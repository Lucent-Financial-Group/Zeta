---
id: 081M1QF8C01087G0R0019EJ17J
type: task
state: backlog
priority: P1
slug: arc-scene-feedback-controller-separates-persistent-identity
title: "ARC scene feedback controller separates persistent identity from turn events"
created: 2026-09-05T00:24:51.969Z
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
