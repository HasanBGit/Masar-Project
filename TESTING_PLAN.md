# Masar Platform — Testing Plan

This document defines the testing strategy for the three deployables in this monorepo — the Django/DRF backend (`backend/`), the stakeholder app (`frontend/`), and the marketing site (`site/`) — plus the CI gates that enforce it.

## 1. Goals & principles

1. **Every fixed bug gets a regression test.** The 2026-08 audit found multiple endpoints that returned HTTP 500 on every call and pages that hung forever on API failure — none had tests. Each fix in that program lands with a test that would have caught it.
2. **Test at the layer where the bugs live.** The backend had good service-layer coverage (97 tests) but near-zero HTTP-layer coverage — and all seven 500-class bugs were in the view/serializer layer. HTTP-level API tests are therefore mandatory for every write endpoint.
3. **The suite must run on a fresh clone.** `pip install -r requirements.txt` + `npm ci` + one documented command per package. No reliance on a pre-existing venv, seeded DB, or developer machine state.
4. **CI is the gate.** Nothing merges with a red matrix. The README's "Tests Passing" badge must reflect an actual CI run.

## 2. Test pyramid per deployable

### 2.1 Backend (`backend/`) — pytest + pytest-django

| Layer | What | Tooling |
|---|---|---|
| Unit / service | Business rules: 3-Edges state machine, RBAC matrix, SLA math, webhook dispatch, RAG pipeline (mocked providers) | `pytest`, existing `conftest.py` fixtures |
| API (HTTP) | Every endpoint: happy path, auth required, permission denied per role, validation errors, 404s, pagination | DRF `APIClient` |
| Data integrity | Unique-constraint collisions return 400 not 500; cross-tenant isolation; idempotency of state transitions | `APIClient` + direct ORM asserts |
| Query budget | `django_assert_num_queries` on hot list endpoints (coordination threads, punch list, evidence, audit log) | pytest-django |
| Migrations | `makemigrations --check --dry-run` in CI; migrations apply cleanly to an empty Postgres | CI job |

**Required coverage areas** (each app):
- `accounts`: JWT obtain/refresh (success, bad creds, throttled), `me/`, roster CRUD + IDOR, compliance, audit log, user search.
- `approvals`: state machine transitions via API actions (`confirm-hearing`, `record-understanding`, `agree`), accountable-only gating, escalation idempotency.
- `rfi_change_control`: **HTTP tests for every write** (RFIs, change orders, submittals, permits, deliveries, checkpoints, threads/messages) — this is where the always-500 bugs lived.
- `handover`: record POST with real/invalid dates, punch list, O&M verify permissions, defect state machine incl. double-resolve.
- `trust_evidence`: evidence create/verify gating, project scoping of subject lookups, dispute export permission.
- `contract_payments`: contract create (duplicate → 400), milestones release idempotency, amendments version collision → 400, ceiling check, legal-agent with mocked LLM.
- `platform_api`: API key create validation (scope/tier), revoke, public facade key scoping + cross-project isolation, throttle tier behavior, webhook subscription `event_types` validation, delivery/HMAC.
- `observability`: `/health/` open, everything else StaffOnly (assert owner/contractor rejected), integration health incl. platform-wide (`project IS NULL`) rows.
- `dashboard`: summary per role, non-member rejection.
- `drawings_studio`: upload validation (extension, size), delete permissions.
- `config`: exception handler writes audit event and never converts a 403 into a 500.

**Conventions**: tests live in `<app>/tests/`; HTTP tests named `test_*_api.py`; use `conftest.py` role fixtures; never hit real network (mock `requests`/`httpx`/LLM providers); `--reuse-db` locally, fresh DB in CI. Postgres with `pgvector` extension is required (CI uses the `pgvector/pgvector` image).

### 2.2 Frontend (`frontend/`) — Vitest + Testing Library (jsdom)

| Layer | What |
|---|---|
| Lib/unit | `lib/api.ts` interceptors: 401→refresh→retry, single-flight refresh, refresh-failure → logout; `lib/pagination.ts`; `getApiError` |
| Component | Shared primitives: DataTable (pagination/sorting), Modal/SlideOver (focus trap, Escape, restore), ConfirmDialog, Toast, Field, StatusBadge/Badge fallbacks, SlaCountdown (fake timers), ErrorBoundary |
| Page | Per feature page: renders skeleton while loading → data on success → **error state with retry on failure** → empty state on empty data. API modules mocked per test. |
| Auth/routing | AuthContext login/logout, ProtectedRoute redirect, staff-only route gating |
| RTL smoke | `dir="rtl"` renders mirrored layout, language persists, toggle updates label |

**Conventions**: co-located `*.test.tsx`; `vitest run` in CI, `test:coverage` with `@vitest/coverage-v8`; mock at the feature `api.ts` boundary (not axios) except for `lib/api.ts` tests which mock axios adapters.

### 2.3 Site (`site/`) — Vitest + Testing Library (jsdom)

| Layer | What |
|---|---|
| i18n | Language resolution: `ar-SA` → Arabic + `dir="rtl"`; persistence round-trip; direction listener uses base language |
| Landing | Nav modal open/close/focus, early-access form validation + submit path, no dead anchors (every `href="#x"` has a target id) |
| App shell | Gmail auth hook: GSI script-load retry path sets a visible error state instead of failing silently |

### 2.4 End-to-end / smoke (manual + scripted)

Scripted smoke (documented in this repo, run before release):
1. `docker`-less local boot: Django `runserver` :8000 + `vite` :5174; login with seeded demo user; visit every route; no console errors; no eternal spinners with backend killed mid-session.
2. `vite build` for `frontend/` and `site/` both succeed; `site/dist` contains **both** `index.html` and `app.html`.
3. `GET /health/` and `GET /api/v1/observability/health/` return 200 with DB status.

A full Playwright E2E layer is deliberately deferred until the component/API suites are green and CI exists (this repo previously had zero CI — foundation first).

## 3. Coverage targets

| Package | Initial gate | Target |
|---|---|---|
| backend | All tests pass; every write endpoint has ≥1 HTTP test | 80% line coverage on `views.py`/`serializers.py`/`services.py` |
| frontend | All tests pass; `lib/` at 90%; every page has loading/error/empty tests | 70% line overall |
| site | i18n + landing suites pass | grow with features |

Coverage is reported in CI (`pytest --cov`, `vitest run --coverage`) but the *gate* is the enumerated behaviors above — chasing a % number without the behavior list produces vanity coverage.

## 4. How to run locally

```bash
# Backend (requires Postgres with pgvector; see README)
cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
./venv/bin/pytest --reuse-db

# Frontend
cd frontend && npm ci
npm test               # vitest run
npm run test:coverage  # with V8 coverage

# Site
cd site && npm ci
npm test

# Everything from the repo root
npm run test           # runs frontend + site + backend suites
```

## 5. CI gates (`.github/workflows/ci.yml`)

Three parallel jobs on every push/PR:

1. **backend** — Postgres 16 + pgvector service container; `pip install -r requirements.txt`; `python manage.py check`; `python manage.py makemigrations --check --dry-run`; `pytest`.
2. **frontend** — `npm ci`; `tsc -b`; `npm run lint`; `vitest run`; `vite build`.
3. **site** — `npm ci`; `tsc -b`; `npm run lint`; `vitest run`; `vite build`.

All three must pass. The README badge points at this workflow.

## 6. Regression-test ledger (from the 2026-08 audit)

Every entry below is a bug that shipped without a test; its fix must include the named test.

| # | Bug | Regression test |
|---|---|---|
| B1 | `POST change-orders/` 500 (`project` kwarg duplicated) | `rfi_change_control/tests/test_api_writes.py::test_create_change_order` |
| B2 | `POST submittals/`, `permits/` 500 (`current_as_of` never set) | same file, create tests |
| B3 | `POST handover/record/` 500 (string date) | `handover/tests/test_handover_api.py` |
| B4 | Bad API-key tier → all public API calls 500 | `platform_api/tests/test_public_api.py` |
| B5 | `sla_deadline` KeyError on RFI create | `test_api_writes.py::test_create_rfi_without_sla` |
| B6 | Unthrottled `/auth/token/` | `accounts/tests/test_auth_api.py::test_login_throttled` |
| B7 | Platform-wide health rows invisible | `observability/tests/::test_platform_wide_health_visible` |
| B8 | Evidence subject-id cross-model collision | `trust_evidence/tests/::test_subject_lookup_project_scoped` |
| B9 | Milestone double-release re-fires webhook | `contract_payments/tests/::test_release_idempotent` |
| B10 | IntegrityError → 500 (roster dup, amendment version, second contract) | per-app `*_api` tests |
| F1 | Eternal "Loading…" on API failure (Dashboard, ContractPayments) | page error-state tests |
| F2 | Stuck `busy` flags on error | form-submit failure tests |
| F3 | StatusBadge crash on unknown status | `StatusBadge.test.tsx` |
| F4 | Zombie session after refresh failure | `lib/api.test.ts` |
| F5 | Tables silently truncated to page 1 | `DataTable`/pagination tests |
| F6 | Project-switch race overwrites newer data | `useProjectData` hook test |
| S1 | `ar-SA` renders English/LTR | `site/src/i18n/i18n.test.ts` |
| S2 | Early-access form discards submissions | landing form test |
| S3 | GSI script race kills sign-in silently | `useGmailAuth.test.ts` |

## 7. Ownership & maintenance

- New endpoint ⇒ HTTP tests (happy + denied + invalid) in the same PR.
- New page/component ⇒ loading/error/empty tests in the same PR.
- Flaky test ⇒ fix or delete within a day; never `skip` without an issue link.
- This plan is updated whenever a new layer (E2E, visual regression, load) is added.
