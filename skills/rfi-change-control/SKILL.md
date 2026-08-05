---
name: rfi-change-control
description: >
  Use when building or extending RFIs, submittals, change orders, permits,
  supplier/material delivery tracking, quality checkpoints, or the master
  schedule/critical-path view. Triggers on: "RFI", "submittal", "change
  order", "variation order", "document lifecycle", "version control",
  "schedule impact", "quality checkpoint", "critical path". Prevents
  building a one-off model per document type instead of reusing the shared
  tracked-object base and document lifecycle state machine defined in
  platform-guidelines.
allowed-tools: Read, Grep, Glob
---

# RFI, Change Order & Version Control (Module 6 - Phase 2)

## Module identity

- Module #: 6
- Phase: Phase 2
- Django app: `rfi_change_control`
- React feature folder: `frontend/src/features/rfi-change-control/`
- API namespace / URL prefix: `/api/v1/rfi-change-control/`

## Why this exists / Ground truth

Treats RFIs, submittals, change orders, and permits as tracked objects (shared base per `platform-guidelines/references/platform-architecture.md`) with a "schedule-impact-if-unanswered-by-X" flag and a live at-risk cascade view. Structured change-order forms (baseline scope + delta + cost/schedule impact + evidence - not free text). Revision push notifications with "current as of" tagging. Location-tagged cross-trade coordination threads. Universal document lifecycle status applied uniformly (draft/under_review/approved/superseded/archived). Supplier/material delivery tracking as a tracked object. Quality-checkpoint tracking tied to milestones (e.g. rebar inspection before pour), distinct from safety incidents. AI/computer-vision progress estimation from site photos is flagged in the research as "solved in research, unbuilt in product" - the most-cited gap in the evidence base; treat as a real but unstarted sub-feature, not something to fabricate. Weather-data auto-tagging links delays to recorded conditions for force-majeure evidence. Master schedule/critical-path view ties RFIs + change orders + handover milestones together.

## Owns vs. does not own

**Owns:** `RFI`, `Submittal`, `ChangeOrder`, `Permit`, `SupplierDelivery`, `QualityCheckpoint` models (all inheriting the shared `TrackedItem` base and document lifecycle enum), the schedule-impact/at-risk cascade logic, the master schedule/critical-path view.

**Does NOT own:** the decision/approval routing for any of these objects (`approvals-workflow` handles that, attached generically); payment impact of a change order (`contract-payments` reads change-order data, doesn't duplicate it); evidence verification (`trust-evidence`); handover-specific punch-list items (`handover-closeout`, a related but separate tracked-object set).

## Integration with other skills

- **`approvals-workflow`** (Module 4): every RFI/submittal/change order/permit that needs sign-off calls `approvals.services.request_decision(...)`; `rfi_change_control` doesn't implement its own approval routing.
- **`contract-payments`** (Module 12): reads change-order cost/schedule impact via `rfi_change_control.services` to feed the contract-vs-actual tracker.
- **`trust-evidence`** (Module 5): quality-checkpoint and change-order evidence is recorded via `trust_evidence.services.record_event(...)`.
- **`handover-closeout`** (Module 7): the master schedule view here includes handover milestones sourced from that module, via its service layer.

## Rules or Process

- Every one of the six object types above inherits the shared `TrackedItem` base and document lifecycle enum - don't redefine status fields per model.
- Change orders require structured fields (scope delta, cost impact, schedule impact, evidence reference) - reject free-text-only change-order submissions at the API layer.
- "Current as of" tagging is mandatory on any versioned document view - never show a drawing/spec without a visible revision timestamp.

## Non-goals / Limitations

- Does not implement AI/computer-vision progress estimation yet - flagged as a known future capability, not silently stubbed as "done."
- Does not route or record approvals itself - see `approvals-workflow`.
- Does not track post-handover defects - see `handover-closeout`.

## See also

- `../approvals-workflow/SKILL.md`
- `../contract-payments/SKILL.md`
- `../trust-evidence/SKILL.md`
- `../handover-closeout/SKILL.md`
- `../platform-guidelines/references/platform-architecture.md`
