---
name: field-capture
description: >
  Use when building or extending ingestion of WhatsApp field messages
  (photos, voice notes, text) into Truepoint without requiring field teams
  to change behavior. Triggers on: "WhatsApp ingestion", "field capture",
  "voice transcription", "WAHA", "Baileys", "WhatsApp Groups API", "join
  existing WhatsApp group". Prevents silently assuming WhatsApp capture is a
  solved/simple integration - it carries real ToS/ban risk and an unresolved
  strategic fork that must be decided before building on top of it.
allowed-tools: Read, Grep, Glob
---

# Field Capture - WhatsApp Ingestion (Module 1 - Core / MVP)

## Module identity

- Module #: 1
- Phase: Core (MVP)
- Django app: `field_capture`
- React feature folder: `frontend/src/features/field-capture/`
- API namespace / URL prefix: `/api/v1/field-capture/`

## Why this exists / Ground truth

WhatsApp is the dominant real-time channel at every project tier in the Saudi/GCC market; the platform must ingest photos, voice notes, and text from field messages **without requiring field teams to change behavior** (this is Gap G2: portals go dark if field teams have to actively post into a separate app).

**Unresolved strategic fork - must be decided before deep implementation:**
- **Path A** - a structured chat app people migrate to (Kraaft-style, like Bouygues/VINCI use). Lower legal risk, but requires behavior change (contradicts the "no behavior change" goal above).
- **Path B** - an unofficial WhatsApp client joining existing groups. Matches the "no behavior change" goal, but carries real ToS/ban risk. Meta's official Groups API (launched Oct 2025) is **create-only** - it cannot join or read existing groups and is capped at 8 participants, so it does not support the "passively watch an existing group" use case at all.

Do not assume either path is settled; treat this as an open architecture decision to confirm with the team, not something to silently pick while implementing.

Gulf-dialect-aware voice transcription is required - Gulf dialect ASR is measurably weaker than MSA across vendors tested; transcripts must be shown as low-confidence/editable, never presented as authoritative text.

## Owns vs. does not own

**Owns:** WhatsApp session/connection state, raw message ingestion (text/photo/voice), voice transcription pipeline output (with confidence scoring), the capture-to-tracked-object mapping logic (deciding which timeline entry a captured message becomes).

**Does NOT own:** the unified project timeline itself (`unified-timeline` owns the merged view); notification-sending (routes through the shared scheduler per `trust-calibrated-ux`); Arabic NLP structuring beyond raw transcription (see `multilingual-voice` for the full Arabic-first pipeline).

## Integration with other skills

- **`unified-timeline`** (Module 2): pushes captured events into the timeline via `unified_timeline.services.ingest_event(...)`; does not write to timeline tables directly.
- **`observability`** (Module 15): WhatsApp session/ban status is a monitored integration-health signal - `field_capture` exposes a health-check endpoint `observability` polls, rather than `observability` reaching into `field_capture` internals.
- **`multilingual-voice`** (Module 8): raw transcription happens here; Gulf-dialect-aware NLP structuring and translation happen there - `field_capture` calls out to that pipeline rather than reimplementing it.

## Rules or Process

- Never present a voice transcription as ground truth in the UI - always show it as editable/low-confidence pending human confirmation.
- Log every capture with its raw source reference (message ID, timestamp, channel) so `trust-evidence`'s `source_message_ref` traceability requirement is satisfiable downstream.
- Session/ban-status changes must be surfaced to `observability` immediately, not just logged locally - a silently banned WhatsApp session breaks the platform's core promise.

## Non-goals / Limitations

- Does not decide the Path A/B strategic fork - flags it as an open decision, doesn't resolve it unilaterally.
- Does not merge WhatsApp data with email/permit data - see `unified-timeline`.
- Does not do full Arabic NLP structuring - see `multilingual-voice`.

## See also

- `../unified-timeline/SKILL.md`
- `../multilingual-voice/SKILL.md`
- `../observability/SKILL.md`
- `../platform-guidelines/references/product-overview.md`
