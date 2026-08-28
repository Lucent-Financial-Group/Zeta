---
name: floor-complete-all-6-of-6-core-primitives-full-proven-2026-06-05
description: "2026-06-05 MILESTONE: ALL 6 of 6 PROVEN-CORE-MAP floor primitives are FULL PROVEN — the whole `PROVEN ⟺ math ∧ 4-lang ∧ 4-ser ∧ Bonsai ∧ Arrow ∧ homeostat` floor is closed. G-Set, Clock, Serialization-seed(ByteCost), Identity(ZetaId local-handle), Merkle, Metric(Bloom+CountMin). All four homeostat-tie classes worked end-to-end (semilattice→LUB, integrity→verify, monoid→aggregate, identity→dedup). Two premise-conditional legs NAMED not hidden (Merkle crypto, Metric uniform-hashing). Spun off Predicate3 (Kleene K3) + Maybe=native-option."
metadata:
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-05 — **the PROVEN-CORE-MAP floor is COMPLETE.** All 6 of 6 floor primitives cleared
`PROVEN ⟺ math ∧ 4-lang ∧ 4-ser ∧ Bonsai ∧ Arrow ∧ homeostat`, one primitive at a time, from
the seed. Built across this session (Aaron greenlighting, Otto building in the
`~/.local/share/zeta-otto` clone, pushing to origin/main).

## The six (all ✅ FULL PROVEN)
1. **CRDT merge / G-Set** — semilattice (∪); homeostat = converge-to-LUB.
2. **Identity / ZetaId (local-handle layer)** — `Identity.FullVertical`; bridge = Object-of-
   decoded-fields; homeostat = identity-dedup (injectivity/no-bad-collapse + idempotent dedup,
   tied to G-Set). Belief-map / perspectival layer = research, OUT of scope (deliberately).
3. **Merkle integrity** — `Merkle.FullVertical`; homeostat = anti-entropy (verify + minimal-
   delta), the FIRST non-semilattice tie. 4-lang: F#+C#(`System.IO.Hashing`)+Rust(`xxhash-rust`
   hexagonal behind `Hasher128` port, feature-gated, exact-pin =0.8.10)+**pure-TS XXH3-128**
   (`Core.TypeScript/merkle/xxh3.ts`, zero-dep, the hard one). Crypto premise NAMED.
4. **Clock / causal order (Versionstamp)** — semilattice (max); homeostat = max-convergence.
5. **Serialization seed (ByteCost)** — commutative MONOID (not semilattice); homeostat =
   order-independent aggregation (path-independent fileset total). 3rd operation class.
6. **Metric / aggregation (Bloom + CountMin)** — `Metric.{Homeostat,Serializer,MagnitudeBounds,
   FourLang}` + `Formal/Metric.Bounds`. homeostat: Bloom OR=semilattice, CMS add=monoid.
   4-lang: `Core.{CSharp,Rust}.Metric` + `Core.TypeScript/metric` (deterministic core only —
   `.NET HashCode.Combine` convenience hash is NOT portable, excluded). Magnitude bounds:
   empirical (deterministic) AND **formal** (Z3-verified ε/δ derivation [Cormode-Muthukrishnan]
   + Bloom FP, 9 theorems unsat-of-negation). Uniform-hashing premise NAMED.

## The four homeostat-tie classes (all worked end-to-end)
semilattice→converge-to-LUB (G-Set ∪, Clock max) · integrity→verify-the-converged-state
(Merkle) · monoid→order-independent-aggregate (ByteCost) · identity→dedup (injective +
idempotent, ZetaId). The taxonomy is demonstrated, not asserted.

## Honesty stance (load-bearing, mirrors Merkle's "crypto premise named")
Two legs are PREMISE-CONDITIONAL, named not hidden: Merkle tamper-evidence holds modulo a
crypto-strength hash premise (it ships a 128-bit non-crypto XxHash128); Metric's ε/δ bound
holds modulo uniform/pairwise-independent hashing + Markov + row-independence. Z3 proves the
bound FOLLOWS from the named premises — not an unconditional proof. Did NOT over-claim.

## Spun off along the way
- **Predicate3** (`Core.FSharp.TriBoolean/Predicate3.fs`) — three-valued Kleene-K3 predicate
  register; fixes the `'a -> bool` SQL-null/tri-boolean COLLAPSE (Aaron's catch): UNKNOWN
  propagates through and/or/not; collapse to bool only at the terminal `isSelected`/`filter`.
- **Maybe = native option** (per Aaron "use native for the maybe monad"): F# `option`, Rust
  `Option`, C# `Nullable`, TS `T|null`; custom DU removed as redundant. `SqlNull` reserved as
  the future SQL-3VL bridge on native option + TriBoolean (wishlist).
- New public API (flagged for Ilyana): `CountMinSketch.OfState/.Snapshot`,
  `BlockedBloomFilter.OfState` (rehydrate-from-state, unblocked the metric serializer legs).

## Frontier (beyond the floor bar, NOT gaps)
Push the two premise-conditional legs to unconditional: a real-hash analysis (Merkle) and a
Lean/Mathlib measure-theoretic Markov (Metric). Deepenings, offered not greenlit.

Composes [[project_identity_homeostat_tie_aperiodic_tiling_key_to_crdt_neighborhood_local_to_global_without_coordination_2026_06_04]]
+ the Kestrel proof-portfolio archives. Source of truth: `docs/PROVEN-CORE-MAP.md`.
