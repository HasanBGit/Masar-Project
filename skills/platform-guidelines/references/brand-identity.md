# Brand Identity - Truepoint

Source: `Info/brand/*.png` (logo screenshots reviewed directly; no separate brand-guide PDF exists yet - treat pixel-sampled values below as approximate until a formal brand guide is produced).

## Name

**Truepoint.** Wordmark is always rendered as one word, capital T, rest lowercase - "Truepoint", never "TruePoint" or "True Point".

## Color palette

| Role | Approx. hex | Usage |
|---|---|---|
| Primary / wordmark | `#0F3B4D` (deep navy/teal) | Wordmark text, primary UI text, primary buttons |
| Accent | `#C9A227` (mustard/gold) | The circle-and-swoosh mark, highlights, active/selected states, CTAs used sparingly |
| Background | `#F4EFE7` (warm cream) | Page/card backgrounds - this is a warm off-white, not pure white (`#FFFFFF`) |

`[NEEDS FULL EXTRACTION]` - these hex values were sampled from PNG screenshots, not taken from a design-system source file. Confirm exact values against a Figma/brand-guide export before hardcoding into a Tailwind config; until then, treat them as close approximations, not pixel-exact.

## Mark / logo

The icon is a circle sitting above an open, upward-curving swoosh - reads as a rising sun or a minimal person/greeting silhouette. It is always gold/mustard on a cream or transparent background, never recolored to navy.

Available lockups (`Info/brand/`):
- `logo-icon.png` - mark alone, no wordmark. Use for favicons, app icons, small avatar contexts.
- `logo-favicon.png` - mark alone, sized for browser favicon use.
- `logo-wordmark.png` - "Truepoint" text alone, no mark. Use where the mark would be redundant (e.g. repeated inline mentions).
- `logo-primary-lockup.png` - mark stacked above wordmark, centered. Use for square/vertical placements (splash screens, title cards).
- `logo-full-lockup.png` - mark beside wordmark, horizontal. Use for headers/navbars and wide placements.
- `logo-watermark.png` - faded/light mark, background-only placement (e.g. behind empty-state illustrations). Never use as the primary visible logo.

## Typography

Wordmark and headings use a bold, geometric grotesk sans-serif (rounded terminals, e.g. the lowercase "t" and "p" in "Truepoint" - treat as a Poppins/Century Gothic/Circular-style geometric sans until a specific typeface file is confirmed). `[NEEDS FULL EXTRACTION]` - exact typeface name/weights not yet confirmed from a source file; do not hardcode a specific font family into `tailwind.config` without checking with the team first.

## Tone

Clean, minimal, trust-oriented. Generous whitespace, rounded corners, no gradients or drop shadows in the marks themselves. This visual restraint should carry into UI: prefer flat fills, soft rounded corners, and the cream/navy/gold palette over adding new accent colors.

## Application rules

- Don't place the navy wordmark on a background darker than the cream tone - contrast is designed for light backgrounds.
- The gold accent is a highlight color, not a base UI color - don't use it for large fill areas (e.g. full-page backgrounds, large panels).
- Don't recolor the mark. If a dark-mode variant is ever needed, treat that as a design task, not something to derive by inverting these values programmatically.

## See also

- `saudi-design-system.md` - component/UX pattern reference (footer logo sizing, dark-background logo handling, co-branded logo placement) borrowed from Saudi's كود المنصات design system; these Truepoint brand rules take precedence wherever the two conflict.
