---
id: 081M1TB7K9F087G0R001FMKH0M
type: task
state: in-progress
priority: P2
slug: add-cross-domain-frame-signals-over-emulator-observations
title: "Add cross-domain frame signals over emulator observations"
created: 2026-09-06T03:12:15.663Z
depends_on: []
composes_with: []
---

# Add cross-domain frame signals over emulator observations

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TB7K9F087G0R001FMKH0M-*.md` glob. -->

## Scope

Add a source-owned F# reducer over `GameEnvironment.Frame` for color
occupancy, connected foreground components, exposed edges, normalized shapes,
and frame-to-frame pixel changes. The reducer may inspect rendered palette
cells only; emulator state, game identity, rewards, and reference answers are
outside the port.

## Acceptance

- Invalid frames return typed feedback rather than throwing.
- Ratios use deterministic integer basis points.
- Normalized component shapes survive translation and palette relabeling.
- A temporal comparison distinguishes movement-like background crossings from
  direct foreground recoloring.
- The result carries exact work and retained-coordinate receipts, without
  claiming CLR heap size or wall-clock performance.
- Focused tests exercise crafted frames and source-owned CHIP-8 carts.

## Non-goals

This slice does not claim ARC benchmark improvement, cross-game transfer, or a
general learned model. A later treaty can compare this F# contract with the
existing Python scene-prior implementation.
