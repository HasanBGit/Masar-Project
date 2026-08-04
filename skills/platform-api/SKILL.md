---
name: platform-api
description: >
  Use when building or extending the public/partner REST API, webhook
  events, API auth/access scoping, developer documentation, or rate
  limiting. Triggers on: "public API", "partner API", "webhook", "OpenAPI",
  "API key", "rate limit", "developer docs". Prevents exposing internal
  service-layer functions directly as the public API surface instead of a
  deliberately versioned, documented, access-scoped external contract.
allowed-tools: Read, Grep, Glob
---

# Platform API & Documentation (Module 14 — Phase 4)

## Module identity

- Module #: 14
- Phase: Phase 4
- Django app: `platform_api`
- React feature folder: **none** — this module is an API/docs surface, not a UI feature; its "frontend" is the developer documentation portal, not an in-app React feature
- API namespace / URL prefix: `/api/public/v1/` (deliberately separate from the internal `/api/v1/<module>/` namespaces every other module uses, since this surface has different versioning/stability guarantees)

## Why this exists / Ground truth

Public/partner REST API exposing the project timeline, approvals, documents, and evidence records. Webhook events for state changes: approval requested, milestone verified, payment released, contractor overdue. API auth/access control (API keys/OAuth) scoped per project and role, mirroring `owner-dashboard`'s role-view model. A developer documentation portal with a versioned OpenAPI spec, kept separate from internal engineering docs (this `skills/` folder). Rate limiting and API usage tiers per tenant.

## Owns vs. does not own

**Owns:** the public API gateway/versioning layer, webhook subscription and delivery logic, API key/OAuth issuance and scoping, the OpenAPI spec and developer docs portal, rate-limit enforcement.

**Does NOT own:** the underlying domain data or business logic of any module it exposes — `platform_api` is a **facade**. It calls each module's own service layer (`approvals.services`, `trust_evidence.services`, etc.), the same as any other internal consumer; it never reimplements a module's logic to serve the public API.

## Integration with other skills

- Every other module (`approvals-workflow`, `trust-evidence`, `unified-timeline`, `contract-payments`, etc.): `platform_api` composes its public endpoints by calling each module's service layer/internal viewset. This is the clearest instance of the app-boundary rule in the whole system — the public API is *only* a thin, versioned, access-controlled wrapper.
- **`observability`** (Module 15): webhook delivery success/failure/retry data is a monitored signal there.
- **`access-control-admin`** (Module 17): API key/OAuth scoping is built on that module's RBAC and roster data, not a separate auth system.

## Rules or Process

- Never let a public API endpoint directly query another app's models — it must go through that app's service layer, same as any internal consumer.
- Version the public API explicitly (`/api/public/v1/`) and don't make breaking changes within a version.
- Webhook delivery must be retried and tracked (success rate, dead-letter queue) — `observability` reads this data, but `platform_api` is responsible for producing it correctly.
- Rate limits and usage tiers apply per tenant (per owner's account), not globally.

## Non-goals / Limitations

- Does not implement business logic — pure facade over other modules' service layers.
- Internal engineering docs (this `skills/` folder) are separate from the public developer documentation portal this module produces — don't conflate the two audiences.

## See also

- `../observability/SKILL.md`
- `../access-control-admin/SKILL.md`
- `../platform-guidelines/references/platform-architecture.md`
