---
name: trust-calibrated-ux
description: >
  Use whenever writing or reviewing any notification-scheduling code, AI
  summary/digest generation, or ambiguity-handling logic anywhere in
  Truepoint. Triggers on: "notification timing", "prayer times", "Ramadan
  hours", "AI summary", "who wrote this summary", "soft commitment",
  "inshallah", "ambiguity flagging". This is a constraint-only skill (no
  owned app) that other modules' code must follow - prevents culturally
  tone-deaf notification cadence and AI summaries presented as the
  platform's own voice instead of attributed to a named human, which
  undermines the wasta-based trust model this platform operates inside of.
allowed-tools: Read, Grep, Glob
---

# Cultural & Trust-Calibrated UX (Module 10 - Phase 3, constraint-only)

## Module identity

- Module #: 10
- Phase: Phase 3
- Django app: **none** - this module has no owned data domain; it's a set of conventions that constrain other apps' code, closer to a lint rule than a feature
- React feature folder: **none** - same reason
- Constrains: `field-capture` (notification scheduling), `unified-timeline` / `owner-dashboard` (AI-summary attribution and traceability), `approvals-workflow` (escalation timing), `multilingual-voice` (TTS/voice notification cadence)

## Why this exists / Ground truth

Culturally-aware notification cadence: pause during prayer windows, adjust for Ramadan hours. AI-summary sourcing/traceability: every brief shows its source message/person/timestamp plus a one-tap "verify with [person]." Soft-commitment/ambiguity flagging: phrases like "inshallah, we'll try" should be flagged as low-confidence, not silently treated as a firm commitment. AI summaries are attributed to named humans ("Ahmed reports...") rather than presented as the platform's own voice - this is directly grounded in **wasta** (see `platform-guidelines/references/domain-glossary.md`): personal-connection-based trust is the primary operating layer in this market, so an unattributed AI claim reads as untrustworthy in a way an attributed human statement doesn't.

## Owns vs. does not own

**Owns:** nothing structurally - this skill defines rules, not models or endpoints.

**Does NOT own:** any data. Any app implementing a notification scheduler, an AI summary generator, or ambiguity detection logic must implement these rules itself, per the app-boundary convention - this skill is guidance to follow, not a service to call (though a genuinely shared notification-scheduling utility living in `core` per `platform-architecture.md` is a reasonable place to centralize the prayer-time/Ramadan logic specifically, to avoid every app reimplementing a Hijri-calendar lookup).

## Integration with other skills

- **`field-capture`** (Module 1) and **`multilingual-voice`** (Module 8): any notification/TTS scheduling must respect prayer-time and Ramadan-hour cadence.
- **`owner-dashboard`** (Module 3) and **`unified-timeline`** (Module 2): any AI-generated summary must attribute to a named human source and show one-tap traceability.
- **`approvals-workflow`** (Module 4): SLA escalation timing should account for the same cultural cadence rules, not fire notifications during a prayer window.

## Rules or Process

- Notification-sending code should route through a shared, cadence-aware scheduler (in `core`) rather than each app implementing its own prayer-time/Ramadan lookup.
- Any AI-generated text presented to a user must be phrased as reporting a named person's statement ("Ahmed reports the drainage detail was approved") rather than as a first-person platform claim ("Drainage detail approved").
- Any summary or digest item must be one tap away from its source message/event - no summary without a traceability link.
- Detect and visibly flag soft-commitment language rather than normalizing it into a hard status.

## Non-goals / Limitations

- Does not itself send notifications or generate summaries - it constrains the modules that do.
- Does not define the Hijri-calendar/prayer-time data source - that's an implementation detail for whichever app centralizes the shared scheduler.

## See also

- `../field-capture/SKILL.md`
- `../owner-dashboard/SKILL.md`
- `../unified-timeline/SKILL.md`
- `../approvals-workflow/SKILL.md`
- `../platform-guidelines/references/domain-glossary.md`
