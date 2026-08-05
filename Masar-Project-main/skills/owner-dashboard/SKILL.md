---
name: owner-dashboard
description: >
  Use when building or extending role-differentiated views (Owner, Investor,
  Consultant, Contractor) over the unified project timeline, the daily/
  weekly digest, the conversational Q&A interface, or PDF/Excel export.
  Triggers on: "owner dashboard", "role view", "investor view", "digest",
  "plain-language summary", "ask a question about the project", "export
  report". Prevents building one generic dashboard and bolting on
  role-based field hiding — the whole point is that this is the platform's
  primary differentiator (Gap G1: no competitor gives owners a real seat).
allowed-tools: Read, Grep, Glob
---

# Owner Dashboard & Role-Differentiated Views (Module 3 — Core / MVP)

## Module identity

- Module #: 3
- Phase: Core (MVP)
- Django app: `dashboard`
- React feature folder: `frontend/src/features/owner-dashboard/`
- API namespace / URL prefix: `/api/v1/dashboard/`

## Why this exists / Ground truth

Same underlying data (the unified timeline), four audience-specific views generated from one data model: Owner, Investor, Consultant, Contractor. This is the platform's headline differentiator — no competitor gives the owner a real seat (Gap G1) or differentiates roles at all (Gap G4). Includes: a single daily/weekly digest ("3 things need your decision"); a plain-language summary layer for drawings/specs; a **conversational Q&A interface** (owner asks free-form questions, gets an AI-grounded answer sourced from the timeline — explicitly named in the research as an unbuilt market gap, "the bidirectional half of owner communication"); on-demand PDF/Excel export.

## Owns vs. does not own

**Owns:** per-role view composition/filtering logic, the digest generation job, the plain-language summarization layer, the Q&A interface and its grounding-to-timeline logic, PDF/Excel export generation.

**Does NOT own:** the underlying timeline data (`unified-timeline`), approval routing (`approvals-workflow`), evidence verification (`trust-evidence`). This module is a **read/presentation layer** over other modules' data — it should have very few models of its own beyond view-configuration and digest/export artifacts.

## Integration with other skills

- **`unified-timeline`** (Module 2): primary data source, read via API/service layer only.
- **`approvals-workflow`** (Module 4): the digest's "3 things need your decision" pulls pending decisions via `approvals.services`, doesn't duplicate decision state.
- **`trust-evidence`** (Module 5): verified-status badges shown in dashboards come from `trust_evidence`'s verification status, not re-derived locally.
- **`access-control-admin`** (Module 17): role determination (which of the 4 views a given user sees) is enforced by RBAC there; `owner-dashboard` trusts the role passed down, doesn't reimplement access control.
- **`trust-calibrated-ux`** (Module 10): the AI-summary human-attribution rule ("Ahmed reports...") and source-traceability ("verify with [person]") apply directly to this module's summaries and Q&A answers.

## Rules or Process

- Every AI-generated summary or Q&A answer must show its source (which message/event/person/timestamp it's grounded in) and a one-tap way to verify with that person — per `trust-calibrated-ux`.
- Role views are generated from **one data model**, filtered/composed per role — never maintain four separate parallel data pipelines per role.
- The digest is capped to a small, prioritized set ("3 things") by design — resist the urge to make it a comprehensive activity feed; that's what the full timeline view is for.

## Non-goals / Limitations

- Does not own or route approvals — see `approvals-workflow`.
- Does not verify evidence — see `trust-evidence`.
- Does not enforce access control — see `access-control-admin`.

## See also

- `../unified-timeline/SKILL.md`
- `../approvals-workflow/SKILL.md`
- `../trust-evidence/SKILL.md`
- `../trust-calibrated-ux/SKILL.md`
- `../access-control-admin/SKILL.md`
