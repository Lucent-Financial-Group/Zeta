# Factored predictive comparison: measured results

Date: 2026-09-06
Operational status: research-grade
Lifecycle: active
Work item: 081M1VS712Z087G0R000YKZKFB
Baseline: `ab8ddff9b415a79f08fc2c7a785990ff65bc4d01`

## Verdict

This continues the [predictive-state batch](2026-09-06-predictive-state-batch-results.md)
under a [protocol published before measurement](2026-09-06-factored-predictive-protocol.md).
All twelve HMM fits, eighteen frozen RNNs, all seeds, and all negative controls
are retained. Nothing here promotes a game controller or production policy.

1. **The registered RNNs predict better than these eight-pass HMM fits.**
   HMM inference is cheaper at the tested dimensions, but learning the right
   hidden dynamics from observations remains an optimization problem.
2. **The stronger output-only probe changes the interpretation.** Joint-four-token
   outputs beat hidden-state linear probes in every RRXOR run on both panels.
   Hidden-state geometry alone does not establish a Bayesian implementation.
3. **The allocation repair works without changing arithmetic.** Width-8 inference
   allocation is now independent of context length, with 504 bitwise prediction
   witnesses and 360 nonempty loss/gradient witnesses unchanged.
4. **The null model is load-bearing.** The known-null detector alarms on 2.59%
   of unchanged streams; a deliberately wrong IID null alarms on 100%.
5. **Shared operators and compressed beliefs are different.** Exact operator
   sharing preserves correlated beliefs. Product projection is faster here,
   but loses information with common noise. A smaller representation does not
   automatically allocate less scratch space or consume less energy.

## A. Learned HMMs and stronger probes

Each fit sees the same 65,536 length-33 sequences as its source/seed's earlier
RNN: 2,162,688 raw observations, with independent corpus SHA-256 replay. HMMs
perform eight full Baum-Welch passes, 17,301,504 optimizer target visits;
the RNN trained once on 2,097,152 conditional targets. HMMs include the first
token likelihood and fit a prior. This is **not matched optimizer compute**.
No true transitions, hidden labels, posterior targets, topology, smoothing,
early stopping, or selected checkpoint enter HMM fitting. The 3-state Mess3
and 5-state RRXOR capacities are explicitly oracle-informed choices.

New common panels: seed 1009, 512 contexts each, lengths 16 and 64, domains
31/32. The table gives arithmetic means over all three seeds at length 64;
the raw receipt contains every seed, initial model, length and bigram control.
KL units are bits, lower is better. Known-law filters have zero reference KL.

| Source | Model                   | Free parameters |  Next KL | Joint-four KL |
| ------ | ----------------------- | --------------: | -------: | ------------: |
| Mess3  | HMM, 3 states           |              26 | 0.171511 |      0.681783 |
| Mess3  | HMM, 8 states           |             191 | 0.075389 |      0.303199 |
| Mess3  | RNN, width 3            |              33 | 0.001705 |      0.006927 |
| Mess3  | RNN, width 8            |             123 | 0.001264 |      0.004814 |
| Mess3  | RNN, width 16           |             371 | 0.001306 |      0.005063 |
| Mess3  | Fitted bigram, all runs |               6 | 0.093822 |      0.371516 |
| RRXOR  | HMM, 5 states           |              49 | 0.322178 |      1.315754 |
| RRXOR  | HMM, 8 states           |             127 | 0.323722 |      1.322005 |
| RRXOR  | RNN, width 3            |              26 | 0.181080 |      0.740120 |
| RRXOR  | RNN, width 8            |             106 | 0.029495 |      0.118938 |
| RRXOR  | RNN, width 16           |             338 | 0.011584 |      0.046151 |
| RRXOR  | Fitted bigram, all runs |               2 | 0.324226 |      1.324218 |

All HMM corpus losses decrease across the eight passes. RRXOR fits nevertheless
remain near the fair-coin loss. This is not a representational impossibility:
the known five-state HMM generates RRXOR exactly. More EM passes or other
initializations are unmeasured follow-ups, not reasons to suppress these runs.
Recorded native training time spans 0.72--2.97 seconds per fit, excluding corpus
generation and FSI compilation but including the final loss evaluation.
Per-fit process CPU spans 0.74--3.30 seconds. Old RNN receipts do not provide
comparable training timing; no training-speed ranking is inferred.

The new RRXOR probe fits affine ridge 1e-6 on a separate length-16 panel,
domain 33, without refitting at length 64:

| Test length | Mean hidden R2 | Mean joint-four-output R2 | Output-probe wins |
| ----------- | -------------: | ------------------------: | ----------------: |
| 16          |       0.517039 |                  0.841330 |               9/9 |
| 64          |       0.551952 |                  0.866984 |               9/9 |

The earlier hidden-versus-next-token result survives as an observation, but
not as evidence unique to hidden posterior storage. A longer predictive
readout is a materially stronger control. Neither probe identifies the causal
algorithm, nor does the result say that recurrent hidden states are useless.

## B. Allocation and matched binary64 inference

The original RNN loop incurred 32 bytes per token. An `int[]` annotation first
removed only constant sequence overhead; this unsuccessful partial repair
is preserved. Changing offset and log-normalizer tuples to struct tuples
removed the length-dependent allocation. Operation order and weights are
unchanged. All eighteen models, seven lengths (including empty and 257), four
synthetic contexts each retain identical output bit hashes. The 360 contexts
of length at least two also retain identical loss/gradient bit hashes;
length-zero/one cases carry an empty-gradient sentinel.
A live native regression test also checks length-independent allocation.

| Width-8 profile | Original bytes/call, L64 | Array-only | Final, every tested length |
| --------------- | -----------------------: | ---------: | -------------------------: |
| Mess3 seed 11   |                    2,392 |      2,328 |                        280 |
| RRXOR seed 41   |                    2,384 |      2,320 |                        272 |

Five repetitions, 4,096 calls each, after 256 warm-up calls; lengths
0/1/16/64/256. The approximately 88% allocation reduction at L64 is not a
claim of an 88% time or energy reduction. The intermediate array-only profile
was slightly slower on this host, and is not discarded.

The separate matched benchmark uses 256 common L64 contexts, domain 35,
and returns binary64 state plus the entire next-token distribution for every
model. No BigInteger or sequence log-likelihood is included. Candidate order
rotates across five repetitions. Representative ranges of per-seed medians:

| Source/model                 |                      Microseconds/call | Allocated bytes/call |
| ---------------------------- | -------------------------------------: | -------------------: |
| Mess3 known filter           |                                   1.62 |                  200 |
| Mess3 HMM, 3 / 8 states      |                1.60--1.65 / 4.16--4.25 |            200 / 280 |
| Mess3 RNN, widths 3 / 8 / 16 | 2.13--2.28 / 7.81--8.09 / 28.90--29.18 |      200 / 280 / 408 |
| RRXOR known filter           |                                   2.60 |                  224 |
| RRXOR HMM, 5 / 8 states      |                2.58--2.60 / 4.18--4.31 |            224 / 272 |
| RRXOR RNN, widths 3 / 8 / 16 | 2.61--2.75 / 8.38--8.48 / 29.50--30.03 |      192 / 272 / 400 |

These are FSI microbenchmarks on one host, not throughput SLAs. No own build,
test or training process ran during timing; ordinary host activity was not
controlled. Parameter, cached-emission, and retained-state numeric bytes are
separate receipt fields. Allocation includes temporary arrays and output
objects; numeric payload is not retained heap. No joules or peak-heap claim.

## C. Calibrated change detection

The null copies the bit two positions back with probability .75. All compared
processes retain fair single-token marginals. The detector uniformly mixes
eight complete alternative sequence laws: permanent switches to .5 or .25 at
positions 64/128/192/256. It crosses once at likelihood ratio 20, without
restarts. Under the **true known null**, conditional expectation of the ratio
is its previous value, yielding a time-uniform .05 crossing bound.
This is a mathematical guarantee for that null, not a learned-null guarantee.

Each panel has 2,048 streams of 512 tokens; changed panels start at index 128.
Pre-change alarms are reported separately, not counted as successful detection.

| Panel                      | Pre-128 alarms | Post-128 alarms | Never alarmed | Median post-change delay |
| -------------------------- | -------------: | --------------: | ------------: | -----------------------: |
| Unchanged                  |             18 |              35 |         1,995 |             Not a change |
| Permanent .5               |             15 |           2,033 |             0 |                29 tokens |
| Permanent .25              |             21 |           2,027 |             0 |                 8 tokens |
| Transient .5 for 16 tokens |             16 |             668 |         1,364 |                12 tokens |

Unchanged false-alarm estimate: 53/2,048 = **2.59%**, Wilson 95% interval
**[1.98%, 3.37%]**. Both permanent changes are eventually detected among all
streams not already alarmed. The transient post-change rate is 32.62% over
all streams, or 32.87% among those still at risk at index 128. The transient
is an actual departure from the null, not automatically a false positive.
Delay quantiles and every first crossing are retained, including late alarms.

The wrong IID-fair denominator alarms on **2,048/2,048 unchanged streams**,
2,046 before index 128. Its alternatives are valid probability laws, but the
denominator is not the data law; the .05 guarantee does not apply. The purely
marginal detector stays identically one and never detects these changes.
Thus an entropy spike, marginal change, and an operator change are not synonyms.

## D. Exact sharing versus lossy belief factoring

Known two-state factors use the registered transition, destination-emission
and prior. With shared bit-complement noise, a token operator is a weighted
sum of two tensor products. Tensor contraction can reuse the local operators
while retaining the full correlated joint belief. Projecting after every
observation onto a product of marginals discards those correlations.

With no common noise, all three paths agree to floating-point roundoff.
With epsilon .2, means over all three seeds give:

| Factors | Exact joint vs product-of-its-marginals KL | Projected next KL | Maximum projected state error |
| ------- | -----------------------------------------: | ----------------: | ----------------------------: |
| 2       |                                   0.097679 |          0.001102 |                      0.182774 |
| 3       |                                   0.223877 |          0.002791 |                      0.297932 |
| 4       |                                   0.369732 |          0.005093 |                      0.397694 |

Exact shared contraction's maximum state discrepancy from dense filtering is
below 4e-16. The projected-state error compares the full exact posterior with
the reconstructed product after all 64 updates, not merely one final projection.
Tiny signed KL values near zero are floating-point roundoff, not negative
information. All outputs include the complete next-token distribution.

At epsilon .2, medians across the three per-seed timing medians:

| Factors | Dense us | Exact shared us | Projected us | Bytes/call: dense / shared / projected |
| ------- | -------: | --------------: | -----------: | -------------------------------------- |
| 2       |     2.07 |            2.09 |         1.27 | 224 / 368 / 312                        |
| 3       |     4.22 |            4.66 |         1.63 | 320 / 544 / 408                        |
| 4       |    14.08 |           10.35 |         1.68 | 512 / 880 / 536                        |

Dense numeric parameters including prior occupy 544/4,160/32,896 bytes.
The shared template occupies 88 bytes of numeric parameters plus 32 bytes of
cached local emissions, excluding metadata and code. Dense cached emissions
occupy an additional 128/512/2,048 bytes. Exact retained joint belief still
occupies 32/64/128 bytes; projected marginals occupy 32/48/64. The complete
output itself scales as 8 times 2^N bytes before object headers. These are
representation budgets, not process memory measurements.

Sharing is slower at three factors and allocates more scratch at every tested
size; it becomes faster at four factors. Product projection is fastest but
is not lossless under common noise. No claim of universal compression, learned
factor discovery, energy reduction, or optimal tensor-kernel engineering.

## Reading the papers and talk

The five supplied PDFs represent four works: the NeurIPS PDF and
[arXiv 2405.15943v3](https://arxiv.org/abs/2405.15943v3) are versions of the same
belief-geometry paper. Appendix A.3 retains the Mess3/RRXOR process parameters
used in the earlier v2-based fixture. The paper distinguishes representation
evidence from directly establishing Bayesian update implementation; our
stronger predictive-output probe makes that distinction especially important.

[Constrained Belief Updates](https://proceedings.mlr.press/v267/piotrowski25a.html)
derives architecture-constrained intermediate geometry and attention behavior.
The screenshots' final normalized operator product and intermediate additive
approximation are not interchangeable. Our RNN/HMM work does not reproduce
that attention-circuit experiment or certify its claims for all transformers.

[Transformers learn factored representations](https://arxiv.org/abs/2602.02385v1)
provides conditional-factorization results and experiments on an inductive
bias toward factored representations. Independent factor subspaces may be
orthogonal while distinct histories within a factor remain nonorthogonal.
The hypothesis does not license making every belief vector orthogonal.
Appendix H.2.1, page 29, incorrectly identifies trivial subspace intersection
with orthogonality: span((1,0)) and span((1,1)) have zero intersection but
squared principal cosine 1/2. H.2.2's principal-angle overlap statistic is a
different, legitimate geometric diagnostic. Also, a 95%-variance dimension
need not add across orthogonal factors with unequal variances. An orthogonal
change of coordinates preserves rank and predictions; it alone saves no bytes.
These limits do not invalidate the paper's entire experimental program.

The paper's noisy-token construction is not our common-bit-flip fixture.
Our experiment tests the same distinction between product and correlated
posteriors, but is **not a replication** of that training experiment. No new
orthogonality regularizer was trained. That needs its own preregistered
accuracy/compression/compute ablation rather than a post-hoc reward choice.

[Nominally quantum and post-quantum representations](https://arxiv.org/abs/2507.07432v2)
concerns expressive finite-dimensional state representations, including an
ideal-real versus finite-precision distinction. Nonorthogonal coordinates do
not imply physical quantum hardware, super-Turing computation, or lower joules.
For generalized HMMs, normalization constraints alone do not prove all word
probabilities are nonnegative; a valid probabilistic state/effect structure
is needed. The new learner here uses ordinary nonnegative stochastic edges.

The IPAM screenshots/transcript extend the story to nonergodic components,
shared factors, position manifolds, and programming-language steering. In a
direct-sum model the state contains **component-weighted conditional states**,
not a list of equally available independent posteriors. Concentration on a
component can produce effective sparsity; finite ambiguous contexts need not
make other components exactly zero. Shared generator factors motivate reuse
across domains, but steering demonstrations and centered PCA plots alone do
not establish correct program execution or a universal abstraction mechanism.

## Composition and review findings

This reuses `ResearchRandom`, Mess3/RRXOR samplers, `SmallRnn`, `BeliefProbe`,
and the existing independent Python lane. `DenseHmm` adds the missing
observation-only expected-count learner and matched binary64 filter.
Existing `Bayesian/FactorGraph.fs` already has message-passing abstractions;
it was inspected, not replaced. `Core/CayleyDickson.fs` provides algebraic
doubling, not a lossless predictive-state compression theorem. Neither this
experiment nor operator sharing authorizes discarding correlated information
or applying associativity-based rewrites to arbitrary doubled algebras.

Reviewer lenses applied from `docs/REVIEW-AGENTS.md`: performance/allocation,
math/novelty, shared mutable state, verification, and simplicity. Concrete
findings and dispositions:

- Fixed context-proportional tuple allocation; retained the partial array-only
  attempt and three bitwise witness sets. No weight retraining was needed.
- HMM EM counts checked against exhaustive hidden paths, including unoccupied
  rows and impossible observations; public constructors own input arrays.
- Restricted unchecked product expansion to internal use; exposed inference
  validates bounded contexts. Dense/tensor/projected modes return owned arrays.
- Known binary64 posteriors and all four-step words additionally checked
  against independent exact fractions in 32 current-kernel fixtures.
- Kept learned-null false alarms, transient misses, stronger-probe reversal,
  allocation/time disagreements and HMM optimization failures visible.
- Independent implementations are not an independent reviewer. No external
  adversarial-review completion is asserted by a successful replay.

## Receipts and reproduction

All paths below are under `src/Research.FSharp/`:

- `learned-hmm-results.json`: all initial/final parameters, nine trace points
  per fit, corpus hashes, parameter/observation budgets and training costs.
- `hmm-comparison-results.json`: 124 prediction rows, 18 probes and native
  oracle checks, with input and source hashes.
- `rnn-allocation-{before,after,struct}-results.json`: 150 profile rows.
- `rnn-layout-{before,after,struct}-results.json`: three 504-case bit witnesses.
- `matched-inference-results.json`: all 160 matched benchmark rows and payloads.
- `change-detection-results.json`: all 8,192 streams' first crossings and final
  log ratios, panel hashes and fixed detector configuration.
- `factor-comparison-results.json`: 54 score rows and 270 benchmark rows.
- `comparison-replay-results.json`: maximum prediction/probe error 6.0e-15,
  all cost checksums, all twelve independently retrained HMMs (maximum
  parameter error 1.11e-13).
- `factor-change-replay-results.json`: independently verified factor metrics,
  every alarm time, and derived rates/intervals/delay quantiles.

Runners refuse existing output paths. Use fresh output filenames. Comparison
runners deliberately evaluate the retained model receipts; they do not silently
substitute a new training run. Independent retraining verifies those receipts:

```sh
dotnet fsi src/Research.FSharp/run-hmm-training.fsx /tmp/hmm-reproduction.json
dotnet fsi src/Research.FSharp/run-hmm-comparison.fsx /tmp/hmm-comparison.json
dotnet fsi src/Research.FSharp/measure-matched-inference.fsx /tmp/matched-inference.json
dotnet fsi src/Research.FSharp/run-change-detection.fsx /tmp/change-detection.json
dotnet fsi src/Research.FSharp/run-factor-comparison.fsx /tmp/factor-comparison.json
uv run --project src/Interp.Python python -m zeta_interp.comparison_replay src/Research.FSharp /tmp/comparison-replay.json --training
uv run --project src/Interp.Python python -m zeta_interp.factor_change_replay src/Research.FSharp /tmp/factor-change-replay.json
```

Do not run builds, tests or training concurrently with timing reproduction.
Fresh reproduction files in `/tmp` are ephemeral, not preservation surfaces.
The retained versions above are committed and indexed here and by the lane README.

### Provenance archive

Permanent ref: `archive/experiments/081M1VS712Z087G0R000YKZKFB`.
It must retain these exact ancestors through squash, never be moved or deleted:

- Published protocol: `e5764e57f5cb995789df3e535b0358b9abf8214e`.
- Original allocation kernel/witness: `54a5f62989b60467c35bb27fafedf4aaf7d67f3c`.
- HMM fits and array-only witness: `42a441382313cb664954e7b029a63b3a2af8345e`.
- Completed measurements/replay source: `dfa27120e9b346ac0bbdd72662890d36462eda6e`.

The archive resolves source hashes even after formatting or internal-visibility
cleanup. Numerical JSON receipts are not rewritten by formatting.

Supplied PDF SHA-256 provenance, in filename order:

| File                                 | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `2602.02385v1.pdf`                   | `d0582aa1da73f8f2ed7bf33b18ca246ed2acede27fb6dff9689e64a5ddcdd8db` |
| `2507.07432v2.pdf`                   | `59875961d28d1ddd9882b65d501ccd522af132648e7e48ac71bc4db35de92027` |
| `9570_Transformers_Represent_Be.pdf` | `b22178869b545187f9ae92bcd82ef6772108968cd050759fa07828d29d928a7b` |
| `2405.15943v3.pdf`                   | `a4d7ea32691907de73d35481ee127f6bf4cedcb39f764f11a564c60abe2ab50a` |
| `2891_Constrained_Belief_Update.pdf` | `7e42f2bb61f3dc19f66faa24ce73385ff3d26e2934415bf3c1f2647026bf5154` |

Supplied transcript SHA-256:
`ffc105af968a2dcfb71599a9da896a9237aecce3b0b55907699c5d863c110b5a`.
Screenshots are the supplied September 6 captures of Paul Riechers's IPAM talk,
_The shape of beliefs and abstraction in neural networks_. No screenshots,
transcript, or third-party PDF have been copied into the repository.

Likelihood-control grounding: [Howard et al. (2020)](https://doi.org/10.1214/18-PS321).
EM prior art: [Baum et al. (1970)](https://doi.org/10.1214/aoms/1177697196);
bibliographic metadata checked, full original article not retrieved in this run.
The implemented expected-count update is defended by the explicit path tests
and independent full numerical training replay, not a claimed full-paper review.

## Gates

- `dotnet build -c Release`: zero warnings and zero errors.
- Complete .NET suite rerun: **7,453 passed, six existing skips**, zero failures.
  The F# project accounts for 6,463 passes and all six skips.
- Independent Python suite: **72 passed**, one previously present TransformerLens
  deprecation warning. Ruff check/format and mypy pass (15 source files).
- All twelve EM fits independently replayed, not only the tiny fixture.
- `bun run preflight:quick`: all 16 executed checks pass, including the native
  language lints and ACE build-graph drift. No derived JSON change was needed.
- `dotnet format --verify-no-changes`: exits zero, but emits unsupported-F#
  and workspace warnings. This is not a claim that it formats F#.
- `git diff --check`: clean.

The first full .NET run had 7,452 passes, six existing skips, and one failure:
the JVM crashed during the unchanged `DbspSpec` TLC check (exit 134,
OpenJDK 26.0+35-2893, macOS arm64, Serial GC, SIGSEGV in
`OopOopIterateDispatch<YoungGenScanClosure>`). This was not a model verdict.
The isolated `DisplayName~DbspSpec` rerun passed in ten seconds with the same
pinned model and JVM flags. No solver flags, test expectations, or production
code were changed to obtain that pass. The subsequent complete suite passed
with the same binaries (`dotnet test Zeta.sln -c Release --no-build`).

Publication must preserve the archive ref above and verify the eventual merge
commit is an ancestor of `origin/main`; a queued auto-merge is not merge proof.
