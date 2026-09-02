# Composable Factor-Graph, Correlated-Error, and CRDT Belief-Fusion Results

**Author:** Manus AI

**Status:** Independently reproduced finite results; public usefulness claim rejected

## Key Recommendation

Do not market the present work as “DAG learning beats chains.” The measured positive result is narrower: **balanced composition preserves an exact commutative Gaussian posterior while reducing ideal reduction depth**. The public ETTh1 experiment is a useful negative result: naive precision fusion improves MSE over equal weights but becomes substantially overconfident and loses slightly to validation-selected ridge. The first shrinkage-covariance follow-on restores coverage but selects away every residual correlation and worsens MSE, so it also fails its frozen usefulness rule.

The practical architecture is now clearer. Replicate **content-addressed evidence**, retain changed-content conflicts, and compute probabilistic beliefs as deterministic queries over the complete adjudicated state. Do not use pairwise Gaussian product or covariance intersection as a CRDT state merge.

## 1. Scope and Architecture Correction

The current Reference-Frame Factor Heterarchy is two one-variable unary-factor blackboards with deterministic compensated posterior fusion behind external admission and pose-routing topology. Its parent/lateral graph controls message admission; it is not yet a multi-variable heterarchical factor graph. A separate two-variable equality-factor control confirms that the generic factor-graph substrate can propagate between variables, but RFFH does not instantiate that structure yet.

| Family | What it presently changes | What this work does not establish |
|---|---|---|
| Linear versus balanced Gaussian reduction | Evaluation topology and ideal critical-path depth | Better prediction from identical evidence |
| Static ETTh1 precision fusion | How four fixed expert forecasts are combined | Learned gates, learned topology, or PGE paper reproduction |
| Shrinkage-covariance query | Validation-fitted convex forecast weights and interval calibration | A non-vacuous correlation-aware winner |
| Evidence-state CRDT | Replica convergence and conflict retention | A semilattice of posterior probabilities |
| Pairwise covariance intersection | One declared query family under unknown cross-correlation | Associative state merge or universal conservativeness |

## 2. CFB-A: Exact Topology Census

For evidence counts `2,4,8,16,32,64`, chain, reversed chain, and balanced reduction agree with the dense information-form oracle to floating tolerance. At 64 inputs, all reduction lanes use 63 products. The chain’s ideal critical path is 63 products; the balanced tree’s is 6. The maximum observed posterior moment difference is approximately `3.55e-15`. Dropping a nonzero evidence branch changes the result in every declared case.

The F# oracle uses the production Gaussian message algebra, while TypeScript implements the benchmark reduction independently. Agreement therefore checks a real shared mathematical contract rather than two call sites into one function.

## 3. CFB-B: ETTh1 Static Ensemble

The pinned public input has SHA-256 `f18de3ad269cef59bb07b5438d79bb3042d3be49bdeecf01c1cd6d29695ee066`, 17,420 rows, and 17,229 complete 96-input/96-horizon examples split chronologically into `10,337 / 3,446 / 3,446`. The separately authored Python and TypeScript runners agree on all frozen preprocessing and result fields.

| Lane | MSE | MAE | Gaussian NLL | 95% coverage | Mean interval width |
|---|---:|---:|---:|---:|---:|
| Equal weights | 13.9423 | 3.0245 | 2.7485 | 0.9791 | 16.4041 |
| Best validation expert | **9.6231** | 2.3996 | **2.5516** | 0.9393 | 11.8721 |
| Zeta static chain | 9.6934 | **2.3987** | 2.9761 | 0.7501 | 7.1523 |
| Zeta static DAG | 9.6934 | 2.3987 | 2.9761 | 0.7501 | 7.1523 |

The static precision lane’s MSE improvement over equal weights is `−4.2489`, with moving-block 95% interval `[−7.0740, −1.2172]`. That positive point-forecast result does not satisfy the frozen usefulness rule because coverage degrades by about 22.9 percentage points and the lane loses slightly to the validation-selected ridge expert. Maximum validation residual correlation is `0.8738`; duplicating the `last` expert as false independent evidence lowers coverage another 6.27 points and worsens NLL by `0.4261`.

## 4. CFB-C: First Correlated-Error Follow-On

The query enumerated all 15 nonempty expert subsets for each shrinkage `α∈{0,0.1,…,1}`, solved the equality-constrained minimum-variance weights, retained only nonnegative simplex solutions, and selected by validation MSE. It chose `α=1`, which deletes all off-diagonal covariance. The required diagonal-only mutation is therefore identical to the selected lane: the attempted correlation-aware mechanism is **vacuous in the final model**.

| Lane | MSE | Gaussian NLL | 95% coverage | Frozen verdict |
|---|---:|---:|---:|---|
| Shrinkage-covariance query | 10.8695 | 2.6154 | 0.9608 | Not supported |
| Best validation expert | 9.6231 | 2.5516 | 0.9393 | Comparator |
| Static precision DAG | 9.6934 | 2.9761 | 0.7501 | Overconfident comparator |

Relative to static precision fusion, NLL improves by `−0.3607` with interval `[−0.7161, −0.0657]`, but MSE worsens by `1.1761` and the interval crosses zero. Relative to the best validation expert, both MSE and NLL point estimates are worse. The calibration improvement is real as a finite observation, but it costs too much MSE for the frozen “calibration repair only” criterion.

This outcome is consistent with the forecast-combination literature’s warning that estimated optimal weights may lose to simple averaging or selection once estimation error and common forecast components are present.[1] [2] It is not evidence that covariance modeling is generally useless.

## 5. CRDT-Compatible Belief Fusion Boundary

The state/query split survives the finite laws. Evidence-map union is associative, commutative, idempotent, monotonic by key inclusion, redelivery invariant, and conflict retaining. Raw Gaussian product is not idempotent: repeating the same evidence halves its variance. Fixed-half and 1,001-point trace-grid covariance intersection are idempotent and commutative after canonical ordering, but both have explicit two-dimensional non-associativity witnesses.

| Candidate binary operation | Obstruction |
|---|---|
| Gaussian product | Repeated-evidence variance ratio `0.5` |
| Fixed-half CI | First catalog parenthesization difference `0.26288972189176474` |
| Trace-grid CI | First catalog parenthesization difference `0.24355734504083776`; final weights `0.881` vs `0.347` |

The allowed conclusion is architectural: merge provenance-bearing evidence state, then query the full canonical state. Pairwise CI may still be useful inside a declared query, but it cannot serve as this state-based CRDT join.

## 6. Competitor and Usefulness Verdict

Zeta is presently comparable to systems that evaluate declared factor graphs and combine uncertainty-bearing evidence. It is not yet a causal structure learner, neural architecture search system, probabilistic-circuit structure learner, or implementation of Thousand Brains cortical learning. Numeric comparison with Precision-Gated Experts remains invalid because this benchmark uses four transparent static experts rather than its trained neural and quantile expert stack.

The next experiment should not tune CFB-C on the same held-out test. A fresh contract and evaluation boundary should test either a bias-aware residual second-moment objective, a common-noise latent factor, or genuinely more diverse experts. The success criterion should still require point accuracy, calibration, a deployable baseline, residual-dependence diagnostics, source-identity deduplication, and independent reproduction.

## 7. Explicit Non-Claims

These results do not establish universal DAG superiority, learned causal or computational topology, a calibrated online learner, brain-level capability, geospatial language semantics, consciousness, physical identity, regularity, homoiconicity, or universal covariance-intersection conservativeness. CFB-A is a finite exact-algebra census. CFB-B/C are one-target static forecast-combination studies. The CRDT result concerns a declared finite evidence representation and explicit operator counterexamples.

## References

[1]: https://arxiv.org/abs/2205.04216 "Wang et al., Forecast combinations: an over 50-year review"
[2]: https://econweb.ucsd.edu/~grelliott/AveragingOptimal.pdf "Elliott, Averaging and the Optimal Combination of Forecasts"
[3]: http://www.ledoit.net/Well-conditioned2004.pdf "Ledoit and Wolf, A well-conditioned estimator for large-dimensional covariance matrices"
[4]: https://inria.hal.science/inria-00555588/document "Shapiro et al., A comprehensive study of Convergent and Commutative Replicated Data Types"
[5]: https://arxiv.org/abs/2403.03543 "Cros et al., Split Covariance Intersection with Correlated Components for Distributed Estimation"
