---
name: engineering-principles
description: >
  Use for any code-writing, code-review, or refactor task in Truepoint's
  backend (Django/DRF/pytest) or frontend (React/TypeScript/Jest/Tailwind).
  States DRY/KISS/YAGNI/SOLID applied to this stack, testing expectations,
  and the modular-monolith app-boundary rule as a first-class engineering
  principle, not just an architecture note. Triggers on: "how should I
  structure this", "is this over-engineered", "should this be its own app",
  "code review", "should I import from another app", "where does this
  logic belong", "how do I test this".
allowed-tools: Read, Grep, Glob
---

# Engineering Principles

## Why this exists / Ground truth

Truepoint is built by multiple people, each owning a distinct feature module (see `skills/README.md`), on a shared Django + PostgreSQL backend and a shared React + TypeScript + Tailwind frontend. These principles exist to keep that low-coupling promise real in day-to-day code, not just in the folder structure. This complements — doesn't replace — any global engineering guidelines already in force (e.g. a root `CLAUDE.md`); where they overlap, prefer the more specific rule below for this stack.

## Rules or Process

### DRY / KISS / YAGNI
- **DRY**: shared data-model patterns (tracked-object base, document lifecycle enum, audit log) are defined once in `core`/`trust_evidence` per `skills/platform-guidelines/references/platform-architecture.md` — don't redefine them per app.
- **KISS**: a Django app for a feature module starts with `models.py`, `services.py`, `views.py`/`serializers.py`, `urls.py`, `tests/`. Don't add `managers.py`, `selectors.py`, `interfaces.py`, etc. until the app actually needs the separation.
- **YAGNI**: don't build for a later phase's module while implementing a Core one. If `approvals-workflow` (Core) needs to reference a not-yet-built `rfi-change-control` (Phase 2) object, use a generic reference (e.g. a `content_type` + `object_id` pair, or a plain string reference), not a speculative foreign key into an app that doesn't exist yet.

### The app-boundary rule (modular monolith)
This is a SOLID/dependency-inversion consequence, not a separate afterthought: **no Django app imports another app's models.** Cross-app calls go through the other app's `services.py` (plain Python functions) or its DRF viewset — the same surface an external API consumer would use. Same idea on the frontend: a React feature folder under `src/features/<name>/` doesn't reach into another feature folder's internals — shared UI primitives live in `src/components/` (or equivalent shared layer), and cross-feature data flows through each feature's own API client, not imported component state.

### SOLID, applied here
- **S**ingle responsibility: one Django app = one feature module = one bounded set of models. If a model doesn't clearly belong to one module's "owns" list (see that module's `SKILL.md`), that's a signal it belongs in `core` instead.
- **O**pen/closed: extend the shared `TrackedItem` base and document lifecycle enum rather than forking them per app.
- **L**iskov: anything inheriting `TrackedItem` must honor its status/SLA/evidence-link contract — don't override `status` to mean something different per subclass.
- **I**nterface segregation: a module's `services.py` should expose narrow, purpose-specific functions (`record_event(...)`, `request_decision(...)`) — not a single catch-all `do_thing(**kwargs)`.
- **D**ependency inversion: modules depend on each other's service-layer *interface*, never their ORM internals — this is the same rule as the app-boundary rule above, restated as the reason it exists.

### Testing conventions
- Backend: `pytest-django`, with model/service-layer factories (e.g. `factory_boy`). Every service-layer boundary function (the functions other apps call) needs a test — that's the contract other modules rely on.
- Frontend: Jest + React Testing Library. Test feature components through their public behavior (what the user sees/does), not internal state.
- State-machine transitions (document lifecycle, approval SLA escalation) need explicit tests for both the "happy path" and invalid-transition rejection.
- Write the failing test first when fixing a bug or adding a feature with a clear success criterion — see the "Goal-Driven Execution" pattern in the root engineering guidelines.

## Non-goals / Limitations

- This skill doesn't cover module-specific business rules — see each module's own `SKILL.md`.
- Doesn't prescribe a specific frontend state-management library or backend task-queue choice — those are implementation decisions to make explicitly with the team when a module actually needs them, not assumed here.
