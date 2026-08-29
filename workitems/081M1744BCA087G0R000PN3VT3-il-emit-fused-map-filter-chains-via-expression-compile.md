---
id: 081M1744BCA087G0R000PN3VT3
type: task
state: backlog
priority: P1
slug: il-emit-fused-map-filter-chains-via-expression-compile
title: "IL-emit fused map/filter chains via Expression.Compile"
created: 2026-08-29T16:02:35.018Z
depends_on: []
composes_with: []
---

# IL-emit fused map/filter chains via Expression.Compile

Homogeneous same-key Map/Filter chains compile to one
`DynamicMethod` at `Circuit.Build` (`FuseEmit.compile`). One
`Invoke` per element for the whole chain. Heterogeneous Map
(key type changes) stays on nested closures.

Beacon: Expression trees / DynamicMethod (LINQ `Expression.Compile`).
