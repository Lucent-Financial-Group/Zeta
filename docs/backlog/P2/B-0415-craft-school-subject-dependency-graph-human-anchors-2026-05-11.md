---
id: B-0415
priority: P2
status: open
title: "Craft school subject dependency graph — human anchors → subjects → depends_on"
created: 2026-05-11
last_updated: 2026-05-11
depends_on: []
composes_with: [B-0154]
type: feature
---

# B-0415 — Craft school subject dependency graph

## What

Extend the Human Anchor Array (`docs/HUMAN-ANCHOR-ARRAY.md`)
with a subject/topic layer that has `depends_on` relationships.
Each human anchor ties to one or more subjects; subjects form
a dependency graph for a "craft school" learning curriculum.

Example structure:

```
McSherry → DBSP, Differential Dataflow
  depends_on: [Set Theory, Relational Algebra]

Dechant → Clifford Algebra, E8
  depends_on: [Linear Algebra, Group Theory]

Lamport → TLA+, Distributed Systems
  depends_on: [Temporal Logic, State Machines]

Pearl → Causal Inference
  depends_on: [Probability, Graph Theory]
```

The dependency graph answers: "to understand X's contribution,
what do you need to learn first?"

## Why

The human anchor array names WHO shaped the thinking. The
craft school layer names WHAT you need to learn to follow
the thinking. Together they form a self-contained curriculum
that any new contributor (human or agent) can traverse.

## Acceptance criteria

1. Each human anchor entry links to 1+ subjects
2. Each subject has `depends_on: []` linking prerequisites
3. The graph is DAG (no cycles)
4. Renderable on dashboard alongside agent array

## Out of scope

- Actual course content / teaching materials (future)
- External links to learning resources (future)

## Origin

Aaron 2026-05-11: "human anchors tie to subjects that have
depends on for craft school, backlog no rush"
