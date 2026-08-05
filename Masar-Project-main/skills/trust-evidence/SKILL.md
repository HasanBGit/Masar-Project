---
name: trust-evidence
description: >
  Use when building or extending anything related to verified milestone
  evidence, the audit log, contractor-silence detection, or dispute export
  in Truepoint. Triggers on: "audit log", "evidence", "verified milestone",
  "dispute export", "contractor silence", "geotagged photo", "who approved
  this and when", "case-ready export". Prevents payment or approval features
  from being built on unverifiable, contractor-self-asserted data — this
  module is what makes the platform's trust claim actually true rather than
  a UI-only promise.
allowed-tools: Read, Grep, Glob
---

# Trust & Evidence Infrastructure (Module 5 — Core / MVP, domain kernel)

## Module identity

- Module #: 5
- Phase: Core (MVP) — domain kernel, alongside Module 4 (`approvals-workflow`)
- Django app: `trust_evidence`
- React feature folder: `frontend/src/features/trust-evidence/`
- API namespace / URL prefix: `/api/v1/trust-evidence/`

## Why this exists / Ground truth

Described in the source research as **"the platform's real product."** Every other module's trust claim (owner-facing verified status, dispute-ready records, payment gated on evidence) depends on this one being solid. Concretely, it owns:

- The **verified milestone ledger** — timestamped, geotagged photo/video evidence tied to a specific milestone, requiring an explicit owner/verifier acknowledgment before it "counts."
- The **audit log** (see `references/audit-log-schema.md`) — every instruction/approval/complaint tied to a named actor, timestamp, and channel.
- **Overdue-update / contractor-silence detection** — auto-flag and escalate after N days of silence on an expected update. "Silence is data": unanswered RFIs, quiet permit submissions, and contractor silence are all the same shape of problem — turn non-response into a tracked, escalating, timestamped event.
- **Case-ready dispute export** — tamper-evident, chronological export of the audit log, formatted for SCCA arbitration use.
- **Real-time cumulative change-order cost/schedule tracker** — rolls up change-order evidence against the baseline (data sourced from `rfi-change-control`, aggregated here).

## Owns vs. does not own

**Owns:** `AuditEvent` (see schema doc), `EvidenceRecord` (photo/video + geotag + timestamp + acknowledgment state), `SilenceFlag`, dispute-export generation logic, the change-order cost/schedule rollup view.

**Does NOT own:**
- The tracked object the evidence is *about* (an RFI, a milestone definition, a payment request) — those live in `rfi-change-control`, `contract-payments`, etc. `trust_evidence` references them generically (content_type + object_id), never via direct FK into another app's models.
- The approval/decision routing itself (who needs to approve, RACI, SLA timers) — that's `approvals-workflow`'s job. `trust_evidence` records that decisions happened; it doesn't decide who should make them.

## Integration with other skills

- **`approvals-workflow`** (Module 4): calls `trust_evidence.services.record_event(...)` on every decision state transition. `trust_evidence` never imports `approvals` models. See "no teeth without Module 5" note below.
- **`contract-payments`** (Module 12): payment release is gated on a verified `EvidenceRecord` acknowledgment via `trust_evidence.services.get_verification_status(milestone_ref)`. **Cross-module dependency note:** Module 12 (contract/payment verification) "has no teeth without Module 5" — without a verified evidence record, payment gating degrades to contractor self-assertion, which is exactly the failure mode the platform exists to fix. This is documented on `contract-payments`' side too; neither module resolves the dependency by importing the other's internals — `contract-payments` calls `trust_evidence`'s service layer, same as everyone else.
- **`observability`** (Module 15): reads aggregated audit-event data for SLA-compliance monitoring (are escalations actually firing) — a read-only, service-layer consumer.
- **`access-control-admin`** (Module 17): filters the same audit-event stream by actor for security/incident review.
- **`unified-timeline`** (Module 2): evidence records and audit events surface as entries in the project timeline — `unified-timeline` reads via `trust_evidence`'s service layer/API, doesn't duplicate the data.

## Rules or Process

- Every write to the audit log goes through `trust_evidence.services.record_event(...)` — see `references/audit-log-schema.md` for the full contract and invariants (append-only, always project-scoped).
- An `EvidenceRecord` only "counts" once a verifier (owner or delegated verifier) has explicitly acknowledged it — a photo upload alone is not evidence, it's a pending claim.
- Silence detection thresholds (N days) are configurable per project/module, not hardcoded — different tracked-object types (RFI vs. contractor progress update) reasonably have different expected cadences.
- Dispute exports must be chronological and must include `source_message_ref` where present (traceability back to the original WhatsApp/email capture) — never summarize away the source pointer in an export.

## Non-goals / Limitations

- Does not define *what* counts as sufficient evidence for a given milestone type (e.g. how many photos, what angle) — that's a per-module or per-project configuration concern, not something this module hardcodes.
- Does not route decisions or own RACI/SLA logic — see `approvals-workflow`.
- Does not generate invoices — see `contract-payments`.

## See also

- `../approvals-workflow/SKILL.md`
- `../contract-payments/SKILL.md`
- `../observability/SKILL.md`
- `../platform-guidelines/references/platform-architecture.md`
- `references/audit-log-schema.md`
