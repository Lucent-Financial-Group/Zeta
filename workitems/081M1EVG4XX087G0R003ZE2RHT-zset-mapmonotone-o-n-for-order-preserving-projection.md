---
id: 081M1EVG4XX087G0R003ZE2RHT
type: task
state: backlog
priority: P1
slug: zset-mapmonotone-o-n-for-order-preserving-projection
title: "ZSet.mapMonotone O(n) for order-preserving projection"
created: 2026-09-01T16:05:39.901Z
depends_on: []
composes_with: []
---

# ZSet.mapMonotone O(n) for order-preserving projection

`ZSet.map` always sort+consolidates (O(n log n)). Feldera Nexmark Q1 is
`price * k` on a sorted int key — order-preserving. Caller-asserted
`mapMonotone` coalesces adjacent images in O(n) and skips the sort.

Acceptance:

- `mapMonotone f` equals `map f` when `f` is non-decreasing.
- Colliding images (`x / 2`) coalesce.
- Circuit `MapMonotone` matches `Map` on `x * 2`.
- `mapMonotone` allocates no more than `map` at N=256.

Do not silently change `Map` — arbitrary `f` can reorder. Wire Feldera.Bench
Q1 after ingest #16252 lands.
