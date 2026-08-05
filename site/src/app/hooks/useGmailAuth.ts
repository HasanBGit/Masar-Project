import { useState, useEffect, useCallback } from "react";
import { GOOGLE_CLIENT_ID, GMAIL_SCOPES } from "../config";
import type { AuthState } from "../types";
import { fetchGmailUser } from "../services/channels/gmail";

declare global {
  interface Window {
    google: any;
  }
}

export function useGmailAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
    error: null,
  });

  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    // Load Google Identity Services script if not present
    if (!window.google?.accounts?.oauth2) {
      console.warn("Google Identity Services script not loaded. Ensure <script src=\"https://accounts.google.com/gsi/client\" ...> is in app.html");
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      console.warn("VITE_GOOGLE_CLIENT_ID is not set in environment variables.");
      setAuthState(prev => ({ ...prev, isLoading: false, error: "Google Client ID not configured" }));
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GMAIL_SCOPES,
        callback: async (response: any) => {
          if (response.error !== undefined) {
            setAuthState(prev => ({ ...prev, error: response.error, isLoading: false }));
            return;
          }
          
          const token = response.access_token;
          setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
          
          try {
            const user = await fetchGmailUser(token);
            setAuthState({
              token,
              user,
              isLoading: false,
              error: null,
            });
          } catch (err: any) {
            setAuthState({
              token: null,
              user: null,
              isLoading: false,
              error: err.message ?? "Failed to fetch user profile",
            });
          }
        },
      });
      setTokenClient(client);
    } catch (err: any) {
      setAuthState(prev => ({ ...prev, error: err.message, isLoading: false }));
    }
    
    // Check for existing token (e.g. in localStorage) if we wanted to persist sessions
    // For this MVP, we'll require sign-in every time the page reloads for simplicity and security.
    setAuthState(prev => ({ ...prev, isLoading: false }));
  }, []);

  const login = useCallback(() => {
    if (tokenClient) {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      tokenClient.requestAccessToken();
    } else {
      setAuthState(prev => ({ ...prev, error: "OAuth client not initialized" }));
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

  return { ...authState, login, logout };
}
