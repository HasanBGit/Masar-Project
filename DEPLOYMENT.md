# Deployment: Vercel + Railway/Render + Supabase

This repo has three deployables:

| Path        | What it is                        | Where it goes |
|-------------|------------------------------------|----------------|
| `frontend/` | The app (React + Vite, SPA)        | Vercel |
| `site/`     | Marketing landing page (React + Vite) | Vercel |
| `backend/`  | Django + DRF API                   | A Python host (Render/Railway/Fly) - **not** Vercel |
| Postgres    | -                                   | Supabase |

## Why the backend doesn't go on Vercel

Vercel's compute is stateless serverless functions with hard execution-time
limits and no built-in scheduler. This backend needs neither of those to be
a problem for request/response, but it does rely on things that don't fit
serverless well:

- `approvals.services.escalate_if_breached()` runs lazily per-request, but
  the bulk sweep (`python manage.py escalate_overdue_decisions`, see
  `backend/README.md`) needs a real cron scheduler - Render and Railway both
  have one built in; Vercel doesn't run background jobs at all.
- `python manage.py migrate` needs to run as a one-off release step, which
  Render/Railway support natively (see `backend/Procfile`) and Vercel doesn't.

Supabase itself is Postgres (+ optional Storage/Auth), not a Django host, so
this split - Vercel for the two static/SPA frontends, a real Python host for
Django, Supabase for the database - is the standard shape for this stack,
not a workaround.

## 1. Supabase (database)

1. Create a project at supabase.com.
2. **Settings > Database > Connection string > URI.** Use the pooled
   ("Transaction" mode, port 6543) connection string for the app, since API
   instances on Render/Railway open/close connections per deploy cycle and
   the pooler avoids exhausting Supabase's direct connection limit.
3. Append `?sslmode=require` if it isn't already present - Supabase requires
   TLS and `backend/config/settings.py` also enforces this by default
   whenever `DEBUG=False`.
4. Optional - **Storage > New bucket** if you want uploaded drawing files
   (`drawings_studio`) to live in Supabase Storage instead of local disk.
   Storage exposes an S3-compatible endpoint at
   `https://<project-ref>.supabase.co/storage/v1/s3`; grab an access
   key/secret from Storage settings.

## 2. Backend (Render/Railway/Fly)

There is exactly **one** deploy config for the backend, and it lives inside
`backend/`:

- `backend/Procfile` (used by Render/Fly and any Procfile-aware host):

  ```
  release: python manage.py migrate --noinput && python manage.py collectstatic --noinput
  web: gunicorn config.wsgi --log-file -
  ```

- `backend/railway.json` (used by Railway) — defines the same release/start
  commands.

### Railway specifics

1. Create a Railway service from this repo and set the service's
   **Root Directory to `backend/`** — that is what makes
   `backend/railway.json` (and relative `manage.py` paths) apply. Do not add
   a second railway.json at the repo root; two configs whose applicability
   depends on the root-directory setting is a silent misconfiguration trap.
2. `railway.json` runs `migrate` + `collectstatic` on every deploy as the
   release command. Note: migrations marked destructive (see
   `contract_payments/migrations/0002`) run unattended here — review new
   migrations before deploying.
3. Add a Railway Cron schedule for the SLA sweep (see below).

Set these environment variables on the host (see `backend/.env.example` for
the full annotated list):

```
DJANGO_SECRET_KEY=<random, 50+ chars>
DEBUG=False
ALLOWED_HOSTS=<your-api-host>.onrender.com
DATABASE_URL=<Supabase pooled connection string from step 1>
CORS_ALLOWED_ORIGINS=https://<your-app>.vercel.app
CSRF_TRUSTED_ORIGINS=https://<your-app>.vercel.app
```

Then, wire the SLA sweep as a scheduled job on the host (Render Cron Jobs /
Railway Cron), running:

```
python manage.py escalate_overdue_decisions
```

## 3. Frontend + site (Vercel)

Import the repo into Vercel **twice** - once per app - since this is a
monorepo and each Vite app needs its own project:

- Project 1: Root Directory = `frontend`. Framework preset: Vite
  (auto-detected). Env var: `VITE_API_URL=https://<your-api-host>.onrender.com/api/v1`.
  `frontend/vercel.json` handles the SPA rewrite `react-router-dom`'s
  `BrowserRouter` needs.
- Project 2: Root Directory = `site`. Framework preset: Vite
  (auto-detected). The build emits two entry points: `index.html` (the
  marketing landing) and `app.html` (the San3 workspace demo). Optional env
  vars (see `site/.env.example`): `VITE_APP_URL` (where the landing's Login
  link points), `VITE_EARLY_ACCESS_ENDPOINT` (where the early-access form
  POSTs), and — only if you expose the workspace demo —
  `VITE_GOOGLE_CLIENT_ID` / `VITE_GEMINI_API_KEY`. **Warning:** any
  `VITE_*` key is bundled into client JS and visible to every visitor; the
  Gemini key must sit behind a server-side proxy before any real production
  exposure (`site/src/app/config.ts` documents this).

**Important:** if `VITE_API_URL` is left unset on the `frontend` Vercel
project, the app falls back to a relative `/api/v1` base URL (the same one
the local dev proxy uses) - in production there's no proxy, so requests
would hit `frontend/vercel.json`'s SPA rewrite and get back `index.html`
instead of JSON. Always set `VITE_API_URL` for the deployed frontend.

## 4. Order of operations

1. Deploy `backend/` first (needs Supabase's `DATABASE_URL`); note its URL.
2. Deploy `frontend/` on Vercel with `VITE_API_URL` pointed at that backend.
3. Deploy `site/` on Vercel (independent of the other two).
4. Once the frontend's real Vercel URL is known, add it to the backend's
   `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` and redeploy the backend.

## 5. Security note: rotate credentials leaked in git history

Commit `37b2671` added `.env.dev` files containing a real
`DJANGO_SECRET_KEY` and a Supabase `DATABASE_URL` (with password). A later
commit removed the files from tracking, but **the values remain recoverable
from git history** and must be treated as compromised:

1. Rotate the Django `SECRET_KEY` on every deployed environment.
2. Reset the Supabase database password (Supabase dashboard → Settings →
   Database) and update `DATABASE_URL` everywhere it is set.
3. If those `.env.dev` files ever contained other keys (LLM providers,
   storage), rotate those too.
