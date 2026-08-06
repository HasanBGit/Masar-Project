---
name: email-integrations
description: >
  Use when building or extending Gmail sync, the read-and-act "Inbox
  Decisions" SLA flow, or OAuth2 credential handling for a project's
  connected email account. Triggers on: "Gmail sync", "email integration",
  "inbox decision", "connect Gmail", "OAuth callback", "email category".
  Prevents building a parallel approve/acknowledge mechanism instead of
  reusing approvals-workflow's 3-Edges infrastructure, and prevents storing
  Gmail refresh tokens without acknowledging the plaintext-storage gap this
  module explicitly flags as pre-production debt.
allowed-tools: Read, Grep, Glob
---

# Inbox Decisions - Gmail Sync (Module 19 - proposed, not in the original 17-module scope)

## Module identity

- Module #: 19 (new - not part of the original 17-module product scope in
  `Info/research/platform_features_high_level.md`; added by direct user
  request during a role-model/journey redesign pass, flagged here so the
  product-scope decision stays visible)
- Phase: unscoped (built as a standalone first pass)
- Django app: `email_integrations`
- React feature folder: `frontend/src/features/email-integrations/`
- API namespace / URL prefix: `/api/v1/email-integrations/`

## Why this exists / Ground truth

A project connects one Gmail account (read-only OAuth2 scope). Synced mail
is classified into categories (RFI, submittal, payment, safety, general);
anything but general needs a response, so it opens an **Inbox Decision** -
a normal `approvals.Decision` in the Hearing edge, not a bespoke mechanism.
"I have read this and will act" is `confirm_hearing`; if nobody does that
before the SLA deadline, the item escalates - specifically to the **Project
Manager**, not the project's general `EscalationRule.fallback_role`, since
they're the one who needs to know a neglected email is blocking something on
site. Consultant is the default accountable approver, matching the platform's
role hierarchy (Consultant reviews PM/Designer work).

## Owns vs. does not own

**Owns:** `EmailAccount` (one connected Gmail account per project - OAuth
tokens, last-synced timestamp), `EmailMessage` (a synced message + its
category + read/acknowledge state), the OAuth2 authorization-code exchange
and refresh flow, the Gmail REST sync (`services.sync_inbox`), and the
keyword-based category classifier.

**Does NOT own:** the approval/escalation state machine itself - a synced
message that needs action becomes a generic `(subject_type="inbox_email",
subject_ref=<EmailMessage.id>)` decision via
`approvals.services.request_decision(...)`, same pattern as
`handover`'s punch-list sign-off. This module never touches
`approvals.Decision` rows directly, and `approvals` never imports this
module - the one exception is a single subject_type string literal
(`"inbox_email"`) `approvals.services.escalate_if_breached` checks to pick
the Project-Manager fallback instead of the project's general one; that's
a string comparison, not a cross-app model import, so it doesn't break the
app-boundary rule.

## Integration with other skills

- **`approvals-workflow`** (Module 4): every Inbox Decision is a `Decision`
  created via `approvals.services.request_decision(...)`; acknowledging a
  message calls `approvals.services.confirm_hearing(...)`. This module reads
  decision status in bulk via `approvals.services.get_decisions_for_subjects(...)`
  (avoids N+1 when listing a page of messages).
- **`trust-evidence`** (Module 5): connecting/disconnecting a Gmail account
  is recorded via `trust_evidence.services.record_event(...)`.
- **`access-control-admin`** (Module 17): role determination (who can
  connect/disconnect the account, who becomes the default Accountable
  approver) comes from `accounts.services`/`accounts.models.Role`, never
  reimplemented locally.

## Rules or Process

- Never present a Gmail message as ground truth without a source reference -
  every `EmailMessage` keeps its `gmail_message_id`/`gmail_thread_id` so a
  reviewer can always open the original thread.
- `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET` unset ->
  `GmailNotConfigured`, surfaced as HTTP 503 - the rest of the module (and
  the whole app) keeps working with no key configured, same fail-closed
  pattern as `contract_payments.LegalAgentNotConfigured`.
- `GOOGLE_OAUTH_CLIENT_ID` is shared with the Google Identity Services
  sign-in flow (`accounts.views.GoogleAuthView`) but is a **different OAuth
  flow** - GIS only verifies an ID token and needs no client secret; this
  module runs a full authorization-code exchange and needs
  `GOOGLE_OAUTH_CLIENT_SECRET` too. Don't conflate the two when debugging.
- Category classification is a plain keyword heuristic
  (`services._classify`), not an LLM call - cheap, deterministic, and
  wrong often enough that a human still has to open the message; don't
  present a category as authoritative in the UI.

## Non-goals / Limitations

- OAuth tokens are stored in plaintext `TextField` columns - acceptable for
  this MVP pass (matches other flagged dev-only gaps in this codebase, e.g.
  `drawings_studio`'s local `MEDIA_ROOT`) but needs field-level encryption
  (e.g. `django-fernet-fields`) before real refresh tokens land here in
  production.
- No Gmail push notifications (Pub/Sub watch) - sync is pull-only, triggered
  by the user or a scheduled job; there is no `sync/` cron wired up yet.
- Does not do full Arabic/Gulf-dialect NLP structuring on message bodies -
  see `multilingual-voice` if that's ever needed here.
- Does not merge inbox data into a single project timeline - see
  `unified-timeline` (not built).

## See also

- `../approvals-workflow/SKILL.md`
- `../trust-evidence/SKILL.md`
- `../contract-payments/SKILL.md` (the `LegalAgentNotConfigured` fail-closed pattern this module mirrors)
- `../platform-guidelines/references/platform-architecture.md`
