# Exact-Dense Linear-Gaussian Multilayer Query Contract

**Status:** Frozen before implementation; implemented with finite F#/Python cross-verification.

## 1. Purpose

`MultilayerBnn.tryInferViaFactorGraph` correctly labels converged loopy Gaussian BP as **means-only** because its variances are not generally exact. This contract adds a bounded, deterministic exact query for the already-declared linear-Gaussian multilayer model. It is not a generic factor-graph solver, a non-Gaussian method, or a state merge.

## 2. Declared finite model

For `n ≤ 64` layers, compile the network and current layer-zero observations to canonical form:

```text
p(x) ∝ exp(-½ xᵀJx + hᵀx)
```

Each prior contributes `1/vᵢ` to `Jᵢᵢ` and `μᵢ/vᵢ` to `hᵢ`. Each declared relation `xᵢ = Σⱼ x_parent(j) + εᵢ`, with positive channel variance `vᵢ`, contributes the corresponding quadratic precision block. Each layer-zero observation contributes exactly once, as in the existing online-update contract. Compute `μ = J⁻¹h` and the full covariance `Σ = J⁻¹` by deterministic Gauss-Jordan elimination with the **largest absolute pivot and lowest-index tie break**.

| Receipt field | Required interpretation |
|---|---|
| `Marginals` | Exact univariate Gaussian marginals for the compiled finite model. |
| `Method` | `ExactDenseGaussian`. |
| `LayerCount` | Declared finite dimension, maximum 64. |
| `AbsorbedObservationCount` | Layer-zero durable evidence count after exact-once absorption. |
| Failure | Teaching error for malformed topology, invalid numeric input, non-finite arithmetic, non-positive pivot, or over-cap dimension. |

## 3. Accuracy boundary

For a well-formed finite linear-Gaussian model with nonsingular positive-definite `J`, direct inversion gives exact means and covariance; it costs `O(n³)` time and `O(n²)` storage. This is a correctness fallback for small declared graphs, not the distributed efficiency claim of BP. The related path-sum literature supplies an exact arbitrary-topology representation, while this contract uses a simpler finite dense construction.[1]

The exact query must be a deterministic query over an already-canonical evidence collection. It neither absorbs duplicate evidence twice nor supplies a CRDT merge operation. Non-Gaussian factors remain out of scope. EP and ensemble BP are future separately contracted approximations with schedule, seed, and calibration controls.[2] [3]

## 4. Finite controls and decision rule

The implementation must compare an acyclic chain's dense result against the existing exact sequential smoother and per-edge factor graph. It must compare a shared-parent diamond's dense covariance to an independently authored Python joint-precision inversion and demonstrate a nonzero variance discrepancy from converged loopy BP. Replay must be bit-stable. A precision-coupling-sign mutant and an observation-double-count mutant must both disagree with the independent oracle. No claim may be promoted unless all controls pass.

## 5. Measured finite result

The exact-dense implementation passes the existing acyclic reduction and an independently authored Python joint-precision inversion for both an acyclic four-layer chain and the declared four-layer loopy skip topology. The cross-verifier separates **9 cross-oracle comparisons**, **12 production-receipt controls**, and **3 mutation controls**. The earlier “14 witness groups” label is retired because it conflated these categories.

| Quantity | Measured result |
|---|---:|
| Exact-dense acyclic layers | `4` |
| Absorbed layer-zero observations | `3` |
| Exact-dense loopy mean L¹ difference from converged BP | `4.0190073491430667e-14` |
| Exact-dense loopy variance L¹ difference from converged BP | `0.22710111268589156` |
| Coupling-sign mutant disagreement | 4 means, 0 variances |
| Channel-variance mutant disagreement | 4 means, 4 variances |
| Observation-double-count mutant disagreement | 4 means, 4 variances |

The exact-dense result corrects the known covariance gap for this finite declared Gaussian model. It does **not** improve generic loopy BP, identify a non-Gaussian posterior, or change the CRDT evidence-state rule. The exact query is cubic-time and capped at 64 layers; per-edge BP remains the scalable query path, with its existing means-only limitation on converged loops.

## References

[1] [Giscard et al., *Exact Inference on Gaussian Graphical Models of Arbitrary Topology using Path-Sums*, JMLR 2016](https://www.jmlr.org/papers/volume17/14-445/14-445.pdf).

[2] [Weiss and Freeman, *Correctness of Belief Propagation in Gaussian Graphical Models of Arbitrary Topology*, NeurIPS 1999](https://proceedings.neurips.cc/paper_files/paper/1999/hash/10c272d06794d3e5785d5e7c5356e9ff-Abstract.html).

[3] [MacKinlay et al., *Gaussian Ensemble Belief Propagation for Efficient Inference in High-Dimensional, Black-box Systems*, arXiv:2402.08193v7, 2025](https://arxiv.org/html/2402.08193v7).
