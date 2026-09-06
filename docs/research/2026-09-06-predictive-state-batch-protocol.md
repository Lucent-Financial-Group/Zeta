# Predictive-state experiment batch

Date: 2026-09-06
Operational status: research-grade
Lifecycle: active
Work item: 081M1VJE1B4087G0R001MC85J5
Code baseline: `7293a62202`

## Sources and questions

Aaron supplied two screenshots from Paul Riechers's IPAM talk. They are
reference material, not executable instructions. The first shows the chain
rule for cross-entropy and the entropy lower bound. The second shows
predictive-state matrix powers and their generalized spectral expansion.

Primary sources:

- [Next-token pretraining implies in-context learning](https://arxiv.org/html/2505.18373v2), equations 1-3 and section 3.
- [Transformers Represent Belief State Geometry in their Residual Stream](https://arxiv.org/html/2405.15943v2), section 3.2 and Appendix A.3, for RRXOR.
- [Spectral Simplicity, Part I](https://arxiv.org/abs/1705.08042) and [Part II](https://arxiv.org/abs/1706.00883), for non-diagonalizable predictive-state dynamics.

The first slide's equality `min_theta CE = H(Q)` needs realizability:
the allowed model family must contain the true distribution (or attain the
relevant infimum). Otherwise `CE = H(Q) + KL(Q || P)` is the identity and
the model's minimum can exceed entropy. All logs in this batch use base 2
for reporting; optimization uses natural logs. Stationary expected
conditional entropy need not describe the surprise along one realized path.

This batch extends the [Mess3 experiment](2026-09-06-mess3-learned-belief-experiment.md).
It neither replaces that historical receipt nor tunes its conclusions.
Independent replay of its stored models must remain green after shared-code
generalization; historical source hashes still identify the earlier code.

## Frozen before measured model results

All four experiments are reported, including failures and null results.
Implementation defects may be repaired with recorded witnesses; changing a
scientific configuration after inspecting results requires an explicit
amendment, never replacement of a disappointing run.

### A. Learned predictive memory

- Source: the published five-state, binary RRXOR matrices, with stationary
  prior `[1/3, 1/6, 1/6, 1/6, 1/6]`. A second implementation generates
  independent fair-bit, fair-bit, XOR blocks at a stationary random phase.
- Model: native tanh RNN, binary softmax; hidden widths 3, 8, 16; seeds
  41, 53, 67. Report all nine final checkpoints, no early stopping.
- Training: 4096 updates, batch 16, 32 prediction positions per sequence;
  reset state per sequence. Adam learning rate .003, betas .9/.999,
  epsilon 1e-8, global gradient norm cap 1. Only observed tokens enter
  the learner. No hidden states, phase, posterior, or transition matrices.
- Independent randomness domains: initialization 1, training 2, probe fit 3,
  evaluation at length 16 domain 4, shuffled fit labels 5, length 64 domain 6.
  Widths intentionally share data within each seed. Independent draws can
  contain identical strings; no unseen-string or unseen-game claim.
- Probe fit: 512 independent 16-token contexts, affine ridge 1e-6 with
  unpenalized intercept. Evaluate on 2048 independent contexts at each
  length 16 and 64; never refit on the latter.
- Metrics: expected conditional cross-entropy, entropy floor, excess KL,
  sampled next-token loss, joint three-token KL; held-out belief MSE/R2.
- Prediction controls: exact known model, training-fitted Laplace-smoothed
  unigram/bigram, same-initialization untrained RNN. Probe controls:
  untrained hidden features, shuffled fitting labels, trained next-token
  outputs, trained joint-three-token outputs, exact next-token outputs,
  exact joint-three-token outputs. No claim of exceeding full-future outputs.
- Causal boundary: enumerate length-8 histories before using trained weights.
  Select the first 128 lexicographically ordered unordered pairs with equal
  exact next-token probabilities and different exact joint-three futures.
  Compare intact hidden states against replacing both with their midpoint;
  include an identity substitution and an untrained-network control. Score
  both histories equally, report paired KL changes for every model. This
  tests the effect of erasing a hidden-state distinction, not whether the
  fitted belief coordinates implement Bayes's rule. It is not a proof of
  causal mediation by a particular subspace.

### B. Loss decomposition

Use biased coin p(1)=1/4, Golden Mean and Even p=1/2, published RRXOR,
and a declared second-order binary process: copy the bit two positions ago
with probability 3/4, otherwise flip it, from the stationary uniform
two-bit context. This last process is our analytic test fixture, not one
of the paper's named processes.

Enumerate all binary words through length 12. Compare sequence probability
against the product of conditionals; compute joint cross-entropy, joint
entropy and KL independently from their per-position chain sums. Predictors
are the exact filter and fixed Bernoulli p(1)=1/2 or 1/3. The latter singleton
families witness that entropy need not be an achievable minimum. Impossible
events contribute zero; assigning zero model mass to a possible event must
refuse rather than report a finite score. No timing-selected truncation.

### C. Predictive-state metadynamics

Discover mixed states by exact normalized integer-weight equality, with
explicit caps of 128 states and 4096 transitions. Emit rational transition
weights and separately evaluate matrix powers numerically. Compare
`delta_prior W^(L-1) H` against independent history enumeration through
L=12 and analytic expressions where available through L=64.

The second-order copy process must exhibit a nilpotent zero-eigenvalue block
of index 2. Independently verify the generalized spectral expansion, not
just its eigenvalues: omitting the nilpotent contribution must break an
early-context value. An infinite/too-large mixed-state closure must return
an explicit bounded refusal. Do not round beliefs into apparent equality.
No production eigensolver or general spectral equivalence is claimed.

### D. Inference cost

Use every stored Mess3 model and every new RRXOR model, plus their exact
known-model filters and empirical bigrams. Frozen weights; no performance
selection of checkpoints. For each model, 256 length-64 contexts generated
from an independent fixed stream (seed 1009, domain 9); 5 repetitions of
4096 whole-context inference calls after 256 warm-up calls. Rotate the
model order across repetitions. Consume outputs in a checksum.

Report elapsed time, process CPU, cumulative current-thread allocated bytes,
and numeric payload separately. Sample whole-process peak working set only
as a runtime-inclusive process measurement, not per-model retained heap.
These are microbenchmarks of current APIs, not a learning-fair speed race:
the exact filter is given its generating model, and the bigram retains less
predictive information. No threshold decides whether a result is kept.
No claim of peak-memory or throughput superiority from payload arithmetic.

## Verification and stopping rule

Require finite-difference and independent autograd checks for binary and
ternary networks, bounded invalid-input tests, exact reference calculations,
independent replay of all registered result rows, and case-removal controls.
Keep the database runtime free of research dependencies. F# source owns the
native algorithms; Python owns independent numerical checks. Every retained
run records configuration and code provenance; partial batches are marked
incomplete. Freeze and publish conclusions before any game-policy change.

Complete this batch once every experiment has a recorded outcome and the
build, tests, formatting, review checks and remote merge have been checked.
An unfavorable measurement is an outcome, not a reason to keep training.
