# Saudi Design System Reference - كود المنصات (Platforms Code)

Source: content pasted by the user from the كود المنصات (Platforms Code) website (`ds.dga.gov.sa`-style DGA design-system site), 2026-08-04. This is a public Saudi government design system, not Truepoint's own - see "Scope" below before applying anything here.

## What it is

كود المنصات ("Platforms Code") is an open-source design system built by هيئة الحكومة الرقمية (the Saudi Digital Government Authority, DGA), version 1.0. It's aimed at Saudi government digital platforms, with the stated vision of being *"the leading open-source design system setting global standards for government digital services"* and the mission of fostering a collaborative environment where government and community efforts merge to build accessible, easy-to-use digital services. It uses **Atomic Design methodology** for UI structure, ships Figma design files and homepage/component templates (CC BY 4.0 licensed via Figma Community), and is actively maintained (dated changelog entries visible on the template page, e.g. component/logo additions through Apr 2026).

## Scope - how Truepoint should use this

**This is a voluntarily-adopted quality bar, not a compliance requirement.** Truepoint is a private construction-industry SaaS product, not a government platform, so none of this is legally binding. It's referenced here because: (1) it's a well-documented, accessibility-conscious pattern set specifically calibrated for Arabic-first, Saudi-market digital products - directly relevant given Truepoint's own Arabic-first requirement (see `../platform-guidelines/references/product-overview.md` and `multilingual-voice` in `skills/README.md`), and (2) its concrete component rules (logo handling, search behavior, card/button patterns) are a reasonable default to crib from rather than inventing from scratch. Treat every rule below as "worth doing unless Truepoint's own brand/product needs override it," not as a hard constraint.

## Concrete rules worth reusing

### Logo / footer handling
- Build the logo as a reusable **component**, not a flattened image dropped into layouts - swap the component, not the pixels, when a page/template needs a different logo variant.
- Reference dimensions for a footer-placed logo: **W: 125px, H: 42px** - a reasonable starting point for Truepoint's own footer logo sizing (`Info/brand/logo-full-lockup.png` / `logo-wordmark.png`), adjust to Truepoint's actual proportions rather than copying the number blindly.
- Keep a **white/inverted logo variant** for use on dark backgrounds or over photos, to preserve contrast and clarity - Truepoint's brand assets don't currently include an inverted variant (see `brand-identity.md`); flag this as a gap if a dark-background placement is ever needed.
- If a page ever needs to show more than the primary product logo alongside a co-branded or campaign logo (their example: adding a national "Year of AI" logo alongside the org logo), the added logo should render **horizontally alongside existing logos on desktop, and stacked vertically on mobile**, with careful alignment/spacing/visual balance - a pattern to reuse if Truepoint ever needs a co-branding or partner-logo placement (e.g. an investor's logo, a compliance/certification badge).

### Homepage / template structure
- A homepage template centers on a **hero section**: a short purpose statement, a primary call-to-action button, and a supporting image/illustration.
- **Navbar consistency rule**: once a navbar structure and style is set, don't alter its colors or fonts when reusing/adapting the template elsewhere - treat nav styling as fixed, not something each page customizes.
- Page-level customization should happen by **selecting from the design system's existing components**, not by inventing new one-off patterns per page.

### Search behavior
- Live, relevant autocomplete suggestions that update dynamically as the user types.
- A clear/delete icon in the search field: appears once the user starts typing, disappears when the field is empty, clears the field on click, and **must be keyboard-accessible** (not just mouse-clickable) - an explicit accessibility requirement worth carrying into any search UI Truepoint builds (see `skills/search/SKILL.md`).

### Cards and the "View All" button
- A "View All" button's job is to reveal additional content not shown in the default page view - place it clearly near the content it expands, not buried elsewhere.
- On **display-only cards** (cards that already convey everything needed without further interaction), it's fine to omit the button entirely rather than adding interaction for its own sake.
- **Mobile long-title handling**: when a card title is long and horizontal space is limited, move the action button below the content instead of squeezing it inline - use vertical stacking on mobile.
- **Consistency rule**: whatever placement choice is made (button inline vs. below content) must be applied uniformly across every card/section on the page - don't mix patterns within one view.

### Trust/freshness signals
- Show a **last-modified date on individual pages/content** - this measurably helps users judge whether what they're reading is current, directly relevant to Truepoint's own emphasis on "current as of" tagging for documents (see `skills/rfi-change-control/SKILL.md`).
- Show a **platform-level last-updated date** separately - signals the product is actively maintained, distinct from any single page's freshness.

## Non-goals / Limitations

- This is not Truepoint's own design system - it's a reference to borrow proven patterns from, not something to implement wholesale or brand as Truepoint's own.
- The source content was pasted from a live website browse and contains some garbled/truncated text (encoding artifacts from copy-paste) - treat any rule not clearly stated above as unconfirmed rather than guessing at the corrupted original wording.
- Component-level visual specs (exact colors, spacing tokens, type scale) were not part of what was pasted - if those are ever needed, they'd have to be pulled from the DGA design system's Figma files directly, not inferred from this summary.

## See also

- `brand-identity.md` - Truepoint's own logo/color/typography rules (these take precedence over anything here when they conflict)
- `../../search/SKILL.md`
- `../../rfi-change-control/SKILL.md`
