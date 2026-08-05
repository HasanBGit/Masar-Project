# Truepoint `skills/` Index

This folder is consumed by Claude Code (and read by any engineer joining the team) to understand how Truepoint's feature domains are scoped, owned, and bounded. It is **not** a skill itself - there's no `SKILL.md` at this level, so it won't be auto-loaded as a 20th skill.

**Architecture:** modular monolith. One Django project, one PostgreSQL database. Each feature module below is its own isolated Django app + React feature folder (`frontend/src/features/<name>/`). No app imports another app's models directly - cross-app access only via each app's service layer / internal API. Full rationale: `platform-guidelines/references/platform-architecture.md`.

**Naming rule:** skill folder (kebab-case) → Django app (same words, snake_case) → React feature folder (same words, kebab-case). Two documented exceptions: Module 10 (no owned app - constraint-only) and Module 14 (no UI feature folder - API/docs surface).

## Cross-cutting skills

| Skill | What it's for |
|---|---|
| [`engineering-principles`](engineering-principles/SKILL.md) | DRY/KISS/YAGNI/SOLID + testing conventions for Django/DRF/pytest and React/TS/Jest, plus the app-boundary rule |
| [`platform-guidelines`](platform-guidelines/SKILL.md) | Brand identity, product overview, shared architecture conventions, domain glossary - the source every module skill links back to |

## Feature modules (17 + 1 proposed)

| # | Module | Phase | Skill | Django app | React feature folder |
|---|---|---|---|---|---|
| 1 | Field Capture (WhatsApp ingestion) | Core | [`field-capture`](field-capture/SKILL.md) | `field_capture` | `features/field-capture/` |
| 2 | Unified Project Timeline | Core | [`unified-timeline`](unified-timeline/SKILL.md) | `timeline` | `features/unified-timeline/` |
| 3 | Owner Dashboard & Role Views | Core | [`owner-dashboard`](owner-dashboard/SKILL.md) | `dashboard` | `features/owner-dashboard/` |
| 4 | Approval & Decision Workflow (3 Edges) | Core - kernel | [`approvals-workflow`](approvals-workflow/SKILL.md) | `approvals` | `features/approvals-workflow/` |
| 5 | Trust & Evidence Infrastructure | Core - kernel | [`trust-evidence`](trust-evidence/SKILL.md) | `trust_evidence` | `features/trust-evidence/` |
| 6 | RFI, Change Order & Version Control | Phase 2 | [`rfi-change-control`](rfi-change-control/SKILL.md) | `rfi_change_control` | `features/rfi-change-control/` |
| 7 | Handover & Post-Handover | Phase 2 | [`handover-closeout`](handover-closeout/SKILL.md) | `handover` | `features/handover-closeout/` |
| 8 | Multilingual & Voice-First Design | Phase 3 | [`multilingual-voice`](multilingual-voice/SKILL.md) | `localization` | `features/multilingual-voice/` |
| 9 | Safety & Risk Signals | Phase 3 | [`safety-signals`](safety-signals/SKILL.md) | `safety` | `features/safety-signals/` |
| 10 | Cultural & Trust-Calibrated UX | Phase 3 | [`trust-calibrated-ux`](trust-calibrated-ux/SKILL.md) | *none - constraint only* | *none* |
| 11 | International & Remote Stakeholder Support | Phase 3 | [`remote-stakeholder-support`](remote-stakeholder-support/SKILL.md) | `remote_participation` | `features/remote-stakeholder-support/` |
| 12 | Contract & Payment Verification (ZATCA) | Core | [`contract-payments`](contract-payments/SKILL.md) | `contract_payments` | `features/contract-payments/` |
| 13 | Portfolio Governance | Phase 4 | [`portfolio-governance`](portfolio-governance/SKILL.md) | `portfolio` | `features/portfolio-governance/` |
| 14 | Platform API & Documentation | Phase 4 | [`platform-api`](platform-api/SKILL.md) | `platform_api` | *none - API/docs only* |
| 15 | Monitoring & Observability | Core baseline | [`observability`](observability/SKILL.md) | `observability` | `features/observability/` |
| 16 | Search | Phase 2 | [`search`](search/SKILL.md) | `search` | `features/search/` |
| 17 | Security, Access Control & Team Admin | Core baseline | [`access-control-admin`](access-control-admin/SKILL.md) | `accounts` | `features/access-control-admin/` |
| 18 | Drawings Studio (3D model viewer) | **Proposed - not in the original product scope, built by direct request; confirm phasing** | [`drawings-studio`](drawings-studio/SKILL.md) | `drawings_studio` | `features/drawings-studio/` |

## Phasing

- **Core / MVP:** Modules 1–5 + 12, plus baseline slices of 15 & 17.
- **Phase 2:** Modules 6, 7, 16.
- **Phase 3:** Modules 8, 9, 10, 11.
- **Phase 4:** Modules 13, 14, plus full scope of 15 & 17.

Modules 4 and 5 are the **domain kernel** - build them together; most other modules depend on both.

## Reference material

- `Info/brand/` - Truepoint logo files (gitignored, not in git history).
- `Info/research/` - source product/market research docs this whole folder is derived from (gitignored).
- `platform-guidelines/references/saudi-design-system.md` - component/UX patterns borrowed from Saudi's كود المنصات (DGA) design system; voluntarily adopted, not a compliance requirement.

## Finding things fast

```bash
grep -rn "^- Module #:" skills/*/SKILL.md | sort   # module number → file
grep -rn "^- Phase:" skills/*/SKILL.md              # filter by phase
```
