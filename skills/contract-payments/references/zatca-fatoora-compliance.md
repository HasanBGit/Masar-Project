# ZATCA / Fatoora Phase 2 Compliance

Source: `Info/research/platform_features_high_level.md` (Module 12).

## Why this is a separate reference

This is a **legal requirement**, not a product feature choice — explicitly called out in the source research as "not optional." It has enough external-spec detail (XML schema, QR code, real-time API) that it doesn't belong inline in `contract-payments/SKILL.md`.

## What it is

ZATCA (Saudi Tax Authority) runs Fatoora, Saudi's e-invoicing program. Phase 2 is the integration phase: real-time-API-integrated, digitally-signed XML invoices (UBL 2.1 format) with an embedded QR code. As of Wave 24 (Apr–Jun 2026), this now covers businesses down to SAR 375,000 annual turnover — i.e. it applies broadly, not just to large enterprises.

## Trigger point in the platform

Any invoice generated from a **verified payment milestone** (a milestone whose evidence has been acknowledged per `trust-evidence`) must be issued as a Fatoora Phase 2-compliant e-invoice, not a plain PDF.

## Requirements checklist (confirm current detail against ZATCA's published spec before implementing — do not hardcode from this summary alone, tax/compliance specs change)

- [ ] Invoice generated as XML in UBL 2.1 format.
- [ ] Digitally signed per ZATCA's cryptographic requirements.
- [ ] Real-time (or near-real-time, depending on invoice type — simplified vs. standard) submission to ZATCA's API for clearance/reporting.
- [ ] QR code embedded, encoding the ZATCA-specified invoice fields.
- [ ] Applies to any in-scope business regardless of size, per current wave thresholds (confirm current threshold at implementation time — this document records SAR 375,000 / Wave 24 as of the source research date, not necessarily current).

## Integration point

Owned by `contract-payments` (Module 12). Triggered by `trust_evidence.services.get_verification_status(...)` returning a verified state for a payment milestone — see `../../trust-evidence/SKILL.md` and `../../trust-evidence/references/audit-log-schema.md`.

## Non-goals

This document is not legal advice and not a substitute for ZATCA's own published technical specification — treat it as a pointer to the requirement's existence and trigger point, and go to ZATCA's current documentation before implementing the actual XML generation/signing/submission code.
