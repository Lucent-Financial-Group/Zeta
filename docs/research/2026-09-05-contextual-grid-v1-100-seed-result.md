# Contextual-Grid v1: 100-Seed Result Record

**Status:** measured finite result for `zeta.contextual-grid/v1`. The result
meets the v1 predeclared comparison criterion on this one carrier. It is not a
reproduction of the source paper, a general transfer result, or evidence of
general intelligence, intrinsic motivation, society-level empowerment, or
parameter/energy efficiency.

**Recommendation:** retain this as a successful **single-grid, fixed-policy,
independently replayed observation**, then test a new carrier before asserting
that the count-first rule transfers. Do not promote it to an EvidenceSeam card
or leaderboard result until protected review accepts the implementation and
receipt controls.

## Measurement Identity

Both independently authored emitters produced exactly the same canonical UTF-8
receipt: SHA-256
`99f9e1ada20829373ac91b5dc9a2197f70796aa7ed0443ea8e30578fd74e2367`;
each file is 238,778 bytes. The F# emitter verifies the frozen raw carrier
bytes before execution, and the Python emitter independently verifies the same
two SHA-256 carriers before execution. The roster contains every unsigned
seed `0…99` exactly once, with 1,000 training episodes and a 250-action cap for
every policy/seed pair. [1]

| Receipt field                     | Observed value                                                     |
| --------------------------------- | ------------------------------------------------------------------ |
| Result schema                     | `zeta.contextual-grid/result-receipt/v1`                           |
| Environment fingerprint           | `389fca213b59a18f9afe32640a0cefffc32c7423e155dd7fc866e8b4ed3e6338` |
| Evaluator catalogue fingerprint   | `bedd7617e115d7d4a718edd2d5906bfb945a5b7ddbf385a50b17ae279d6b916c` |
| Optimal held-out return           | `1,720,000 ppm`                                                    |
| Bootstrap replicas                | 10,000                                                             |
| Bootstrap PRNG draws / rejections | 1,000,000 / 0                                                      |
| Bootstrap index digest            | `d845705cc04da1dc190b743a35a7bc358b75ef8e9121509a4ab76629f45467f8` |
| Comparison label                  | `criterion-met-on-declared-grid`                                   |

The optimal return is a dynamic-programming result over the frozen transition
and reward table, 250-step horizon, and held-out start. It does not use a
learned Q table. Every policy's reported suboptimality is that external
denominator minus its held-out return; lower suboptimality is better. [1]

## Observed Policy Outcomes

`count-first/v1` was the declared candidate. It chose the smallest completed
state-action count during training and did not receive a different update rule,
action budget, Q-table initialization, or test-time learning path. The two
Q-based comparators use the same base Q update; the values below are evidence
for this fixed implementation and this carrier only.

| Policy              | Mean held-out return (ppm) | Mean held-out suboptimality (ppm) | Held-out runs reaching goal | Training goal episodes, min–max |
| ------------------- | -------------------------: | --------------------------------: | --------------------------: | ------------------------------: |
| `uniform-random/v1` |                 −9,414,000 |                        11,134,000 |                     5 / 100 |                         908–949 |
| `q-epsilon/v1`      |                 −9,765,600 |                        11,485,600 |                     2 / 100 |                       999–1,000 |
| `q-ucb/v1`          |                 −9,765,600 |                        11,485,600 |                     2 / 100 |                     1,000–1,000 |
| `count-first/v1`    |             **−3,671,200** |                     **5,391,200** |                **54 / 100** |                         979–995 |

The candidate's mean held-out return exceeded all three comparators on the
complete declared roster. Its lower held-out suboptimality satisfies the
strict-negative paired-delta rule versus uniform random and ε-greedy, and its
paired delta is nonpositive versus the declared UCB comparator. That produces
the narrow predeclared label shown above; it does not establish that state-action
counts are a generally effective exploration method.

| Candidate minus comparator, in suboptimality ppm |       Mean | 95% predeclared percentile interval |
| ------------------------------------------------ | ---------: | ----------------------------------: |
| versus `uniform-random/v1`                       | −5,742,800 |            [−7,032,000, −4,453,600] |
| versus `q-epsilon/v1`                            | −6,094,400 |            [−7,266,400, −4,922,400] |
| versus `q-ucb/v1`                                | −6,094,400 |            [−7,266,400, −4,922,400] |

The intervals resample the observed 100-seed roster with the predeclared,
shared SplitMix64 index vectors; they are finite-sample descriptions of this
roster and not probability guarantees for future grids. [1]

## Controls and Retained Limits

The result path has direct controls for carrier-byte mutation, unknown or
catalogue-mismatch refusal, missing/reordered seed-roster refusal, reordered
policy receipt failure, missing-root-field receipt failure, evaluation Q-table
mutation, changed resampling mapping/digest, and F#–Python complete-byte
disagreement. The final receipt passed F# canonical replay and Python
independent replay after these controls were enabled. [1]

The source paper supplies a related tabular contextual-MDP example, but its
main text and Appendix C.1 contain conflicting held-out coordinates; v1 selects
`(0,4)` in a separately fingerprinted carrier. V1 also fixes
`ε = 0.1` rather than choosing the paper's held-out-selected ε setting,
excludes policy gradient, uses a specified replay PRNG/tie policy, and omits a
hyperparameter-selection sweep. Therefore this receipt neither confirms nor
refutes the paper's reported curves. [2] [3]

No CPU time, energy, hardware configuration, parameter count, memory use,
domain-shift carrier, external benchmark, learned evaluator selection, lexical
interpretation, tangle-navigation result, consented interaction, or
society-consensus measurement was collected here. The next valid step is a
new frozen carrier and independent oracle—not an extrapolation from a single
hand-specified grid.

## References

[1] [Contextual-Grid v1 100-seed result-receipt contract](2026-09-05-contextual-grid-v1-result-receipt-contract.md)

[2] [Contextual-Grid v1 paper-reconciliation record](2026-09-05-contextual-grid-paper-reconciliation.md)

[3] [Jiang, Kolter, and Raileanu, _On the Importance of Exploration for Generalization in Reinforcement Learning_ (NeurIPS 2023)](https://proceedings.neurips.cc/paper_files/paper/2023/file/2a4310c4fd24bd336aa2f64f93cb5d39-Paper-Conference.pdf)
