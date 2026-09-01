---
id: 081M1EYFVPS087G0R002742ZQX
type: bug
state: backlog
priority: P2
slug: weightedcount-is-a-4-way-scalar-unroll-not-simd-sum
title: "weightedCount is a 4-way scalar unroll, not Simd.Sum"
created: 2026-09-01T16:57:56.185Z
depends_on: []
composes_with: []
---

# weightedCount is a 4-way scalar unroll, not Simd.Sum

Naledi P0.4: `docs/BENCHMARKS.md` and the `weightedCount` docstring said
`Simd.Sum` / TensorPrimitives. The body is `Checked.(+)` 4-way unroll
because AoS `ZEntry<'K>` cannot be `MemoryMarshal.Cast` to a weight
span. `Simd.Sum` exists and is unused.

Acceptance: docstring + BENCHMARKS.md name the scalar unroll. Do not
wire `Simd.Sum` in this bug — that needs a measured SoA path.
