---
name: remote-stakeholder-support
description: >
  Use when building or extending asynchronous structured decision requests
  or timezone-aware auto-escalation for international/remote stakeholders
  (e.g. an overseas investor or owner). Triggers on: "remote stakeholder",
  "async decision", "timezone escalation", "international investor",
  "no live call needed". Prevents assuming every approver is available for
  a synchronous call — remote stakeholders need decisions packaged as
  self-contained async requests, not scheduled meetings.
allowed-tools: Read, Grep, Glob
---

# International & Remote Stakeholder Support (Module 11 — Phase 3)

## Module identity

- Module #: 11
- Phase: Phase 3
- Django app: `remote_participation`
- React feature folder: `frontend/src/features/remote-stakeholder-support/`
- API namespace / URL prefix: `/api/v1/remote-participation/`

## Why this exists / Ground truth

Asynchronous structured decision requests: photo/video plus a specific question plus a deadline, with built-in translation, requiring no live call. Timezone-aware auto-escalation: SLA/escalation timing (owned by `approvals-workflow`) should account for the recipient's timezone rather than assuming project-local time.

## Owns vs. does not own

**Owns:** the async decision-request packaging format (structured media + question + deadline), timezone-resolution logic for a given stakeholder.

**Does NOT own:** the underlying decision/RACI/SLA machinery — that's `approvals-workflow`'s job; this module supplies it with timezone data and a specific request format for remote participants, it doesn't reimplement decision routing.

## Integration with other skills

- **`approvals-workflow`** (Module 4): async decision requests are still `Decision` objects there — `remote_participation` supplies the packaging (structured media + question) and timezone metadata via `approvals.services.request_decision(...)`, it doesn't own a separate decision model.
- **`multilingual-voice`** (Module 8): built-in translation for async requests is provided by that module's translation service.

## Rules or Process

- An async decision request must be self-contained: the recipient shouldn't need to join a call to have enough context to decide.
- Escalation timing for a remote stakeholder must resolve against their actual timezone, not the project's local timezone.

## Non-goals / Limitations

- Does not own decision/RACI/SLA logic — see `approvals-workflow`.
- Does not own translation — see `multilingual-voice`.

## See also

- `../approvals-workflow/SKILL.md`
- `../multilingual-voice/SKILL.md`
