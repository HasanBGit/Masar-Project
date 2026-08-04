---
name: platform-guidelines
description: >
  Use whenever a task touches Truepoint branding, product positioning,
  cross-app architecture conventions, or Arabic/construction domain
  terminology. Triggers on: "what does Truepoint do", "brand colors", "logo
  usage", "app boundaries", "shared base model", "modular monolith", "what
  does <term> mean", "is this feature Core or Phase 2/3/4". Prevents
  inconsistent brand usage, ad-hoc cross-app coupling that breaks the
  modular-monolith boundary, duplicated shared data-model logic, and
  mistranslating domain terms like wasta, Balady, or decennial liability.
allowed-tools: Read, Grep, Glob
---

# Platform Guidelines (cross-cutting)

## Why this exists / Ground truth

This is the single source of truth for facts that every one of the 17 feature-module skills would otherwise have to duplicate: what Truepoint is, its brand, the shared architecture rules, and domain terminology. Module skills link here instead of restating this content — see `skills/README.md` for the full module index this complements.

## Rules or Process

- **Brand question** (colors, logo usage, typography, tone) → `references/brand-identity.md`.
- **Architecture question** (app boundaries, shared base models, DRF assumption) → `references/platform-architecture.md`.
- **Term lookup** (Arabic/construction jargon) → `references/domain-glossary.md`.
- **"What is Truepoint / what does it do"** → `references/product-overview.md`.
- **Component/UX pattern question** (search behavior, card/button placement, footer/logo handling, homepage structure) → `references/saudi-design-system.md` — a voluntarily-adopted reference pattern set from Saudi's كود المنصات (DGA) design system, not a compliance requirement.
- The modular-monolith rule, stated once here and referenced everywhere else: one Django project, one PostgreSQL database, N apps. No app imports another app's models directly. Cross-app access only via the other app's service layer (`services.py`) or its DRF viewset — never a direct ORM query into another app's tables. Full rationale and the two shared data-model patterns (tracked-object base, document lifecycle enum) live in `references/platform-architecture.md`.
- Every module skill's frontmatter/body must stay consistent with the naming rule: skill folder (kebab-case) → Django app (same words, snake_case) → React feature folder (same words, kebab-case, under `frontend/src/features/`). The two documented exceptions are Module 10 (`trust-calibrated-ux`, no owned app) and Module 14 (`platform-api`, no UI feature folder).

## Non-goals / Limitations

- Does not contain module-specific business rules — those live in each module's own `SKILL.md` (see `skills/README.md`).
- Brand hex values and typeface in `brand-identity.md` are sampled from logo screenshots, not a formal brand-guide export — treat as approximate until confirmed (flagged inline in that file).
