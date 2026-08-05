---
name: observability
description: >
  Use when building or extending integration health monitoring (WhatsApp
  session/ban status, email OAuth token validity, government-portal
  connectivity), webhook/event delivery monitoring, SLA compliance
  monitoring, usage/adoption dashboards, or security/incident monitoring.
  Triggers on: "monitoring", "observability", "integration health",
  "webhook delivery", "SLA compliance", "usage dashboard", "security
  incident", "invalid_grant". Prevents treating this as generic app-uptime
  monitoring instead of the platform-specific signal set it actually needs
 - the platform's core promise is "we're watching so the owner doesn't
  have to," which only holds if this module is actually watching its own
  pipes.
allowed-tools: Read, Grep, Glob
---

# Monitoring & Observability (Module 15 - Core baseline / Phase 4 full scope)

## Module identity

- Module #: 15
- Phase: Core baseline (integration-health monitoring only); full scope (SLA compliance, usage analytics, security/incident monitoring) is Phase 4
- Django app: `observability`
- React feature folder: `frontend/src/features/observability/` (internal/admin views, not customer-facing)
- API namespace / URL prefix: `/api/v1/observability/`

## Why this exists / Ground truth

Framed directly in the source research: "the platform's core promise is 'we're watching so the owner doesn't have to' - that only holds if San3 itself is watching its own pipes." Five distinct signal categories, treated as separate concerns, not one generic uptime dashboard: integration health (WhatsApp session/ban status, email OAuth token validity - catching `invalid_grant`/revoked access, government-portal connectivity); webhook/event delivery monitoring (success rates, retries, dead-letter queue); SLA compliance monitoring (an aggregated internal view of whether `approvals-workflow`'s escalations are actually firing); feature usage/adoption dashboards; internal alerting (distinct from customer-facing alerts); security/incident monitoring (auth anomalies, data-access audit logs) - explicitly called out as a *distinct* failure mode from integration health, not the same category.

## Owns vs. does not own

**Owns:** health-check polling/aggregation for external integrations, webhook delivery metrics, SLA-compliance aggregation views, usage/adoption analytics, internal alerting rules, security/incident detection over audit-log data.

**Does NOT own:** the underlying integrations themselves (`field-capture` owns the WhatsApp session; `unified-timeline` owns email OAuth; `platform-api` owns webhook sending) - this module polls/aggregates their health signals via each module's own health-check endpoint or service-layer call, it doesn't manage the integrations directly.

## Integration with other skills

- **`field-capture`** (Module 1): polls WhatsApp session/ban-status health-check endpoint.
- **`unified-timeline`** (Module 2): polls email OAuth token validity and government-portal (Balady) connectivity.
- **`platform-api`** (Module 14): reads webhook delivery success/retry/dead-letter data.
- **`approvals-workflow`** (Module 4) via **`trust-evidence`** (Module 5): reads aggregated audit-event data to check whether SLA escalations are actually firing - a read-only consumer of the audit log, not a direct query into `approvals`' tables.
- **`access-control-admin`** (Module 17): security/incident monitoring reads the same audit-log stream that module uses for access audit logs - same underlying data, different read pattern, not a duplicated log.

## Rules or Process

- Treat integration health, webhook delivery, SLA compliance, usage analytics, and security/incident monitoring as five separate signal categories with separate alerting paths - don't collapse them into one generic dashboard.
- Poll/consume other modules' health signals via their own exposed health-check endpoint or service-layer call - never reach into their internals directly.
- Internal alerts (to San3's own ops team) are distinct from customer-facing alerts (e.g. "contractor overdue" shown to an owner) - route them separately.

## Non-goals / Limitations

- Does not manage the integrations it monitors - see the owning module for each (`field-capture`, `unified-timeline`, `platform-api`).
- Full scope (SLA compliance, usage analytics, security/incident monitoring) is Phase 4 - only integration-health monitoring is Core; don't build the full scope prematurely at the expense of Core modules.

## See also

- `../field-capture/SKILL.md`
- `../unified-timeline/SKILL.md`
- `../platform-api/SKILL.md`
- `../trust-evidence/SKILL.md`
- `../access-control-admin/SKILL.md`
