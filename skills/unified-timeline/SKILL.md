---
name: unified-timeline
description: >
  Use when building or extending the merged project timeline that combines
  WhatsApp field events, email/RFI correspondence, and permit/inspection
  correspondence into one chronological, project-anchored record. Triggers
  on: "unified timeline", "channel aggregation", "project history",
  "historical backfill", "cold-start import", "Balady integration". Prevents
  building a separate mailbox/inbox UI instead of treating every channel's
  events as first-class tracked objects in one merged timeline, and prevents
  skipping historical backfill for projects that join mid-construction.
allowed-tools: Read, Grep, Glob
---

# Unified Project Timeline (Module 2 - Core / MVP)

## Module identity

- Module #: 2
- Phase: Core (MVP) - includes historical backfill
- Django app: `timeline`
- React feature folder: `frontend/src/features/unified-timeline/`
- API namespace / URL prefix: `/api/v1/timeline/`

## Why this exists / Ground truth

Merges WhatsApp events (`field-capture`) and email threads (RFI/submittal/permit correspondence) into one project timeline as first-class tracked objects - not a separate mailbox bolted next to the "real" product (this directly addresses Gap G3: no competitor aggregates channels for one project). Includes permit/inspection correspondence tracking with government authorities (e.g. Balady), and treats history as **project-anchored, not person-anchored**, so it survives staff turnover.

**Historical backfill / cold-start import** is explicitly Core, not a later phase - most real customers onboard mid-project, so a timeline that only starts recording from signup day is not useful to them.

## Owns vs. does not own

**Owns:** the merged `TimelineEvent` stream, email-thread ingestion (RFI/submittal/permit correspondence parsing), Balady correspondence tracking, historical backfill/import tooling.

**Does NOT own:** the raw WhatsApp capture mechanism (`field-capture`); role-differentiated presentation of the timeline (`owner-dashboard` renders views on top of this data); the audit/evidence guarantee for any given event (`trust-evidence`).

## Integration with other skills

- **`field-capture`** (Module 1): receives ingested WhatsApp events via `timeline.services.ingest_event(...)` - a call *into* `unified_timeline`, not the reverse.
- **`owner-dashboard`** (Module 3): reads timeline data via `timeline.services`/API to build role-specific views; never queries `timeline`'s tables directly.
- **`trust-evidence`** (Module 5): timeline entries that represent audit-worthy events (approvals, evidence submissions) are cross-referenced by ID, not duplicated - `unified-timeline` shows them, `trust-evidence` is the source of truth for their audit status.
- **`search`** (Module 16): indexes timeline content for full-text/semantic search - a read-only consumer via API.

## Rules or Process

- Every merged event keeps its original channel and source reference (WhatsApp message ID, email Message-ID header, Balady correspondence ID) - never collapse provenance away during merge.
- Use standard email-threading logic (References/In-Reply-To headers, JWZ-style algorithm) rather than naive subject-line matching, to avoid splitting one RFI thread into multiple timeline entries.
- Historical backfill must preserve original timestamps (not import-time timestamps) so the timeline reflects when things actually happened on the project.

## Non-goals / Limitations

- Does not decide which channel-capture strategy to use for WhatsApp - see `field-capture`.
- Does not render role-specific dashboards - see `owner-dashboard`.
- Does not itself verify evidence - see `trust-evidence`.

## See also

- `../field-capture/SKILL.md`
- `../owner-dashboard/SKILL.md`
- `../trust-evidence/SKILL.md`
- `../search/SKILL.md`
