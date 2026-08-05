# Product Overview

Source: `Info/research/platform_features_high_level.md`, `Info/research/competitor_analysis_construction_communication.md`, `Info/research/masar_cohort_insights.md`

## What Truepoint is

Truepoint (product name; company/program origin "San3", incubated in the Misk Foundation "Masar" cohort) is a Saudi/GCC-focused SaaS platform that unifies fragmented construction-project communication - per-trade WhatsApp groups, consultant email/RFI threads, PMC PDF reports, phone calls - into a single, owner-facing, trust-verified project record.

San3's own team framed the problem as "Palantir for Construction": construction projects generate critical information across disconnected channels; building owners have no real-time visibility and must chase people for status. Truepoint ingests that fragmented reality **without requiring field teams to change behavior**, structures it with AI/NLP, and produces a single, plain-Arabic, role-differentiated, verifiable project timeline.

## The core positioning claim

**Owner-first infrastructure, not a contractor tool with an owner view bolted on.** Every existing competitor gives contractors the primary seat and owners read-only access inside the contractor's system (Gap G1, below). Truepoint inverts that.

## Five-attribute differentiation

No competitor combines all five:
1. **Owner-first** - the owner is the primary user, not an afterthought.
2. **WhatsApp-native** - sits on top of the channel the market already uses, doesn't ask people to migrate.
3. **AI-automated** - updates happen from captured field/email activity, not manual data entry.
4. **Arabic-first** - not a localization add-on; the core interface for this market.
5. **Built for Saudi/GCC mid-market** - not an enterprise mega-project tool (WakeCap, Autodesk Build) or a US-centric residential tool (Buildertrend, CoConstruct).

## Market context

Only ~6% of Saudi contractors use any modern PM tool. WhatsApp is the dominant real-time channel at every project tier (~40% of WhatsApp traffic in Saudi/Kuwait is voice notes). ~70% of Saudi mega-projects overran schedule in the past decade. Poor communication is the #1-ranked delay cause and #1 owner-cited performance issue in Saudi-specific studies.

## Target users

Owner, Investor, Consultant, Contractor/GC, Subcontractor (multi-tier), Site foreman, Field/migrant laborer, PMC, Government authority (e.g. Balady), San3's internal ops team, API/partner integrators. See `skills/access-control-admin/SKILL.md` for the role model and `skills/owner-dashboard/SKILL.md` for how each role's view differs.

## Eight structural competitor gaps (G1–G8)

From analysis of 11 competitors (Procore, Buildertrend, CoConstruct, BuilderPad, Autodesk Build, Fieldwire, Raken, Kahua, WakeCap, Valoon, Banamind, DroneDeploy Progress AI):

| Gap | Description | Addressed by |
|---|---|---|
| G1 | No owner seat - every tool gives owners read-only access inside a contractor's system | `skills/owner-dashboard/SKILL.md` |
| G2 | Manual bottleneck - portals go dark if field teams stop posting | `skills/field-capture/SKILL.md` |
| G3 | No channel aggregation across WhatsApp/email/PDF for one project | `skills/unified-timeline/SKILL.md` |
| G4 | No role differentiation (owner/investor/consultant/contractor) | `skills/owner-dashboard/SKILL.md` |
| G5 | Manual payment validation, no independent evidence cross-reference | `skills/trust-evidence/SKILL.md`, `skills/contract-payments/SKILL.md` |
| G6 | No trust infrastructure - no audit trail, no independent milestone confirmation | `skills/trust-evidence/SKILL.md` |
| G7 | Not Arabic-first - every major tool is English-first | `skills/multilingual-voice/SKILL.md` |
| G8 | The WhatsApp→owner-dashboard stack is unbuilt - components exist in isolation, nobody connects them to an owner-facing product | `skills/field-capture/SKILL.md`, `skills/unified-timeline/SKILL.md`, `skills/owner-dashboard/SKILL.md` combined |

## Phasing (rough cut, not a commitment - from `platform_features_high_level.md`)

- **Core/MVP:** Modules 1–5 + 12 (field capture, unified timeline, owner dashboard, approvals, trust ledger, contract/payment verification incl. ZATCA), plus baseline slices of Modules 15 & 17 (integration-health monitoring, basic RBAC/roster/data-residency).
- **Phase 2:** Modules 6–7 + 16 (RFI/change-order/version control, handover, search).
- **Phase 3:** Modules 8–11 (multilingual/voice-first, safety, cultural UX, international stakeholders).
- **Phase 4:** Modules 13–14 + remainder of 15/17 (portfolio governance, public API, full observability/audit depth).

See `skills/README.md` for the full module index.
