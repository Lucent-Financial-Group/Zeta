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

| Dimension | Fixed choice |
|---|---|
| Source | Mess3, the numerical matrices in Appendix A.3; uniform stationary initial state |
| Observation | Integers 0, 1, 2 only; no generator state, posterior, or transition matrix enters the learner |
| Network | One tanh recurrent layer, one linear three-token softmax readout; zero initial hidden state |
| Trainable parameters | Input matrix, recurrent matrix, hidden bias, output matrix, output bias |
| Hidden widths | 3, 8, 16; every width reported |
| Repetitions | Seeds 11, 23, 37; every repetition reported |
| Initialization | Independent Glorot-uniform matrices, zero biases |
| Objective | Mean next-token negative log likelihood, full backpropagation within each 32-step sequence |
| Training | 4096 updates, batch 16, 33 tokens per generated sequence; state resets between sequences |
| Optimizer | Adam, learning rate 0.003, beta1 0.9, beta2 0.999, epsilon 1e-8, gradient L2 cap 1 |
| Selection | Final weights only; no evaluation-based checkpoint selection or early stopping |
| Randomness | Explicit domain-separated streams for initialization, training, probe fit, evaluation, and shuffle |
| Probe | Affine ridge regression, mean squared error plus 1e-6 slope penalty; intercept unpenalized |
| Probe fit | 512 independent sequences, one final activation after 16 observations per sequence |
| Held-out evaluation | 2048 independent sequences; no sequence contributes to both probe fit and evaluation |
| Contexts | Main evaluation after 16 tokens; separately report 64-token context extrapolation |
| Prediction | Conditional expected cross-entropy, entropy floor, excess KL, sampled next-token loss, and joint three-token future KL |
| Controls | Exact known-model filter, training-fitted unigram/bigram, same-initialization untrained RNN, shuffled-label probe, next-token-output probe |
| Resource accounting | Binary64 numeric payload bytes separately from measured allocation, elapsed time, and process CPU; no payload-as-heap claim |
| Gates | Gradient finite differences, independently expressed Mess3 checks, numerical reference, deterministic replay, build/test/lint |

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

## Progress

- Protocol recorded; no trained-model results measured yet.
- Implementation, numerical checks, run receipts, and final review pending.
