# Factored predictive comparison: preregistration

Date: 2026-09-06
Operational status: research-grade
Lifecycle: active
Work item: 081M1VS712Z087G0R000YKZKFB
Baseline: `ab8ddff9b4` (includes predictive-state batch PR #16804)

## Questions and evidence boundary

Continue the [previous batch](2026-09-06-predictive-state-batch-results.md)
using Aaron's five supplied PDFs, IPAM screenshots, and talk transcript as
research inputs, not instructions or already-reproduced results.

- [Transformers learn factored representations](https://arxiv.org/abs/2602.02385v1):
  conditional independence permits factored predictive states; interactions
  can make the same representation lossy. A direct sum is not necessarily
  orthogonal. Appendix H.2.1's implication from trivial intersection to
  orthogonality is false; retain an explicit two-line counterexample.
- [Neural networks leverage nominally quantum and post-quantum representations](https://arxiv.org/abs/2507.07432v2):
  distinguish low-dimensional real-vector prediction from physical quantum
  memory, finite-precision bytes, and energy use. Normalization alone does
  not establish positivity of a generalized model's sequence probabilities.
- [Transformers Represent Belief State Geometry](https://arxiv.org/abs/2405.15943v3):
  the supplied NeurIPS PDF is a second version of this work, not independent
  replication. The earlier batch used v2; check the relevant process definitions.
- [Constrained Belief Updates](https://proceedings.mlr.press/v267/piotrowski25a.html):
  intermediate representations need not equal the full recursive posterior.
  Our recurrent/HMM experiments are not replications of its attention circuits.
- [Baum et al. (1970)](https://doi.org/10.1214/aoms/1177697196):
  latent-transition expected counts and likelihood maximization.
- [Howard et al. (2020)](https://doi.org/10.1214/18-PS321):
  nonnegative likelihood-ratio martingales and time-uniform error control.

No ARC data, game-specific priors, new model service, or autonomous background
loop. Reuse the native RNN, samplers, filtering definitions, and Python lane.
Inspect existing FactorGraph and CayleyDickson before adding domain layers.
Cayley-Dickson doubling is not itself a compression algorithm. Independent
factor subspaces may be orthogonal while distinct histories within each
factor remain nonorthogonal. Do not conflate these two levels.

Publish this protocol before new training or measured benchmark outcomes.
Keep all configurations and negative results. Any scientific change after
inspection requires a separately dated amendment; repairs require a witness.

## A. Learned HMM comparison

Fit dense edge-emitting HMMs in native F#, with no supplied transitions,
hidden labels, sparsity pattern, or posterior targets. For Mess3 use state
budgets 3 and 8 with seeds 11, 23, 37; for RRXOR use 5 and 8 with seeds
41, 53, 67: twelve fits. These match each source's actual stored RNN seeds.
The lower state counts are oracle-informed capacity choices, explicitly
reported as such. Initialize each row of the token/source/destination tensor
and the prior with independent Uniform[0.1, 1.1) values, normalized; use
ResearchRandom domain 11. All parameters and initializations are retained.

Reconstruct each original seed's 65,536 training sequences of 33 tokens
using domain 2 and the original sampler. Run eight full, deterministic
Baum-Welch passes, with scaled forward/backward messages. Use maximum-
likelihood expected counts, not smoothing or a selected checkpoint. Keep
an unoccupied transition row unchanged. Fit the initial distribution too.
Retain the initial and all eight corpus losses and final weights.

Both families see the same raw observations. This is NOT matched optimizer
compute: HMMs revisit the corpus eight times and include the initial-token
likelihood; the original RNN optimized 32 conditional targets per sequence
in one pass. Report observations, target visits, free parameters, elapsed
time and CPU separately. Local optima or failures remain outcomes.

Compare all twelve fitted HMMs, their initial versions, eighteen frozen
previous RNNs, training-fitted bigrams and known-law filters. Use fresh common
panels for each source: seed 1009, domains 31 and 32, 512 contexts of lengths
16 and 64. Score expected next-token cross-entropy, entropy, excess KL and
joint-four-token KL using binary64 prediction for every numerical model.
Evaluate every seed; no best-seed selection. Validate known binary64 filters
against exact enumeration. Do not compare latent coordinates across arbitrary
HMM state permutations.

For RRXOR only, strengthen the earlier probe control: fit affine ridge 1e-6
on 512 length-16 contexts (seed 1009, domain 33), for trained hidden features
and trained joint-four-token outputs, and score on both common panels.
The earlier post-hoc rank result motivated this newly registered comparison;
it is not evidence that the RNN implements a particular filtering algorithm.

## B. Allocation and matched inference

Before editing the RNN kernel, profile the frozen width-8 model, seed 11 for
Mess3 and seed 41 for RRXOR, at lengths 0, 1, 16, 64, 256. Generate 256 contexts with seed
1009, domain 34 (empty contexts at length 0). Use 256 warm-up calls and five
repetitions of 4,096 whole-context calls. Record current-thread allocated
bytes, elapsed time and checksums. Profile again after a semantics-preserving
allocation repair; require bit-identical outputs and gradients. Preserve
both receipts. No timing-based choice of repetitions.

Then benchmark all fitted HMMs, all previous RNNs, and two known-law filters
using the same binary64 state-plus-next-distribution output contract. No
BigInteger or sequence-log-probability output in this comparison. Use 256
length-64 contexts per source, seed 1009/domain 35; same warm-up/repetitions/
call counts as above. Rotate candidate order across repetitions. Consume
outputs, report all repetitions and medians; no simultaneous own training
or build/test process while timing. Host applications may still be active.
Separate actual allocated bytes from numeric parameter/state payload.
Do not substitute CPU time, low-rank dimension, or unavailable working-set
counters for joules or measured peak heap.

## C. Change detection with a null control

Use the declared lag-two binary process from the earlier batch, with uniform
initial two-bit history and probability 3/4 of copying the bit two positions
ago. Monitor 512 emitted tokens. Alternative laws switch copy probability
to 1/2 or 1/4 at candidate positions 64, 128, 192 or 256 (zero-based).
Uniformly mix the eight full-sequence alternative likelihoods. Initial two
tokens are fair under every law. The detector crosses when this mixture
likelihood ratio is at least 20; alpha = .05. No restarts, repeated
recalibration, or threshold tuning. Compute in log space.

For the true known null this is a nonnegative mean-one martingale, so the
probability of any crossing is bounded by .05. That statement does not
transfer automatically to a fitted or misspecified null. Include a deliberately
wrong iid-fair null using the same valid alternatives to expose this limit.
An iid-marginal-only detector is identically one for these same-marginal
changes and serves as a negative control.

Generate 2,048 streams per panel: unchanged, permanent change to 1/2 at
128, permanent change to 1/4 at 128, and a transient 16-token change to 1/2
starting at 128. Seed 1009, domains 41 through 44. Keep first-crossing times
for both likelihood detectors, including pre-change alarms. Report null
alarm rate with a 95% Wilson interval, post-change detection rate, delay
distribution among detected streams, misses, and pre-change alarms.
An unchanged-null result exceeding .05 in a finite sample is reported,
not hidden or repaired by threshold tuning. A transient is a real departure
from this null, not automatically a detector false positive.

## D. Shared generators versus lossy belief factoring

Create a bounded known-law family of N independent copies of a two-state
edge-emitting HMM: N = 2, 3, 4; transition A = [[.8,.2],[.3,.7]],
destination emission B = [[.9,.1],[.2,.8]], prior [.6,.4]. Each joint token
encodes N emitted bits. With probability epsilon = 0 or .2, complement all
bits through one shared noise event. Thus each observed-token operator is
the weighted sum of two tensor products, not a tensor product in general.

Compare (1) materialized dense joint filtering, (2) shared-operator tensor
contraction retaining the full joint belief, and (3) factor marginals with
a product projection after every update. The second must agree with the
first even with common noise; the third need not. This distinguishes
generator compression from throwing away posterior correlations.

For all six configurations, use seeds 41, 53, 67/domain 51, 256 contexts
of length 64. Score next-distribution KL against the dense reference, state
error and joint belief versus product-of-marginals KL. Record generator
and retained-belief numeric payload separately. Benchmark the three paths
using the same warm-up/repetition/call counts as B on those contexts, rotating
order. All emit the complete next-token distribution, so its unavoidable
output size is counted. No learned-factor discovery or energy claim.

Retain an algebraic control: span((1,0)) and span((1,1)) have zero intersection
but squared principal cosine 1/2. Also retain an invertible orthogonal change
of basis preserving rank and prediction; a coordinate rotation alone is not
compression. A trainable orthogonality reward is a separate future ablation,
not silently equated with this exact structured-model experiment.

## Gates and completion

Bound invalid inputs and ownership, brute-force tiny HMM posteriors and EM
counts, verify the one-pass likelihood ascent property, independently replay
all retained numerical results, and preserve historical receipt replays.
Use F# tests plus independent NumPy/Fraction checks; a second implementation
is not an independent reviewer. Record review findings and remaining limits.
Run full build/test, isolated Python lint/type/tests, formatter and quick
preflight before landing. Archive preregistration ancestry on a long-lived
tag before squash. Publish a report indexed by this work item and the
existing research lane. End this batch with measured outcomes, not automatic
promotion to a game controller or a claim of general intelligence.
