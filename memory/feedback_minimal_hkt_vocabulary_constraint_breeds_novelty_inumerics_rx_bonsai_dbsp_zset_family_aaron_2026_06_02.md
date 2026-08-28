---
name: minimal-hkt-vocabulary-constraint-breeds-novelty
description: Conform everything to the minimal algebra vocabulary (INumerics + Rx/Bonsai-over-DBSP + Z-set/GSet/Bag/IndexedZSet) for max HKT composition; constraining yourself is what makes novel things pop out
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-06-02 (two observations, one discipline): *"not let myself use anything other than INumerics and Rx Bonsai over DBSP +1/-1 zsets and gset and bags and indexed ones … conform everything into that and surrounding interfaces for maximum HKT composition"* + *"constraining yourself is what makes novel things pop out of your brain."*

**The discipline:** default the primitive vocabulary to a minimal algebra set —
- generic-math / **INumerics** (`Zero`/`One`/`(+)`/`( * )`; per [[numerical-algebra-shaped-into-the-generic-math-interface]]) — reached for **sparingly** ("only if it really really makes sense")
- the **±1 Z-set family**: `ZSet` (retraction-native), `GSet`, `Bag`, and **`IndexedZSet`** (which is *already* `Zero`/`(+)`/`(-)` — an additive group AND a Z-set)
- **DBSP** (`Circuit`/`NestedCircuit` incremental dataflow)
- **Rx + Bonsai** (Nuqleon/Reaqtor compact expression-tree serializer for Rx, over DBSP)

Conform everything into these + their surrounding interfaces → **maximum HKT composition** (everything composes via the same higher-kinded interfaces; because everything lands in the same algebra, the indexed-Z-set *is* a number, the message *is* a number, they compose for free).

**Why (the generative part):** the constraint is not restriction-for-its-own-sake — it's **generative**. Forcing every problem into the same small algebra set makes novel compositions *pop out* (Oulipo / poetic-form / design-constraint creativity; the razor as a *generative* tool, not just pruning). Composes [[all-complexity-is-accidental-in-greenfield]] + razor-discipline + [[interfaces-are-the-asset-code-follows-from-types-meijer-rx-and-numerics-as-algebras-dbsp-parametric-not-coerced]].

**Empirically validated this session (B-1000 Infer.NET rewrite):** the elegant decompositions popped out *because of* the constraint — EP turned out to be "just a non-conjugate factor in the existing `runToFixpoint` loop" (not a new engine) because it was constrained to the `FactorGraph`+message-algebra vocabulary; BP turned out to be "just `product`-folds iterated" because the message store was constrained to the generic-math algebra. An open palette would have produced five bespoke engines; the constraint produced one stack of trivially-composing layers.

**Captured:** B-1004 (the discipline + the engine conformance-audit: `FactorGraph`'s ad-hoc `Map<int,Map<int,M>>` → `IndexedZSet` keyed by edge + Z-set deltas + DBSP `passOnce`/`NestedCircuit` fixpoint = the slice-4b incremental form). Caveat: messages are a commutative **group** (product/divide), not a clean `ISemiring` (no ⊕) — conform via generic-math group, don't force a ring.

**How to apply:** when authoring any new primitive/type/op, conform it to the vocabulary by default; an exception is a documented "really really makes sense" justification. The B-1000 message families already conform (generic-math); the factor-graph state is the named refactor.
