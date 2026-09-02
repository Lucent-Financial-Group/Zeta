# Composable Factor Benchmark Contract

**Status:** Frozen before data acquisition and implementation; CFB-A/B implemented and independently cross-verified

**Author:** Manus AI

## Key Recommendation

Run two distinct experiments and do not merge their conclusions. **CFB-A** tests whether Zeta’s chain and DAG execution paths preserve the same Gaussian product and whether branch deletion is detectable. **CFB-B** tests whether static uncertainty-weighted fusion is useful on the public ETTh1 forecasting dataset. CFB-A is a finite conformance census, not a learning benchmark. CFB-B is a public-data benchmark, but it is not a reproduction of the 2026 Dynamic/Noisy Precision-Gated Experts models.

## 1. CFB-A — Exact Topology-Utility Census

### 1.1 Declared problem

For `n ∈ {2,4,8,16,32,64}`, construct `n` independent scalar Gaussian evidence messages `N(μ_i, σ_i²)` over one latent variable. The parameters are deterministic rational values derived from the index; no random seed or public data is involved. Compute the posterior in four ways:

| Lane | Computation | Declared role |
|---|---|---|
| `dense-information` | Sum all precisions and precision-weighted means in one independent implementation | Exact oracle |
| `linear-chain` | Left fold through the repository Gaussian-message product | Existing sequential composition |
| `balanced-dag` | Pairwise balanced reduction through the same message algebra | Composable DAG execution |
| `branch-drop` | Balanced reduction after deleting one nonzero evidence leaf | Negative control |

The chain and balanced DAG receive exactly the same evidence and execute exactly `n-1` Gaussian products. Their parameter count and arithmetic operation count are matched. The only declared structural difference is critical-path depth: `n-1` for the chain and `ceil(log₂ n)` for the balanced DAG under ideal parallel scheduling.

### 1.2 Measurements

For each `n`, report posterior mean, variance, absolute error against the dense oracle, product count, critical-path depth, deterministic execution time over a fixed repetition count, and allocation count if the repository’s existing instrumentation supports it. Runtime is secondary because the current benchmark executes both lanes on one thread; critical-path depth is the substrate-independent scheduling quantity.

### 1.3 Falsifiers

The topology census fails if the chain or DAG disagrees with the dense oracle beyond `1e-12`, if chain and DAG consume different evidence, if balanced reduction uses more or fewer than `n-1` products, if the branch-drop posterior remains unchanged despite a nonzero deleted precision, or if timing is presented as parallel speedup without a parallel executor.

### 1.4 Decision rule

| Observation | Allowed conclusion |
|---|---|
| Chain and DAG agree; DAG depth is logarithmic | Balanced factor composition preserves this commutative Gaussian posterior and exposes lower ideal critical-path depth |
| DAG predicts better than chain with identical evidence | Treat as a bug or unmatched computation, not an architecture win |
| Branch deletion changes posterior | The benchmark can detect missing evidence |
| Branch deletion does not change posterior | The negative control is vacuous or the deleted message carried zero information |

## 2. CFB-B — Public ETTh1 Static Bayesian Ensemble

### 2.1 Dataset and provenance

Use `ETTh1.csv` from the original ETT dataset repository at immutable commit `1d16c8f4f943005d613b5bc962e9eeb06058cf07`.[1] The Precision-Gated Experts README says its repository includes the CSV, but the tracked `data/` directory currently contains only a `.data` placeholder; that claim is therefore not used as provenance.[2] The checked manifest records the exact download URL, byte length, SHA-256 digest, column schema, row count, license, and split indices. The target is `OT`.

The competitor’s current executable `make_sequences` rule uses `N = T - seq_len - horizon + 1`, and `train_val_test_split` rounds `0.6N` and `0.2N` before assigning the remainder to test.[3] Applied to the immutable full source (`T=17,420`, `seq_len=96`, forecast horizon `96`), this gives `N=17,229` examples split chronologically as `10,337 / 3,446 / 3,446`. These reproducible counts replace the README’s unresolved `(8,545,2,881,2,881)` artifact counts for this benchmark. The difference is disclosed rather than guessed; CFB-B is not a paper-table reproduction. Splits apply to complete examples after window construction. Adjacent examples may overlap raw input observations, as in the competitor utility, but training targets and fitted statistics use training examples only.

The first experiment uses the public raw observations but does not use the authors’ trained neural expert files. It therefore measures a smaller **Static fusion reproduction**, not a paper-table reproduction.

### 2.2 Deterministic expert set

Fit or define four auditable experts using only the training split. Each forecast predicts `OT` 96 hours after the end of a 96-hour input window:

| Expert | Forecast definition | Trainable parameters |
|---|---|---:|
| `last` | `OT` at the end of the input window | 0 |
| `window-start` | `OT` at the start of the 96-hour input window | 0 |
| `train-mean` | Training-set mean | 1 |
| `ridge-window` | Ridge regression on input-window offsets 0, 72, and 95 plus intercept | 4 |

The ridge penalty is selected from a frozen grid `{0, 1e-6, 1e-4, 1e-2, 1}` using validation MSE only. Feature normalization statistics come from training only. Missing values, non-finite rows, and the first 96 unavailable targets are rejected or explicitly excluded with counts.

### 2.3 Ensemble lanes

Every lane receives the same four point forecasts on the same test rows.

| Lane | Rule | Status |
|---|---|---|
| `equal` | Arithmetic mean of the four forecasts; one residual variance fitted on validation | Capacity-matched non-Bayesian baseline |
| `best-validation` | Select the one expert with lowest validation MSE; use its validation residual variance | Deployable selection baseline |
| `zeta-static-chain` | Convert each forecast to `N(pred_i, s_i²)` using its validation residual variance and multiply sequentially | Zeta chain factor fusion |
| `zeta-static-dag` | Multiply the same four messages in a balanced tree | Zeta composable DAG factor fusion |
| `oracle-best-test` | Select the best expert using test labels | Non-deployable ceiling; never a competitor |

No lane learns input-dependent gates. Per-expert variances are fixed after validation. The Bayesian lanes assume conditionally independent expert errors; this assumption receives explicit residual-correlation and duplicate-expert controls.

### 2.4 Metrics

Report test MSE, MAE, Gaussian NLL, empirical 95% interval coverage, mean interval width, parameter count, number of fitted scalar statistics, execution time, and the maximum pairwise validation residual correlation. Bootstrap 95% confidence intervals use 1,000 moving-block replicates, contiguous blocks of length 96, and a manifest-frozen xorshift32 seed and draw algorithm; ordinary iid row bootstrap is prohibited.

### 2.5 Fault controls

| Fault | Required result |
|---|---|
| Duplicate one expert as independent evidence | NLL or coverage must expose overconfidence; the lane is labelled invalid rather than “more certain” |
| Permute test labels | All predictive metrics deteriorate; unchanged performance falsifies the metric path |
| Fit variance on test labels | Provenance guard rejects leakage |
| Cross a chronological split with a lag | Row constructor rejects the sample |
| Reverse chain/DAG grouping | Static chain and DAG posterior remain equal within `1e-12` |
| Drop one informative expert | Posterior changes and the receipt names the omitted evidence |

### 2.6 Success and failure criteria

A practical usefulness claim is allowed only if the deployable Zeta Static lane improves either MSE or NLL over equal weighting while not degrading 95% coverage by more than five percentage points, and the block-bootstrap interval for the selected improvement excludes zero. If chain and DAG differ with identical messages, the result is an implementation defect. If static fusion loses to `best-validation`, report that negative result. If residual correlations are high and the duplicate control shows overconfidence, recommend a correlated-error factor rather than presenting narrow intervals as success.

## 3. Published Competitor Comparison Rules

The result table may place external numbers beside Zeta only when dataset, target, split, horizon, experts, and metrics match. The 2026 Precision-Gated Experts paper uses five trained neural experts plus two quantile experts and a 64-dimensional learned feature, so its MSE/NLL rows are **context**, not leaderboard entries, for this four-expert benchmark.[2] RxInfer systems numbers use different models and hardware and remain architecture context.[3] PyJuice, SDCD, arbitrary-DAG growth, and Monty are not included in the numeric table because they solve different tasks.

## 4. Follow-On Gates

If CFB-B demonstrates useful calibrated static fusion, the next direct-competitor step is to add Gaussian/Gamma precision messages and the exponential-link factor needed for Precision-Gated Experts. If it does not, first repair correlated-error modeling or expert quality. Structure learning is a separate program and must not begin from a static-fusion score.

The first follow-on was executed under the separately frozen `2026-09-02-correlated-error-query-contract.md`. It did not satisfy its usefulness or calibration-repair rule and selected complete off-diagonal shrinkage, making the final lane equivalent to a diagonal-error model. This is retained as a negative result rather than tuned after seeing held-out data.

## 5. Measured Result

| Experiment | Independently reproduced result | Allowed conclusion |
|---|---|---|
| CFB-A, `n=64` | Chain and balanced-DAG posteriors differ by at most `3.55e-15`; both use 63 products; ideal critical-path depth is `63` versus `6` | Balanced grouping preserves the declared commutative Gaussian product and exposes lower ideal depth; it does not improve prediction |
| CFB-B, static precision fusion | MSE `9.6934`, MAE `2.3987`, Gaussian NLL `2.9761`, coverage `0.7501` | The narrow interval is overconfident under correlated residuals |
| Equal weighting | MSE `13.9423`, NLL `2.7485`, coverage `0.9791` | Precision fusion improves MSE against this baseline but fails the coverage gate |
| Best validation expert | MSE `9.6231`, NLL `2.5516`, coverage `0.9393` | Static fusion does not beat the deployable selection baseline |
| Moving-block MSE difference, static minus equal | `−4.2489`, 95% interval `[−7.0740, −1.2172]` | The MSE improvement over equal weighting is statistically retained under the declared block procedure |
| Maximum absolute validation residual correlation | `0.8738` | The independent-error premise is materially violated in this finite expert set |
| Duplicate-expert fault | Coverage falls from `0.7501` to `0.6875`; NLL rises by `0.4261` | Treating a duplicate as independent evidence creates additional overconfidence |

The TypeScript and separately authored NumPy/Python implementations agree on source digest, row/window/split counts, ridge fit, validation variances, residual correlation, five original metric lanes, duplicate/permutation controls, and two moving-block intervals within `1e-9`.

## 6. Explicit Non-Claims

This benchmark does not establish that DAGs universally outperform chains, that Zeta learns topology, that RFFH learns object models, that cortical heterarchies are implemented, that English is geospatial, or that any competitor result has been reproduced before its exact artifacts run. CFB-A measures finite Gaussian composition. CFB-B measures one public time-series target with four declared experts.

## References

[1]: https://github.com/zhouhaoyi/ETDataset/blob/1d16c8f4f943005d613b5bc962e9eeb06058cf07/ETT-small/ETTh1.csv "Original ETT repository — ETTh1.csv"
[2]: https://github.com/biaslab/PrecisionGatedExperts "Precision-Gated Experts official implementation"
[3]: https://github.com/biaslab/PrecisionGatedExperts/blob/0e8383159982b451446f81674eb24b9712d6bd58/src/utils.jl "Precision-Gated Experts sequence and split utilities"
[4]: https://arxiv.org/abs/2605.29467 "Lukashchuk et al., Composing Non-Conjugate Factor Graphs with Closed-Form Variational Inference"
[5]: https://arxiv.org/abs/2112.13251 "Bagaev and de Vries, Reactive Message Passing for Scalable Bayesian Inference"
