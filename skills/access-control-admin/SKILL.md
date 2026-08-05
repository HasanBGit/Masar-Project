---
name: access-control-admin
description: >
  Use when building or extending project/team roster management, RBAC,
  data-access audit logs, or data retention/residency policy. Triggers on:
  "RBAC", "roles and permissions", "add/remove team member", "roster",
  "access audit log", "data residency", "PDPL", "who can see this". Prevents
  ad-hoc, per-module access checks instead of a single enforced RBAC source
  of truth every other module defers to — and prevents treating Saudi data
  residency as an implied hosting detail instead of an enforced
  architecture property.
allowed-tools: Read, Grep, Glob
---

# Security, Access Control & Team Administration (Module 17 — Core baseline / Phase 4 full scope)

## Module identity

- Module #: 17
- Phase: Core baseline (basic RBAC/roster/data-residency); full audit-log depth is Phase 4
- Django app: `accounts`
- React feature folder: `frontend/src/features/access-control-admin/`
- API namespace / URL prefix: `/api/v1/accounts/`

## Why this exists / Ground truth

Project/team roster management — adding, removing, and reassigning stakeholders over time. RBAC enforced everywhere `owner-dashboard` (role views) and `platform-api` (API scoping) assume it exists. Data-access audit logs, especially supporting `trust-evidence`'s dispute exports. Data retention/deletion policy and **Saudi data residency** as an explicit, enforced architecture requirement (hosting region, data export controls) — not just implied by referencing PDPL in a policy doc.

## Owns vs. does not own

**Owns:** `User`, `ProjectMembership`, `Role`, RBAC permission-checking logic, the roster-management UI/API, data-retention/deletion policy enforcement, data-residency configuration.

**Does NOT own:** the audit *event* log itself (`trust-evidence` owns `AuditEvent`) — this module reads that stream, filtered by actor, for access/security review; it doesn't maintain a separate log.

## Integration with other skills

- **`owner-dashboard`** (Module 3): role determination for the 4 role-differentiated views comes from here; `owner-dashboard` trusts the role passed down rather than reimplementing access checks.
- **`platform-api`** (Module 14): API key/OAuth scoping is built on this module's RBAC and roster data.
- **`trust-evidence`** (Module 5): security/incident monitoring here reads the same `AuditEvent` stream that module owns, filtered by actor — a different read pattern over the same underlying data, not a duplicate log.
- **`portfolio-governance`** (Module 13): portfolio membership (which projects belong to an owner's portfolio) relies on this module's roster data.
- Every other module: any permission check ("can this user see/do X") should call this module's RBAC service layer — never reimplement role logic locally.

## Rules or Process

- RBAC is a single source of truth — no module implements its own parallel permission logic; all access checks call `accounts.services.has_permission(user, project, action)` or equivalent.
- Roster changes (adding/removing a stakeholder) must be recorded as audit events via `trust_evidence.services.record_event(...)` — team membership changes are exactly the kind of turnover-surviving history the platform is built to preserve.
- Data residency (hosting region) and PDPL-compliant data handling are enforced infrastructure properties, not just documented intentions — flag any deployment/config change that would move data outside the required region as a compliance-relevant change, not a routine ops decision.

## Non-goals / Limitations

- Does not own the audit event log itself — see `trust-evidence`.
- Full audit-log depth and cross-project security tooling is Phase 4 — only basic RBAC/roster/data-residency is Core.

## See also

- `../owner-dashboard/SKILL.md`
- `../platform-api/SKILL.md`
- `../trust-evidence/SKILL.md`
- `../portfolio-governance/SKILL.md`
- `../platform-guidelines/references/domain-glossary.md`
