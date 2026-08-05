# Audit Log Schema

Source: `Info/research/whatsapp_email_approval_problems_solutions.md` (Module 5 problem set), `Info/research/platform_features_high_level.md`.

This is the schema for the **audit log as a first-class object**, referenced from `skills/platform-guidelines/references/platform-architecture.md`. It is owned by `trust_evidence` and consumed by `approvals` (Module 4), `access-control-admin`/`accounts` (Module 17), and the dispute-export feature.

## Why a spec, not just a model definition

Every instruction, approval, and complaint on the platform must be attributable to a named person, timestamp, and channel — this is what makes a dispute export legally usable (SCCA arbitration, ~47% of whose 2025 caseload is construction disputes) and what makes Module 4's escalation SLAs auditable after the fact. Because three separate modules write to and read from this log, its shape needs to be a stable contract, not an implementation detail buried in one app.

## Core entity: `AuditEvent`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | FK → Project | Every event is project-anchored, not person-anchored — survives staff turnover |
| `actor` | FK → User (nullable) | Nullable only for system-generated events (e.g. auto-escalation firing); never nullable for human actions |
| `actor_role` | enum | Owner / Investor / Consultant / Contractor / Subcontractor / Foreman / Laborer / PMC / San3 staff — snapshot at event time, not a live FK to a role that might change later |
| `event_type` | enum | e.g. `decision_requested`, `decision_hearing_confirmed`, `decision_understood`, `decision_agreed`, `escalated`, `evidence_submitted`, `evidence_verified`, `payment_released`, `complaint_raised` — extend per-module, but always through this shared enum, not a free-text field |
| `channel` | enum | `whatsapp` / `email` / `voice_call` / `platform_ui` / `system` — where the action actually happened |
| `subject_ref` | generic reference (content_type + object_id, or equivalent) | Points at the tracked object this event is about (an RFI, a Decision, a Milestone, ...) — generic on purpose so `trust_evidence` never imports another app's models |
| `timestamp` | datetime | Server time of record, not client-reported time |
| `payload` | JSON | Event-specific structured detail (e.g. the SLA deadline that was set, the evidence file reference) |
| `source_message_ref` | nullable string/URL | For events derived from captured WhatsApp/email content (Module 1/2), a pointer back to the source message — this is what powers the "one-tap verify with [person]" traceability rule in `trust-calibrated-ux` |

## Write path

Other apps call `trust_evidence.services.record_event(project, actor, event_type, channel, subject_ref, payload=None, source_message_ref=None)`. They never write to `AuditEvent` directly. This keeps the log's invariants (project-anchored, actor-role snapshotted, append-only) enforced in one place.

## Invariants

- **Append-only.** No update/delete path on `AuditEvent` in normal operation — corrections are new events (e.g. `decision_reversed`), not edits to history. This is what makes exports "tamper-evident."
- **Every write must resolve a `project_id`.** There is no global, non-project-scoped audit event.
- **`source_message_ref` is preserved verbatim** when present — never rewritten or summarized in the log itself (summarization happens at read time, in `owner-dashboard`, not at write time).

## Read paths

- **Dispute export** (`trust-evidence`): chronological, filtered-by-project export of all events, formatted for arbitration use.
- **SLA compliance monitoring** (`observability`, Module 15): aggregated read — did an `escalated` event fire within the SLA window after a `decision_requested` event.
- **Access audit logs** (`access-control-admin`, Module 17): filtered by `actor` for security/incident review — a different read pattern over the same underlying event stream, not a separate log.
