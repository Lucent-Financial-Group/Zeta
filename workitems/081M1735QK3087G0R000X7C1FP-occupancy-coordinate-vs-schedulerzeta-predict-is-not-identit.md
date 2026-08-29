---
id: 081M1735QK3087G0R000X7C1FP
type: task
state: backlog
priority: P1
slug: occupancy-coordinate-vs-schedulerzeta-predict-is-not-identit
title: "Occupancy coordinate vs SchedulerZeta.predict is not identity"
created: 2026-08-29T15:45:51.715Z
depends_on: []
composes_with: []
---

# Occupancy coordinate vs SchedulerZeta.predict is not identity

Ferry remaining: occupancy is a count of filled FourCorner slots,
not an identity. `SchedulerZeta.predict` / `runToHorizon` require an
injective key on the reachable set. Occupancy-keyed predict collapses
distinct fillings that share a count; `cornersKey` (the I/O record)
does not.

Beacon: numerology-vs-number-theory (a count is not an identification).
