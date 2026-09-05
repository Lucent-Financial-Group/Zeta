---
id: 081M1QK58ZQ087G0R000Z73GH0
type: task
state: backlog
priority: P2
slug: freeze-reclaimsweep-owns-the-journal-under-storedir
title: "Freeze reclaimSweep owns the journal under StoreDir"
created: 2026-09-05T01:33:04.887Z
depends_on: []
composes_with: []
---

# Freeze reclaimSweep owns the journal under StoreDir

`ZetaFsFreeze.reclaimSweep` is the volume door for journaled reclaim.
Journal path is `StoreDir/sweep.journal`, not invented by the caller.
Still `toy`: not on the freeze boat / not auto-ticked.
