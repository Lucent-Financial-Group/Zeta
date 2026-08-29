---
id: 081M171S4DT087G0R003CBCEWE
type: task
state: backlog
priority: P1
slug: build-time-map-filter-chain-fusion
title: "Build-time map/filter chain fusion"
created: 2026-08-29T09:00:00.000Z
depends_on: []
composes_with: []
---

# Build-time map/filter chain fusion

ROADMAP P1 asked for fused `StepAsync` on map/filter/map chains at
`Circuit.Build`. Explicit `FilterMap`/`MapMap` already existed; `Build`
did not rewrite composed `Map`/`Filter` calls.

## What landed

- `Circuit.Build` runs a fanout-1 rewrite: the consumer absorbs the
  producer (`Map∘Map`, `Map∘Filter`, `Filter∘Map`, `Filter∘Filter`).
- Producer `IsFuseSkipped`; its `StepAsync` is a no-op. Consumer walks
  the source span once via `ForEachMapped` / `ForEachKept`.
- Shared producers (fanout > 1) are left alone.
- IL-emit of a single fused method is **not** this slice.

## Anchors

- Stream fusion (Gill, Launchbury, Peyton Jones) — eliminate intermediate
  structures
- Feldera / rustc monomorphization of operator chains
