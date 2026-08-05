---
name: portfolio-governance
description: >
  Use when building or extending multi-project governance for owners/
  developers running several simultaneous projects: consistent approval-rule
  enforcement across projects, or the cross-project compliance-deadline
  tracker. Triggers on: "portfolio", "multi-project", "cross-project",
  "compliance deadline tracker", "consistent RACI across projects".
  Prevents scoping approval rules or compliance tracking to a single project
  when the owner's actual need is a consistent, aggregated view across all
  of theirs.
allowed-tools: Read, Grep, Glob
---

# Portfolio Governance (Module 13 — Phase 4)

## Module identity

- Module #: 13
- Phase: Phase 4
- Django app: `portfolio`
- React feature folder: `frontend/src/features/portfolio-governance/`
- API namespace / URL prefix: `/api/v1/portfolio/`

## Why this exists / Ground truth

For owners/developers running multiple simultaneous projects: consistent approval-rule (RACI/threshold) enforcement across all their projects by default, so a rule doesn't need to be re-configured per project. A cross-project compliance-deadline tracker generalizes permit tracking to any compliance deadline — contract reports, warranty registration, insurance renewal. This module's underlying failure pattern — manual approval routing, no unified audit trail — is the same shape as the platform's core problem, just applied across a portfolio rather than within one project.

## Owns vs. does not own

**Owns:** portfolio-level RACI/threshold rule templates (applied as defaults to new projects), the cross-project compliance-deadline aggregation view.

**Does NOT own:** per-project decision instances (`approvals-workflow` owns those; this module supplies default configuration, doesn't intercept live decisions); per-project permit records (`unified-timeline` owns those; this module aggregates their deadlines across projects).

## Integration with other skills

- **`approvals-workflow`** (Module 4): portfolio-level rule templates configure default RACI/thresholds for `approvals` when a new project is created under an owner's portfolio; `portfolio` doesn't own or intercept individual decisions after that.
- **`unified-timeline`** (Module 2): compliance deadlines (permits, etc.) are aggregated by reading across multiple projects' timelines via that module's service layer.
- **`access-control-admin`** (Module 17): portfolio membership (which projects belong to which owner's portfolio) relies on that module's roster/RBAC data.

## Rules or Process

- Portfolio-level rule templates are **defaults**, not hard overrides — a specific project can still have project-level exceptions, tracked explicitly, not silently.
- The compliance-deadline tracker aggregates read-only; it doesn't own or duplicate the underlying permit/deadline records.

## Non-goals / Limitations

- Does not own individual project decisions — see `approvals-workflow`.
- Does not own permit records — see `unified-timeline`.

## See also

- `../approvals-workflow/SKILL.md`
- `../unified-timeline/SKILL.md`
- `../access-control-admin/SKILL.md`
