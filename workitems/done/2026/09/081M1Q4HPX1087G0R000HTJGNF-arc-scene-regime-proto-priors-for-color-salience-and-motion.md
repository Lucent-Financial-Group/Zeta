---
id: 081M1Q4HPX1087G0R000HTJGNF
type: task
state: done
priority: P2
slug: arc-scene-regime-proto-priors-for-color-salience-and-motion
title: "ARC scene regime proto priors for color salience and motion"
created: 2026-09-04T21:17:43.713Z
depends_on: []
composes_with: []
---

# ARC scene regime proto priors for color salience and motion

## Problem

The coordinate policy treats every visible component as equally likely to be
useful. It cannot distinguish a rare high-boundary object from background-like
decoration, and it has no temporal vocabulary for motion, recoloring, shape
change, split/merge, or appearance/disappearance. Exact frame fingerprints
would merely memorize levels and fail the one-shot objective.

## Smallest Slice

1. Derive deterministic, grid-only color and component observations.
2. Produce a translation-tolerant scene-regime fingerprint rather than an
   exact frame identity.
3. Diff adjacent observations into typed proto-sense events for color, shape,
   density, topology, and motion.
4. Convert structural evidence into a normalized coordinate prior without
   reading engine state.
5. Compare it with the existing object-centroid control on unseen synthetic
   scenes and retain the control as production policy unless the new layer
   earns promotion.

## Acceptance

- Palette-index relabeling preserves structural scores while actual color
  identities remain available for within-game learning.
- Pure translation reports motion without reporting a shape mutation.
- Recoloring, shape change, split/merge, and appearance/disappearance are
  separately observable.
- Forecasts are deterministic, finite, unique by coordinate, and normalized.
- Tests include held-out transformations and a mutant that memorizes exact
  coordinates or palette values.
- No ARC engine internals, external model, clock, or random source enters the
  feature path.

## Result

Implemented in `src/Arc.Python/zeta_arc/scene_priors.py` with 16 focused
falsifiers and a generator-owned benchmark artifact. The feature boundary now
separates:

- palette regime from translation-invariant structure and coarse 4x4 place;
- color occupancy and object-edge density;
- pixel change density, translation, recoloring, shape change, split/merge,
  appearance/disappearance, and background recoloring;
- transferable structural evidence from within-game, palette-scoped Beta
  outcome evidence.

The controlled next-mover task measures 40/40 for the proto prior versus 20/40
for the object-centroid control under persistent motion. Its required
counterexample measures 0/8 versus 4/8 when the mover switches. Therefore the
feature layer is complete, while promotion into the acting policy is explicitly
not earned by this slice. No hosted ARC score was measured.
