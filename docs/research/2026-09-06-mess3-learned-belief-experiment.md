# Mess3 learned predictive-state experiment

Date: 2026-09-06
Operational status: research-grade
Lifecycle: active
Work item: 081M1TXSGV2087G0R000Y88DEY
Code baseline: `9eca989e53`

## Question and scope

Does a small native recurrent network, trained only on emitted tokens, learn
predictive state on the published Mess3 process? How do prediction error,
held-out linear belief decoding, and resource use change with hidden width?

This follows the [exact WSet comparison](2026-09-06-simplex-wset-comparison-and-stack-verdicts.md)
and the [architecture handoff](../handoffs/2026-09-06-shadow-to-vera-reverse-direction-map-simplex-belief-geometry-onto-the-zeta-stack.md).
It is a task-level replication with a different architecture and training budget,
not a reproduction of the paper's transformer checkpoints. No game, ARC score,
quantum hardware claim, runtime replacement, or adaptive budget policy is tested.

## Sources and boundaries

- Shai et al., [Transformers Represent Belief State Geometry in their Residual Stream](https://arxiv.org/abs/2405.15943), v2, Appendix A.3: the three Mess3 transition matrices. Sections 3.2 and 4.4 delimit representation and prediction claims.
- Piotrowski et al., [Constrained Belief Updates Explain Geometric Structures in Transformer Representations](https://arxiv.org/abs/2502.01954): architectural constraints matter; an RNN is not a transformer.
- Riechers et al., [Next-token Pretraining Implies In-context Learning](https://arxiv.org/abs/2505.18373): inference within a sequence is distinct from parameter training and unrestricted out-of-distribution transfer.
- Riechers et al., [Neural Networks Leverage Nominally Quantum and Post-quantum Representations](https://arxiv.org/abs/2507.07432), Appendix H: [reproduction code](https://github.com/adamimos/epsilon-transformers/tree/quantum-public) includes RNNs. Our implementation is independently written, not copied from that repository.
- Shai et al., [Transformers Learn Factored Representations](https://arxiv.org/abs/2602.02385): correlated components cannot generally be reconstructed from marginals. No factorization theorem is tested by this single-process experiment.
- Kingma and Ba, [Adam](https://arxiv.org/abs/1412.6980): bounded, bias-corrected first/second-moment optimizer.

The talk's late cross-language counting and syntax/function interventions do not
have a confidently identified matching paper in this audit. They remain
talk-reported, not acceptance conditions here.

## Protocol frozen before training

These choices are recorded before inspecting trained-model evaluation results.
Implementation defects may be fixed; any experimental change after a run must
be recorded with its reason. A failed scientific comparison is not a code defect.

| Dimension            | Fixed choice                                                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source               | Mess3, the numerical matrices in Appendix A.3; uniform stationary initial state                                                                                        |
| Observation          | Integers 0, 1, 2 only; no generator state, posterior, or transition matrix enters the learner                                                                          |
| Network              | One tanh recurrent layer, one linear three-token softmax readout; zero initial hidden state                                                                            |
| Trainable parameters | Input matrix, recurrent matrix, hidden bias, output matrix, output bias                                                                                                |
| Hidden widths        | 3, 8, 16; every width reported                                                                                                                                         |
| Repetitions          | Seeds 11, 23, 37; every repetition reported                                                                                                                            |
| Initialization       | Independent Glorot-uniform matrices, zero biases                                                                                                                       |
| Objective            | Mean next-token negative log likelihood, full backpropagation within each 32-step sequence                                                                             |
| Training             | 4096 updates, batch 16, 33 tokens per generated sequence; state resets between sequences                                                                               |
| Optimizer            | Adam, learning rate 0.003, beta1 0.9, beta2 0.999, epsilon 1e-8, gradient L2 cap 1                                                                                     |
| Selection            | Final weights only; no evaluation-based checkpoint selection or early stopping                                                                                         |
| Randomness           | Explicit domain-separated streams for initialization, training, probe fit, evaluation, and shuffle                                                                     |
| Probe                | Affine ridge regression, mean squared error plus 1e-6 slope penalty; intercept unpenalized                                                                             |
| Probe fit            | 512 independent sequences, one final activation after 16 observations per sequence                                                                                     |
| Held-out evaluation  | 2048 independent sequences; no sequence contributes to both probe fit and evaluation                                                                                   |
| Contexts             | Main evaluation after 16 tokens; separately report 64-token context extrapolation                                                                                      |
| Prediction           | Conditional expected cross-entropy, entropy floor, excess KL, sampled next-token loss, and joint three-token future KL                                                 |
| Controls             | Exact known-model filter, training-fitted unigram/bigram with additive-one smoothing, same-initialization untrained RNN, shuffled-label probe, next-token-output probe |
| Resource accounting  | Binary64 numeric payload bytes separately from measured allocation, elapsed time, and process CPU; no payload-as-heap claim                                            |
| Gates                | Gradient finite differences, independently expressed Mess3 checks, numerical reference, deterministic replay, build/test/lint                                          |

## Interpretation rules

An affine probe is supervised analysis of a frozen network; the generator's
belief targets are available to the probe, never to the network optimizer.
Random-network controls matter because a fitted probe can exploit useful random
features without learning. Shuffling is performed on probe-training labels only;
its evaluation still uses correct held-out targets.

Mess3's next-token distribution already distinguishes its three-state beliefs.
Successful belief decoding on this process alone therefore does not demonstrate
information beyond next-token probabilities. The output-only probe measures
this limitation directly. RRXOR or another next-token-degenerate process is a
separate follow-up, not an unreported substitution if these results disappoint.

Longer-context evaluation uses the same process. It is not unseen-game transfer.
Approximate binary64 arithmetic is not exact rational arithmetic or a
cross-platform byte-identity promise. Timing has no pass threshold and must not
be used to call a known-model baseline an unfair competitor: its knowledge
advantage is disclosed, while its cost remains relevant.

## Implementation checks before the registered sweep

The separate smoke configuration uses width 3, seed 999, 64 optimizer updates,
and 64 probe/evaluation rows. It is an execution check, not one of the nine
registered scientific runs. No hyperparameters were selected using it.

Eight F# tests pass, including all 364 histories through length 5 checked
against an independently factored BigInteger filter, finite-difference gradients,
replay, frozen-model preservation, and probe controls. The Python reference
uses exact fractions, an independently written forward pass, finite differences,
and pivoted elimination for ridge. A third gradient check uses the existing
interpretability project's PyTorch autograd. All three Python checks pass.

Two implementation defects were found and fixed before the scientific sweep:

- Combining a huge maximum logit with log-sum-exp lost the small normalization
  term. Keeping the maximum separate makes probabilities and loss stable under
  a common `1e300` output bias; a regression test covers it.
- A numerically averaged constant target had a tiny nonzero residual variance,
  making R2 look defined. Exact constant rows now refuse explicitly.

The runner records source hashes, parameters, weight hashes, every scheduled
trace, and measured costs. It checkpoints completed runs and marks partial
receipts incomplete. Existing output files are not silently overwritten.

## Recorded results

Protocol commit: `9e0a858018`, before training. First implementation commit:
`af434e26b2`. All nine registered runs completed; none was excluded or selected
as a checkpoint. Each run consumed 2,097,152 prediction positions. The three
seeds use different streams; widths with the same seed deliberately share
training and evaluation observations. The nine rows are not nine independent
datasets.

The [complete receipt](../../src/Research.FSharp/mess3-learned-belief-results.json)
contains weights, initial/final weight hashes, module hashes, configuration,
loss traces, all scores, runtime/platform, and measured costs. The table below
rounds the main, 16-observation-context panel. KL is in bits; lower is better.
R2 is held-out affine decoding of the three-coordinate posterior.

| Width | Seed | RNN next KL | RNN joint-3 KL | Bigram next KL | Trained hidden R2 | Untrained hidden R2 | Trained output R2 |
| ----: | ---: | ----------: | -------------: | -------------: | ----------------: | ------------------: | ----------------: |
|     3 |   11 |    0.002535 |       0.007728 |       0.091567 |          0.984504 |            0.551328 |          0.995523 |
|     3 |   23 |    0.001382 |       0.004066 |       0.087546 |          0.986968 |            0.712768 |          0.997802 |
|     3 |   37 |    0.001226 |       0.003653 |       0.083674 |          0.988521 |            0.802929 |          0.998135 |
|     8 |   11 |    0.000654 |       0.001979 |       0.091567 |          0.991428 |            0.928839 |          0.998951 |
|     8 |   23 |    0.001074 |       0.003457 |       0.087546 |          0.994449 |            0.946249 |          0.998307 |
|     8 |   37 |    0.001529 |       0.004649 |       0.083674 |          0.994089 |            0.936955 |          0.998483 |
|    16 |   11 |    0.001090 |       0.003247 |       0.091567 |          0.995182 |            0.947632 |          0.998706 |
|    16 |   23 |    0.000997 |       0.003209 |       0.087546 |          0.994261 |            0.932445 |          0.998542 |
|    16 |   37 |    0.001507 |       0.004566 |       0.083674 |          0.996333 |            0.929529 |          0.998638 |

Every trained model beats its unigram, bigram, and untrained-RNN controls on
next-token and joint-three-token KL in both panels. At context 64, trained next
KL ranges from 0.000742 to 0.002655 bits. The probe fit still uses only the
separate context-16 fitting split; it is not refitted for context 64.

The known-model filter has zero KL against the process distribution by
construction. It is an independently checked ground-truth calculation, not a
learner beaten by this experiment. Every trained model has nonzero excess loss.

### Counterinterpretations that survive the result

1. **The output-only control wins.** It decodes belief better than the hidden
   activation probe in every main-panel run. For this Mess3 parameterization,
   `P(next=i | history) = 0.65875 * belief[i] + 0.11375`. Thus belief is already
   affinely recoverable from the next-token probabilities. This experiment
   provides no evidence of additional belief information beyond those outputs.
2. **Random features are useful.** The untrained hidden probe reaches R2 as high
   as 0.947632. Training improves this measure in all nine main-panel runs, but
   high decodability alone would not establish that training learned the state.
   Shuffled-fit-label R2 ranges from -0.082141 to 0.114605; finite-sample random
   regression is not required to have a negative R2 on every draw.
3. **More width is not uniformly better prediction.** Mean main-panel next KL
   across the three seeds is 0.001714, 0.001086, and 0.001198 for widths 3, 8,
   and 16 respectively. Three seeds do not support a general scaling law.
4. **A probe is not a causal mechanism.** No intervention tests whether the
   fitted belief coordinates mediate the network's computation. No Bayes-update
   circuit, fractal dimension, density matrix, or physical quantum effect is
   identified by these scores.

## Resource accounting

The native learner uses F# and existing Core random mixing, without PyTorch,
NumPy, or another neural runtime dependency. Python is an independent analysis
and numerical-check lane, not a dependency of the native learner or database.

| Width | Trainable parameters | Parameters plus one state, bytes | Observed training elapsed range, ms |
| ----: | -------------------: | -------------------------------: | ----------------------------------: |
|     3 |                   33 |                              288 |                             301-409 |
|     8 |                  123 |                             1048 |                             682-694 |
|    16 |                  371 |                             3096 |                           1796-1813 |

These are binary64 payload sizes, not managed heap or peak resident memory.
Training's measured cumulative thread allocation is about 144.7 MB per run,
apart from the first run's additional warm-up allocation. That is cumulative
allocation, not simultaneously live bytes. The evaluator's cost includes all
controls and probe fits; it is not a per-model inference benchmark. Process
CPU and elapsed times differ because they measure different quantities.

The recorded machine is a macOS Arm64 host running .NET 10, with other work
active. A repeat sweep changed timing materially while leaving every weight,
trace, and scientific score identical. No inference throughput, peak-memory,
storage-efficiency, or speed advantage over the known filter is established.

## Independent checks and adversarial review

This is an implementation self-review plus independent numerical algorithms,
not a claim of independent human or second-agent scientific peer review.

- The F# analytic gradient matches central finite differences for every
  parameter at widths 1, 2, 3, and 5, on two sequences each.
- A separately written Python scalar forward pass, exact-fraction filter, and
  pivoted ridge solve check the native fixture. Its finite-difference maximum
  gradient discrepancy was approximately 2.73e-11.
- PyTorch autograd matches the native gradient. Two additional cases compare
  four native Adam steps against PyTorch Adam, with and without a norm exceeding
  the clipping threshold. Both the parameters and reported losses agree.
- Independent NumPy matrix operations and augmented least squares replay all
  630 prediction/probe quantities from all nine stored models. Maximum absolute
  discrepancy was approximately 1.65e-14. The RNG matches by design to replay
  identical observations; filtering, forward computation, and regression do
  not call the F# implementations.
- Receipt validation rejects missing runs, context panels, prediction controls,
  and probe controls. Deleting cases cannot create an easier green result.
- Replacing the model-copy operation with identity makes both preservation
  tests fail. The failed-source test was initially vacuous under this mutation:
  it refused before the first update. It now permits one update before refusing.
  The corrected implementation passes both. The check-arity census admits only
  these two mutation-mediated comparisons, not a general exemption.
- Post-sweep review found another R2 boundary defect: finite error divided by a
  very small finite target variance could return negative infinity. A witnessed
  input with targets +/-1e-155 now returns a typed error. The final receipt was
  regenerated after this fix; all model weights, traces, and scientific scores
  match the first sweep exactly. No scientific configuration changed.

The seven named source hashes cover the runner and research modules. The Core
random-mixing dependency is pinned by the code baseline and git history, rather
than duplicated in those module hashes. Complete cross-platform training
bit-identity is not asserted; independent replay uses explicit tolerances.

## Reproduce

Run from the repository root in a writer-owned clone. The output must not
already exist; the runner refuses accidental overwrite and retains completed
runs if a later run fails.

```sh
dotnet fsi --warnaserror --optimize+ src/Research.FSharp/run-mess3-experiment.fsx --output /tmp/mess3-new-run.json
python3 src/Interp.Python/zeta_interp/mess3_reference.py
uv run --project src/Interp.Python python src/Interp.Python/zeta_interp/mess3_replay.py /tmp/mess3-new-run.json
uv run --project src/Interp.Python pytest src/Interp.Python/tests -q
dotnet test tests/Tests.FSharp/Tests.FSharp.fsproj -c Release --filter FullyQualifiedName~Mess3Learning
```

To compare two same-host runs, remove only `TrainingCost` and `EvaluationCost`
from each run record. The post-boundary-fix comparison also excludes
`SourceHashes`, because that source actually changed. The signed scientific
claim is unchanged outputs, not unchanged clock readings.

The existing optional interpretability CI lane now watches the research source
path and runs 27 checks: nine activation-access cases and eighteen Mess3 cases.
Its collection floor was raised to 27. The eight native research tests run in
the existing F# suite. No default runtime dependency was added.

## Gate status and next boundary

Release build: zero warnings and errors; `dotnet format --verify-no-changes`
passes. Full .NET suite: 7425 passed, zero failed, six existing skips (one manual
benchmark, three Rx integration cases, two collation-contract gaps). These
skips are not new coverage. The latest native boundary change also passes all
eight targeted research tests. The Python suite has 27 passes and one
pre-existing TransformerLens deprecation warning in its activation-access
fixture; the new code does not suppress it. Final quick preflight and remote
integration are still being checked.

The next discriminating experiment is a predeclared next-token-degenerate
process such as RRXOR, with a multi-step output baseline and held-out causal
interventions. That is separate work. Before game integration, also measure
inference CPU, allocation and peak memory against an ordinary learned HMM and
a fixed-feature recurrent baseline, then freeze the learner before non-ARC
held-out games. This result does not justify changing ARC priors or runtime
admission policy on its own.
