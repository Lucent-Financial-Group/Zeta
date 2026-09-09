---
id: 081M23M0MVD087G0R003NR0ET1
type: task
state: backlog
priority: P2
slug: reflective-4-21-in-the-only-register-the-geometry-supports-r
title: "Reflective 4_21 in the only register the geometry supports: root-quantised views, two-sided, 768 faces declared sideless"
created: 2026-09-09T17:38:54.957Z
depends_on: []
composes_with: []
---

# Reflective 4_21 in the only register the geometry supports: root-quantised views, two-sided, 768 faces declared sideless

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M23M0MVD087G0R003NR0ET1-*.md` glob. -->

## Why this is scoped the way it is

Aaron asked "will that work for a mirror?". Measured answer, from
`docs/research/2026-09-09-rung-7-*.md` §7.1 and pinned by falsifiers in
`tests/Tests.FSharp/E8Render.Tests.fs`:

- **A mirror in the scene reflecting our object already works** — secondary rays are
  ordinary rays. Nothing to build; worth a demo.
- **Our object BEING a mirror has three obstacles**, and two of them are properties of 4_21
  rather than gaps in the renderer:
  1. **768 of 60,480 projected faces (1.27%) have no determinable front side** — their plane
     contains the origin. Not a tolerance artefact: the smallest non-zero origin-to-plane
     distance is 0.002329. And every edge carries 27 faces, so there is no global inside.
  2. A view-dependent term breaks the five-level precompute — but **less badly than
     expected**: on a ROOT view the whole surface still takes at most five specular values,
     so a reflective 4_21 is one five-entry table PER VIEW, 240 of them, ~14 MB total.
  3. **Exactness ends at the camera.** The specular denominator is `48 * sqrt(8|V|^2)`,
     rational exactly when `8|V|^2` is a perfect square — true for a root, false in general.

## What to build

Exactly one register, and say so in the type: **root-quantised view directions, two-sided
reflection, and the 768 sideless faces declared rather than shaded**. A free camera or a
claimed orientable mirror surface is not a feature we have not got to; it is a claim the
geometry does not support.

## Falsifiers this must carry

- the per-view specular table is <= 5 entries for every one of the 240 root views;
- a non-root view is REFUSED, not silently approximated;
- the 768 sideless faces are enumerated and excluded by name, never quietly shaded.

