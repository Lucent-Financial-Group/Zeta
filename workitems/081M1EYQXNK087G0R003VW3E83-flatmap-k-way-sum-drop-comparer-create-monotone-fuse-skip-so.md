---
id: 081M1EYQXNK087G0R003VW3E83
type: task
state: backlog
priority: P1
slug: flatmap-k-way-sum-drop-comparer-create-monotone-fuse-skip-so
title: "flatMap k-way sum; drop Comparer.Create; monotone fuse skip-sort"
created: 2026-09-01T17:02:20.339Z
depends_on: []
composes_with: []
---

# flatMap k-way sum; drop Comparer.Create; monotone fuse skip-sort

Naledi P2: `flatMap` pairwise-added (O(n²) when `f` is a singleton).
`ZSet.sum` allocated `Comparer.Create` every call. Fused `MapMonotone`
still sorted even after a Keep-only upstream.

Acceptance:

- `flatMap` of 32 singletons equals `ofKeys` of the images.
- Filter then MapMonotone fused: `x/2` coalesces (2 and 3 → 1 weight 2).
- Existing Map∘Map fusion still sorts (colliding keys).
