# Adinkra-Equivariant Bayesian Factor Layer: Pre-Implementation Contract

**Status:** Measured; bounded integration accepted
**Date:** 2026-09-01
**Author:** Manus AI
**Register:** Finite algebra and probabilistic-computation witness

> **Key recommendation:** Call the reusable learning substrate the **composable Bayesian factor graph**, with `MultilayerBnn.Topology.Dag` treated as a Gaussian factor-DAG model adapter rather than the system’s defining name. The finite Adinkra decomposition is ready for one real use: an exact, typed **sector-routing factor layer** for sixteen independent Gaussian feature beliefs. It is not a learner, and the noncanonical 128-coordinate half-spin embedding must remain outside the default Bayesian path.

## 1. Question and Practical Threshold

The prior census established a concrete finite representation map and a central `8+8` source decomposition. This contract asks whether that algebra can do real probabilistic work: can it transform uncertain 16-coordinate observations into composable Bayesian messages while preserving the declared generator action and without fabricating independence?

The answer is **yes, narrowly**. The implemented adapter preserves every scalar Gaussian mean and variance, states that its input is an independent family, is invariant under source representative choice, never asks for a target selector, leaves the pure factor graph unchanged, and refuses malformed source algebra before Bayesian conversion. It does not transform covariance matrices, estimate weights, or improve predictions by itself.

## 2. Terminology

| Repository object | Correct bounded name | Reason |
|---|---|---|
| `FactorGraph<'M>` + `IMessage<'M>` + BP/EP factors | **Composable Bayesian factor graph** | Generic bipartite graph of variables and factors; messages compose through a declared family algebra |
| `MultilayerBnn.Topology.Dag` | **Gaussian factor-DAG model adapter** | It declares parent sets, but its hand sweeps are approximate for multi-parent cases; the per-edge factor-graph route is the reusable inference path |
| `ToyBosonFermionBnn` | **Diagonal-Gaussian Bayesian probit classifier** | It has a weight posterior, feature map, Bernoulli output, and ADF/EP update |
| `AdinkraEquivariantFactorLayer` | **Adinkra-equivariant Gaussian factor layer** | An exact sign-sector partition and factor-root adapter, not a neural network and not a posterior estimator by itself |

Factor graphs and Bayesian-network DAGs are related but not synonymous. A factor graph is bipartite and represents a factorization directly; a Bayesian network is a directed acyclic generative factorization.[1] Zeta’s generic message algebra and `FactorGraph<'M>` are therefore the architectural center. The historical `Bnn` filenames remain compatibility names until a separately reviewed rename.

## 3. Declared Algebraic Input

Reuse the exact coded-Adinkra source action from the merged finite-intertwiner census:

```text
M = F^16
A_i = L_i L_0,  i = 1,…,7
ω = A_1 A_2 ··· A_7
P_+ = (I + ω)/2
P_- = (I - ω)/2
```

Over the two already declared odd prime fields, `ω` is a central involution and the projectors have ranks `8+8`. The production Bayesian adapter will operate over real-valued moments, using the same integer signed-permutation `ω`. It must not import test-oracle matrices or finite-field golden counts.

The ordered generator word is part of the schema. Reversing seven anticommuting generators negates the word and swaps the labels `+` and `−`; therefore the unordered sector pair is intrinsic to the declared action, while the labels require an orientation convention.

## 4. Uncertainty-Preserving Feature Transform

The input is a vector of sixteen independent scalar Gaussian feature beliefs:

```text
x_j ~ N(μ_j, v_j),  j = 0,…,15.
```

The first implementation assumed that `ω` consisted of two-cycles and proposed mixed coordinates `(x_a ± s x_b)/√2`. The first round-trip test falsified that assumption immediately: in the canonical coded-coset basis, the measured source central word is **diagonal**, with eight `+1` and eight `−1` coordinates. The implementation was replaced rather than patched around.

```text
I_+ = {1,2,4,7,8,11,13,14}
I_- = {0,3,5,6,9,10,12,15}
y_j = x_j, with sector label sign(ω_jj).
```

The exact transformed moments are therefore

```text
E[y_j] = μ_j
Var[y_j] = v_j.
```

No covariance is created or discarded because no coordinate mixing occurs. The exactness boundary is instead the existing message family: the input is explicitly sixteen independent scalar Gaussian beliefs. A correlated multivariate Gaussian would require a different message type and is not accepted by this adapter.

## 5. Bayesian Integration Surface

The proposed adapter will expose a hexagonal boundary with three operations:

| Operation | Output | Claim |
|---|---|---|
| `trySectorize` | Eight `+` and eight `−` Gaussian features plus orientation metadata | Exact partition in the measured central eigenbasis |
| `tryAddPriorFactors` | A `FactorGraph<Gaussian>` with stable variable identifiers and unary prior factors | Real use of the existing inference substrate |
| `tryToFactorDagLayer` | A declared parent-layer descriptor for composition above or below other factors | Topology/schema integration only; no learning claim |

The adapter does not train weights. Learning remains in BP/EP factor updates or a classifier such as `ToyBosonFermionBnn`. A later weighted model may consume these sectorized features, but this result does not call an unchanged posterior “improved” without a held-out measurement against the pure-feature baseline.

## 6. Target Commutant Group Census

For each `64`-dimensional target central sector, the prior exact census measured a `64`-dimensional commutant algebra and multiplicity eight. The follow-on measurement will construct its action on the eight-dimensional Hom coefficient vector.

Exact inversion of the induced 64-dimensional commutant-action basis reconstructs all 64 matrix units on each sector with zero action violations. The measured algebra and its unit group are

```text
End_A(S+) ≅ Mat(8,F_p) ⊕ Mat(8,F_p)
Aut_A(S+) ≅ GL(8,F_p) × GL(8,F_p).
```

The action is transitive on pairs of nonzero sector coefficient vectors, so all full-rank embeddings lie in one target-module automorphism orbit. The group order, nonzero-vector orbit, and stabilizer arithmetic agree between TypeScript and an independent Rust implementation over both primes and representative controls. A deleted multiplicity coordinate has rank 56 and is rejected as singular; a target generator has rank 64 but 384 commutator violations and is rejected as non-commuting.

Even if measured, this is a finite module automorphism group only. It is not a physical gauge group or a symmetry of agents.

## 7. Integral-Lattice Selector Census

The 64 minimum-support selectors will be reconstructed over the integers. For each, measure:

| Invariant | Purpose |
|---|---|
| Primitive column lattice / Smith invariants | Test whether integer saturation selects a subset |
| Frobenius norm and support | Test minimum-norm and minimum-support ties |
| Signed-permutation equivalence | Test whether integer target automorphisms move candidates |
| Orientation reversal | Test whether the ordered central-word convention changes the selected labels |

All 64 candidates have support 256, Frobenius norm squared 256, and a selected nonzero `16×16` minor of absolute determinant 256. Every candidate has rank 8 modulo 2, so none has a primitive column lattice. The tested primitive, minimum-support, and minimum-norm rules therefore remain 64-way ties.

The 128 integral signed-permutation commutant basis maps generate eight measured orbits of size eight on these candidates; they do not collapse the set to one integral orbit. Reversing the central-word orientation swaps the sector labels and preserves the unordered candidate set. The independent Rust oracle agrees on determinant, mod-two rank, primitive count, and orbit partition. These are obstructions for the tested lattice selectors, not a universal nonexistence theorem.

## 8. Machine-Checked Theorem Boundary

Lean will certify the algebraic projector laws over a ring in which `2` is invertible. From seven declared anticommuting generators with squares `−1`, the intended theorem surface is:

```text
ω A_i = A_i ω
ω² = 1
P_±² = P_±
P_+ P_- = P_- P_+ = 0
P_+ + P_- = 1
A_i P_± = P_± A_i.
```

`Lean4.AdinkraCentralProjectors` now derives all displayed laws from explicit pairwise anticommutation and generator-square hypotheses. It does not assume a central `ω` or `ω²=1`. The module is imported by the default Lean target; the full `lake build Lean4` succeeds, and the protected workflow now runs a crash-aware axiom audit that denies both `sorryAx` and unresolved theorem names. Computed ranks `8`, `64`, Hom dimensions, and Bayesian behavior remain outside the theorem.

## 9. Controls and Decision Rules

| Control | Required outcome |
|---|---|
| Pure Gaussian factor graph without sectorization | Same baseline inference behavior as before |
| Independent scalar Gaussian family | Exact unchanged beliefs partitioned into `8+8`; round trip reproduces all moments |
| Correlated multivariate input | Outside this scalar-message adapter; no covariance matrix is accepted or silently diagonalized |
| Source representative change | Same unordered sectorized result after declared basis transport |
| Generator-order reversal | Swaps sector labels and preserves the unordered pair |
| One-coordinate sign fault | Fails source Clifford/central checks before Bayesian conversion |
| Selector change | Source-sector Bayesian output unchanged; target-coordinate output is selector-labelled |
| Out-of-order factor insertion | Same marginal under the generic commutative message product |
| Singular commutant candidate | Rejected as a group element |
| Non-commuting target map | Rejected by exact commutator check |

The integration is accepted as real because exact source-sector beliefs enter the existing `FactorGraph<Gaussian>` as replayable prior factors while every declared unsafe boundary is surfaced. Ten focused F# tests cover round trip, factor insertion, representative invariance, orientation reversal, malformed algebra, pure-factor baseline, and teaching errors. TypeScript independently freezes the same source-sector fingerprint. No accuracy, calibration, or sample-efficiency improvement is claimed without a separate dataset and null-controlled study.

## 10. Explicit Non-Claims

This program does not establish that Bayesian beliefs are spinors, that agents are qubits, that the factor graph has consciousness, or that the finite algebra describes physical particles. It does not make the half-spin embedding canonical. It does not repair the measured unit-dependence in `CliffordAntiSybil`, and that module must not be used as validation for this adapter. It does not measure regularity or homoiconicity.

## References

[1]: https://www.youtube.com/watch?v=fXD6KJB1U20 "Philipp Hennig, Probabilistic ML — Lecture 17: Factor Graphs"
[2]: https://arxiv.org/abs/2109.14218 "Sun et al., Equivariant Neural Network for Factor Graphs"
[3]: https://arxiv.org/abs/2111.13139 "Dax et al., Group equivariant neural posterior estimation"
[4]: https://proceedings.iclr.cc/paper_files/paper/2025/hash/c7138635035501eb71b0adf6ddc319d6-Abstract-Conference.html "Lawrence et al., Improving Equivariant Networks with Probabilistic Symmetry Breaking"
