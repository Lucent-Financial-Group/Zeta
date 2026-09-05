---
id: 081M1S440QQ087G0R00218K9AM
type: task
state: done
priority: P2
slug: reopen-enqueues-orphan-reclaim-without-waiting-for-next-free
title: "Reopen enqueues orphan reclaim without waiting for next freeze"
created: 2026-09-05T15:48:43.895Z
completed: 2026-09-05T16:19:55.226Z
depends_on: []
composes_with:
  - 081M1S2N2A0087G0R003FJ60D3
---

# Reopen enqueues orphan reclaim without waiting for next freeze

`known.pins` survives dispose (#16672). The freeze-byte meter does not.
`pacer(0)` spends a 0-byte budget and deletes nothing, so a leftover
orphan would sit until the next successful freeze refilled the meter.

On Volume construct, after `loadCatalog`, if Known-not-LivePins CAS
files exist, enqueue a DoP=1 reclaim boat whose budget is the sum of
those leftover sizes. Empty catalog must not enqueue. Manual volumes
still `pumpReclaim`. Meter persist / dual-slot `known.pins` is a later
peel.

Falsifier: freeze A → crash leftover → dispose → reopen → `pumpReclaim`
without a new freeze deletes the leftover; A stays readable.
