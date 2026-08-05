---
name: multilingual-voice
description: >
  Use when building or extending Arabic-first / voice-first interfaces:
  voice input/output, TTS digests, VoIP call capture, auto-translation,
  icon/photo-based reporting for low-literacy workers, Arabic NLP, or
  offline-first capture for connectivity dead zones. Triggers on:
  "voice-first", "Arabic NLP", "CAMeL Tools", "TTS", "voice note", "offline
  sync", "low-literacy", "dead zone", "per-worker delivery receipt".
  Prevents treating Arabic support as a localization add-on (i18n string
  files) instead of the core interface this market needs, and prevents
  reusing English-tuned NLP pipelines on Arabic content.
allowed-tools: Read, Grep, Glob
---

# Multilingual & Voice-First Design (Module 8 — Phase 3)

## Module identity

- Module #: 8
- Phase: Phase 3 (though flagged in source research as arguably Core-worthy given the evidence — confirm phasing with the team before deprioritizing)
- Django app: `localization`
- React feature folder: `frontend/src/features/multilingual-voice/`
- API namespace / URL prefix: `/api/v1/localization/`

## Why this exists / Ground truth

Explicitly "not a localization add-on — the core interface for this market": ~40% of WhatsApp traffic in Saudi/Kuwait is voice notes. Covers: voice-first input/output across all user tiers, not just laborers; TTS for the daily digest (Arabic, scoped deliberately to TTS-only, not full conversational voice AI); phone-call capture via a San3-provided VoIP project line (recorded/transcribed — only for calls routed through San3's number, not personal cellphones, due to iOS OS-level restrictions and Saudi consent-law exposure; falls back to manual call logging otherwise); auto-translation at point of capture; icon/photo-based reporting for low-literacy workers; per-worker (not per-group) delivery/read confirmation for safety-critical messages; a direct worker-level reporting channel that bypasses the bilingual-foreman bottleneck; an Arabic NLP pipeline (CAMeL Tools, not an English-tuned pipeline); offline-first capture with sync-on-reconnect for dead zones (basements, shafts, mechanical rooms where MEP work concentrates).

## Owns vs. does not own

**Owns:** the Arabic NLP pipeline, translation services, TTS generation, VoIP call capture/transcription, icon/photo-based reporting UI components, per-worker delivery-receipt tracking, offline-first sync logic.

**Does NOT own:** raw WhatsApp message ingestion (`field-capture` captures, this module structures/translates); the digest content itself (`owner-dashboard` composes it, this module renders it as TTS).

## Integration with other skills

- **`field-capture`** (Module 1): raw voice transcription happens there; Gulf-dialect-aware NLP structuring and translation happen here — this module is called by `field-capture`, not the reverse.
- **`owner-dashboard`** (Module 3): supplies the TTS rendering for the daily/weekly digest; doesn't own digest content selection.
- **`safety-signals`** (Module 9): per-worker delivery/read receipts here are what makes safety-critical message tracking there possible.
- **`trust-calibrated-ux`** (Module 10): notification cadence (prayer-time pausing) applies to any voice/TTS notification sent from here.

## Rules or Process

- Never route personal-cellphone call capture — only calls through the San3-provided VoIP project line may be recorded/transcribed; otherwise fall back to manual call logging.
- Use Arabic-tuned NLP tooling (e.g. CAMeL Tools), not English-tuned pipelines run on Arabic text.
- Gulf-dialect ASR is weaker than MSA across vendors — benchmark before committing to one, and always show transcripts as editable/low-confidence.
- Delivery/read tracking for safety-critical messages must be per-worker, not per-group.

## Non-goals / Limitations

- TTS scope is deliberately limited to reading out digests — not a general conversational voice AI.
- Does not decide the WhatsApp capture strategy (Path A/B) — see `field-capture`.

## See also

- `../field-capture/SKILL.md`
- `../owner-dashboard/SKILL.md`
- `../safety-signals/SKILL.md`
- `../trust-calibrated-ux/SKILL.md`
- `../platform-guidelines/references/domain-glossary.md`
