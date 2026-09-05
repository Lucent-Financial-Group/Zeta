# FVS-Conditioned Gaussian Query — Implementation Contract

> **Decision:** Implement feedback-vertex-set conditioning only as a finite, read-only query for the declared linear-Gaussian `MultilayerBnn` topology. It may report exact means and covariance diagonals when its conditioned factor graph is acyclic and every required tree run converges. It must not claim an order-independent evidence **input** unless the caller supplies a canonical evidence-derived network state.

**Status:** Implemented and independently checked on the finite declared four-layer loopy witness. This contract refines, rather than replaces, the reviewed feedback-message-passing specification in `2026-09-03-loopy-variance-correction-spec-feedback-message-passing-over-the-factor-graph-fvs.md`.

## 1. Input and output boundary

The new API accepts the existing `Network`, tolerance, tree-run cap, and FVS budget. It returns a `FactorGraphUpdate` carrying the unchanged network, corrected marginals, aggregate tree-run count, `Converged = true`, exactness `ExactLoopyViaFvs k`, and the selected feedback vertex indices. It is a **query**: it does not absorb an observation, alter the network, change the plain loopy BP API, or merge evidence.

The existing network's layer-zero posterior may have been formed by arrival-order floating-point accumulation. Therefore, even a deterministic FVS query only has bit-identical outputs for bit-identical network inputs. The canonical CRDT evidence-query adapter supplies a different, TypeScript-only finite query boundary; it has not yet been bridged to `MultilayerBnn`. This implementation must expose no system-wide out-of-order conclusion claim.

## 2. Declared FVS topology

The FVS is defined on the **conditioned bipartite factor graph**, not on cancellation-sensitive zeros in the realised precision matrix. With feedback set `F`, a sum link `x_c = Σ x_p + w` is transformed as follows.

| Condition | Conditioned factor |
|---|---|
| `c ∉ F`, some parents in `F` | Retain `c` and non-feedback parents; shift the sum-link offset by the assigned feedback-parent sum. |
| `c ∈ F`, some parents outside `F` | Retain only non-feedback parents; create a sum-constraint factor whose target is the assigned child minus feedback-parent offset. |
| All incident variables in `F` | Omit the zero-neighbor conditioned factor from tree runs; its information stays in the feedback block of the full declared joint precision. |

The implementation must test acyclicity after this conditioning. A set that leaves a cycle is a named refusal, never an approximate result labeled exact.

## 3. Finite algorithm

For `F = {f₁,…,fₖ}` and `T = V \ F`, run the conditioned tree graph at assignment `0` and at each unit assignment `e_j`. Let `μ_T(0)` and diagonal variances `P^T_ii` come from the zero assignment. Define feedback gains `G_ij = μ_i(e_j) − μ_i(0)`.

Using the already validated full declared joint precision and information vector, form

`J̃_F = J_F + J_FT G`, `h̃_F = h_F − J_FT μ_T(0)`, `P_F = J̃_F⁻¹`, and `μ_F = P_F h̃_F`.

Then return `μ_T = μ_T(0) + G μ_F` and `P_ii = P^T_ii + G_i P_F G_iᵀ`, alongside the feedback-block marginals. The full joint precision is used only for the finite `k × k` feedback solve, after Cholesky positive-definite validation.

For up to 20 layers, select the lexicographically first smallest FVS found by exhaustive subsets through the caller's budget. For larger networks, use a declared-topology greedy heuristic with deterministic lower-index ties. In either case, failure to find a set at or below the budget returns an error that names the budget and the selection mode. It does not pretend to know a minimum `k` after a budget-limited search.

## 4. Required controls and refusal conditions

| ID | Requirement | Falsifier |
|---|---|---|
| FVS-1 | Acyclic network delegates to current per-edge BP and is bit-identical. | A spurious correction changes an acyclic receipt. |
| FVS-2 | The declared four-layer loopy skip topology matches the independent dense joint solve in all means and covariance diagonals. | Remove `G_iP_FG_iᵀ`; variance control fails. |
| FVS-3 | A deliberately incomplete feedback set is refused after conditioned-graph acyclicity check. | Omitting the check produces a mismatch with dense covariance. |
| FVS-4 | The selected set depends only on declared topology and budget. | A link-variance/cancellation mutation changes a small-network exhaustive set. |
| FVS-5 | Insufficient tree-round cap and insufficient FVS budget fail closed. | Returning any `ExactLoopyViaFvs` receipt fails the control. |
| FVS-6 | Query is pure and repeatable for a fixed network input. | A second query changes network or receipt bits. |

An independent Python joint-precision oracle and a deliberate correction-term mutant are mandatory before any result claim. The FVS method does not establish a non-Gaussian posterior, EP/VMP correctness, generic loopy-BP variance correctness, or a CRDT state merge.

## 5. Measured finite result

The declared four-layer skip topology selects the lexicographically first minimum feedback set `[0; 1]` under the exhaustive 20-layer selection rule. The production F# implementation runs three conditioned tree queries in nine aggregate rounds and returns `ExactLoopyViaFvs 2`. Its means and covariance diagonals agree within `1e-10` with the independently authored Python joint-precision inversion.

| Quantity | Exact dense / FVS | Converged ordinary BP |
|---|---:|---:|
| Means | `(2.72, -0.32, 0.48, 1.44)` | Equal within `4.02e-14` L¹ |
| Variances | `(0.136, 0.296, 0.416, 0.744)` | `(0.1552013323, 0.3647188608, 0.4988284112, 0.6876474916)` |
| Variance L¹ difference from exact | `0` | `0.2271011127` |

The finite controls reject a one-vertex feedback budget and a one-round conditioned-tree cap. An acyclic sequential network delegates to the existing exact per-edge query with an empty feedback set. Re-running the FVS query returns bit-identical Gaussian natural parameters for an unchanged input network.

The cross-verifier now reports 11 production-F#/Python comparisons, 19 production-only receipt controls, and 3 independent-oracle mutation controls. Its existing channel-variance and exact-dense double-count mutations each change four means and four covariance diagonals, while the coupling-sign mutation intentionally changes four means and zero covariance diagonals. This does not implement a runtime “correction removal” switch: the FVS-versus-independent-dense covariance comparison is the non-vacuous correction sentinel.

## 6. References

[1] [Liu, Chandrasekaran, Anandkumar, and Willsky, “Feedback Message Passing for Inference in Gaussian Graphical Models,” IEEE TSP 2012](https://doi.org/10.1109/TSP.2012.2199108)

[2] [Weiss and Freeman, “Correctness of Belief Propagation in Gaussian Graphical Models of Arbitrary Topology,” Neural Computation 2001](https://doi.org/10.1162/089976601300014556)

[3] [Kschischang, Frey, and Loeliger, “Factor Graphs and the Sum-Product Algorithm,” IEEE TIT 2001](https://doi.org/10.1109/18.910572)
