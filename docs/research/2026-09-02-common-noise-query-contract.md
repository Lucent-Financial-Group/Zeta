# CFB-D One-Common-Noise Query Contract

**Status:** Frozen before implementation; implemented and independently reproduced; calibration-repair-only rule satisfied

**Author:** Manus AI

## Key Recommendation

Retain the already verified **content-addressed evidence union** as replicated state. Test one non-vacuous, deterministic **query** over that state: a rank-one common-error factor plus positive diagonal uniqueness, followed by a fixed ridge-stabilized simplex combination. Raw Gaussian multiplication and pairwise covariance intersection remain rejected as state merges.

CFB-C selected complete diagonal shrinkage, so its zero-off-diagonal mutation was identical. CFB-D removes that escape hatch. It has no factor-strength grid and no held-out tuning. If its fitted common factor does not change the pre-test weight artifact relative to a diagonal-only mutation, the lane is invalid-vacuous and stops before interpreting test metrics.

## 1. Scope and frozen data

Use the exact CFB-B manifest and bytes: ETTh1 at source commit `1d16c8f4f943005d613b5bc962e9eeb06058cf07`, SHA-256 `f18de3ad269cef59bb07b5438d79bb3042d3be49bdeecf01c1cd6d29695ee066`, 17,420 rows, 17,229 complete windows, and chronological train/validation/test counts `10,337 / 3,446 / 3,446`. The four experts remain `last`, `window-start`, `train-mean`, and validation-selected `ridge-window`. Their definitions, split, horizon, and target are frozen by CFB-B and may not be changed after reading CFB-D test output.

Poncela and Senra model a forecast panel as common factors plus forecast-specific residuals and evaluate combinations ex ante.[1] Weigt and Wilfling model dependence among forecast-error series using only past observations and explicitly separate realistic ex-ante evaluation from an ex-post upper benchmark.[2] These sources justify the **shape and chronology** of this experiment; they do not predict that CFB-D will improve ETTh1.

## 2. State/query boundary

| Layer | Declared object | Required property |
|---|---|---|
| Replicated state | Canonically ordered, content-addressed multi-value evidence map | Associative, commutative, idempotent union; changed-content conflicts retained |
| Base expert artifact | The already frozen CFB-B four-expert model | Training/validation only; no CFB-D change to expert definitions |
| Common-noise artifact | Training residual moments, factor loading, uniqueness, regularized covariance, and weights | Immutable after fitting; deterministic under row and expert permutation |
| Query | Weighted point prediction with validation-fitted scalar interval variance | Deterministic under evidence arrival permutation and duplicate redelivery |

## 3. Frozen common-noise model

Let `e_t ∈ ℝ⁴` be the **training** residual vector in canonical expert order. Compute the centered sample covariance `S`. Reject fewer than two rows, any non-finite entry, or any non-positive diagonal.

Compute the leading unit eigenvector `v₁` of `S` by exactly 256 normalized power iterations initialized at `(1/2,1/2,1/2,1/2)`. After each iteration, orient the vector so its component sum is non-negative. Let `λ₁ = v₁ᵀSv₁` and raw loading `l⁰ = sqrt(max(λ₁,0))v₁`. A separately authored oracle may use a direct symmetric eigensolver, but it must agree within `1e-9`.

Preserve positive uniqueness with the fixed floor `q=0.05`. Define

`c = min(1, min_{i:|l⁰ᵢ|>0} sqrt((1-q)Sᵢᵢ)/|l⁰ᵢ|)`,

`l = c l⁰`, and `ψᵢ = Sᵢᵢ − lᵢ²`.

The common-noise covariance is

`F = llᵀ + diag(ψ)`.

Thus `diag(F)=diag(S)`, every `ψᵢ ≥ 0.05Sᵢᵢ` up to `1e-12`, and `F` is positive semidefinite by construction. These are implementation invariants, not inferred empirical claims.

## 4. Fixed weight stabilization

Use the dimensionless ridge `τ=0.25`; it is frozen, not validation-selected. Let `s̄ = trace(S)/4` and

`Fτ = F + τs̄I`.

Enumerate all 15 nonempty expert subsets. For each subset compute `w = Fτ⁻¹1/(1ᵀFτ⁻¹1)`, reject non-finite or less-than-`−1e-12` weights, clamp values in `[−1e-12,0)` to zero, renormalize, and choose the feasible minimum of `wᵀFτw`. Break ties within `1e-12` by lower canonical subset mask. This is the same explicit four-dimensional active-set convention as CFB-C; there is no iterative optimizer.

Fit one scalar interval variance as the mean squared residual of the fixed point predictor on **validation**. Test intervals are `prediction ± 1.96 sqrt(validation MSE)`. This is a Gaussian working interval, not a residual-normality theorem. Counting four residual means, ten unique covariance entries, and one interval variance, report `15` fitted scalars; deterministic eigenvectors, loadings, uniquenesses, and weights are derived quantities.

## 5. Mandatory pre-test non-vacuity gate

Construct a diagonal mutation `F⁰ = diag(S)`, apply the same `τ`, active-set rule, and canonical ordering, and compare artifacts **before interpreting held-out metrics**.

| Gate | Frozen requirement |
|---|---|
| Common component | `max_{i≠j}|Fᵢⱼ| > 1e-9` |
| Multi-expert query | At least two final weights exceed `1e-9` |
| Artifact sensitivity | `max_i |wᵢ − w⁰ᵢ| > 1e-6` |
| Numerical validity | Every loading, uniqueness, covariance entry, weight, and variance is finite; uniqueness floor holds |

Failure of any row yields `invalid-vacuous`. Test metrics may be emitted for debugging but cannot support a usefulness or calibration claim.

## 6. Held-out metrics and frozen decisions

Report the leading eigenvalue share `λ₁/trace(S)`, scale `c`, four loadings, four uniqueness ratios `ψᵢ/Sᵢᵢ`, active mask, four weights, maximum off-diagonal magnitude, diagonal-mutation weight delta, validation interval variance, test MSE, MAE, Gaussian NLL, 95% coverage, mean interval width, and the existing 1,000-replicate moving-block intervals with block length 96.

| Verdict | Frozen rule |
|---|---|
| **Useful** | Non-vacuity passes; test MSE is lower than `best-validation` and the paired 95% moving-block interval excludes zero; coverage is no more than five percentage points below equal weighting; Gaussian NLL is not worse than `best-validation` |
| **Calibration repair only** | Non-vacuity passes; coverage improves by at least ten percentage points over `zeta-static-dag`; MSE is no worse by more than 1%; Gaussian NLL improves |
| **Mechanism non-vacuous, usefulness not supported** | Non-vacuity passes but neither held-out rule is met |
| **Invalid-vacuous** | Any mandatory pre-test gate fails |

No factor floor, power-iteration count, ridge, active-set rule, interval multiplier, baseline, or success threshold may change after the first test execution.

## 7. Faults and independent verification

| Control | Required observation |
|---|---|
| Reverse training-residual row order | Artifact agrees within `1e-12` |
| Permute supplied expert order | Canonical artifact and predictions agree within `1e-12` |
| Flip the factor-loading sign | `F`, weights, predictions, and metrics are unchanged within `1e-12` |
| Zero the rank-one off-diagonals | Pre-test weight delta exceeds `1e-6`; otherwise `invalid-vacuous` |
| Duplicate one expert under a false identity | Result is labelled invalid-dependent-evidence; narrower intervals receive no credit |
| Same evidence identity with changed content | Query refuses until the multi-value conflict is adjudicated |
| Permute test targets | MSE and Gaussian NLL deteriorate |
| Fit any common-noise quantity or interval variance on test labels | Provenance guard rejects the artifact |
| Non-positive/non-finite training covariance | Teaching error; no fabricated fallback covariance |

A separately authored Python/NumPy oracle must reproduce training residual moments, leading eigenpair up to sign, scaled loading, uniqueness, both covariances, active mask, weights, interval variance, held-out metrics, moving-block intervals, non-vacuity controls, target-permutation fault, and verdict within declared tolerances. The comparator must include one mutation that changes `τ` or removes the common factor and must exit nonzero.

## 8. Measured result

The pre-test non-vacuity gate passes. The training residual covariance has leading eigenvalue share `0.6357784348`; the fitted factor retains three active experts with mask `11` and weights `(0.3180602111, 0.2828954224, 0, 0.3990443666)`. Its maximum modeled off-diagonal covariance is `24.6338489904`. Removing the common factor changes a weight by as much as `0.1082646332` and changes a held-out prediction or interval variance by as much as `2.3422768858`. Reversing training-row order changes the TypeScript artifact by zero; flipping the factor-loading sign changes neither covariance nor weights.

| Held-out quantity | CFB-D result |
|---|---:|
| MSE | `9.7690977784` |
| MAE | `2.4138114741` |
| Gaussian NLL | `2.5631292779` |
| 95% coverage | `0.9222286709` |
| Mean 95% interval width | `11.4674405306` |
| MSE minus best-validation | `0.1459949469`, 95% interval `[−0.5026797417, 0.7739477039]` |
| NLL minus best-validation | `0.0115238296`, 95% interval `[−0.0238346451, 0.0518590378]` |
| MSE minus static precision DAG | `0.0756973646`, 95% interval `[−0.2625518162, 0.4258865322]` |
| NLL minus static precision DAG | `−0.4130087020`, 95% interval `[−0.7107137688, −0.1707742741]` |

CFB-D improves static precision coverage from `0.7501450958` to `0.9222286709`, holds MSE inflation to approximately `0.781%`, and improves Gaussian NLL with a paired interval below zero. It therefore satisfies the frozen **calibration repair only** rule. It does **not** satisfy predictive usefulness: MSE and NLL are slightly worse than the validation-selected ridge expert, and neither paired interval excludes zero in the favorable direction.

The separately authored NumPy/Python oracle uses `numpy.linalg.eigh` instead of the TypeScript 256-step power iteration. It reproduces the complete artifact, metrics, four new moving-block intervals, non-vacuity controls, sign and row-order controls, target-permutation fault, and verdict within `1e-9`. Changing the Python ridge from `0.25` to `0.5` produces 50 comparator failures and exits nonzero.

## 9. Explicit non-claims

CFB-D is one static four-expert query on one ETTh1 target and split. It does not establish a universally optimal forecast combination, causal structure, learned DAG, probabilistic circuit, neural architecture, covariance-intersection convergence, CRDT probability merge, or reproduction of Dynamic/Noisy Precision-Gated Experts. A negative result is a successful falsification outcome.

## 10. References

[1]: https://forecasters.org/wp-content/uploads/Poncela_2005-1.pdf "Poncela and Senra, Forecast Combination through Factor Models: Assessing consensus and disagreement"
[2]: https://www.econstor.eu/bitstream/10419/233668/1/for.2733.pdf "Weigt and Wilfling, An approach to increasing forecast-combination accuracy through VAR error modeling"
