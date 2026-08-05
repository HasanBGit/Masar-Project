// ─── San3 App Configuration ───────────────────────────────────────────────────
// 1. Go to https://console.cloud.google.com/
// 2. Create a project → APIs & Services → Enable "Gmail API"
// 3. Credentials → Create OAuth 2.0 Client ID (Web application)
// 4. Add Authorized JavaScript origin: http://localhost:5173
// 5. Put the Client ID in .env as VITE_GOOGLE_CLIENT_ID

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export const APP_NAME = "San3";
// Messages pulled per channel, per sync. Two AI layers means roughly
// 2 calls per message plus one per project, and a free-tier key allows ~20
// requests/minute — so 15 keeps a cold sync near two minutes. Cached syncs are
// instant regardless. Raise this on a paid key.
export const MAX_MESSAGES = 15;

// ─── Gemini extraction layer ──────────────────────────────────────────────────
// Free key: https://aistudio.google.com/apikey  → .env.local as VITE_GEMINI_API_KEY
// NOTE: anything prefixed VITE_ is bundled into the client JS and visible to
// every visitor. Fine for a local demo; put this behind a server before deploying.
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";

export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_FALLBACK_MODEL = "gemini-2.0-flash";

/** Extractions below this confidence go to the Needs Review queue rather than
 *  straight onto the timeline. */
export const CONFIDENCE_THRESHOLD = 0.7;

/** Parallel extraction calls in flight. Kept low deliberately — free-tier keys
 *  throttle by requests-per-minute, and a throttled sync is slower than a
 *  paced one. Raise this on a paid key. */
export const EXTRACTION_CONCURRENCY = 2;

// ─── Layer 2 · reasoning ──────────────────────────────────────────────────────
// Reasoning costs one model call per event plus one per project. Turn it off to
// run extraction only — the record still works, it just has no interpretation.
export const REASONING_ENABLED = true;

/** How many prior events the reasoning layer sees as context. Higher means
 *  better cross-referencing and more tokens per call. */
export const REASONING_CONTEXT_EVENTS = 20;

/** Cap on how many of the newest events get reasoned per sync, so a large
 *  mailbox cannot turn one sync into hundreds of calls. */
export const MAX_REASONED_EVENTS = 25;

// ─── Label-based ingestion filter ─────────────────────────────────────────────
// Only Gmail messages with this label are pulled. The AI decides what is and
// isn't construction-related — this is just a demo-scoping convenience.
// Set to "" to pull the whole inbox and let the model do all the filtering.
export const GMAIL_LABEL_FILTER = "San3 Demo";

// ─── Project aliases ──────────────────────────────────────────────────────────
// How people actually refer to each project on site — nicknames, zone names,
// short forms. The model reads meaning on its own; what it cannot know is that
// "Zone C" means the Diriyah villas on *this* account. That is account-specific
// fact, not intelligence.
//
// Only put IDENTIFYING terms here. Generic construction vocabulary (concrete,
// rebar, MEP, fit-out, scaffold, floor numbers) belongs to every project, so
// listing it under one skews the model toward that project wrongly.
export const PROJECT_ALIASES: Record<string, string[]> = {
  "tower-01": ["tower", "البرج", "برج طريق الملك عبدالعزيز", "king abdulaziz", "king abdullah", "zone a", "zone b"],
  "villas-c": ["villas", "فلل", "diriyah", "الدرعية", "diriyah gate", "بوابة الدرعية", "zone c", "المنطقة ج"],
  "park-02": ["business park", "مجمع النخيل", "nakheel", "النخيل", "jeddah", "جدة"],
};
