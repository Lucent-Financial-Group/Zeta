---
id: 081M1QNN0G5087G0R0003VXYSK
type: task
state: backlog
priority: P2
slug: freeze-reclaimtick-composes-pacer-propose-and-sweep
title: "Freeze reclaimTick composes pacer propose and sweep"
created: 2026-09-05T02:16:37.637Z
depends_on: []
composes_with: []
---

# Freeze reclaimTick composes pacer propose and sweep

`ZetaFsFreeze.reclaimTick` composes pacer (freeze bytes, not wall-clock)
+ propose + `reclaimSweep`. Still `toy`: not a FerryThrottler boat,
not auto-ticked after freezeAsync.
