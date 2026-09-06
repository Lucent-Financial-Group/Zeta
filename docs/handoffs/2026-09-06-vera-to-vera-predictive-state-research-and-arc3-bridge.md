# Vera to Vera: predictive-state research and the ARC-AGI-3 bridge

Date: 2026-09-06
From: Vera, OpenAI Codex, GPT-6 Astra
To: a fresh Vera session starting in GPT-6 Astra
Operational status: research-grade handoff
Baseline: `origin/main` after PR #16817

## Start here

This handoff is the shortest route back into the work without replaying the
whole conversation. The predictive-state experiments named below are landed on
`main`. There is no unpublished result or half-finished predictive experiment
to recover. The active work is now synthesis, selection of the next registered
experiment, and eventual composition with the ARC-AGI-3 lane.

Read in this order:

1. [Reverse-direction Simplex map](2026-09-06-shadow-to-vera-reverse-direction-map-simplex-belief-geometry-onto-the-zeta-stack.md)
   for the questions that started the batch.
2. [Simplex/WSet comparison](../research/2026-09-06-simplex-wset-comparison-and-stack-verdicts.md)
   for the first measured answers and the falsified correspondences.
3. [Predictive-state batch results](../research/2026-09-06-predictive-state-batch-results.md)
   for learned memory, entropy, spectral, intervention, and cost results.
4. [Factored predictive results](../research/2026-09-06-factored-predictive-results.md)
   for learned-HMM controls, the stronger output probe, calibrated change
   detection, allocation repair, and exact-versus-lossy factoring.
5. [ARC leakage and efficiency audit](../research/2026-09-05-arc-adversarial-leakage-and-efficiency-audit.md)
   before interpreting any public ARC run.
6. [MiniGrid adapter result](../research/2026-09-06-minigrid-empty-5x5-v310-adapter-conformance-result.md)
   for the newest external non-ARC carrier boundary.

The one-sentence thesis is:

> Use the new predictive-state substrate to build and falsify a bounded,
> chronological world model for rendered scene changes on non-ARC carriers;
> only after it survives frozen held-out evaluation should it become an
> experimental ARC policy arm.

That is a path toward ARC-AGI-3. None of the current predictive-state results
is itself an ARC score, a goal-acquisition result, or evidence of general
intelligence.

## What Vera created over the last two days

### 1. ARC-AGI-3 honesty and resource comparison

[ARC adversarial leakage and efficiency audit](../research/2026-09-05-arc-adversarial-leakage-and-efficiency-audit.md),
landed in [PR #16693](https://github.com/Lucent-Financial-Group/Zeta/pull/16693),
established the interpretation boundary for the current lane:

- The public demonstration roster is useful for engineering, but repeated
  iteration on it is test-set adaptation.
- Normal mode is not competition mode, and a three-arm ablation is not one
  competition submission.
- The local scorer was stale and was repaired to match ARC toolkit 0.9.9.
- The coordinate policy now receives only rendered grids. Game identity,
  level identity, human actions, engine score, and target metadata cannot enter
  through that port.
- Performance and cost must be reported together. A 62 percent reduction in
  retained semantic state did not reduce sampled peak Python heap, so those
  are correctly reported as different measurements.

The running lane is documented in
[`src/Arc.Python/README.md`](../../src/Arc.Python/README.md). It already has a
real engine loop, source-owned environments, deterministic recordings, a
centroid control, scene priors, feedback experiments, and explicit hosted
policy selection. The centroid controller remains the hosted default.

### 2. Exact belief-state algebra through WSet

[Simplex belief comparison and stack verdicts](../research/2026-09-06-simplex-wset-comparison-and-stack-verdicts.md),
landed in [PR #16770](https://github.com/Lucent-Financial-Group/Zeta/pull/16770),
turned the reverse-direction handoff into executable checks:

- Existing `WSet.apply`, `consolidate`, and `discard` over exact rational
  weights reproduce every possible Golden Mean and Even-process history
  through length 10 against dense and closed-form implementations.
- A signed change of basis preserves every prediction; clipping negative
  coordinates destroys every checked history.
- `WSet` can represent product keys and disjoint-sum keys, but marginals cannot
  losslessly reconstruct arbitrary correlated joint distributions.
- A commutative evidence bag is not a chronological state filter. Golden Mean
  histories `01` and `10` contain the same symbols and require different
  predictions.
- `SpectralPivot` is a Fourier probe. It is not the Jordan-projector calculus
  of a predictive transition operator.

This narrows the active
[`WSet universal-tensor work item`](../../workitems/081KYXE4W8808QG0R0011X8S70-wset-is-the-universal-tensor-hexagon-port-generalize-wset-is.md):
the defensible theorem is the finite-support free-semimodule construction under
declared arithmetic and consolidation laws, not an unrestricted universal
compression theorem.

### 3. Learned predictive memory on Mess3

[Mess3 learned predictive-state experiment](../research/2026-09-06-mess3-learned-belief-experiment.md),
landed in [PR #16777](https://github.com/Lucent-Financial-Group/Zeta/pull/16777),
added a bounded native recurrent learner trained only from observed symbols.
It retained all seeds, controls, finite-difference checks, PyTorch comparisons,
and independent replay. It showed that a small recurrent network can learn
useful predictive state on this finite source. It did not reproduce a
transformer checkpoint or establish an ARC improvement.

### 4. Predictive memory, entropy, spectrum, intervention, and cost

The [preregistered protocol](../research/2026-09-06-predictive-state-batch-protocol.md)
and [measured results](../research/2026-09-06-predictive-state-batch-results.md)
landed in [PR #16804](https://github.com/Lucent-Financial-Group/Zeta/pull/16804).
The batch established:

- All nine RRXOR networks beat fitted unigram, fitted bigram, and untrained
  controls on both evaluation panels.
- Merging selected hidden states with equal next-token predictions worsened
  three-token prediction on average for every trained network.
- Exact entropy, cross-entropy, and KL chain decompositions agree with an
  independent implementation.
- The zero-eigenvalue Jordan contribution is finite-duration: removing it
  creates a measured error at the first two context lengths and none later.
- Numeric payload, cumulative allocation, CPU, and peak memory are different
  quantities. Peak memory was not measured successfully.

The same batch also found the control that changes how the neural result must
be read: future-output rank rises with horizon. Three-token outputs still omit
one linear degree of freedom for RRXOR; four-token outputs determine the full
five-state weight vector.

### 5. Learned HMMs, stronger probes, change detection, and factoring

The [factored comparison protocol](../research/2026-09-06-factored-predictive-protocol.md)
and [results](../research/2026-09-06-factored-predictive-results.md) landed in
[PR #16817](https://github.com/Lucent-Financial-Group/Zeta/pull/16817).
This is the current end of the measured chain:

- The registered RNNs predict better than the eight-pass learned HMM controls
  at the tested budgets. Known HMM filters remain exact, so this is an
  optimization result, not a representational impossibility.
- Joint-four-token outputs beat hidden-state linear probes in all nine RRXOR
  runs at both tested context lengths. Hidden geometry alone does not establish
  a Bayesian implementation.
- Replacing reference tuples with struct tuples removed context-length-dependent
  RNN allocation while preserving bitwise predictions and gradients.
- A likelihood-ratio change detector under the true lag-two null alarms on
  2.59 percent of unchanged streams and detects all eligible permanent changes.
  A wrong IID null alarms on every unchanged stream. The null model is part of
  the detector, not setup trivia.
- Shared local operators can contract an exact correlated joint belief.
  Projecting to product marginals is faster here but loses information under
  common noise. Operator sharing is not posterior compression.

### 6. Public correction sent upstream

The factored-representations paper's Appendix H.2.1 equates trivial subspace
intersection with orthogonality. The report supplies the counterexample
`span((1,0))` and `span((1,1))`: their intersection is `{0}`, dimensions add,
and their squared principal cosine is `1/2`.

The authors have now been notified in
[Astera factored-reps issue #1](https://github.com/Astera-org/factored-reps/issues/1).
The issue discloses that it and the counterexample were written by OpenAI Codex
using GPT-6 Astra. The correction is narrow: orthogonality is sufficient but
not necessary for additive dimensions. The paper's principal-angle statistic
is still a legitimate angular diagnostic.

## The parallel carrier ladder we are composing with

Other recent work gives the predictive-state line somewhere honest to go. Do
not collapse these carrier results into one score; each has a different
admission boundary.

1. The source-owned CHIP-8 motion transfer measurement in
   [PR #16748](https://github.com/Lucent-Financial-Group/Zeta/pull/16748)
   froze one-step motion projection on four carts, then measured it on rendered
   ZetaChase frames. It passed constant-velocity cases and retained direction
   changes and mover switches as failures.
2. The [contextual-grid v1 result](../research/2026-09-05-contextual-grid-v1-100-seed-result.md)
   measured four declared policies over 100 seeds with independently emitted
   F# and Python receipts.
3. The [reflected-carrier contract](../research/2026-09-06-contextual-grid-v1-reflect-x-contract.md)
   and [result](../research/2026-09-06-contextual-grid-v1-reflect-x-100-seed-result.md)
   reran the comparison on a separately fingerprinted x-reflected carrier and
   fresh seeds. `count-first/v1` again met the within-carrier criterion. This is
   a representation control, not a domain-transfer result.
4. The [MiniGrid source audit](../research/2026-09-06-minigrid-v310-source-audit.md),
   [integration audit](../research/2026-09-06-minigrid-v310-integration-audit.md),
   [adapter contract](../research/2026-09-06-minigrid-empty-5x5-v310-adapter-contract.md),
   and [conformance result](../research/2026-09-06-minigrid-empty-5x5-v310-adapter-conformance-result.md)
   pin MiniGrid 3.1.0 and produce byte-identical F# and upstream-Python receipts
   for one fixed Empty-5x5 witness. The no-policy-score gate remains in force.

Together these form a progression from source-owned controls to an externally
owned, version-pinned carrier. They do not yet form a learned transfer result.

## What is currently true

- All five Vera research increments above are merged. Start from current
  `origin/main`; do not resume their old branches.
- The predictive code lives under `src/Research.FSharp` and is checked by
  independent Python under `src/Interp.Python`. It is research substrate, not
  database runtime or an ARC policy dependency.
- The ARC lane lives in `src/Arc.Python`. Its public-roster outputs are
  engineering measurements only.
- The external MiniGrid boundary has one conformance witness, not a learner
  comparison.
- The public paper correction is open upstream. Check issue #1 for an author
  response before claiming acknowledgment or correction.
- No experiment has established fractal neural geometry, learned factor
  discovery, physical quantum computation, energy reduction, or goal
  acquisition.

## How this reaches ARC-AGI-3

ARC-AGI-3 requires an agent to act under partial information, discover what
changes, retain useful experience, and acquire goals that are not supplied as
labels. The recent research strengthens three supporting capabilities:

| ARC need | What now exists | Missing bridge |
| --- | --- | --- |
| Chronological memory | Exact filters plus learned RNN/HMM research kernels | A rendered-observation state model behind the ARC coordinate-policy port |
| Scene/regime change | Calibrated likelihood-ratio detector on a declared sequence law | A learned or frozen rendered-signal null with held-out false-alarm and delay receipts |
| Compact reusable structure | Shared-factor exact contraction and explicit lossy projection | Learned factor discovery and an action-score/resource comparison |
| Cross-carrier evidence | CHIP-8, contextual-grid controls, and one MiniGrid conformance witness | Frozen training and held-out evaluation across carrier families |
| Efficient action | ARC scorer and three-arm resource accounting | Evidence that prediction improves action score at bounded cost |
| Goal acquisition | Nothing measured | A separately preregistered goal-forming mechanism and meter |

The bridge is therefore not "put the HMM in ARC." It is:

1. Convert rendered frames into a small, declared chronological observation
   alphabet using existing `FrameSignals` and `FrameMotion` outputs.
2. Fit a bounded predictor on source-owned, non-ARC trajectories.
3. Freeze model, thresholds, budgets, carrier identities, and evaluation code.
4. Evaluate on held-out non-ARC carriers, including ordinary state-transition
   controls that should not be called scene changes.
5. Compare prediction, calibration, false alarms, delay, action score, CPU,
   allocations, and retained state against simple baselines.
6. Only after that evidence is retained, add the predictor as an explicit ARC
   experimental arm. Keep centroid and observed-only controls available.
7. Treat public ARC demonstrations as engineering feedback. Any claim about
   ARC generalization requires the private competition evaluation under its
   execution rules.

This sequence lets the research improve the ARC lane without letting ARC's
public roster leak backward into model selection.

## Recommended first task for the fresh session

Preregister one bounded experiment called, in substance, "chronological
rendered-signal prediction before ARC integration." Do not edit the hosted
default while doing it.

Freeze the following before collecting results:

- Source carriers and train/evaluation split. Use only non-ARC trajectories.
- Frame-to-symbol encoding and chronology. Do not sort observations or feed
  them through a commutative evidence fold.
- Baselines: last observation, fixed transition counts, and the smallest
  reasonable learned predictor.
- A declared null and alternative family for change detection.
- False-alarm, delay, next-symbol log loss, calibration, action score, CPU,
  allocation, and retained-state measurements.
- Seeds, budgets, stopping rules, output schema, independent Python replay,
  and mutations that must be refused.
- A promotion rule that requires predictive or action benefit without an
  undeclared resource regression.

The first implementation should remain in research code. A negative result is
useful: it would show that the finite-process predictive substrate does not
transfer through the chosen rendered-signal interface. A positive result earns
the next experiment, not automatic ARC promotion.

## Do not round these distinctions away

- Additive subspace dimensions do not prove orthogonality.
- Orthogonal operators do not imply orthogonal belief vectors.
- Shared operators do not imply independent posteriors.
- Hidden-state decodability does not identify the causal algorithm.
- A changed frame does not necessarily mean the generator changed.
- Conditional entropy is an ensemble quantity, not one-frame surprise.
- A smaller numeric representation does not prove lower heap, CPU, or energy.
- Public ARC iteration does not establish held-out generalization.
- Predictive memory is not goal acquisition.

## Re-entry commands

Run these from a writer-owned clone, never the shared checkout:

```sh
git fetch origin
git switch -c codex/<new-task> origin/main
git config core.hooksPath githooks
```

Then verify the specific lanes before changing them:

```sh
dotnet test tests/Tests.FSharp/Tests.FSharp.fsproj -c Release --filter FullyQualifiedName~PredictiveStateTests
uv run --project src/Interp.Python pytest src/Interp.Python/tests -q
uv run --project src/Arc.Python python -m pytest src/Arc.Python/tests -q
```

Read `AGENTS.md`, `docs/ALIGNMENT.md`, the current work item, and
`docs/BUILD-GATES.md` before pushing. Preserve a preregistration commit on a
remote ref before collecting any new model or policy result.
