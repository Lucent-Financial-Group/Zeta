# Contextual-Grid v1: Paper-Reconciliation Record

**Status:** reconciliation record for the merged
`contextual-grid-curiosity-transfer/v1` conformance harness. It is not a
reproduction certificate and contains no accepted 100-seed result.

**Primary specification reviewed:** Jiang, Kolter, and Raileanu, _On the
Importance of Exploration for Generalization in Reinforcement Learning_,
NeurIPS 2023, Section 3 and Appendix C.1. [1]

## Recommendation

> Retain `zeta.contextual-grid/v1` as a **separately versioned inspired
> benchmark**. Do not label any v1 outcome as a reproduction of Figure 2 or
> Figure 8, because the supplied primary text contains an unresolved held-out
> coordinate conflict and v1 intentionally changes the hyperparameter and
> selection protocol. [1]

The paper supplies a useful didactic tabular control: it isolates exploration
from representation learning by holding the state/action grid fixed while
changing the start distribution. Its relevant empirical conclusion is bounded
to that paper's configured experiment. This record uses the paper to prevent
silent drift, not to import its empirical conclusion into the Zeta carrier.

## Mechanics Reconciled Directly

The following fields agree with the primary text's stated grid mechanics. The
carrier fixes their bytes and the runner/oracle replay them under an explicit
PRNG stream; the paper does not specify the Zeta byte encoding or that stream.

| Dimension          | NeurIPS paper                                                  | Zeta v1 carrier                                  | Reconciliation                                |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Grid               | 5 × 5 tabular grid                                             | 25 `(x,y)` positions                             | Same finite state count                       |
| Actions            | Four cardinal moves                                            | `north`, `east`, `south`, `west`                 | Same movement class; names/order are v1-owned |
| Boundary           | Moving out of bounds leaves location unchanged                 | Same deterministic transition                    | Same                                          |
| Goal               | `(4,0)`, terminal reward `+2`                                  | `(4,0)`, `+2,000,000 ppm`                        | Same quantity after exact ppm representation  |
| Nonterminal reward | `−0.04`                                                        | `−40,000 ppm`                                    | Same quantity after exact ppm representation  |
| Training start     | `(0,0)`                                                        | `(0,0)`                                          | Same                                          |
| Horizon            | 250 steps or terminal                                          | 250 steps or terminal                            | Same                                          |
| Discount           | `γ = 0.9`                                                      | `0.9`                                            | Same                                          |
| Training length    | 1,000 episodes/trial                                           | 1,000 episodes/seed                              | Same per-run budget                           |
| Q step size        | `0.05 / sqrt(t)`                                               | `0.05 / sqrt(max(1,t))`, first action at `t = 1` | Same finite first-step convention             |
| Q target           | reward plus discounted maximum next Q, terminal bootstrap zero | Same                                             | Same                                          |

The source specifies that the performance value is undiscounted return relative
to an optimal undiscounted return. V1 likewise retains held-out undiscounted
return and requires a separately computed dynamic-programming denominator for
suboptimality; it must never use a learned Q table as that denominator. [1]

## Unresolved Source Conflict

Section 3 states that the test start is `(0,4)`, while Appendix C.1 states
`ρ_test(s) = 1_(4,0)(s)`. The latter coordinate is also the source's declared
terminal goal. This record does not infer which statement is intended, call
either one a typographical error, or resolve it from the figure. The v1 carrier
uses `(0,4)`, records the choice in its SHA-256-bound bytes, and remains a
separate benchmark precisely because no authoritative reconciliation artifact
was found in the published EDE implementation. [1] [2]

| Question                      | Paper record                                                                                            | v1 decision                                   | Consequence                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| Held-out start                | Main text `(0,4)`; Appendix C.1 `(4,0)`                                                                 | Freeze `(0,4)`                                | Not a paper reproduction                    |
| Tabular source implementation | Paper links EDE repository; repository exposes the deep benchmark path rather than this tabular carrier | Do not reconstruct missing settings from code | No implementation-based conflict resolution |

## Intentional v1 Divergences

V1 differs where the paper's evaluation procedure would make the proposed
evidence contract either ambiguous or circular. These are neither repairs to
the paper nor evidence that v1 is superior.

| Dimension             | Paper protocol                                                                                    | v1 protocol                                                                              | Why the distinction is load-bearing                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| ε-greedy comparator   | Search ten ε values, then report the highest-average-test-return setting; reported best `ε = 0.9` | Fixed `ε = 0.1`                                                                          | A fixed non-tuned comparator prevents v1 from selecting on its own held-out roster; it cannot be compared to the paper's selected curve |
| UCB comparator        | Search ten `c` values; reported best `c = 45`                                                     | Fixed `c = 45`                                                                           | Same numeric `c`, but no v1 held-out selection sweep                                                                                    |
| Tie resolution        | Training argmax ties broken randomly; paper test-time policy described only as highest Q          | Explicit SplitMix64 tie resolution during training and canonical-order greedy evaluation | Enables byte-replay; not claimed to be the paper's RNG protocol                                                                         |
| Additional policies   | ε-greedy, UCB, and policy gradient are evaluated                                                  | `uniform-random/v1` and `count-first/v1` added; policy gradient omitted                  | V1 is a declared selector comparison, not a method-for-method reproduction                                                              |
| Statistical selection | 10 hyperparameters × 100 trials; selected by test return                                          | Exactly one run per seed over roster `0…99`; no tuning on held-out values                | Preserves a prospective, fail-closed comparison boundary                                                                                |
| Receipt fields        | Mean/standard-deviation performance curves                                                        | Per-seed trace, Q-digest, PRNG-draw, and carrier identities                              | Adds conformance observability; does not reproduce reported figures                                                                     |

The paper calls its UCB construction a simple extension that does not inherit
the bandit regret guarantee in the MDP setting. V1 therefore treats it solely
as a named finite comparator, never as a proof of an optimal exploration rule.
[1]

## Consequences for the Next Receipt

The existing seed-42 artifact establishes F#–Python conformance only: all four
policies reached the 250-step held-out cap without termination. The stipulated
100-seed receipt may measure a v1 comparison, but it cannot be described as
confirmation or refutation of the NeurIPS paper. It must retain every seed,
implementation and carrier identity, the declared bootstrap-draw accounting,
and an explicit `MISMATCH`/`INCOMPLETE` refusal. A uniformly null outcome is a
valid v1 result.

No conclusion here extends to intrinsic motivation in general, deep EDE,
Procgen, Crafter, lexical semantics, tangle navigation, non-Gaussian inference,
or mutual empowerment. Those are distinct research paths requiring their own
frozen carrier and evidence.

## References

[1] [Jiang, Kolter, and Raileanu, _On the Importance of Exploration for Generalization in Reinforcement Learning_ (NeurIPS 2023)](https://proceedings.neurips.cc/paper_files/paper/2023/file/2a4310c4fd24bd336aa2f64f93cb5d39-Paper-Conference.pdf)

[2] [facebookresearch/ede: official implementation repository](https://github.com/facebookresearch/ede)
