---
id: 081M1S7ZFMT087G0R0008K0EKV
type: task
state: active
priority: P2
slug: arc-motion-forecasts-can-propose-bounded-future-coordinates
title: "ARC motion forecasts can propose bounded future coordinates"
created: 2026-09-05T16:56:09.626Z
depends_on: []
composes_with: []
---

# ARC motion forecasts can propose bounded future coordinates

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1S7ZFMT087G0R0008K0EKV-*.md` glob. -->

`MotionSense` already computes a one-step constant-velocity prediction, but
`forecast_scene` discards that coordinate after deriving the motion score.

Acceptance:

- projection is an explicit source-owned policy with observed-only as default;
- one-step mode relocates moving-object candidates to their predicted point;
- static objects remain at observed coordinates;
- projected actions are bounded by both the rendered grid and ARC's 0-63
  coordinate contract;
- candidates retain inspectable observed/predicted provenance;
- the scene-feedback controller accepts the policy through its existing port;
- tests prove default compatibility, projection, clamping, and controller use.
