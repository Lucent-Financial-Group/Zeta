---
id: 081M1QF8C01087G0R0019EJ17J
type: task
state: done
priority: P1
slug: arc-scene-feedback-controller-separates-persistent-identity
title: "ARC scene feedback controller separates persistent identity from turn events"
created: 2026-09-05T00:24:51.969Z
completed: 2026-09-05T00:49:50Z
depends_on: []
composes_with: ["081M1Q4HPX1087G0R000HTJGNF"]
---

# ARC scene feedback controller separates persistent identity from turn events

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1QF8C01087G0R0019EJ17J-*.md` glob. -->

## Problem

The first scene-prior slice distinguishes color, shape, edge, occupancy, and
motion signals, but learned outcome evidence is keyed only by color and callers
must manually close the action/outcome loop. A useful invariant can therefore
be observed without becoming durable evidence, while a terminal action can end
before its outcome is credited.

The technical part of the attached `meno` discussion supplies a useful split:
the event is what changed this turn; the model is what remains after those
events are integrated. This task makes that split executable without treating
the source conversation as policy or evidence.

## Acceptance

- Color evidence remains scoped to a game and palette regime.
- Shape evidence survives recoloring and translation but remains scoped to a
  game fingerprint.
- A controller exposes explicit observe, choose, and outcome operations; no
  terminal outcome depends on a later action call.
- Each completed turn records the prior observation, selected coordinate,
  measured outcome, and resulting evidence without consulting engine state.
- A generated benchmark compares the controller with the existing click policy
  under a stable feature and a feature switch, reporting both the supported
  case and the counterexample.
- Existing click and hosted behavior stays unchanged until the benchmark earns
  a separately reviewed promotion.

## Landed

- `scene_priors.py` now learns color and translation-invariant shape outcomes
  under distinct scopes. Color resets with the palette regime; shape survives
  recoloring and translation but does not cross the game fingerprint.
- `scene_feedback.py` owns the explicit coordinate-policy port adapter. Its
  controller retains an immutable evidence model and at most one pending turn;
  completed turn receipts are returned instead of accumulated internally.
- `LayeredAgent.observe` credits terminal frames, so the final successful
  coordinate action cannot disappear merely because no later `act` call occurs.
- `scene-feedback-benchmark.json` records six-episode action counts against the
  existing centroid policy:
  - stable color: 7 vs 12 actions;
  - stable shape across palettes: 8 vs 12;
  - switched color: 11 vs 15, including a 5-action first switch;
  - switched shape: 11 vs 13, including a 3-action first switch.

## Limits

The measurements are synthetic and source-owned, not ARC leaderboard results.
They demonstrate narrow transfer and its adaptation cost. They do not justify
changing the hosted default, so the scene adapter remains explicitly injected.

## Verification

- ARC Python suite: 171 passed.
- Python lint: Ruff check/format and mypy passed for both Python projects.
- `bun run preflight:quick`: 16/16 passed.
- `bun run preflight`: 18/18 passed, including Release build and full tests.
