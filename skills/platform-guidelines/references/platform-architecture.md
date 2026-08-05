# Platform Architecture — Shared Conventions

Source: architecture decisions made for this project (modular monolith, Django + DRF + React/TS/Tailwind + PostgreSQL), plus recurring data-shape patterns identified across the 17 feature modules in `Info/research/platform_features_high_level.md`.

## The modular-monolith rule

One Django project. One PostgreSQL database. Each feature module (see `skills/README.md` for the full list) is its own Django app and its own React feature folder under `frontend/src/features/`.

**Boundaries are enforced by convention and code review, not by network separation.** Concretely:

- An app **never imports another app's models directly** and never runs raw queries against another app's tables.
- Cross-app reads/writes go through the other app's `services.py` (a plain-Python service layer) or its internal DRF viewset — the same interface an external API consumer would use. If app A needs data that lives in app B, A calls a function in `B/services.py`; it does not `from B.models import X`.
- Each module's `SKILL.md` documents this explicitly under `## Owns vs. does not own` and `## Integration with other skills`.

Why this matters: it's what makes "each person owns their feature" actually true day-to-day (nobody's migration breaks someone else's app), and it keeps the door open to splitting any one app into a real separate service later, without a rewrite, if that's ever needed.

**DRF (Django REST Framework) is the assumed API layer** for both the internal service-boundary interfaces and the public API (Module 14) — this is a stated recommendation given Django is confirmed and DRF is the standard choice for REST APIs in the Django ecosystem, not a decision the user separately confirmed. Flag it for confirmation before it becomes load-bearing (e.g. before writing DRF-specific code generators or tooling).

## Shared data-model patterns

Two patterns recur across many modules. Define each **once**, as a shared base in a small `common`/`core` app, and have module apps inherit/reference it rather than re-implementing it.

### 1. The "tracked object" shape

RFIs, submittals, change orders, permits, supplier deliveries, and quality checkpoints (Module 6), plus approval-eligible items generally (Module 4), all share the same underlying shape:

- `status` (see document lifecycle enum below, where applicable)
- `owner` / `assigned_approver`
- SLA deadline + escalation state
- links to evidence records (Module 5)
- links to the audit log (see below)

Model this as an abstract base model (e.g. `TrackedItem`) in the shared `core` app. Module-specific models (`RFI`, `ChangeOrder`, `Permit`, ...) inherit from it rather than each redefining status/SLA/evidence-link fields independently.

### 2. The document lifecycle state machine

A single enum applies uniformly across drawings, contracts, RFIs, submittals, permits, and change orders:

```
draft → under_review → approved → superseded → archived
```

Define this once as a shared enum/mixin in `core`, not per-app. Any module dealing in versioned documents (`rfi-change-control`, `contract-payments`, `handover-closeout`) reuses it.

### 3. The audit log as a first-class object

Every instruction, approval, and complaint needs to be queryable with actor + timestamp + channel — this is what makes Module 5's dispute exports and Module 17's access audit logs possible. It is **owned by `trust-evidence`** (Module 5); see `skills/trust-evidence/references/audit-log-schema.md` for the full schema. Other apps write to it via `trust_evidence.services.record_event(...)`, never by writing to its tables directly.

## Notification/scheduling conventions

Multi-channel notification delivery (WhatsApp, email, push, voice/TTS) needs to be aware of prayer-time and Ramadan-hour cadence (see `skills/trust-calibrated-ux/SKILL.md`) and needs **per-recipient**, not per-group, delivery/read tracking for safety-critical messages (see `skills/safety-signals/SKILL.md`). Any app sending notifications should route through a shared notification-scheduling service rather than calling a messaging provider directly, so this cultural-cadence logic lives in one place.

## Compliance requirements that touch architecture, not just one module

- **Saudi data residency + PDPL** (data protection law) — an enforced architecture property (hosting region, data export controls), not just a policy statement. Applies platform-wide; owned operationally by `skills/access-control-admin/SKILL.md` (Module 17) but relevant to any app storing personal data.
- **ZATCA e-invoicing (Fatoora Phase 2)** — legally mandated for any invoice generated from a verified payment milestone. See `skills/contract-payments/references/zatca-fatoora-compliance.md`.
