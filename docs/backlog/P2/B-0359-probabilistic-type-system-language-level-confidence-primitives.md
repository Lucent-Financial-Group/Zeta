---
id: B-0359
priority: P2
status: open
title: "Probabilistic type system — language-level confidence primitives (Hejlsberg/Syme lineage)"
effort: XL
created: 2026-05-09
last_updated: 2026-05-09
depends_on: [B-0358]
classification: research
decomposition: needs-decomposition
owners: [architect]
type: feature
tags: [type-system, probabilistic, research, language-design, bayesian]
---

# B-0359 — Probabilistic type system research arc

## What

Research trajectory: make probability flow across the entire
type system so "sharp" (bool/certainty) becomes impossible
without explicitly opting into a degenerate distribution.

Aaron 2026-05-09: *"imagine bools don't exist, they are just a
special case of a distribution that is either 0 or 1"* +
*"this is the lineage of Anders Hejlsberg — what he wanted to
do with C#/F# with Don Syme but they have not done it yet,
across the board to anything sharp to make probability flow
and the entire language not possible of sharp."*

## Lineage

- **Anders Hejlsberg** (C# designer) + **Don Syme** (F# designer):
  the vision of probabilistic types at the language level
- **Probabilistic programming languages**: Pyro, Stan, Gen.jl,
  Church, Anglican, Edward — DSLs on top of existing type systems
- **Zeta's ZSet algebra**: weights already ARE the confidence
  primitive (weight 1 = sharp, weight 0.7 = round)
- **B-0358**: incremental step (API returns float instead of bool)

## Research questions

1. Can F#'s type system express "all returns are distributions"
   without a language fork? (Computation expressions +
   custom operators may suffice)
2. What's the query-language surface? If Zeta ships a SQL-like
   frontend, do WHERE clauses return probability-weighted rows?
3. How does this compose with the DBSP retraction algebra?
   (Retractions as negative probabilities = signed measures)
4. What's the relationship to quantum type systems?
   (Superposition = distribution over basis states)

## Not in scope for B-0358

B-0358 is the incremental API fix (bool → float returns).
This item is the longer research arc — making the TYPE SYSTEM
itself probabilistic, not just the API layer.

## Composes with

- B-0358 (bool → float API returns — prerequisite)
- `src/Core/ZSet.fs` (weights as confidence primitive)
- `src/Core/SignalQuality.fs` (gradient falsifiability)
- `src/Core/Veridicality.fs` (provenance scoring)
- Measure-theory foundations in `src/Core/NovelMath.fs`
