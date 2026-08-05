import { useState, useEffect, useCallback } from "react";
import { GOOGLE_CLIENT_ID, GMAIL_SCOPES } from "../config";
import type { AuthState } from "../types";
import { fetchGmailUser } from "../services/channels/gmail";

// ─── Minimal typings for the Google Identity Services token client ────────────
// Only the pieces this hook actually uses; the GIS script has no bundled types.

interface GoogleTokenResponse {
  access_token: string;
  error?: string;
}

interface GoogleTokenClient {
  requestAccessToken: () => void;
}

interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
  }): GoogleTokenClient;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2;
      };
    };
  }
}

/** The GIS script in app.html loads async/defer, so window.google is usually
 *  NOT there on first render. Poll for it instead of checking once. */
const SCRIPT_POLL_INTERVAL_MS = 200;
const SCRIPT_POLL_TIMEOUT_MS = 10_000;

const SCRIPT_LOAD_ERROR =
  "Google sign-in failed to load — refresh to retry, or check your network/ad-blocker.";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function useGmailAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
    error: null,
  });

  const [tokenClient, setTokenClient] = useState<GoogleTokenClient | null>(null);
  // Bumping this re-runs the init effect (used by the visible Retry button).
  const [initAttempt, setInitAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!GOOGLE_CLIENT_ID) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Google Client ID not configured — set VITE_GOOGLE_CLIENT_ID.",
      }));
      return;
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    const initClient = (oauth2: GoogleOAuth2) => {
      try {
        const client = oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GMAIL_SCOPES,
          callback: async (response: GoogleTokenResponse) => {
            if (response.error !== undefined) {
              setAuthState((prev) => ({ ...prev, error: response.error ?? null, isLoading: false }));
              return;
            }

            const token = response.access_token;
            setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
              const user = await fetchGmailUser(token);
              setAuthState({ token, user, isLoading: false, error: null });
            } catch (err) {
              setAuthState({
                token: null,
                user: null,
                isLoading: false,
                error: errorMessage(err) || "Failed to fetch user profile",
              });
            }
          },
        });
        if (!cancelled) {
          setTokenClient(() => client);
          setAuthState((prev) => ({ ...prev, isLoading: false, error: null }));
        }
      } catch (err) {
        if (!cancelled) {
          setAuthState((prev) => ({ ...prev, error: errorMessage(err), isLoading: false }));
        }
      }
    };

    // Poll for the async/defer GIS script instead of checking once — a single
    // check races the script and permanently breaks sign-in when it loses.
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = () => {
      if (cancelled) return;
      const oauth2 = window.google?.accounts?.oauth2;
      if (oauth2) {
        initClient(oauth2);
        return;
      }
      if (Date.now() - startedAt >= SCRIPT_POLL_TIMEOUT_MS) {
        setAuthState((prev) => ({ ...prev, isLoading: false, error: SCRIPT_LOAD_ERROR }));
        return;
      }
      timer = setTimeout(poll, SCRIPT_POLL_INTERVAL_MS);
    };
    poll();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [initAttempt]);

  /** Re-runs script detection + token-client init (for the Retry button). */
  const retryInit = useCallback(() => {
    setInitAttempt((n) => n + 1);
  }, []);

  const login = useCallback(() => {
    if (tokenClient) {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      tokenClient.requestAccessToken();
    } else {
      setAuthState((prev) => ({ ...prev, error: "OAuth client not initialized" }));
    }
  }, [tokenClient]);

  const logout = useCallback(() => {
    setAuthState({
      token: null,
      user: null,
      isLoading: false,
      error: null,
    });
    // In a real app, you might also want to revoke the token
    // window.google.accounts.oauth2.revoke(token, () => {});
  }, []);

  return { ...authState, login, logout, retryInit };
}
