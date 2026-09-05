---
id: 081M1SC3ADK087G0R001M8YKBS
type: task
state: in-progress
priority: P2
slug: keepnone-unpin-survives-volume-reopen-without-a-pump
title: "KeepNone unpin survives volume reopen without a pump"
created: 2026-09-05T18:08:09.652Z
depends_on:
  - 081M1SAMBMM087G0R000E7JVEB
composes_with: []
---

# KeepNone unpin survives volume reopen without a pump

`applyRetention` persists pin bits in `known.pins`. Reopen loads that
catalog and auto-enqueues orphan reclaim. A crash between freeze B and
`pumpReclaim` must not resurrect generation A.

Falsifier: `KeepNone`; freeze A; freeze B; dispose without pumping;
reopen; `pumpReclaim`; A is not readable; B is. Replay restores both
commits; catalog pin bits are what reclaim obeys.
