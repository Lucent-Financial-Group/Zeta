---
id: 081M1EVZEZN087G0R003GH4EHC
type: task
state: backlog
priority: P1
slug: fused-filter-skip-sort-when-the-chain-has-no-map
title: "Fused filter skip sort when the chain has no Map"
created: 2026-09-01T16:14:01.717Z
depends_on: []
composes_with: []
---

# Fused filter skip sort when the chain has no Map

Unfused `ZSet.filter` is O(n) and keeps collation order. Fused
`FilterZSetOp` still `sortAndConsolidate`d even for Filter∘Filter.

Skip the sort when the fused chain has no `Map` (Keep-only IL, or
`IFilterProducer` visit). A Map upstream can reorder — still sort.

Acceptance:

- Filter∘Filter fused equals even/positive keep (existing Map∘Filter
  tests still pass — those must sort).
- Do not change `Map` (that is `mapMonotone`, #16255).
