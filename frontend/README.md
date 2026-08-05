# Truepoint frontend (app)

React + TypeScript + Tailwind app implementing the owner-facing product - 
distinct from `../site/`, which is the marketing landing page.

Feature folders (per `../skills/README.md`'s naming convention):

- `src/features/auth/` - JWT login, session context.
- `src/features/owner-dashboard/` - role-differentiated dashboard (Owner/Investor/Consultant/Contractor) + "3 things need your decision" digest.
- `src/features/approvals-workflow/` - the 3 Edges (Hearing → Understanding → Agreeing) decision UI.

## Run

```bash
npm install
npm run dev   # http://localhost:5174, proxies /api to the Django backend on :8000
```

Start the backend first (`../backend/README.md`) and seed demo data
(`python manage.py seed_demo`), then sign in as `owner@truepoint.sa` /
`demo1234` (or `investor` / `consultant` / `contractor` @truepoint.sa).

Deploying to Vercel: see `../DEPLOYMENT.md`.

## Stack notes

- Tailwind v4 via `@tailwindcss/vite`, brand tokens (`--color-navy`, `--color-gold`, `--color-cream`, …) defined in `src/index.css`, matching `../skills/platform-guidelines/references/brand-identity.md`.
- `src/lib/api.ts` - axios client with automatic JWT refresh on 401.
- Routing via `react-router-dom`; `ProtectedRoute` redirects unauthenticated users to `/login`.
