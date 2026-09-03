# Multilayer Factor-Graph Online Update Contract

**Status:** Frozen before implementation; finite census implemented and independently cross-verified

**Author:** Manus AI

## Key Recommendation

Do not build another N-layer module. `MultilayerBnn` already exists and already has three distinct inference paths. Add the missing **online per-edge update boundary**: absorb one observation once at layer 0, rebuild the declared Gaussian factor graph, run bounded sum-product, and return the updated evidence state together with every marginal and an explicit convergence/exactness receipt.

The new API is an inference update, not neural-network weight training, causal discovery, or evidence-state merge. Exactness is allowed only when the constructed factor graph is cycle-free. If a Gaussian loopy run converges, only its means may be described as exact; its variances remain approximate.[1] [2]

## 1. Current Architecture Census

| Existing path | Measured role | Boundary |
|---|---|---|
| `MinimalBnn.update` | Conjugately absorbs scalar evidence into one Gaussian latent | One cell only |
| `MultilayerBnn.update` | Node-level forward/backward messages | Exact for `Sequential`; explicitly approximate for multi-parent topology |
| `tryMarginalsViaFactorGraph` | Per-edge synchronous sum-product over the complete declared graph | Pure query; does not absorb a new observation |

The statement in `docs/ZETA-CORE-TECHNOLOGY-FOR-MAX.md` that the N-layer module is not shipped is false on current main. The module is shipped. The actual missing operation is a single boundary combining **one evidence-state update** with **one per-edge inference query**.

## 2. Frozen API and Semantics

Add an explicit exactness classification and result record:

```fsharp
type FactorGraphExactness =
    | ExactAcyclic
    | ConvergedLoopyMeansOnly
    | UnsettledAcyclic
    | UnsettledLoopy

type FactorGraphUpdate =
    { Network: Network
      Marginals: Gaussian array
      Rounds: int
      Converged: bool
      Exactness: FactorGraphExactness }
```

Add two functions:

```fsharp
tryUpdateViaFactorGraph :
    tol: float -> maxRounds: int -> requireConvergence: bool ->
    observation: float -> net: Network -> Result<FactorGraphUpdate, string>

tryInferViaFactorGraph :
    tol: float -> maxRounds: int -> requireConvergence: bool ->
    observations: seq<float> -> net: Network -> Result<FactorGraphUpdate, string>
```

For each observation, the implementation must perform these operations in this order:

1. Validate the numerical budget, observation, and declared topology.
2. Call `MinimalBnn.update` on `Layers.[0]` exactly once.
3. Leave every deeper `MinimalBnn.Posterior` unchanged; deeper layers receive evidence only through factor-graph messages.
4. Build the factor graph from the updated network and run `FactorGraph.runToFixpoint`.
5. Return all marginals and the convergence receipt. If `requireConvergence=true` and the cap is reached, return a teaching error containing the rounds and tolerance; never return the capped iterate as if it were settled.

The returned `Network` is the durable online evidence state. `Marginals` is the latest deterministic query result. Callers must not infer the factor-graph marginals from `Network.UpwardMessages` or `Network.DownwardMessages`, because those arrays encode the separate node-level sweep representation and cannot carry per-edge DAG messages.

## 3. Validation Boundary

The new API must fail closed when any of the following is true:

| Invalid input | Required teaching error |
|---|---|
| `tol` is non-finite or negative | State that tolerance must be finite and non-negative |
| `maxRounds <= 0` | State that the round budget must be positive |
| Observation is non-finite | Preserve the `MinimalBnn` observation error with online-update context |
| Public `Network` arrays differ in length or a channel variance is non-finite/non-positive | Name the malformed array length or variance index before any indexing occurs |
| A parent index is negative, outside the layer array, equal to its child, or greater than its child | Name the child and invalid parent; the declared layer order is the topological order |
| A factor-graph child names the same parent more than once | Preserve the existing duplicate-parent refusal |
| Strict convergence is requested but not reached | Name rounds, cap, and tolerance; do not mutate the caller’s network |

No validation may silently delete an invalid parent. Filtering malformed topology into a different model is an erasure, not recovery.

## 4. Exactness Classification

The implementation must classify the constructed **bipartite factor graph**, not merely the directed layer declaration.

| Graph class | Allowed statement |
|---|---|
| Cycle-free factor graph | Sum-product marginals are exact after convergence |
| Loopy Gaussian factor graph, converged | Posterior means are exact for this Gaussian model; variances are generally approximate [1] |
| Loopy factor graph, not converged | No settled posterior claim; strict mode refuses the result |

Kschischang, Frey, and Loeliger show that a cycle-free factor graph directly encodes the marginal computations and that two directed messages per edge compute all marginals.[2] Weiss and Freeman show that converged Gaussian loopy belief propagation gives correct posterior means while covariance estimates are generally incorrect.[1]

## 5. Frozen Finite Census

The first implementation must run this catalog without tuning after results are seen:

| Control | Frozen construction | Required result |
|---|---|---|
| One-layer reduction | One proper prior, one observation | Equals `MinimalBnn.update` posterior |
| Sequential exactness | Four layers, unequal priors and channel variances, three observations | Every marginal agrees with independent joint-precision inversion within `1e-10` |
| DAG-chain equivalence | Same chain represented as `Dag [| []; [0]; [1]; [2] |]` | Same marginals within `1e-12` |
| Non-vacuous backward evidence | Three-layer chain with informative top prior | Layer-0 smoothed marginal differs from its local `MinimalBnn` posterior |
| Single absorption | Prior precision `τ₀`, observation variance `v`, `k` updates | Layer-0 durable precision is exactly `τ₀ + k/v` within `1e-12` |
| Replay/query separation | Query the same returned network three times without a new observation | Marginals are bit-identical and durable precision does not change |
| Loopy mean control | Existing four-layer skip catalog | Converged means agree with dense solve within `1e-9`; at least one variance differs by more than `1e-6` |
| Strict non-convergence | Same loopy catalog with `maxRounds=1` and strict mode | Returns an error and leaves input serialization unchanged |
| Permissive non-convergence | Same cap with strict mode disabled | Returns `Converged=false`; no exactness claim |
| Malformed topology | Negative, future, self, out-of-range, and duplicate parents | Every case is rejected with the named child/parent or duplicate refusal |

The exact numerical observations and priors must be declared in the regression test before their outputs are asserted. A positive result is falsified by evidence duplication, swallowed non-convergence, hidden topology deletion, or disagreement with the independent dense solve.

## 6. Independence Plan

The first oracle is the existing separately implemented dense joint-precision inversion in `MultilayerBnn.Tests.fs`. It does not call `FactorGraph`, `forward`, `backward`, or the new API. A second-language oracle is required only if the implementation introduces new Gaussian algebra rather than composing the already cross-checked primitives.

The mutation gate must at minimum prove that re-absorbing the observation during factor-graph construction changes layer-0 precision and fails the single-absorption row. A second mutation that converts strict non-convergence into a successful result must fail its dedicated row.

## 7. Measured Results

The frozen implementation passes **44 MultilayerBnn scenarios**. Eight new scenario groups cover the one-layer reduction, independent four-layer dense solve, DAG-chain spelling, non-vacuous backward evidence, exact-once absorption with bit-stable replay, converged loopy mean-only classification, strict/permissive non-convergence, and named malformed-input refusals.

| Measurement | Result |
|---|---:|
| Acyclic convergence rounds | `5` |
| Layer-0 durable precision after three observations | `8.3` |
| Deeper durable observation counts | `[0, 0, 0]` |
| Sequential means | `[1.6145528293, 0.7751047676, 0.6122556004, -0.2692039058]` |
| Sequential variances | `[0.1091686506, 0.2958162588, 0.3740793681, 0.4348334161]` |
| Top-prior effect on smoothed layer-0 mean | `2.5754527163` |
| Query replay | Bit-identical |
| Strict one-round loopy cap | Refused |
| Permissive one-round loopy cap | `UnsettledLoopy` |
| Converged loopy classification | `ConvergedLoopyMeansOnly` |

The production F# receipt agrees with a separately authored pure-Python joint-precision inversion within `1e-10` for every sequential mean and variance. The Python implementation does not import production values or call the factor graph. Flipping the sign of every inter-layer precision coupling creates four comparator disagreements, proving that the cross-language check can reject a materially changed model.

The finite result supports the online per-edge update boundary. It does not change the earlier loopy limitation: convergence supports exact Gaussian means, not exact variances.[1]

## 8. Decision Rules

| Measurement | Decision |
|---|---|
| Tree rows agree with dense inversion and absorption is exact-once | Ship the online per-edge update boundary |
| Loopy means agree after convergence but variances do not | Ship with the existing Gaussian mean-only boundary |
| Strict cap returns a marginal array | Reject the implementation |
| Any malformed parent is filtered rather than refused | Reject the implementation |
| Node-level sweeps are relabelled as per-edge EP | Reject the documentation |

## 9. Explicit Non-Claims

This work does not establish multilayer neural weight learning, universal continuous learning, non-Gaussian robustness, causal or architecture discovery, exact loopy covariance, cortical fidelity, a Goodfire-equivalent block-sparse featurizer, geometric English semantics, a Clifford identification, consciousness, or physical identity. The finite claim is an online Gaussian evidence update followed by a bounded, explicitly classified factor-graph query.

## References

[1]: https://proceedings.neurips.cc/paper_files/paper/1999/hash/10c272d06794d3e5785d5e7c5356e9ff-Abstract.html "Weiss and Freeman, Correctness of Belief Propagation in Gaussian Graphical Models of Arbitrary Topology"
[2]: https://people.rennes.inria.fr/Cedric.Herzet/Cedric.Herzet/Sparse_Seminar/Entrees/2012/3/12_Factor_Graphs_and_the_Sum-Product_Algorithm(F._R._Kschischang_et_al.)_files/Kschischang_FG.pdf "Kschischang, Frey, and Loeliger, Factor Graphs and the Sum-Product Algorithm"
