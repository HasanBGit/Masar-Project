# Masar Platform — Project Audit & Resolution Log

Date: 2026-08-05 · Branch: `claude/testing-plan-ui-ux-enhancement-vo8u5p`

Three parallel audits (backend, frontend app, marketing site + repo config) inventoried every
problem in the monorepo; this document records each finding and what was done about it.
Companion documents: [`TESTING_PLAN.md`](TESTING_PLAN.md) (strategy + regression ledger) and
[`ENHANCEMENT_PLANNER.md`](ENHANCEMENT_PLANNER.md) (phased execution checklist).

Legend: ✅ fixed in this program · 📋 documented/advisory (needs an action only the owner can take) · ⏭ deferred with rationale

---

## 1. Backend (`backend/` — Django 5 + DRF)

### 1.1 Install & dependencies
| Finding | Resolution |
|---|---|
| `drf-spectacular` + `drf-spectacular-sidecar` in `INSTALLED_APPS` but missing from `requirements.txt` — a clean install could not start | ✅ Added with version bounds |
| `requests` (webhook dispatcher) and `httpx` (OpenRouter client) only available transitively | ✅ Added explicitly |
| No dependency pinning at all | ✅ Upper-bound guards added to every requirement |
| Django 5.0 is past end of security support | ⏭ Upgrade to 5.2 LTS deferred — needs a dedicated migration/regression pass; tracked here deliberately |

### 1.2 Endpoints that returned HTTP 500 on every call
| Finding | Resolution |
|---|---|
| `POST /rfi-change-control/change-orders/` — `project` passed both as kwarg and inside `validated_data` → `TypeError` always | ✅ Fixed + HTTP regression test |
| `POST /rfi-change-control/submittals/` and `permits/` — non-null `current_as_of` never set (views bypassed the service that sets it) → `IntegrityError` | ✅ Routed through the services + regression tests |
| `POST /handover/record/` — raw string date fed into year arithmetic → `TypeError` | ✅ Serializer with real date parsing; invalid/missing dates → 400 |
| API keys: unvalidated `scope`/`tier` — an unknown tier made **every** subsequent public-API request with that key 500 | ✅ Input serializer + defensive throttle lookup + tests |
| RFI create: `KeyError` when optional `sla_deadline` omitted | ✅ Fixed + test |
| Quality checkpoints demanded an `inspector` the frontend never sends → guaranteed 400 | ✅ Defaults to the requesting user |

### 1.3 Security
| Finding | Resolution |
|---|---|
| Real `DJANGO_SECRET_KEY` + Supabase DB password committed in history (commit `37b2671`; later removed from tracking but still recoverable) | 📋 **Rotate both** — steps in `DEPLOYMENT.md` §5 |
| `DEBUG` defaulted to `True` — forgetting the env var in production silently disabled the whole hardening block (SSL redirect, secure cookies, HSTS, DB TLS) | ✅ Defaults to `False`; SECRET_KEY guarded when not DEBUG |
| `/api/v1/auth/token/` completely unthrottled (unlimited credential stuffing) | ✅ Scoped throttle on token endpoints + default anon/user throttles + test |
| No `LOGGING` configuration at all | ✅ Console logging config added |
| No `CACHES` — per-worker LocMem made public-API rate limits N× advertised | ✅ Explicit config + Redis guidance for multi-worker |
| `HSTS 60s` (effectively off) | ✅ Real default once HTTPS verified |
| `.env.example` shipped an empty `CSRF_TRUSTED_ORIGINS=` that crashes Django at startup for anyone copying it | ✅ Fixed |
| No upload size limits despite 3D model uploads | ✅ Limits configured + file-size validation |
| Permission gaps: any project member could verify O&M docs, acknowledge/resolve defects, delete anyone's 3D models, list API-key metadata, read webhook delivery history, export the full dispute bundle, read contract financials, and burn LLM budget via the legal agent | ✅ Role checks added consistent with the existing RBAC matrix + permission-denied tests |
| `seed_demo` runs in production and hardcodes a demo password; made a live httpbin.org POST inside a transaction | ✅ DEBUG-guarded; network call removed |

### 1.4 Silent correctness bugs
| Finding | Resolution |
|---|---|
| Platform-wide integration health rows (`project IS NULL`) invisible — `IN (x, NULL)` never matches | ✅ `Q`-based filter + partial unique constraint + test |
| Evidence subject lookups not project-scoped; Decision ids and PaymentMilestone ids share one namespace — verified evidence on Decision #N could satisfy the payment-release gate for Milestone #N | ✅ Project-scoped lookups + regression test |
| `release_payment_milestone` not idempotent — double release re-fired the webhook and duplicated audit events | ✅ Guard + test |
| Defect `resolve` allowed from any state incl. already-resolved | ✅ State guard + test |
| RAG re-ingest deleted all of a project's embeddings before re-embedding, outside any transaction — one network error destroyed the corpus | ✅ `transaction.atomic` |
| `resolve_silence_flag` could attribute the resolution to the wrong flag row | ✅ Target captured before update |
| State-mutating writes inside GET handlers (SLA escalation in `get_object`, punch-list sync during list) — GETs weren't safe or idempotent | ✅ Moved to explicit actions/management commands |
| Webhook HMAC secret never revealed to subscribers — the signature header was unverifiable decoration | ✅ One-time secret reveal on create |
| `payment.released` dispatched but not a declared event type; `event_types` accepted arbitrary JSON | ✅ Enum extended + list validation |
| RFI numbering used `COUNT(*)+1` — collides after any deletion, races under concurrency | ✅ Max-based numbering with retry |
| `IntegrityError`/`DoesNotExist` surfaced as 500s (duplicate roster member, duplicate amendment version, second contract per project, bad ids in request bodies) | ✅ Proper 400/404 conversions + tests |

### 1.5 Performance
N+1 and materialization fixes: coordination threads/messages, punch lists, evidence lists,
audit export (was unbounded), quiet-projects/security-events per-project loops, alert queryset
materialization, Python-side financial sums → aggregates, list-returning services → QuerySets so
DRF pagination applies. ~15 models without `Meta.ordering` (non-deterministic pagination) fixed.

### 1.6 Validation
Latitude/longitude ranges, future-dated capture timestamps, `contract_value > 0`, retention 0–100,
milestone project/contract consistency, drawing upload size/extension, default statuses on
tracked items (previously empty string), roster/handover hand-rolled parsing → serializers.

---

## 2. Frontend app (`frontend/` — React 19 + TS + Vite + Tailwind v4)

### 2.1 Correctness
| Finding | Resolution |
|---|---|
| Dashboard + Contract Payments hung on "Loading…" **forever** if the API failed (no catch) | ✅ Race-safe `useProjectData` hook + `ErrorState` with retry everywhere |
| ~12 `busy` flags stuck permanently on error (buttons disabled forever, no message) | ✅ try/catch/finally + toasts across all mutation flows |
| Every DRF-paginated table silently showed page 1 only (`unwrapList` discarded `count`/`next`) | ✅ `unwrapPage` keeps totals; shared `DataTable` paginates + sorts |
| Project-switch race: fast switching let a slow stale response overwrite newer data (8 pages) | ✅ `useProjectData` sequence guard |
| Zombie session: refresh failure cleared tokens but left the app rendered, every request 401ing | ✅ Auth-expired event → context logout → redirect to login |
| `StatusBadge` crashed (`TypeError`) on unknown status | ✅ Fallback rendering |
| Undefined color tokens (`status-active`, `status-closed`) rendered as no-ops — invisible live-pulse, unstyled success text | ✅ Mapped to real tokens |
| Language toggle label never updated (read DOM, never re-rendered); language not persisted; `Me.preferred_language` never read | ✅ `LanguageProvider` (React state + localStorage + profile initial value) |
| Fake `dir-rtl` class (Arabic rendered LTR) | ✅ Real `dir="rtl" lang="ar"` attributes |
| Fake copy button (`alert("copied")`, no clipboard call) | ✅ Real clipboard + fallback + toast |
| `prompt()` → `Number()` unvalidated retention input | ✅ Validated inline form (1–50) |
| `setTimeout` leak on unmount | ✅ Cleanup |
| `/accounts/projects/` assumed bare array; would break under pagination | ✅ `unwrapList` + active-project revalidation |
| Dead code: `Select`/`CustomSelect` (283 lines, zero importers), unused api functions, unused assets, dead ternary in `EdgesTracker` | ✅ Removed (EdgesTracker's intent implemented: muted skipped-step hint) |
| 13× `catch (e: any)` reaching into response internals | ✅ Shared typed `getApiError` |
| `StatCard` ×4, table markup ×6, roster api ×2, ~200 duplicated three.js lines | ✅ Single shared implementations (`StatCard`, `DataTable`, `viewerInteractions.ts`) |
| PrimitiveViewer rebuilt all geometry on every slider tick; SlaCountdown created one interval per row | ✅ Geometry rebuilds only on shape/color change; single shared ticker |

### 2.2 UI/UX (brand colors untouched)
- **States**: every page now has skeleton loading, `ErrorState` + retry, meaningful `EmptyState`s
  (icon/hint/CTA); success/error toasts; `ConfirmDialog` on destructive actions (remove member,
  revoke key, delete model). Previously: zero skeletons, one error state in the whole app,
  6 pages showing misleading "No X yet" during fetch.
- **A11y**: global gold `:focus-visible` ring; skip-to-content link; one `<h1>` per screen;
  every input/select labelled (shared `Field` components with `aria-invalid`/`aria-describedby`);
  `aria-label` on icon-only buttons; real `role="tablist"` tab bars with arrow-key navigation;
  `role="switch"` toggles; `aria-hidden` decorative emoji; dialogs (`Modal`/slide-over) with focus
  trap, Escape, focus restore, scroll lock; `role="alert"` errors; `prefers-reduced-motion` honored.
- **Forms**: real `<form>` submission everywhere (Enter works); numeric fields `type="number"`
  validated; URL fields `type="url"`; inline field errors.
- **RTL**: physical → logical properties across the app (`start/end`, `ps/pe`, `ms/me`,
  `border-s/e`, mirrored directional icons); Arabic chrome labels (nav, titles, common actions)
  via a lightweight dictionary; language persists and follows the profile.
- **Responsive**: mobile users can now switch/create projects (was `hidden sm:block`); drawer
  close button no longer off-screen; hard grids get `sm:` fallbacks; content width raised to
  `max-w-7xl` for the 5-column stat grids and 3D studio.
- **Consistency**: standard type scale (arbitrary `text-[13.5px]` etc. removed), consistent card
  padding/radius via tokens, off-palette raw Tailwind colors (red/amber/emerald/blue/purple)
  mapped onto the existing brand/status tokens, hover + transition on interactive elements.
- **Honesty pass — no fake data presented as real**: removed the hardcoded "3" notification badge,
  the fake "Connected: pm@masar-construction.sa" line, and the dashboard's fake Gmail promo card;
  the docs search box is now a real filter; the Email Integrations workspace — the one remaining
  sample-data surface, pending a real Gmail backend — carries an explicit dismissible
  "Demo preview — sample data" banner and its sample copy is labelled as such.

---

## 3. Marketing site (`site/`)

| Finding | Resolution |
|---|---|
| `app.html` + all of `src/app/` (~2,400 lines) silently excluded from every production build | ✅ Multi-page Vite build; both entry points ship |
| i18next fully installed but 100% dead (`t()` never called); regional codes (`ar-SA`) fell back to English/LTR; three competing language systems fought over `<html>`; stored Arabic pref rendered English text in RTL layout; landing unmount wiped the language choice | ✅ Single i18next-owned system; regional codes resolve; persistence works; competing writers removed; ur/hi locale files kept but UI limited to en/ar |
| Early-access form (the site's only conversion path, behind 6 CTAs) discarded submissions | ✅ Posts to a configurable endpoint (`VITE_EARLY_ACCESS_ENDPOINT`) with validation + aria-live feedback; mailto fallback when unconfigured |
| Dead links: `#privacy`, `#terms` (no targets), `/login` (no router — 404) | ✅ Real privacy/terms sections; login link driven by `VITE_APP_URL` (hidden when unset) |
| Gmail sign-in permanently broken by a script-load race, with no visible error | ✅ Poll-with-timeout init + visible error + retry button |
| Keyboard focus outline explicitly removed from the hero slider cards (the page's primary keyboard targets); 1 aria attribute across 17 components | ✅ Visible focus outline restored; dialogs/buttons/inputs labelled; `aria-pressed` state on cards |
| 2 hover rules in 1,125 lines of CSS; slider controls inert until ~3,660px of scroll and RTL-broken; no tablet breakpoint; heading order violations; `<cite>` misuse; leaked CSS custom properties; reduced-motion only half-honored (rAF kept running) | ✅ All addressed (hover/transition suite, working RTL-aware slider, 641–899px tablet range, semantic fixes, tracked-and-removed CSS vars, true static reduced-motion mode) |
| Landing images hotlinked from CloudFront/Wikimedia with no dimensions or lazy loading | ✅ `loading="lazy"` on below-fold images + dimensions + alt text; self-hosting flagged in-markup (downloads blocked by sandbox network policy) |
| `strict` TypeScript off; lint config nearly empty; README was the unmodified Vite template; no `.env.example`; zero tests | ✅ strict on; oxlint expanded (jsx-a11y, no-console, no-explicit-any); real README; `.env.example` with all vars; 17 tests |

---

## 4. Repo / config / docs

| Finding | Resolution |
|---|---|
| No CI of any kind | ✅ `.github/workflows/ci.yml`: backend (pgvector Postgres, checks, migrations check, pytest+cov), frontend & site (tsc, lint, vitest, build) |
| README claimed "Tests 100% Passing" with no CI; broken `file:///Users/hassan/...` link; "Statestless" typo; wrong directory tree; pgvector requirement undocumented | ✅ Real CI badge, fixed link/typo/tree, pgvector setup step |
| `skills/README.md` documents 18 modules; 11 exist | ✅ Honestly noted in the README tree (7 are roadmap items without code) |
| Root scripts assumed an activated gitignored venv; no `test:site` | ✅ Fixed; upstream Nixpacks/Vercel build scripts merged in |
| Duplicate, divergent `railway.json` at root vs backend (silent misconfiguration trap) | ✅ Single source of truth: `backend/railway.json` + Procfile; root copy removed; Railway section added to DEPLOYMENT.md |
| `.env.dev` secrets recoverable from git history | 📋 Rotation steps in DEPLOYMENT.md §5 |

---

## 5. Deferred items (deliberate, with rationale)

1. **Django 5.0 → 5.2 LTS upgrade** — security-relevant but needs its own regression pass.
2. **Real Gmail/email backend** — the Email Integrations workspace is clearly labelled demo until
   a real integration service exists (OAuth flow, sync worker, webhook receiver are new features,
   not fixes).
3. **Playwright E2E layer** — foundation-first: component/API suites + CI landed now; browser E2E
   is the next increment (see TESTING_PLAN.md §2.4).
4. **Self-hosting landing imagery** — flagged in markup; requires assets the repo doesn't contain.
