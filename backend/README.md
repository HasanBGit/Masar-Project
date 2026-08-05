# Truepoint backend

Django + DRF + PostgreSQL modular monolith. One Django project, one Postgres
database, one Django app per feature module - see
`../skills/README.md` and `../skills/platform-guidelines/references/platform-architecture.md`
for the full architecture rationale.

This slice implements:

- **`accounts`** (Module 17 core baseline) - custom `User` (email login), `ProjectMembership`/`Role`, RBAC service layer, JWT auth.
- **`approvals`** (Module 4 - domain kernel) - the **3 Edges** decision model: Hearing → Understanding → Agreeing, RACI, SLA escalation.
- **`dashboard`** (Module 3) - role-differentiated views (Owner/Investor/Consultant/Contractor) over `approvals` data, plus the "3 things need your decision" digest.
- **`trust_evidence`** (Module 5, minimal slice) - the shared `AuditEvent` log + `record_event()` that `approvals` writes every state transition to.
- **`core`** - shared `Project` model and the `TrackedItem` abstract base other tracked-object modules (RFIs, change orders, …) will inherit from in later phases.

## Setup

```bash
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

createdb truepoint_dev          # local Postgres must be running
cp .env.example .env            # adjust DATABASE_URL if your local Postgres user differs

python manage.py migrate
python manage.py seed_demo      # creates a demo project + one user per role + sample decisions
python manage.py runserver      # http://127.0.0.1:8000
```

Demo accounts (password `demo1234` for all): `owner@truepoint.sa`,
`investor@truepoint.sa`, `consultant@truepoint.sa`, `contractor@truepoint.sa`.

Deploying against Supabase Postgres: see `../DEPLOYMENT.md`.

## Tests

```bash
pytest
```

Covers: 3-Edges valid/invalid transitions, the Accountable-only close rule,
generic-paraphrase rejection, the DB-level "exactly one Accountable"
constraint, SLA escalation (incl. idempotency), RBAC permission checks, and
role-filtered dashboard composition (owner sees everything, investor sees
high-stakes only, contractor sees only what they're Responsible for).

## SLA escalation in production

`approvals.services.escalate_if_breached()` runs lazily whenever a single
decision is fetched (`DecisionViewSet.get_object`), so an overdue item
flips to `escalated` the moment anyone opens it. For decisions nobody
re-opens, run the bulk sweep on a schedule:

```bash
python manage.py escalate_overdue_decisions   # wire to cron / Celery beat in production
```

## Scalability notes

- **Stateless JWT auth** (`djangorestframework-simplejwt`) - no server-side session store, so API instances scale horizontally behind a load balancer with no sticky sessions.
- **`CONN_MAX_AGE`** is set (see `config/settings.py`) for persistent DB connections; put a connection pooler (pgbouncer / RDS Proxy / Cloud SQL Proxy) in front of Postgres before scaling API instances beyond a handful.
- **DB-level constraints, not just app-layer checks** - e.g. the "exactly one Accountable participant per decision" rule is a partial unique index (`approvals.DecisionParticipant.Meta.constraints`), so it holds even under concurrent writes, not just when the service layer runs.
- **Indexes** on the columns the hot paths filter/sort by: `Decision(project, status)`, `Decision(status, sla_deadline)`, `DecisionParticipant(user, raci_role)`, `AuditEvent(subject_type, subject_id)`.
- **Config via environment** (`django-environ` + `DATABASE_URL`) - the same codebase points at a managed Postgres instance in staging/production without code changes.
- Everything is **paginated** by default (`REST_FRAMEWORK.DEFAULT_PAGINATION_CLASS`) so list endpoints don't unbounded-grow as project/decision counts increase.
