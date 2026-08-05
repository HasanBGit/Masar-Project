---
name: drawings-studio
description: >
  Use when building or extending the 3D model viewer/editor - uploading,
  viewing, orbiting, sectioning or measuring drawing models. Triggers on:
  "3D viewer", "BIM viewer", "model viewer", "drawing studio", "mesh
  upload", "glTF/OBJ/STL", "section box", "clip plane", "view cube".
  Prevents scope creep toward the full BIM/CAD/quantity-takeoff stack this
  module deliberately does not own - see "Non-goals" below.
allowed-tools: Read, Grep, Glob
---

# Drawings Studio (Module 18 - proposed, not yet in the core 17-module scope)

## Module identity

- Module #: 18 (new - not part of the original 17-module product scope in
  `Info/research/platform_features_high_level.md`; added by direct user
  request, flagged here so the product-scope decision stays visible)
- Phase: unscoped (built as a standalone first pass)
- Django app: `drawings_studio`
- React feature folder: `frontend/src/features/drawings-studio/`
- API namespace / URL prefix: `/api/v1/drawings-studio/`

## Why this exists / Ground truth

Ported from `datadrivenconstruction/OpenConstructionERP` (AGPL-3.0, dual
licensed) - specifically the parts of its BIM viewer that have **no**
backend coupling: the Three.js scene/selection/clip/camera classes under
`shared/ui/BIMViewer/` and the client-side mesh loader under
`features/bim/meshImport/loaders.ts`, which parses glTF/GLB/OBJ/STL/FBX/DAE
/3DS/PLY/USD/USDZ entirely in the browser. OpenConstructionERP's own
`BIMViewer.tsx` was **not** ported as-is - it fetches model/element data
from `bim_hub`'s tiled 3D-Tiles backend (cad2data conversion, BOQ-linking,
canonical element storage), none of which exists or is wanted here. Instead
a new `ModelViewer.tsx` wraps the same standalone `SceneManager` /
`ClipManager` / `BIMViewCube` classes directly around a client-parsed mesh.

## Owns vs. does not own

**Owns:** `DrawingModel` (an uploaded 3D mesh file + minimal metadata:
project, name, format, uploader). The viewer UI (orbit, section box,
measure, view cube) and the client-side mesh parsing.

**Does NOT own:** CAD/BIM ingestion of native RVT/DWG/DGN/IFC (would need
cad2data or an IfcOpenShell-equivalent - neither is present); quantity
takeoff or BOQ-linking (there is no BOQ module in this platform); per-element
property storage, smart views, federation/diff, clash detection, or BCF
issue tracking; DXF/DWG 2D takeoff and PDF markup/takeoff (deferred, separate
future passes - see the OpenConstructionERP module catalog in
`MODULES.md` inside the cloned reference repo for what those would need).

## Integration with other skills

- None yet. This module attaches to `core.Project` like every other app but
  has no cross-app service-layer calls in either direction. If a future pass
  wires it to e.g. `handover-closeout` (as-built models) or
  `rfi-change-control` (drawings referenced by an RFI), that integration
  goes through each app's `services.py`, never direct model imports, per
  `skills/engineering-principles/SKILL.md`.

## Rules or Process

- No cad2data, no IfcOpenShell, no native RVT/DWG/DGN/IFC parsing - if a
  file needs that, it is out of scope for this module; the user exports to
  an accepted mesh format first.
- The backend never parses or interprets mesh geometry - it only stores the
  file and metadata. All parsing/rendering happens client-side in
  `frontend/src/features/drawings-studio/viewer/`.
- Files ported from OpenConstructionERP keep their original DDC copyright
  header - AGPL requires preserving it. New files (e.g. `ModelViewer.tsx`)
  say so explicitly in a leading comment instead.
- `MEDIA_ROOT` local disk storage is dev-only - flag before this goes to
  production (needs S3/blob storage).

## Non-goals / Limitations

- Does not do CAD conversion, quantity takeoff, or BOQ-linking - see "Owns
  vs. does not own" above.
- Does not do DXF/DWG or PDF drawing takeoff - later, separate passes.
- No automated frontend tests for this module yet - verified manually
  (upload/list/view/delete through the running app). A Vitest suite exists
  platform-wide as of this writing; add coverage here in a follow-up pass.

## See also

- `../engineering-principles/SKILL.md`
- `../platform-guidelines/references/platform-architecture.md`
