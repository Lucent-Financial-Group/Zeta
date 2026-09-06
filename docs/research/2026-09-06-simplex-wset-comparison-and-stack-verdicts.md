# Simplex belief comparison and stack verdicts

Date: 2026-09-06
Operational status: research-grade
Lifecycle: active
Work item: 081M1TRRN18087G0R00082EDMR
Scope: architecture-spanning audit of the named correspondences, not an audit of every file in Zeta.
Code baseline: `d1cc223375`.

## Result first

The first experiment in the [handoff](../handoffs/2026-09-06-shadow-to-vera-reverse-direction-map-simplex-belief-geometry-onto-the-zeta-stack.md)
is runnable. Existing `WSet.apply`, `consolidate`, and `discard`, using
`ProbabilitySemiring.RationalRing`, reproduce the Golden Mean and Even process
predictions at the explicit parameter p = 1/2. No core primitive was changed.

Every binary history of length 0 through 10 was evaluated, including zero-probability histories.

| Process | Histories | Possible | Impossible | Dense disagreements | Closed-form disagreements | Signed-coordinate disagreements | Disagreements after clipping negative coefficients |
|---|---:|---:|---:|---:|---:|---:|---:|
| Golden Mean | 2047 | 375 | 1672 | 0 | 0 | 0 | 2047 |
| Even | 2047 | 596 | 1451 | 0 | 0 | 0 | 2047 |

Comparison includes prefix probability, posterior over hidden states, and the entire
next-symbol probability vector. Equal refusal on impossible histories counts as agreement.
The dense path has a separately written matrix representation. The closed-form path
uses the last symbol or trailing-one parity and never calls the transition kernel.
All three share the existing rational arithmetic, so they are independent algorithms,
not independent arithmetic implementations. Entropy calculations use binary64 logs.

This is a successful finite algebraic reproduction. It is **not** a transformer training
experiment, an activation analysis, a general signed-model validity proof, or an ARC score.
The control is a standard HMM calculation and has equal predictive accuracy. No CPU,
allocation, or working-set advantage has been measured.

## Reproduce

```sh
dotnet build src/Core/Core.fsproj -c Release
dotnet fsi --warnaserror src/Research.FSharp/run-simplex-belief-comparison.fsx
dotnet test tests/Tests.FSharp/Tests.FSharp.fsproj -c Release --filter FullyQualifiedName~SimplexBeliefComparison
```

Source: [SimplexBeliefComparison.fs](../../src/Research.FSharp/SimplexBeliefComparison.fs).
Measured output: [receipt](../../src/Research.FSharp/simplex-belief-comparison.json).
Regression cases: [tests](../../tests/Tests.FSharp/SimplexBeliefComparison.Tests.fs).
The research module is compiled into the test executable, not into the database runtime.
The runner references the built Core assemblies; build first to avoid stale binaries.

The history cap is intentional. The existing rational carrier uses int64 products,
not arbitrary-precision fractions; this comparison must not be extended to unbounded
histories by removing the cap. Exhaustive enumeration is exponential and is a test
method, not the proposed runtime algorithm. The prediction fold retains two weighted
coordinates, but the enumerator retains many histories. Neither statement is a heap-size measurement.

## Exact setup and what the sign means

The source processes and row-vector convention come from Riechers et al.,
[Next-token pretraining implies in-context learning](https://arxiv.org/abs/2505.18373),
v2, section 3 and Figure 1. Our p = 1/2 is an explicitly chosen instance of their
parameterized families; we do not claim to reproduce their trained-model loss curves.

The Golden Mean matrices, in state order A,B, are
`T0 = [[1/2,0],[1,0]]`, `T1 = [[0,1/2],[0,0]]`.
For Even, `T0 = [[1/2,0],[0,0]]`, `T1 = [[0,1/2],[1,0]]`.
Both start at stationary distribution `[2/3,1/3]`.

Our additional signed-coordinate experiment is a change of basis we constructed:
`C = [[1,0],[-1,2]]`, `C^-1 = [[1,0],[1/2,1/2]]`.
Use `eta C`, operators `C^-1 T_x C`, and decode with `C^-1`.
Since `C 1 = 1`, the terminal sum still gives word probability. Cancellation of the
adjacent inverse pairs explains equality for every word in exact arithmetic;
the bounded enumeration checks the implementation. Pure state B becomes `[-1,2]`,
which is a coordinate vector, **not a probability distribution**. Clipping destroys
the equality. The clipped path is deliberately invalid and is never a selectable runtime policy.

Verdict: the rational-weighted container can carry a signed linear representation
of these processes. The stronger statement "a negative-coefficient model is a Z-set"
is underspecified: integer multiplicities alone do not provide a transition operator,
initial vector, terminal functional, positivity constraints, or normalization.
Nor does this example demonstrate a process unavailable to ordinary HMMs: it began as one.

## Correspondence audit

| Handoff connection | Source checked | Verdict |
|---|---|---|
| Signed operators and weighted sets | `src/Core/WSet.fs`, `src/Core/ProbabilitySemiring.fs`, experiment above | **Measured, bounded.** Signed rational linear propagation works. Probability normalization remains a nonlinear boundary. |
| Universal tensor | `src/Core/WSet.fs`, `src/Core/WeightedSet.fs`, `src/Core/ZSetW.fs` | **Conditional mathematical statement**, below. Raw lists are not canonical vectors, and tensor is bilinear, not jointly linear in its two arguments. |
| Bayesian state updates | `src/Core/SoftValue.fs:135`, `foldRetainedBounded` | **Related but not interchangeable.** Fixed-state likelihood products commute; hidden-state transition operators generally do not. |
| Simplex geometry | `SoftValue.candidates`, `ofWeighted`, `unnormalized`; experiment belief census | **Representation exists; shared fractal result unestablished.** These two examples reach exactly 3 and 4 beliefs respectively, not a fractal. The unnormalized escape hatch also means not every constructible value is a simplex point. |
| Spectral decomposition | `src/Core/SpectralPivot.fs`, `src/Core/SoftRegimeStability.fs`, `src/Core/IharaZeta.fs`, `src/Core/CoordinationSpectrum.fs` | **Not an implementation equivalence.** DFT/Goertzel frequency probes do not compute the Jordan projectors of a predictive-state transition operator. The latter has not been supplied by this experiment. |
| Measured uncertainty change | `src/Core.TypeScript/ledger/measure.ts` | **Different units.** The ledger records an ordinal, self-attested work-item judgment. Our numeric conditional KL is a prediction metric; it is not automatically that ledger's delta. |
| Four-channel corrections | `src/Core/WSet.fs` (`FourCornerTrace`), `src/Core/RetractionReading.fs`, `src/Core/FourCornerC4.fs` | **Correction history exists.** No communication-loss/feedback ablation was run here. A retained log and a consolidated view have different information-retention properties. |
| Clifford and Bayesian inference | `src/Bayesian/AdinkraEquivariantFactorLayer.fs`, `src/Bayesian/SignedProbitEp.fs:163` | **Integration exists; equality to learned density-matrix geometry is unestablished.** Signed-probit uses the binary label to reflect the cavity mean before projection; it is not a negative probability or our signed transition matrix. |
| Budgeted execution and learning | `src/Core/Vision.fs`, `src/Core/VisionAttention.fs`, `src/Core/RoomRun.fs`, `src/Core/RoomHorizon.fs` | **Budget ports exist.** A memory budget neither estimates a hidden transition model nor supplies calibration of its posterior. Admission and prediction error need separate receipts. |
| Game sensing | `src/Core/FrameSignals.fs`, `src/Core/FrameMotion.fs`, `src/Arc.Python/zeta_arc/scene_prior_benchmark.py` | **Rendered observations and a transfer comparison exist.** This experiment has not added a learned transition model to the game agent. |
| Heat | `src/Core/WSetHeat.fs`, `src/Core/Heat.fs` | **Separate accounting.** Finite-domain erasure profiles are not observed hardware dissipation; neither is conditional KL in bits. No conversion to joules or temperature is introduced. |

### A falsified equivalence: commutative evidence is not a temporal filter

Golden Mean after `01` predicts `[1,0]`; after `10` it predicts `[1/2,1/2]`.
The observations have the same multiset and different valid predictions. Sorting the
observations to make the fold commute would delete predictive information.
The regression test locks this counterexample. This does not refute `SoftValue`'s
fixed-likelihood product law; it refutes applying that law to ordered state transitions.

### What can legitimately be universal

For a lawful commutative semiring R, finite-support functions K -> R form the free
R-semimodule on K. Given a function f: K -> M into an R-semimodule, its unique linear
extension is `F(v) = sum_k v(k) f(k)`: linearity forces this formula from the basis
vectors, and semimodule laws make it well-defined. This is a standard algebraic
construction, not a new measured property of trained models.

`WSet` represents it only **modulo consolidation**, assuming exact zero recognition
and lawful arithmetic. Float epsilon pruning and overflowing machine integers do
not inherit that theorem without additional bounds. Canonical `WeightedSet` is
closer to the finite-support representation, but it also depends on the supplied algebra.

Product keys express the tensor basis; tagged/disjoint keys express a direct sum.
The code can represent both. There is no unrestricted invertible linear compression
from all joint distributions to their marginals. The test constructs
`P(00)=P(11)=1/2` and `Q(01)=Q(10)=1/2`: identical marginals, different correlation.
Reconstruction by tensor gives four entries of 1/4 and recovers neither input.
An independent product distribution does round-trip. Compact marginals are sufficient
only under an independence assumption (or when extra dependence information is retained).

The primary [factored-representations paper](https://arxiv.org/abs/2602.02385),
dated February 2026, explicitly makes this conditional-independence distinction
and gives a non-invertible joint-to-factored map in Appendix A.5. Our counterexample
agrees with that limitation; it refutes an unrestricted reading of the handoff,
not the paper's actual result. An explicit map between representations is feasible;
lossless recovery from that map needs a premise, and the source already states it.

### Two corrections that matter before building a change detector

`SpectralPivot` evaluates a Fourier transform of sampled signals. Riechers and
Crutchfield's [Spectral Simplicity, Part I](https://arxiv.org/abs/1705.08042)
analyzes functions of transition operators that may not be diagonalizable. A
nonzero nilpotent matrix with all eigenvalues zero cannot be similar to a diagonal
matrix: a diagonal matrix with that spectrum is zero. Renaming frequency bins does
not bridge that gap.

A changed image can be an ordinary state transition under an unchanged generating
process. Also, conditional entropy averaged over histories is not the surprise of
one observation. A detector therefore still needs a declared model, a residual
statistic, and false-alarm/delay calibration; the word "spectral" removes none of these.

## Computed entropy result

The receipt reports `H(X_L | X_<L)`, cross-entropy against the stationary memoryless
predictor, and conditional KL calculated separately, averaged over the exact history
probabilities. `cross-entropy - H = expected KL` holds within 1e-12 bits.
Golden Mean gives 0.918295834 bits at L=1 and 0.666666667 bits thereafter;
the memoryless predictor remains at 0.918295834 bits. Even reaches 0.674530078
bits at L=11. The fully specified HMM has zero excess loss against itself.

Finite-context conditional entropy is irreducible **given that information**, not
necessarily the asymptotic noise floor. Longer context may still resolve hidden-state
uncertainty. Along one realized history it can rise: Golden Mean after `1` has
next-token entropy zero, then after `10` has one bit. Legitimate evidence can widen
predictions. This is compatible with decreasing expected conditional entropy under
the stationary model. Neither observation establishes coercion from the sign of a metric.

## Paper boundary and remaining work

Shai et al., [NeurIPS 2024](https://arxiv.org/abs/2405.15943), tests belief geometry
against trained residual activations. Piotrowski et al.,
[ICML 2025](https://arxiv.org/abs/2502.01954), studies architecture-constrained belief
updates and distinguishes intermediate geometry from full belief-state geometry.
We have not trained those models, fitted their activation maps, or reproduced their
fractal observations. Negative eigenvalues, signed coordinates, and negative binary
labels are three different things. None establishes physical quantum computation.

The talk's generalized-representation thread also has its own primary reference:
[Riechers, Elliott and Shai (2025)](https://arxiv.org/abs/2507.07432).
Our change of basis of an ordinary HMM does not test the representation-class
separations discussed there. That is a distinct experiment, not an implication of
matching these two processes.

The handoff's six experiments now stand as follows:

1. **Completed at finite-process scope:** runnable WSet/dense/closed-form comparison,
   plus our own signed-coordinate variant. No trained-transformer replication claimed.
2. **Narrowed:** free-semimodule statement and independence boundary stated;
   independent reconstruction passes and unrestricted marginal recovery is refuted.
   No unrestricted "universal tensor" theorem or machine-checked proof claimed.
3. **Not implemented:** next useful game slice is a bounded chronological predictor
   over rendered signals, then calibrated change detection against ordinary baselines.
   Fit on non-ARC source games; freeze parameters before held-out games. Record
   false alarms, detection delay, log loss, action score, CPU, allocations and peak memory.
4. **Partially measured:** numeric loss decomposition on the toy processes;
   no automatic work-ledger adapter, because the measurement semantics differ.
5. **Partially measured:** reachable-state census for two small processes;
   no simplex plot, fractal dimension estimate, or neural activation comparison yet.
6. **Not run:** feedback/channel-loss ablation. Specify the operational S statistic,
   setting-generation dependence and common-randomness controls before executing it.

Next integration order: ordered observation interface and proper probability scoring;
resource receipts; held-out non-ARC regime changes; only then a spectral alternative
with the same evaluation budget. Immutable observations can still be stored/retracted
through DBSP; rebuilding the chronological filtered view is distinct from treating
temporal transitions as a commutative evidence bag.
