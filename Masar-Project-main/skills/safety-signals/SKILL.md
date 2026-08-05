---
name: safety-signals
description: >
  Use when building or extending anonymous near-miss/hazard reporting,
  auto-generated delay/force-majeure explanations, or evidence-vs-report
  discrepancy flagging. Triggers on: "near-miss", "hazard report", "safety
  incident", "anonymous reporting", "discrepancy flag", "force majeure
  explanation". Prevents building safety reporting that exposes the
  reporting worker's identity to the contractor — anonymity toward the
  contractor is a hard requirement, not a nice-to-have.
allowed-tools: Read, Grep, Glob
---

# Safety & Risk Signals (Module 9 — Phase 3)

## Module identity

- Module #: 9
- Phase: Phase 3
- Django app: `safety`
- React feature folder: `frontend/src/features/safety-signals/`
- API namespace / URL prefix: `/api/v1/safety/`

## Why this exists / Ground truth

Anonymous, low-friction near-miss/hazard reporting, routed to the owner/safety lead — **never attributed to the reporting worker in any contractor-visible record**. Auto-generated plain-language delay/force-majeure explanations, sent proactively rather than waiting for the owner to ask. Evidence-vs-report discrepancy flagging (e.g. no progress photos for 5 days despite a verbal "on track" update) — this is a specific instance of the platform-wide "silence is data" pattern owned conceptually by `trust-evidence`.

## Owns vs. does not own

**Owns:** `HazardReport` (with contractor-facing anonymization enforced at the model/query layer, not just the UI), the discrepancy-flagging job, force-majeure explanation generation.

**Does NOT own:** the general silence/overdue-update detection mechanism (`trust-evidence` owns that pattern; this module is one specific consumer/instance of it); weather-data tagging used in force-majeure evidence (`rfi-change-control` owns that).

## Integration with other skills

- **`trust-evidence`** (Module 5): discrepancy flags and hazard reports are recorded as audit events via `trust_evidence.services.record_event(...)`, with the actor field set to a system/anonymized placeholder for hazard reports rather than the real worker identity.
- **`multilingual-voice`** (Module 8): per-worker delivery/read receipts from that module make it possible to confirm safety-critical messages actually reached the intended worker.
- **`owner-dashboard`** (Module 3): surfaces safety signals in the owner/safety-lead view, reading via this module's service layer.

## Rules or Process

- Contractor-visible views of hazard reports must never expose the reporting worker's identity — enforce this at the query/serializer layer, not just by hiding a field in the UI (a hidden-but-present field is still a leak).
- Force-majeure explanations should be auto-generated in plain language and pushed proactively, not held back until requested.
- A discrepancy flag (e.g. no photos despite "on track") should reference the specific missing evidence window, not just a generic "discrepancy detected" message.

## Non-goals / Limitations

- Does not own the general contractor-silence/overdue-update detection pattern — see `trust-evidence`.
- Does not own weather-data tagging — see `rfi-change-control`.

## See also

- `../trust-evidence/SKILL.md`
- `../multilingual-voice/SKILL.md`
- `../owner-dashboard/SKILL.md`
