# Correlated-Error Belief Query Contract

**Status:** Frozen before implementation; implemented and independently cross-verified; usefulness and calibration-repair rules not satisfied

**Author:** Manus AI

## Key Recommendation

Keep **replicated state** and **belief query** separate. The replicated object remains the content-addressed, conflict-retaining evidence union measured in the CRDT belief-fusion census. The proposed correlated-error operation is a deterministic query over that complete deduplicated state plus a validation-fitted calibration artifact. It is not a binary CRDT merge and must not be presented as one.

The first practical target is deliberately narrow: repair the false independence assumption exposed by CFB-B’s maximum validation residual correlation of approximately `0.874`. The candidate is a four-expert, validation-only, shrinkage-covariance forecast combination. Forecast-combination theory gives the unconstrained minimum-variance weights as `Σ⁻¹1 / (1ᵀΣ⁻¹1)` when forecast errors are unbiased and the covariance is known; in practice the covariance must be estimated, and simple averaging is a difficult benchmark because weight-estimation error can erase the theoretical gain.[1] [2] Covariance shrinkage is included as an explicit finite stabilizer, not as a claim that the asymptotic Ledoit–Wolf optimum has been implemented.[3]

## 1. State/Query Boundary

| Layer | Declared object | Required law or control |
|---|---|---|
| Replicated state | Content-addressed multi-value evidence map | Associative, commutative, idempotent union; changed-content conflicts retained |
| Calibration artifact | Canonically ordered expert identities, validation residual matrix, chosen shrinkage, weights, and interval variance | Fitted from training/validation only; content-addressable and immutable after fit |
| Query | Weighted point forecast and Gaussian interval computed from the whole adjudicated state | Deterministic under evidence arrival permutation and duplicate redelivery |

Raw Gaussian product, fixed-half covariance intersection, and pairwise optimized covariance intersection are excluded from the state-merge role by the separate CRDT census. Their non-idempotency or non-associativity must not be hidden by calling them “eventually consistent.”

## 2. Frozen ETTh1 Inputs

Use the exact CFB-B manifest and bytes: ETTh1 at source commit `1d16c8f4f943005d613b5bc962e9eeb06058cf07`, SHA-256 `f18de3ad269cef59bb07b5438d79bb3042d3be49bdeecf01c1cd6d29695ee066`, 17,420 rows, 17,229 complete windows, and chronological train/validation/test counts `10,337 / 3,446 / 3,446`. The four experts remain `last`, `window-start`, `train-mean`, and validation-selected `ridge-window`. No expert, split, horizon, or target may be changed after observing this lane’s test result.

## 3. Declared Correlated-Error Query

For validation residual vector `e_t ∈ ℝ⁴`, compute the centered sample covariance `S`. For each frozen shrinkage value

`α ∈ {0, 0.1, 0.2, …, 0.9, 1}`,

form

`Σ_α = (1 − α)S + α·diag(S)`.

For each nonempty expert subset, compute the equality-constrained minimum-variance weights

`w = Σ_α⁻¹1 / (1ᵀΣ_α⁻¹1)`.

Retain only candidates with every weight at least `−1e-12`, clamp numerical values in `[-1e-12,0)` to zero, renormalize to sum one, and set excluded-expert weights to zero. This exact enumeration is the four-dimensional simplex active-set solution; no iterative optimizer or hidden stopping rule is allowed. A singular subset is rejected rather than repaired silently.

For each `α`, choose the feasible subset with minimum predicted variance `wᵀΣ_αw`, breaking ties by canonical expert-mask order. Select `α` by minimum validation MSE of the resulting point forecast. Break an MSE tie within `1e-12` toward the larger `α`, then the lower expert mask. The larger-shrinkage tie rule is a declared stability preference, not a theorem.

Fit the query interval variance as the validation mean squared residual of the final combined point forecast. This includes any residual bias. The test interval is `prediction ± 1.96·sqrt(validation MSE)`. This is a finite Gaussian working interval, not a proof that ETTh1 residuals are Gaussian.

## 4. Metrics and Predeclared Decision Rule

Report the selected `α`, four weights, active expert mask, covariance condition diagnostic, fitted scalar count, test MSE, MAE, Gaussian NLL, empirical 95% coverage, mean interval width, and moving-block bootstrap intervals with the existing manifest seed, 1,000 replicates, and block length 96.

| Verdict | Frozen rule |
|---|---|
| **Useful correlated-error result** | Test MSE is lower than `best-validation` and its paired moving-block 95% interval excludes zero; coverage is no more than five percentage points below equal weighting; and Gaussian NLL is not worse than `best-validation` |
| **Calibration repair only** | Coverage improves by at least ten percentage points over `zeta-static-dag`, while MSE is no worse by more than 1% and NLL improves |
| **Not supported** | Neither rule is met |

The same held-out observations may support more than one reported paired difference, but only the predeclared rules above determine wording. No weight, shrinkage grid, interval multiplier, expert subset, or success threshold may be changed after reading test metrics.

## 5. Faults and Falsifiers

| Control | Required observation |
|---|---|
| Expert-order permutation | Canonical artifact, weights by expert identity, predictions, and metrics remain unchanged within `1e-12` |
| Duplicate redelivery with the same content identity | Evidence union and final query remain byte-stable after canonical serialization |
| Same identity with changed content | Conflict remains visible and the query refuses until adjudication |
| Zero all off-diagonal covariances | At least one selected weight, predicted variance, or test metric changes; otherwise the “correlated-error” lane is vacuous |
| Duplicate one expert under a false new identity | The result is labelled invalid-dependent-evidence; narrower intervals are not credited |
| Permute test targets | MSE and NLL deteriorate; unchanged metrics falsify the evaluation path |
| Fit covariance or interval variance on test labels | Provenance guard rejects the artifact |
| Non-positive or non-finite covariance | The candidate is rejected with a teaching error rather than coerced to a fabricated matrix |

An independent Python implementation must reproduce the selected shrinkage, active mask, weights, point predictions, interval variance, metrics, and paired moving-block intervals. The comparator must contain a mutation control that changes either the residual alignment or covariance shrinkage and proves disagreement is detected.

## 6. Measured Result

The validation selector chose `α=1`, active mask `15`, and weights `(0.2700940641, 0.2321655957, 0.1443786095, 0.3533617307)`. Because `α=1` zeros every off-diagonal entry, the selected artifact is not operationally correlation-aware. The required zero-off-diagonal control produces exactly the same weights, predictions, and metrics. This fails the non-vacuity control and blocks any claim that residual correlation caused the lane’s behavior.

| Held-out quantity | Result |
|---|---:|
| MSE | `10.8695323440` |
| MAE | `2.5909684519` |
| Gaussian NLL | `2.6154064429` |
| 95% coverage | `0.9608241439` |
| Mean 95% interval width | `13.7258831481` |
| MSE minus best-validation | `1.2464295126`, 95% interval `[−0.1502144844, 2.5242856927]` |
| NLL minus best-validation | `0.0638009946`, 95% interval `[−0.0025852222, 0.1221502764]` |
| MSE minus static precision DAG | `1.1761319303`, 95% interval `[−0.4349791621, 2.6996122504]` |
| NLL minus static precision DAG | `−0.3607315370`, 95% interval `[−0.7160763557, −0.0656678321]` |

The lane repairs much of the static precision model’s undercoverage (`0.7501 → 0.9608`) and significantly improves NLL relative to that overconfident lane, but MSE worsens by approximately `12.1%`, exceeding the frozen 1% calibration-repair allowance. It also loses in point estimate to the best-validation expert and does not have a paired MSE interval below zero. The declared verdict is therefore **not supported**.

The separately authored NumPy/Python implementation reproduces the selected shrinkage, active mask, weights, full residual and shrunk covariance matrices, interval variance, held-out metrics, four new moving-block intervals, zero-off-diagonal control, target-permutation fault, and verdict within `1e-9`. Removing `α=1` from the Python grid is detected by the TypeScript comparator and exits nonzero.

This result exposes two concrete next questions without silently answering either: whether a bias-aware residual second-moment objective is more appropriate than centered covariance for these experts, and whether the four fixed experts are too weak or redundant for any static combination to beat validation selection. Either study requires a new frozen contract and untouched evaluation data.

## 7. Explicit Non-Claims

This experiment does not establish a universally optimal forecast combination, learned graphical structure, causal discovery, a neural DAG, a probabilistic circuit, covariance-intersection convergence, or a CRDT probability merge. It does not reproduce the Dynamic or Noisy Precision-Gated Experts models. It tests one static, four-expert, query-level correction on one public target and one frozen split.

## References

[1]: https://arxiv.org/abs/2205.04216 "Wang et al., Forecast combinations: an over 50-year review"
[2]: https://econweb.ucsd.edu/~grelliott/AveragingOptimal.pdf "Elliott, Averaging and the Optimal Combination of Forecasts"
[3]: http://www.ledoit.net/Well-conditioned2004.pdf "Ledoit and Wolf, A well-conditioned estimator for large-dimensional covariance matrices"
