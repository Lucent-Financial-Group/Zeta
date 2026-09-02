# Composable Factor-Graph, Correlated-Error, and CRDT Belief-Fusion Results

**Author:** Manus AI

**Status:** Independently reproduced finite results; public usefulness claim rejected

## Key Recommendation

Do not market the present work as “DAG learning beats chains.” The measured positive result is narrower: **balanced composition preserves an exact commutative Gaussian posterior while reducing ideal reduction depth**. The public ETTh1 experiment remains negative for predictive usefulness: naive precision fusion becomes substantially overconfident, and the first shrinkage-covariance follow-on selects away every residual correlation. A frozen one-common-noise follow-on is genuinely non-vacuous and meets its calibration-repair-only rule, but it still does not beat validation-selected ridge.

The practical architecture is now clearer. Replicate **content-addressed evidence**, retain changed-content conflicts, and compute probabilistic beliefs as deterministic queries over the complete adjudicated state. Do not use pairwise Gaussian product or covariance intersection as a CRDT state merge.

## 1. Scope and Architecture Correction

The current Reference-Frame Factor Heterarchy is two one-variable unary-factor blackboards with deterministic compensated posterior fusion behind external admission and pose-routing topology. Its parent/lateral graph controls message admission; it is not yet a multi-variable heterarchical factor graph. A separate two-variable equality-factor control confirms that the generic factor-graph substrate can propagate between variables, but RFFH does not instantiate that structure yet.

| Family | What it presently changes | What this work does not establish |
|---|---|---|
| Linear versus balanced Gaussian reduction | Evaluation topology and ideal critical-path depth | Better prediction from identical evidence |
| Static ETTh1 precision fusion | How four fixed expert forecasts are combined | Learned gates, learned topology, or PGE paper reproduction |
| Shrinkage-covariance query | Validation-fitted convex forecast weights and interval calibration | A non-vacuous correlation-aware winner |
| One-common-noise query | Training-fitted rank-one-plus-diagonal error covariance and validation-fitted interval scale | Predictive usefulness or a learned graph |
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

## 5. CFB-D: One-Common-Noise Query

CFB-D was frozen before execution. It fits a rank-one common training-residual factor plus positive diagonal uniqueness, adds a fixed dimensionless ridge `τ=0.25`, and enumerates the same 15 simplex active sets. There is no factor-strength grid and no held-out tuning. The required diagonal mutation changes the largest weight by `0.1083`, so the mechanism is non-vacuous rather than another diagonal model under a correlation-aware label.

| Lane | MSE | Gaussian NLL | 95% coverage | Frozen verdict |
|---|---:|---:|---:|---|
| One-common-noise query | 9.7691 | 2.5631 | 0.9222 | Calibration repair only |
| Best validation expert | **9.6231** | **2.5516** | 0.9393 | Predictive comparator |
| Static precision DAG | 9.6934 | 2.9761 | 0.7501 | Overconfident comparator |

The leading residual factor accounts for `0.6358` of training covariance trace. The final weights are `(0.3181, 0.2829, 0, 0.3990)` over `last`, `window-start`, `train-mean`, and `ridge-window`. Coverage improves by 17.21 percentage points over static precision fusion; MSE rises by approximately `0.781%`, within the frozen 1% limit; and NLL improves by `−0.4130` with moving-block interval `[−0.7107, −0.1708]`. Those facts satisfy the predeclared calibration-repair-only rule.

Predictive usefulness remains unsupported. Relative to validation-selected ridge, MSE is worse by `0.1460` with interval `[−0.5027, 0.7739]`, while NLL is worse by `0.0115` with interval `[−0.0238, 0.0519]`. Neither difference establishes improvement. The separately authored NumPy oracle uses a direct symmetric eigensolver rather than TypeScript’s fixed power iteration and reproduces the artifact, metrics, controls, and intervals within `1e-9`; a ridge mutation is rejected.

This finite result supports one engineering conclusion: a declared common-noise query can repair much of naive precision fusion’s calibration without becoming a replicated-state merge. It does not show that the common factor is causal, universal, or preferable to expert selection.[6] [7]

## 6. CRDT-Compatible Belief Fusion Boundary

The state/query split survives the finite laws. Evidence-map union is associative, commutative, idempotent, monotonic by key inclusion, redelivery invariant, and conflict retaining. Raw Gaussian product is not idempotent: repeating the same evidence halves its variance. Fixed-half and 1,001-point trace-grid covariance intersection are idempotent and commutative after canonical ordering, but both have explicit two-dimensional non-associativity witnesses.

| Candidate binary operation | Obstruction |
|---|---|
| Gaussian product | Repeated-evidence variance ratio `0.5` |
| Fixed-half CI | First catalog parenthesization difference `0.26288972189176474` |
| Trace-grid CI | First catalog parenthesization difference `0.24355734504083776`; final weights `0.881` vs `0.347` |

The allowed conclusion is architectural: merge provenance-bearing evidence state, then query the full canonical state. Pairwise CI may still be useful inside a declared query, but it cannot serve as this state-based CRDT join.

## 7. Competitor and Usefulness Verdict

Zeta is presently comparable to systems that evaluate declared factor graphs and combine uncertainty-bearing evidence. It is not yet a causal structure learner, neural architecture search system, probabilistic-circuit structure learner, or implementation of Thousand Brains cortical learning. Numeric comparison with Precision-Gated Experts remains invalid because this benchmark uses four transparent static experts rather than its trained neural and quantile expert stack.

The static four-expert lane has now tested diagonal precision, validation-selected shrinkage covariance, and a non-vacuous common-noise factor. None beats validation-selected ridge. The next fair usefulness study should therefore change the information available rather than continue tuning combination weights on the same held-out split: implement the declared Gaussian/Gamma and exponential-link competitor messages, use genuinely distinct expert artifacts, or establish a new chronological test boundary for a dynamic branch-selection model.

## 8. Explicit Non-Claims

These results do not establish universal DAG superiority, learned causal or computational topology, a calibrated online learner, brain-level capability, geospatial language semantics, consciousness, physical identity, regularity, homoiconicity, or universal covariance-intersection conservativeness. CFB-A is a finite exact-algebra census. CFB-B/C/D are one-target static forecast-combination studies. The CRDT result concerns a declared finite evidence representation and explicit operator counterexamples.

## References

[1]: https://arxiv.org/abs/2205.04216 "Wang et al., Forecast combinations: an over 50-year review"
[2]: https://econweb.ucsd.edu/~grelliott/AveragingOptimal.pdf "Elliott, Averaging and the Optimal Combination of Forecasts"
[3]: http://www.ledoit.net/Well-conditioned2004.pdf "Ledoit and Wolf, A well-conditioned estimator for large-dimensional covariance matrices"
[4]: https://inria.hal.science/inria-00555588/document "Shapiro et al., A comprehensive study of Convergent and Commutative Replicated Data Types"
[5]: https://arxiv.org/abs/2403.03543 "Cros et al., Split Covariance Intersection with Correlated Components for Distributed Estimation"
[6]: https://forecasters.org/wp-content/uploads/Poncela_2005-1.pdf "Poncela and Senra, Forecast Combination through Factor Models: Assessing consensus and disagreement"
[7]: https://www.econstor.eu/bitstream/10419/233668/1/for.2733.pdf "Weigt and Wilfling, An approach to increasing forecast-combination accuracy through VAR error modeling"
