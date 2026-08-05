---
name: handover-closeout
description: >
  Use when building or extending punch-list/snagging workflows, O&M
  documentation, or the post-handover defect channel. Triggers on:
  "handover", "punch list", "snagging", "O&M documentation",
  "post-handover defect", "decennial liability", "10-year warranty".
  Prevents treating handover as a one-time event that closes the project
  record — the post-handover defect channel and decennial liability window
  must stay live for years after practical completion.
allowed-tools: Read, Grep, Glob
---

# Handover & Post-Handover (Module 7 — Phase 2)

## Module identity

- Module #: 7
- Phase: Phase 2
- Django app: `handover`
- React feature folder: `frontend/src/features/handover-closeout/`
- API namespace / URL prefix: `/api/v1/handover/`

## Why this exists / Ground truth

A dedicated punch-list/snagging workflow per unit/zone, tracked to closure with owner sign-off. O&M (operations & maintenance) documentation checklist, in plain Arabic, owner-verifiable. A persistent post-handover defect channel that **outlives project completion**, tracked against Saudi's 10-year decennial liability window — see `platform-guidelines/references/domain-glossary.md` for that term.

## Owns vs. does not own

**Owns:** `PunchListItem` (per unit/zone, inherits shared `TrackedItem` base), the O&M documentation checklist model, `PostHandoverDefect` and its liability-window tracking.

**Does NOT own:** the general RFI/change-order tracked-object set (`rfi-change-control`); approval routing for punch-list sign-off (`approvals-workflow`); warranty/retention financial tracking (`contract-payments` owns the retention-period-to-liability-window link, this module owns the defect-report workflow itself).

## Integration with other skills

- **`approvals-workflow`** (Module 4): punch-list item closure and owner sign-off route through `approvals.services.request_decision(...)`.
- **`rfi-change-control`** (Module 6): the master schedule/critical-path view there includes handover milestones sourced from here via this module's service layer.
- **`contract-payments`** (Module 12): retention/warranty period tracking there references this module's liability-window data rather than duplicating it.
- **`multilingual-voice`** (Module 8): O&M documentation must be presented in plain Arabic — this module supplies structured content, `multilingual-voice` supplies the language/voice layer.

## Rules or Process

- A punch-list item is scoped to a specific unit/zone, not just the top-level project — the tracked-object's location/scope field is required, not optional.
- The post-handover defect channel must remain queryable and open for the full decennial liability period — do not archive or soft-delete project records at handover.
- O&M documentation content should be owner-verifiable (i.e. checkable against what was actually installed), not just a static PDF dump.

## Non-goals / Limitations

- Does not track pre-handover RFIs/change orders — see `rfi-change-control`.
- Does not own retention/warranty financial terms — see `contract-payments`.

## See also

- `../approvals-workflow/SKILL.md`
- `../rfi-change-control/SKILL.md`
- `../contract-payments/SKILL.md`
- `../platform-guidelines/references/domain-glossary.md`
