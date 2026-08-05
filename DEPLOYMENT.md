# Deployment: Vercel + Supabase

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

Uses `backend/Procfile`, already wired for this:

```
release: python manage.py migrate --noinput
web: gunicorn config.wsgi --log-file -
```

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
  (auto-detected). No env vars or extra config needed - it's a single
  static page with no client-side routing.

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
