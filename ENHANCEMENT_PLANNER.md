# Masar Platform — Enhancement Planner

The phased execution plan behind the 2026-08 quality program, kept as a living checklist.
Detail per finding: [`PROJECT_AUDIT.md`](PROJECT_AUDIT.md). Test strategy: [`TESTING_PLAN.md`](TESTING_PLAN.md).

Branch: `claude/testing-plan-ui-ux-enhancement-vo8u5p`

## Guardrail

Brand colors are untouchable. Every visual change reuses the existing tokens in
`frontend/src/index.css` / `site/src/index.css` / the landing `:root` palettes; no brand color
value was altered.

## Phase 0 — Baseline & environment ✅
- [x] Install deps for frontend, site, backend (fresh clone path verified)
- [x] Baseline matrix recorded (tsc/lint/tests/builds; Django checks; 102 backend tests)
- [x] Local Postgres 16 + pgvector, socket-auth dev database
- [x] Connectivity config review: Vite proxy 5174→8000, `/api/v1` base, JWT refresh single-flight

## Phase 1 — Testing plan + infrastructure ✅
- [x] `TESTING_PLAN.md` (pyramid, per-module coverage areas, targets, regression ledger)
- [x] Frontend coverage tooling (`@vitest/coverage-v8`, `test:coverage`)
- [x] Site: vitest + Testing Library from zero
- [x] Root scripts fixed (`dev:backend`, `test:site`, full `test`)
- [x] CI for all three deployables (`.github/workflows/ci.yml`, pgvector service container)

## Phase 2 — Frontend problem rewrite ✅
- [x] Eternal-loading bugs (Dashboard, Contract Payments) → race-safe `useProjectData` + error states
- [x] 12 stuck busy flags → try/catch/finally + toasts
- [x] StatusBadge crash fallback; Badge type safety
- [x] Undefined color tokens in Drawings Studio
- [x] Language state into React (persisted; reads `Me.preferred_language`)
- [x] `dir-rtl` class → real `dir` attribute; real clipboard copy; timeout leak
- [x] `prompt()` → validated form
- [x] Pagination preserved (`unwrapPage`) + paginated tables
- [x] Zombie-session fix (auth-expired event → logout)
- [x] Dead code removed (Select/CustomSelect, unused api fns/assets); duplication collapsed
  (StatCard, DataTable, viewer interactions, roster api)
- [x] Perf: geometry rebuild scoping; shared SLA ticker

## Phase 3 — Backend problem rewrite + tests ✅
- [x] requirements.txt completed + bounded (clean install works)
- [x] All 500-on-every-call endpoints fixed with HTTP regression tests
- [x] Settings hardening (DEBUG default, SECRET_KEY guard, throttling incl. auth endpoints,
      LOGGING, CACHES, HSTS, upload limits, `.env.example` startup footgun)
- [x] Permission gaps closed per RBAC matrix + permission tests
- [x] Correctness: evidence scoping, idempotent release/resolve, atomic RAG re-ingest,
      NULL-project health visibility, RFI numbering, IntegrityError→400 conversions,
      GETs made read-only
- [x] Webhooks: one-time secret reveal, event-type validation, `payment.released`
- [x] N+1/prefetch pass; QuerySets for pagination; aggregates; Meta.ordering
- [x] Serializer validation pass
- [x] HTTP test backfill where the bugs lived (rfi writes, handover, public API, staff-only,
      auth flow, cross-tenant isolation)
- [ ] ⏭ Django 5.0 → 5.2 LTS upgrade (deferred — dedicated pass; 5.0 is out of security support)

## Phase 4 — Frontend UI/UX enhancement ✅
- [x] Shared primitives: Skeleton, ErrorState, EmptyState, ConfirmDialog, Toast, DataTable,
      Field, Modal/slide-over, StatCard
- [x] Loading/error/empty states on every page; confirmations on destructive actions
- [x] A11y sweep (focus ring, skip link, single h1, labels, tablists, switches, dialogs,
      aria-hidden emoji, role=alert)
- [x] Real forms everywhere (Enter submits; typed+validated numeric/URL inputs)
- [x] RTL: logical properties app-wide; Arabic chrome dictionary; persisted language
- [x] Responsive: mobile project switching, drawer fixes, grid fallbacks, wider content cap
- [x] Consistency: type scale, spacing, radius tokens, off-palette colors → brand tokens,
      hover/transition polish
- [x] Honesty pass: fake badge/address/promo card removed; docs search made real;
      Email Integrations clearly labelled as demo preview

## Phase 5 — Site repair ✅
- [x] Multi-page build (app.html ships)
- [x] One i18n system (regional codes, persistence, no competing writers)
- [x] Dead links → real sections/env-driven; early-access form actually submits
- [x] Gmail auth race fixed with visible error + retry
- [x] A11y/UX: focus outlines, dialog semantics, hover suite, RTL slider, tablet breakpoint,
      reduced-motion static mode, lazy-loaded imagery with dimensions
- [x] strict TS + expanded lint; real README + `.env.example`; 17 tests

## Phase 6 — Repo/docs/config hygiene ✅
- [x] README: CI badge, fixed links/typos/tree, pgvector step, honest module inventory
- [x] Deploy config: single source of truth (backend/railway.json + Procfile), Railway section
      in DEPLOYMENT.md, Vercel notes for both frontends
- [x] Secret-rotation advisory (DEPLOYMENT.md §5) for the git-history leak

## Phase 7 — Platform documentation (in-app /docs) ✅
- [x] Getting Started: real setup, JWT auth flow, demo accounts, first API call
- [x] Concepts: 3-Edges kernel, RACI, evidence gating, SLA escalation as actually implemented
- [x] Modules: the 11 real modules with endpoints; roadmap modules marked honestly
- [x] API Reference: per-app endpoint tables, auth/pagination/error conventions, Swagger/ReDoc links
- [x] Webhooks: all four event types, one-time HMAC secret, signature verification example,
      retry/dead-letter semantics

## Phase 8 — Final verification & delivery
- [x] Full local matrix green (backend pytest + checks; frontend & site tsc/lint/tests/builds)
- [x] Live end-to-end proof: migrate + seed → Django :8000 + Vite :5174 → health probes,
      JWT login, profile/projects/dashboard through the proxy, previously-500 write endpoints
      exercised with a real token
- [x] `PROJECT_AUDIT.md` + this planner committed
- [ ] Push to `HasanBGit/Masar-Project` (blocked on repo write access at time of writing —
      first push retried as access opens)
- [x] Deliverable docs mirrored to `alshaya00/Test` on the same branch name

## Follow-up backlog (recommended next increments)
1. Django 5.2 LTS upgrade + dependency refresh.
2. Real email-integration backend (OAuth, sync, webhook receiver) to replace the demo preview.
3. Playwright E2E layer on top of the now-green component/API suites.
4. Self-host landing imagery + fonts; Lighthouse budget in CI.
5. Redis cache in production for cross-worker rate limiting.
