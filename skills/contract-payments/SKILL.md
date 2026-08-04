---
name: contract-payments
description: >
  Use when building or extending structured contract data, payment
  milestone gating, the contract-vs-actual tracker, ceiling/threshold
  alerts, digital contract signing, warranty/retention tracking, or ZATCA
  e-invoicing. Triggers on: "contract terms", "payment milestone", "ZATCA",
  "Fatoora", "e-invoice", "contract vs actual", "retention period",
  "escrow". Prevents gating payment on contractor self-assertion instead of
  trust-evidence's verified evidence — payment verification has "no teeth"
  without that link, per the cross-module note below.
allowed-tools: Read, Grep, Glob
---

# Contract & Payment Verification (Module 12 — Core / MVP)

## Module identity

- Module #: 12
- Phase: Core (MVP)
- Django app: `contract_payments`
- React feature folder: `frontend/src/features/contract-payments/`
- API namespace / URL prefix: `/api/v1/contract-payments/`

## Why this exists / Ground truth

Digitizes contract terms (payment schedule, milestone definitions, scope baseline) as structured data alongside the source PDF. Payment milestones are gated on verified evidence, not contractor self-assertion. A contract-vs-actual tracker runs a live comparison of contract value plus change orders vs. paid-to-date. Automated ceiling/threshold alerts flag before a change order or payment breaches a contract limit. Digital contract signing plus an amendment log reuses the same e-signature/audit infrastructure as `approvals-workflow`. A plain-Arabic contract summary layer mirrors `owner-dashboard`'s plain-language approach. Warranty/retention period tracking links retention holdbacks to the decennial liability window (`handover-closeout`). **ZATCA e-invoicing (Fatoora Phase 2) compliance is legally mandated** — see `references/zatca-fatoora-compliance.md`. Escrow-style staged disbursement is noted as relevant only if San3 ever touches payment rails directly — not assumed as a near-term requirement.

## Owns vs. does not own

**Owns:** `Contract` (structured payment schedule, milestone definitions, scope baseline), `PaymentMilestone`, the contract-vs-actual tracker, ceiling/threshold alert logic, the plain-Arabic contract summary layer, warranty/retention period fields, ZATCA e-invoice generation.

**Does NOT own:** evidence verification itself (`trust-evidence` decides whether a milestone's evidence is acknowledged); change-order cost/schedule data (`rfi-change-control` owns change orders, this module reads their impact); the decennial liability window definition (`handover-closeout` owns that, this module links retention periods to it).

## Integration with other skills

- **`trust-evidence`** (Module 5): payment release is gated on `trust_evidence.services.get_verification_status(milestone_ref)` returning a verified state. **Cross-module dependency note ("no teeth without Module 5"):** without this link, payment gating degrades to contractor self-assertion — exactly the failure mode this platform exists to fix. Documented on both modules' skills; `contract_payments` calls `trust_evidence`'s service layer, never its tables directly.
- **`rfi-change-control`** (Module 6): reads change-order cost/schedule impact via that module's service layer to feed the contract-vs-actual tracker.
- **`approvals-workflow`** (Module 4): digital contract signing and amendment approval route through `approvals.services.request_decision(...)`, reusing the same e-signature/audit infrastructure rather than building a parallel one.
- **`handover-closeout`** (Module 7): warranty/retention tracking here references that module's decennial liability window data.

## Rules or Process

- Contract terms are structured fields, not just an attached PDF — payment schedule, milestone definitions, and scope baseline must be queryable data.
- Never release a payment milestone without a verified `trust-evidence` acknowledgment.
- Any invoice generated from a verified milestone must go through the ZATCA Fatoora Phase 2 flow — see `references/zatca-fatoora-compliance.md`. Do not ship a plain-PDF invoice path as a substitute.
- Ceiling/threshold alerts must fire *before* a breach, not after — check against the running contract-vs-actual total on every change-order or payment write.

## Non-goals / Limitations

- Does not verify evidence itself — see `trust-evidence`.
- Does not own change-order records — see `rfi-change-control`.
- Escrow/staged disbursement is out of scope unless San3 decides to touch payment rails directly — don't build it speculatively.

## See also

- `../trust-evidence/SKILL.md`
- `../rfi-change-control/SKILL.md`
- `../approvals-workflow/SKILL.md`
- `../handover-closeout/SKILL.md`
- `references/zatca-fatoora-compliance.md`
