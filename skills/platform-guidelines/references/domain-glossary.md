# Domain Glossary

Source: `Info/research/whatsapp_email_approval_problems_solutions.md`, `Info/research/competitor_analysis_construction_communication.md`, `Info/research/masar_cohort_insights.md`

Arabic and construction-industry terms that recur across the codebase and skills. Preserve these terms as-is in code comments, model field names (where relevant), and UI copy discussions - don't silently translate or paraphrase them away.

| Term | Meaning | Why it matters here |
|---|---|---|
| **San3** (صنع) | The product/company origin name | Truepoint is the product name; San3 is the originating company/team name - both appear in source docs |
| **Masar** | The Misk Foundation startup cohort program San3 came out of | Program name, not a product feature - don't confuse with the old repo folder name |
| **Balady** (بلدي) | Saudi municipal permit/inspection government platform (balady.gov.sa) | Permit/inspection correspondence tracking (Module 2, `unified-timeline`) integrates with it |
| **wasta** (واسطة) | Personal-connection/reciprocal-obligation trust layer central to Gulf business culture - "the primary operating layer of trust, not a deviation from it" | Directly informs the `trust-calibrated-ux` (Module 10) rule that AI summaries must be attributed to named humans ("Ahmed reports...") rather than presented as the platform's own voice |
| **ZATCA** | Saudi Tax Authority | Governs e-invoicing requirements |
| **Fatoora** | Saudi's e-invoicing program; Phase 2 = integration phase (real-time API, signed XML/UBL 2.1, QR code) | Legal requirement for `contract-payments` (Module 12) - see `../../contract-payments/references/zatca-fatoora-compliance.md` |
| **PDPL** | Saudi Personal Data Protection Law | Enforced architecture requirement (data residency, access controls) - see `platform-architecture.md` and `access-control-admin` (Module 17) |
| **SCCA** | Saudi Center for Commercial Arbitration | Construction disputes are ~47% of its 2025 caseload - motivates `trust-evidence`'s (Module 5) case-ready dispute export feature |
| **decennial liability** | The 10-year structural-defect liability period Saudi contractors/consultants carry post-handover | Central to `handover-closeout`'s (Module 7) post-handover defect-tracking window |
| **kafala** | Migrant-labor sponsorship employment structure | Referenced re: worker communication being structurally one-directional/employer-mediated - relevant to `field-capture` (Module 1) and `multilingual-voice` (Module 8) worker-level reporting design |
| **RACI** | Responsible / Accountable / Consulted / Informed matrix | The model underlying `approvals-workflow`'s (Module 4) single-named-approver design |
| **MEP** | Mechanical, Electrical, Plumbing | A trade category, frequently cited re: cross-trade coordination and connectivity dead zones (basements, shafts, mechanical rooms - relevant to `multilingual-voice`'s offline-first capture) |
| **RFI** | Request for Information | Standard contract-administration document type - a "tracked object" per `rfi-change-control` (Module 6) |
| **submittal** | Contractor-submitted document (shop drawing, material spec, etc.) requiring review/approval | Same tracked-object treatment as RFI, owned by `rfi-change-control` |
| **change order** / **variation order** | A formally agreed change to contract scope/cost/schedule | Tracked object owned by `rfi-change-control`, but payment impact flows to `contract-payments` |
| **teach-back method** | Healthcare informed-consent technique: ask the person to restate what they understood, don't just get a signature | Borrowed for `approvals-workflow`'s (Module 4) "Understanding" gate in the 3 Edges model |
| **snagging** / **punch list** | UK/international vs. US terms for the same handover defect-list workflow | Both terms appear in source docs; `handover-closeout` (Module 7) owns this workflow |
| **the 3 Edges** | Truepoint's core approval interaction model: Hearing → Understanding → Agreeing | See `skills/approvals-workflow/SKILL.md` |
