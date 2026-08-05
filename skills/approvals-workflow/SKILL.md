---
name: approvals-workflow
description: >
  Use when building, reviewing, or extending any approval/decision feature
  (RFIs, change orders, submittals, permits, payment milestones, or any
  tracked object requiring sign-off) in Truepoint. States the "3 Edges"
  decision model (Hearing → Understanding → Agreeing), RACI assignment, and
  SLA escalation timers. Triggers on: "approval", "decision", "sign-off",
  "RACI", "SLA", "escalation", "teach-back", "who approves this",
  "comprehension check". Prevents shipping a bespoke approve/reject button
  that skips the Understanding gate or bypasses RACI - which would silently
  reintroduce the informal, unauditable decision-making this platform exists
  to replace.
allowed-tools: Read, Grep, Glob
---

# Approval & Decision Workflow - The 3 Edges (Module 4 - Core / MVP, domain kernel)

## Module identity

- Module #: 4
- Phase: Core (MVP) - domain kernel, alongside Module 5 (`trust-evidence`)
- Django app: `approvals`
- React feature folder: `frontend/src/features/approvals-workflow/`
- API namespace / URL prefix: `/api/v1/approvals/`

## Why this exists / Ground truth

The core UX pattern of the whole product. Every approval-eligible item goes through three distinct edges, borrowed in part from healthcare informed-consent practice:

1. **Hearing** - the item enters a dedicated pending-decision queue; there's a clear signal it needs attention, distinct from just another WhatsApp message scrolling past.
2. **Understanding** - a teach-back comprehension check: the approver restates what they understood before sign-off is accepted, not just a checkbox.
3. **Agreeing** - a single named, accountable approver signs off (RACI: Responsible/Accountable/Consulted/Informed - only the Accountable party's signature closes the loop; Consulted/Informed parties are notified but don't block).

Each edge has an SLA countdown; missing it auto-escalates to a fallback approver. Mobile UX is stakes-calibrated: one-tap confirmation for low-risk items, a harder gesture plus the full comprehension check for high-stakes items like change orders or payment milestones.

## Owns vs. does not own

**Owns:** `Decision`, `DecisionParticipant` (RACI role per participant), `RaciAssignment`, `EscalationRule`, SLA timer state, the generic decision-attachment mechanism other tracked objects use to request a decision.

**Does NOT own:**
- The underlying RFI/change-order/permit/payment-milestone record being decided on - those belong to `rfi-change-control`, `contract-payments`, etc. `approvals` attaches to them via a generic reference (content_type + object_id), never a direct model import.
- The immutable record proving a decision happened and is trustworthy for a dispute - that's `trust-evidence`'s job (see cross-module note below).

## Integration with other skills

- **`trust-evidence`** (Module 5): every state transition (Hearing confirmed, Understanding recorded, Agreement given, Escalation fired) calls `trust_evidence.services.record_event(...)`. `approvals` never writes to `trust_evidence`'s tables directly.
- **`rfi-change-control` / `contract-payments` / other tracked-object modules**: those apps call `approvals.services.request_decision(subject_ref, raci_config, sla_hours)` to attach a decision workflow to one of their objects. `approvals` never imports their models.
- **Cross-module dependency note ("no teeth without Module 5"):** `approvals` enforces *process* - who decides, in what order, by when. It does not itself guarantee the resulting decision record is trustworthy enough for a dispute; that guarantee comes from `trust-evidence` recording it properly. If `trust-evidence` integration is ever missing or broken, `approvals` still functions as task routing but loses its audit/dispute value. This is documented on both modules' skills rather than resolved by either importing the other's internals.
- **`trust-calibrated-ux`** (Module 10): governs notification cadence for decision requests (e.g. pause during prayer windows) and the human-attribution rule for any AI-generated summary of a pending decision.

## Rules or Process

- All three edges (Hearing, Understanding, Agreeing) are required for high-stakes decisions (change orders, payment milestones); low-risk items may collapse Hearing+Agreeing into a single one-tap confirmation, but Understanding is never silently skipped for anything gated on `trust-evidence`'s payment-verification path.
- "Understanding" must capture a paraphrase or explicit confirmation of the specific decision content - not a generic "I agree" checkbox indistinguishable from Agreeing.
- Exactly one participant per decision holds the RACI "Accountable" role; Consulted/Informed participants can comment but cannot close the decision.
- SLA clock starts when the item enters "Hearing" and stops when "Agreeing" completes; escalation to the configured fallback approver fires automatically on SLA breach and is itself an audit event.
- Gulf-compliant e-signature integration is required for the "Agreeing" edge on legally significant decisions (contract amendments, payment sign-off) - don't substitute a plain button click where a signature is contractually expected.

## Non-goals / Limitations

- Does not store contract terms or payment schedules - see `contract-payments`.
- Does not judge the sufficiency of evidence backing a decision - see `trust-evidence`.
- Does not replace human judgment; it routes and records it.

## See also

- `../trust-evidence/SKILL.md`
- `../rfi-change-control/SKILL.md`
- `../contract-payments/SKILL.md`
- `../trust-calibrated-ux/SKILL.md`
- `../platform-guidelines/references/platform-architecture.md`
