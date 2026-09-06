# Predictive-state batch: learning, entropy, spectrum and cost

Date: 2026-09-06
Operational status: research-grade
Lifecycle: active
Work item: 081M1VJE1B4087G0R001MC85J5
Author: Vera, OpenAI Codex

## Verdict

Four registered experiments ran. Native binary RNNs learned useful predictive
memory on RRXOR; exact calculations reproduced the entropy identities and
the finite-duration spectral contribution in the supplied slides. This is
not an LLM replication, a proof of Bayesian neural computation, an ARC
improvement, or evidence of database performance superiority.

All nine trained networks beat the training-fitted unigram, bigram and
untrained-network controls in both evaluation panels. Smaller models vary
substantially across initializations. Merging matched hidden states worsens
three-token prediction on average for all nine trained networks. That is a
bounded intervention result, not identification of the internal algorithm.

The exact generalized spectral expansion passes 64 matrix-power checks.
Removing its zero-eigenvalue term creates a measured 0.188721875541-bit error
at the first two context lengths, and zero error thereafter.

Inference cost was measured for 38 candidates, five repetitions each. Numeric
payload, cumulative allocation and CPU are separate quantities. Peak memory
was **not measured successfully**: the Mac's raw .NET counter returned zero.
No retained-heap or peak-memory advantage is established.

## Protocol and provenance

The [protocol](2026-09-06-predictive-state-batch-protocol.md) was committed as
`103df7d214` and pushed to `claim/task-predictive-state-batch` before training.
Implementation `d9dba7a5f4` preceded every registered run. No training budget,
width, initialization, pair selection or metric was changed after results.
Git tag `archive/experiments/081M1VJE1B4087G0R001MC85J5` retains the
pre-squash protocol and implementation ancestry for independent auditing.
All final models, all controls and every repetition are retained:

- [RNN weights and measurements](../../src/Research.FSharp/rrxor-learned-belief-results.json).
- [Exact-state and loss measurements](../../src/Research.FSharp/predictive-laws-results.json).
- [Inference measurements](../../src/Research.FSharp/predictive-inference-results.json).

The receipts retain hashes of the code actually executed, including the Core
random mixer. Inference also hashes its input receipts. Post-run API review
made the fixture collection fresh per call and propagated unexpected filter
errors. Re-enumeration after those edits reproduced every recorded law row
exactly. Historical source hashes intentionally continue to identify the
measurement implementation; they are not rewritten to impersonate later code.
A complete post-review repeat also reproduced all nine weight vectors,
training traces, 18 evaluation panels and 18 intervention records exactly.

The original [Mess3 report](2026-09-06-mess3-learned-belief-experiment.md) and
its receipt were not replaced. All 630 historical numerical comparisons still
pass after generalizing the research RNN and probe dimensions.

## A. Learned predictive memory

RRXOR consists of independent fair-bit, fair-bit, XOR blocks observed at a
stationary random phase. The five-state matrices come from Appendix A.3 of
[Shai et al.](https://arxiv.org/html/2405.15943v2). An independent exhaustive
check over all length-eight binary words verifies that block generation and
those edge-emitting matrices define the same stationary word distribution.

Training uses only observed tokens: 4096 Adam updates, batch 16, 32 prediction
positions, learning rate .003, gradient norm cap 1. Each of the nine models
receives 2,097,152 prediction positions. The recurrent state resets for each
sequence. The source's state, phase and posterior never enter the optimizer.

There are 512 independent fitting contexts and 2048 evaluation contexts per
panel. Affine probes fit at length 16 and remain frozen at length 64. Draws
are independent, not guaranteed-distinct strings. There is no unseen-game claim.

All following losses and changes are in bits. R2 columns use length 16.
`Merge change` is mean midpoint KL minus mean intact KL over 128 fixed pairs.

| Width | Init | Next KL, L16 | Next KL, L64 | Hidden R2 | Three-token output R2 | Merge change |
| ----- | ---- | ------------ | ------------ | --------- | --------------------- | ------------ |
| 3     | 41   | .131913      | .124188      | .289839   | .710888               | .119199      |
| 3     | 53   | .261762      | .302064      | .173118   | .173863               | .037686      |
| 3     | 67   | .140733      | .144643      | .300691   | .611419               | .175644      |
| 8     | 41   | .044648      | .035479      | .377882   | .784415               | .356040      |
| 8     | 53   | .039400      | .031893      | .419789   | .782909               | .472591      |
| 8     | 67   | .030834      | .023102      | .645099   | .766106               | .425174      |
| 16    | 41   | .022200      | .014024      | .768051   | .819243               | .699421      |
| 16    | 53   | .021560      | .015776      | .815721   | .803735               | .545723      |
| 16    | 67   | .010826      | .005827      | .901695   | .783163               | .973605      |

The L16 bigram excess loss spans .308045-.323656; the L64 range is
.329579-.355957. The known-model filter has zero excess loss by construction.
The empirical conditional-entropy floor averages over sampled histories;
it is not the exact stationary ensemble entropy curve. In particular a
finite panel can average below the asymptotic ensemble rate of 2/3 bit.

All nine hidden-state probes outperform their next-token-output probes.
Seven of nine remain worse than the **three-token-output** probe. Two wider
models exceed that latter probe, but this is not evidence of information
unavailable in the full predictive distribution.

### Why three future tokens are not a full control

An explicitly **post-result diagnostic**, not a changed baseline, computes
the exact ranks of RRXOR's maps from five-state weights to future-word
probabilities. For horizons 1, 2, 3, 4 the ranks are 2, 3, 4, 5. Therefore
three-token probabilities still discard one linear degree of freedom;
four-token probabilities determine the full five-state weight vector.
The reproducible calculation is `future_rank_diagnostic` in
[predictive_reference.py](../../src/Interp.Python/zeta_interp/predictive_reference.py).
No new four-token trained probe was fit after seeing the result.

### What the intervention establishes

The first 128 lexicographic unordered pairs of length-eight histories with
identical exact next-token probabilities and distinct three-token futures
were selected without network weights. Both states in a pair were then
replaced by their midpoint. Identity substitution changes nothing exactly.
The full list and all 128 individual changes per model are in the receipt.

Every trained model has a positive mean degradation. Counts of individually
degraded pairs range from 77/128 to 128/128; results are not uniformly positive
for all small models. All nine untrained networks instead improve on average
when merged. The fixed pair population is uniformly weighted and deliberately
diagnostic, not representative of stationary history frequencies.

Midpoints can be off the learned state manifold. There is no matched-norm
random-direction control or intervention confined to a decoded belief subspace.
The result supports a role for hidden-state distinctions in these predictions;
it does not prove Bayesian causal mediation, optimal internal coordinates,
or implementation of a known filter. The paper's own distinction between
decodability and causal mechanism remains important.

## B. Loss decomposition and realizability

All binary words through length 12 were enumerated for five declared sources:
biased coin, Golden Mean, Even, RRXOR and a custom lag-two-copy process.
Our Golden Mean symbol convention forbids `00`; exchanging the alphabet
does not change its entropy. The custom process copies the bit two positions
ago with probability 3/4, from a uniform stationary two-bit context. It is
not the paper's named higher-order Golden Mean example.

Direct unnormalized word probabilities and separately normalized filtering
agree exactly in integer arithmetic. Joint entropy, cross-entropy and KL
agree with their conditional chain sums for the known model and the two
fixed Bernoulli predictors. Independent Fraction/NumPy calculations compare
1,080 quantities; maximum discrepancy is 7.54e-13 bits.

The relevant identity is `CE(Q,P) = H(Q) + KL(Q || P)`.
The first screenshot's equality at the optimum additionally needs a model
family capable of representing the true distribution (or the appropriate
attainable infimum). A fixed fair coin predicting the biased coin incurs
positive excess loss forever; optimizing an absent parameter cannot remove
it. [Riechers et al., equations 1-3](https://arxiv.org/html/2505.18373v2)
state the realizability condition explicitly.

Impossible source events contribute zero. A model assigning zero mass to a
possible event returns an error instead of a misleading finite cross-entropy.
Bits here measure predictive uncertainty. No joule conversion, physical
temperature or irreversibility claim follows from these loss differences.

## C. Mixed states and the spectral term

Exact integer-normalized belief equality gives these closure sizes:

| Source       | Mixed states | Symbol edges |
| ------------ | ------------ | ------------ |
| Biased coin  | 1            | 2            |
| Golden Mean  | 3            | 5            |
| Even         | 4            | 7            |
| RRXOR        | 36           | 70           |
| Lag-two copy | 7            | 14           |

State growth has independent limits of 128 states and 4096 transitions;
exhaustion returns a typed refusal. A two-component biased-coin mixture
with an infinite exact belief family witnesses the refusal. Beliefs are
not rounded together to manufacture finite closure.

For every source, `delta_prior W^(L-1) H` matches independent history
enumeration through L12. The matrix trajectory is independently checked
through L64. The lag-two process has entropy `[1, 1, H2(1/4), ...]`.

SymPy independently finds eigenvalues `1`, `1/2`, `+sqrt(2)/2`,
`-sqrt(2)/2` and zero with algebraic multiplicity three. Zero has Jordan
blocks of sizes two and one. Its projector is idempotent, commutes with W,
obeys `W^2 P0 = 0`, and has `W P0 != 0`.

The full generalized expansion agrees with all 64 exact rational operator
powers, not merely the scalar entropy output. Removing `P0 W^(L-1)` loses
`1 - H2(1/4) = .188721875541` bit at L1 and L2. The removed term is exactly
zero thereafter. This implements the finite-duration contribution described
in [Spectral Simplicity I, equation 26](https://arxiv.org/pdf/1705.08042)
and [II, equations 7-9](https://arxiv.org/pdf/1706.00883).

This is a checked finite fixture. No general production eigensolver, FFT
equivalence or scene-change detector was added. Conditional entropy is an
ensemble expectation; one surprising frame does not by itself identify an
operator change.

## D. Inference measurement

Host: macOS 26.6.2, Arm64, .NET 10.0.11. Each candidate receives 256 fixed
length-64 contexts, 256 warm-up calls, then five repetitions of 4096 calls.
Candidate order rotates between repetitions. No builds or tests from this
task were running during measurement; ordinary host applications remained
active. No CPU pinning or exclusive-machine claim is made.

The table gives the range of per-model median elapsed microseconds per
whole context, and measured current-thread allocated bytes per call.
All per-repetition wall and process-CPU measurements remain in the receipt.

| Candidate                   | Median microseconds, range | Allocated bytes/call | Numeric payload bytes |
| --------------------------- | -------------------------- | -------------------- | --------------------- |
| Mess3 RNN width 3           | 2.184-2.339                | 2312                 | 288                   |
| Mess3 RNN width 8           | 6.317-6.747                | 2392                 | 1048                  |
| Mess3 RNN width 16          | 18.544-19.304              | 2520                 | 3096                  |
| RRXOR RNN width 3           | 2.659-2.766                | 2304                 | 232                   |
| RRXOR RNN width 8           | 6.735-6.894                | 2384                 | 912                   |
| RRXOR RNN width 16          | 19.937-20.364              | 2512                 | 2832                  |
| Mess3 empirical bigrams     | .063-.070                  | 48                   | 76                    |
| RRXOR empirical bigrams     | .062-.067                  | 40                   | 36                    |
| Mess3 known binary64 filter | 2.452                      | 5256                 | 132                   |
| RRXOR known exact filter    | 24.630                     | 70141.125 average    | unknown               |

The exact RRXOR filter uses arbitrary-precision integers and computes a
whole-word likelihood as well as the posterior; the RNN uses binary64 and
returns state plus prediction. The bigram needs only the final symbol.
These are measurements of those APIs, **not equal-information or
equal-arithmetic implementations**. A known filter is given the generating
model; it is not a learning-fair baseline. No inference victory is inferred
from these unmatched comparisons.

The .NET peak-working-set counter returned zero. The verifier initially
assumed a strictly positive available counter and refused the receipt.
That assumption was wrong: the corrected verifier preserves the raw value
and reports **unavailable**, with a regression test. No timing row was
discarded or rerun to improve it. Exact-filter integer payload is recorded
as null, not zero. No per-model retained heap or peak-memory comparison exists.

Independent matrix replay checks the consumed output checksums of all 190
measurements; maximum discrepancy is 1.82e-12. It also rejects missing models,
missing repetitions, changed budgets and corrupted checksums. Timing is not
expected to reproduce bit-for-bit across machines.

## Verification and limits

Native tests cover both alphabets' finite-difference gradients, immutable
model ownership, impossible histories, probability conservation, bounded
closure, loss identities, interventions and five-coordinate probes.
Python independently checks both alphabets against PyTorch autograd and Adam,
exact block generation, rational closures, Jordan powers, and all 3,060
RNN score/intervention values. Maximum model-replay discrepancy is 1.02e-13.
It also reconstructs all 2,097,152 training positions for each of the three
data streams and reproduces every fitted unigram and bigram exactly.
Missing-case and deliberately corrupted-measurement checks must fail.

Release build has zero warnings and errors. The isolated Python suite has
65 passing cases and one existing TransformerLens deprecation warning;
the warning was not suppressed. Full .NET execution passes 7,441 tests, with
six existing skips: one manual benchmark, three Rx integration tests and two
collation-contract gaps. `dotnet format --verify-no-changes --no-restore`
passes for its supported projects; it does not format F#. All 16 quick
preflight checks pass, including the F# lint. Main `2071a17b7d` was integrated
without conflict. Remote integration is subject to the PR checks and merge.

This was a self-review against the repository's code, API, measurement and
research criteria, plus independent numerical implementations. No separate
human or independent agent review is being claimed by that wording.

## Reproduce and next boundary

From a writer-owned repository clone, with the isolated interpretability
dependencies installed declaratively:

```sh
dotnet fsi --warnaserror --optimize+ src/Research.FSharp/run-predictive-laws.fsx /tmp/predictive-laws-new.json
dotnet fsi --warnaserror --optimize+ src/Research.FSharp/run-rrxor-experiment.fsx /tmp/rrxor-new.json
dotnet fsi --warnaserror --optimize+ src/Research.FSharp/measure-predictive-inference.fsx /tmp/inference-new.json
uv run --project src/Interp.Python python -m zeta_interp.predictive_reference
uv run --project src/Interp.Python python -m zeta_interp.rrxor_replay
uv run --project src/Interp.Python python -m zeta_interp.inference_replay
uv run --project src/Interp.Python pytest src/Interp.Python/tests -q
dotnet test tests/Tests.FSharp/Tests.FSharp.fsproj -c Release --filter FullyQualifiedName~PredictiveStateTests
```

Runners refuse overwriting an existing output. Python commands replay the
checked-in receipts; the inference runner benchmarks those frozen weights,
not a newly trained `/tmp` model. Research source remains in `src/Research.FSharp`;
Python is an independent checker, not a dependency of the F# learner or DB.

Next justified work is a separately registered learned-HMM comparison with
matched outputs/arithmetic, allocation profiling, and change-point detection
with false-alarm controls before any held-out non-ARC game integration.
This batch does not change game priors, admission decisions or the DB runtime.
