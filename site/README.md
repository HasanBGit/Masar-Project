# Truepoint marketing site + San3 workspace demo

React 19 + TypeScript + Vite + Tailwind v4 + i18next. This package contains
**two entry points** built as one multi-page Vite app:

| Entry        | Path         | What it is |
| ------------ | ------------ | ---------- |
| `index.html` | `/`          | The Truepoint marketing landing page (`src/features/landing/`) — a cinematic scroll story plus features/pricing/FAQ sections, bilingual EN/AR. |
| `app.html`   | `/app.html`  | The San3 construction-intelligence workspace demo (`src/app/`) — Gmail ingestion through a two-layer Gemini pipeline into a project record. |

Both inputs are wired in `vite.config.ts`; removing either silently drops that
page from production builds.

## Commands

```bash
npm install        # once
npm run dev        # dev server (landing at /, workspace at /app.html)
npm run build      # tsc -b + vite build → dist/ (contains index.html AND app.html)
npm run preview    # serve the production build locally
npm run lint       # oxlint (react, typescript, oxc, jsx-a11y plugins)
npm test           # vitest run
npm run test:watch # vitest watch mode
```

## Environment variables

Copy `.env.example` to `.env.local`. All variables are optional for local
development; features degrade gracefully when unset.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_APP_URL` | landing | Absolute URL of the deployed workspace app. Sets the header **Log in** link; the link stays hidden when unset (the static site has no `/login` route). |
| `VITE_EARLY_ACCESS_ENDPOINT` | landing | Endpoint receiving the early-access form as `POST` JSON `{name, email}`. Falls back to a `mailto:` flow when unset. |
| `VITE_GOOGLE_CLIENT_ID` | workspace | Google OAuth 2.0 Client ID for Gmail sign-in (setup steps in `src/app/config.ts`). |
| `VITE_GEMINI_API_KEY` | workspace | Gemini API key for the extraction + reasoning layers. |

> **Security warning** (from `src/app/config.ts`): anything prefixed `VITE_`
> is bundled into the client JavaScript and visible to every visitor. The
> Gemini key setup is acceptable for a local demo only — route model calls
> through a server-side proxy before any production deployment.

## Internationalisation

i18next (`src/i18n/`) is the single source of truth for language state: it
persists the choice in `localStorage` (`truepoint-language`), and its
`languageChanged` listener owns `document.documentElement.lang`/`dir`
(normalising regional codes such as `ar-SA` to their base language). The site
UI offers **English and Arabic** only — the landing content is authored as EN
text plus `data-ar` attributes swapped at runtime, and every language switcher
goes through `i18n.changeLanguage()`. `hi`/`ur` locale files exist but are not
user-selectable (see the comment in `src/i18n/index.ts`).

## Notes

- The landing images are currently hotlinked from CloudFront/Wikimedia and
  must be self-hosted before production (see the comment at the top of
  `src/features/landing/landingMarkup.ts`).
- `src/features/landing/landingMarkup.ts` is rendered via
  `dangerouslySetInnerHTML`; interactivity (scroll rig, modals, language
  swapping) is attached imperatively in `LandingPage.tsx` and honours
  `prefers-reduced-motion` with a static fallback layout.
