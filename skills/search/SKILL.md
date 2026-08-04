---
name: search
description: >
  Use when building or extending full-text or semantic search across the
  unified project timeline (WhatsApp, email, RFIs, contracts, photos).
  Triggers on: "search", "find the message where", "semantic search",
  "full-text index". Prevents building search as a duplicate data store
  disconnected from role/project scoping — every search result must respect
  the same access boundaries as the underlying data.
allowed-tools: Read, Grep, Glob
---

# Search (Module 16 — Phase 2)

## Module identity

- Module #: 16
- Phase: Phase 2
- Django app: `search`
- React feature folder: `frontend/src/features/search/`
- API namespace / URL prefix: `/api/v1/search/`

## Why this exists / Ground truth

Full-text/semantic search across the unified timeline — WhatsApp, email, RFIs, contracts, photos — answering queries like "find the message where the consultant approved the drainage detail." Scoped by role and project, mirroring `owner-dashboard`'s access model — a search result a given user isn't allowed to see must not appear, full stop.

## Owns vs. does not own

**Owns:** the search index, query parsing/ranking logic, semantic-search embedding pipeline (if used).

**Does NOT own:** the source data being indexed — `unified-timeline`, `rfi-change-control`, `contract-payments`, etc. remain the source of truth; `search` maintains a read-optimized index built from their data via their service layers/events, not a competing canonical store.

## Integration with other skills

- **`unified-timeline`** (Module 2): primary indexing source — consumes timeline events via that module's service layer/event stream.
- **`rfi-change-control`** (Module 6) and **`contract-payments`** (Module 12): additional indexed content (RFIs, contracts) consumed the same way.
- **`access-control-admin`** (Module 17): every query must be scoped by the requesting user's role/project access, enforced using that module's RBAC data — never return a result the user couldn't otherwise see via the normal UI.

## Rules or Process

- Index updates should be event-driven (react to changes in source modules), not a periodic full-table scan that risks staleness.
- Every search result must carry enough scoping metadata (project, required role) to be filtered against the querying user's access before being returned.
- If the index and the source data ever disagree, the source module's data is authoritative — the index is a derived, rebuildable artifact.

## Non-goals / Limitations

- Does not own or modify the underlying data — read-only index.
- Does not implement access control itself — enforces it using `access-control-admin`'s data, doesn't duplicate the RBAC logic.

## See also

- `../unified-timeline/SKILL.md`
- `../rfi-change-control/SKILL.md`
- `../contract-payments/SKILL.md`
- `../access-control-admin/SKILL.md`
