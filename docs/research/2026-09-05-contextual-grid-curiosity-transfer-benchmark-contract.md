# Contextual-Grid Curiosity and Transfer Benchmark Contract

**Status:** proposed finite benchmark contract. This document defines what a
future implementation may measure. It reports **no experiment, no learned
policy, no transfer result, and no society-level consensus result**.

**Owner:** Zeta research and verification layer  
**Version:** `contextual-grid-curiosity-transfer/v1`  
**Scope:** deterministic, tabular, single-agent contextual control only

## 1. Purpose and Falsifiable Claim

This contract tests one narrow question: given a **declared, exact environment
fingerprint** and a finite catalogue of declared action-selection rules, does an
internal count-novelty selector achieve a lower held-out finite-horizon
suboptimality than specified non-adaptive baselines under the same interaction
budget and seed roster?

The design takes its methodological anchor from the tabular contextual-MDP
example of Jiang, Kolter, and Raileanu: a deterministic 5×5 grid, a training
start distinct from the held-out start, identical action budgets, and evaluation
after training without test-time learning. Their paper reports that exploration
strategy changes held-out performance in that didactic setting. [1]

> This benchmark does **not** reproduce the authors' experiment. The paper's
> main text and Appendix C.1 disagree on the held-out start coordinate; the
> released EDE repository contains the deep Procgen/Crafter paths, not the
> tabular carrier. This contract therefore defines a separately versioned
> benchmark rather than silently resolving the discrepancy. [1] [2]

The primary claim is **falsified** for a candidate configuration if its mean
held-out suboptimality is not strictly lower than both `uniform-random/v1` and
`q-epsilon/v1` on the complete declared seed roster. A candidate does not earn
any claim against `q-ucb/v1` unless it is also no worse than that comparator
under the same measurement. A null, tie, or loss is a valid result.

| This contract may measure                                                     | This contract does not measure                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Finite-budget state/action exploration and held-out return in one frozen grid | General intelligence, universal transfer, or parameter efficiency          |
| Exact fingerprint admission or refusal                                        | Learned scene semantics, geospatial semantics, or spectral learning        |
| A deterministic local count statistic                                         | Intrinsic motivation in general, human curiosity, or emotional propagation |
| A later opt-in multi-agent extension only after a new contract                | Mutual empowerment, consent, governance, or society-level consensus        |

## 2. Frozen Environment

The environment identifier is `zeta.contextual-grid/v1`. Coordinates are ordered
as `(x, y)` with `x, y ∈ {0, 1, 2, 3, 4}`. The state space has 25 positions;
there is no hidden state, no local clock, and no ambient random source.

| Field                       | Frozen value                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------- |
| Actions, in canonical order | `north`, `east`, `south`, `west`                                                      |
| Transition                  | Deterministic unit move; an attempted boundary crossing leaves the position unchanged |
| Goal / terminal state       | `(4, 0)`                                                                              |
| Goal reward                 | `+2.00` (`+2_000_000` ppm) and terminate                                              |
| Nonterminal reward          | `−0.04` (`−40_000` ppm)                                                               |
| Training start              | `(0, 0)`                                                                              |
| Held-out evaluation start   | `(0, 4)`                                                                              |
| Per-episode action cap      | `250`                                                                                 |
| Discount used by Q-learning | `0.9`                                                                                 |
| Evaluation return           | Undiscounted finite-horizon return                                                    |

The transition table and reward table, not prose, are the normative carrier.
The eventual receipt must contain their canonical UTF-8 JSON form and the
SHA-256 fingerprint of exactly those bytes. The committed carrier is
`docs/research/data/2026-09-05-contextual-grid-v1-manifest.json`; its 204-byte
payload has SHA-256
`389fca213b59a18f9afe32640a0cefffc32c7423e155dd7fc866e8b4ed3e6338`.
The byte format is:

1. Object keys are ASCII and emitted in the order `actions`, `goal`,
   `heldOutStart`, `nonterminalRewardPpm`, `terminalRewardPpm`,
   `trainingStart`, `transitionVersion`.
2. Arrays retain the action order above; coordinates are two-element integer
   arrays; no whitespace is emitted.
3. All rewards in the canonical carrier are signed integer ppm values. Floating
   arithmetic may occur only in the declared Q-learning calculation and is not
   claimed byte-identical across language runtimes.

An independent dynamic-programming oracle must compute the optimal undiscounted
return for each admissible start and 250-step horizon directly from the frozen
tables. No learned value function may supply the denominator of suboptimality.

## 3. Fingerprint Admission and Evaluator Catalogue

The first release uses only **hard admission**. It may use
`FingerprintPrism.hard` as the implementation mechanism, but the contract is
defined by exact canonical-byte SHA-256 equality, not by a heuristic classifier.
`FingerprintPrism.soft`, its MinHash/Jaccard threshold, and
`StructureFingerprint` are explicitly out of scope: neither is a learned domain
policy or a semantic scene recognizer.

| Input fingerprint state                                        | Required outcome                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Exactly equals `zeta.contextual-grid/v1` canonical fingerprint | Admit the sole evaluator catalogue version below                             |
| Known catalogue version but different fingerprint              | Refuse before any action, count update, or evaluation                        |
| Unknown fingerprint                                            | Return `UnknownFingerprint`; do not choose a nearest evaluator               |
| Soft-similar fingerprint                                       | Return `SoftMatchNotAdmitted`; do not silently promote it to exact admission |
| Conflicting copies of one catalogue version                    | Return `ConflictingCatalogue`; do not select an entry                        |

The immutable catalogue is `zeta.contextual-grid/evaluators/v1`:

| Catalogue ID            | Role                  | Definition                                                                                                           | Adaptive learned weights? |
| ----------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `external-return/v1`    | Environment outcome   | The frozen reward table above; used by Q updates and return reporting                                                | No                        |
| `state-action-count/v1` | Local novelty account | Before choosing action `a` in state `s`, `n(s,a)=1/sqrt(1+N(s,a))`, where `N` is the completed-training action count | No                        |
| `q-epsilon/v1`          | External baseline     | Tabular Q-learning with fixed ε policy                                                                               | No                        |
| `q-ucb/v1`              | External baseline     | Tabular Q-learning with fixed count-UCB policy                                                                       | No                        |
| `count-first/v1`        | Internal candidate    | Choose minimal `N(s,a)`; break ties only through declared PRNG action order                                          | No                        |

The catalogue is a **finite declared lookup**, not a global fitness function.
`state-action-count/v1` is an accounting statistic rather than a claim that
unpredictability is intrinsically good. The environment reward remains visible
and separately reported. The contract prohibits selecting catalogue entries from
mutable learned weights, catalog order, local time, or an undeclared heuristic.
The committed catalogue carrier is
`docs/research/data/2026-09-05-contextual-grid-v1-evaluator-catalogue.json`; its
250-byte payload has SHA-256
`bedd7617e115d7d4a718edd2d5906bfb945a5b7ddbf385a50b17ae279d6b916c` and binds
the exact environment fingerprint above.

## 4. Policies, Randomness, and Update Ordering

All stochastic policy choices use a **benchmark-local, separately tested,
stateful SplitMix64 stream**. The repository exposes a stateless `SplitMix64.mix`
function, not a stream, so this contract does not pretend that a stateful
interface already exists. The v1 stream update is exactly: set
`s' = s + 0x9E3779B97F4A7C15 (mod 2^64)`; set `z = s'`; set
`z = (z xor (z >>> 30)) * 0xBF58476D1CE4E5B9 (mod 2^64)`; set
`z = (z xor (z >>> 27)) * 0x94D049BB133111EB (mod 2^64)`; return
`z xor (z >>> 31)` with next state `s'`. The stream state is explicit and
threaded through every action selection. No call to wall-clock,
`System.Random`, `Math.random`, process entropy, or ambient RNG is admissible.
The F# runner and Python oracle must publish shared stream golden vectors before
they publish a benchmark receipt.

The published v1 vector carrier is
`docs/research/data/2026-09-05-contextual-grid-v1-splitmix64-vectors.json`.
Both implementations replay its eight seed-zero transitions directly; the file
is shared data, not a shared PRNG implementation.

The comparison roster is the 100 unsigned 64-bit seeds `0` through `99`. Every
candidate and baseline receives every seed once, with a fresh Q table, count
table, and PRNG source for that seed. A lightweight conformance tier may use
seeds `0` through `15`, but no score from that tier is a benchmark result.

Every fresh Q table sets every `Q(s,a)` to exactly `0.0`, and every fresh count
table sets every `N(s,a)` to integer zero. All four policies maintain those same
tables and apply the update sequence below; `count-first/v1` merely ignores Q
when selecting its training action. This avoids calling a policy comparison fair
while giving the candidate a different data-update path.

| Policy ID           | Training action rule                                                                      | Fixed parameter |
| ------------------- | ----------------------------------------------------------------------------------------- | --------------- |
| `uniform-random/v1` | Draw one of four actions using two declared PRNG bits                                     | None            |
| `q-epsilon/v1`      | With probability ε draw uniformly; otherwise greedy Q action                              | `ε = 0.1`       |
| `q-ucb/v1`          | Select unvisited actions first; otherwise maximize `Q(s,a)+45*sqrt(log(max(1,t))/N(s,a))` | `c = 45`        |
| `count-first/v1`    | Select action of smallest completed count `N(s,a)`                                        | None            |

The UCB comparison uses the family and `c=45` reported as best in the cited
tabular sweep, but it is not tuned on this contract's held-out start. [1]

For every training action, the implementation must apply this ordering:

1. Read `Q(s,a)` and `N(s,a)` before the action; compute and record
   `n(s,a)` before incrementing the count.
2. Select the action using only the policy definition, current explicit PRNG
   state where applicable, and canonical action order.
3. Apply the deterministic transition, receive the external reward, and emit a
   transition receipt.
4. Update the chosen Q value with
   `α_t = 0.05 / sqrt(max(1,t))` and target
   `r + 0.9 * max_a Q(s',a)` unless the transition is terminal, in which case
   the bootstrap term is zero.
5. Increment `N(s,a)` and global training action counter `t` exactly once.

Training runs 1,000 episodes per seed. Every episode terminates at the goal or
after 250 actions. At held-out evaluation, the Q table is frozen, the policy is
greedy with canonical-order tie resolution, and **neither Q nor N may update**.
The evaluator emits one 250-step-or-shorter trace from `(0,4)` per seed.

## 5. Measurements and Reporting

The primary statistic is mean held-out undiscounted suboptimality over the 100
seed roster:

`optimalHeldOutReturn − observedHeldOutReturn`.

The receipt must retain per-seed values, not only an aggregate. It must also
report the paired difference against each baseline, its arithmetic mean, and a
predeclared 10,000-replicate percentile bootstrap interval. Bootstrap resampling
uses only a fresh SplitMix64 source at seed `0x4354584752494456`: draw 32 bits,
reject values in `[4_294_967_200, 2^32)`, and map each retained value to one of
the 100 seed-row indices by integer remainder modulo 100. The receipt must
record draws and rejections as metered sampling cost. A confidence interval is a
finite-sample summary, not a proof of generalization beyond this carrier.

| Class      | Metric                                                                                  | Interpretation                                                |
| ---------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Primary    | Mean held-out suboptimality                                                             | Lower is better only for this frozen grid and seed roster     |
| Primary    | Paired held-out suboptimality deltas vs `uniform-random/v1`, `q-epsilon/v1`, `q-ucb/v1` | Comparative evidence under matched budgets                    |
| Secondary  | Training unique-state and unique-state-action coverage                                  | Cartography coverage, not task competence                     |
| Secondary  | Mean pre-increment `state-action-count/v1`                                              | Novelty accounting trace, not a reward claim                  |
| Secondary  | Training goal-reaching rate and return                                                  | Separates training solution from held-out behavior            |
| Diagnostic | Exact action/transition trace digest                                                    | Replay and oracle comparison                                  |
| Diagnostic | Post-training Q-table IEEE-754 digest                                                   | Finite arithmetic-conformance check, not a performance metric |

The receipt must state `not-measured` for TangleNavigator navigation, escape
rate, lexical interpretation, society consensus, energy use, latency, parameter
count, and all multi-agent outcomes. `TangleNavigator` remains a caller-supplied
bounded orbit diagnostic; this grid has no declared chaotic-state embedding or
admissible kick search, so it cannot be used as an implicit progress reward.

## 6. Independent Verification and Fault Controls

The production runner and oracle must be separately authored. The initial plan
is an F# benchmark runner plus a Python oracle whose transition, optimal-return,
policy, PRNG, and receipt validation code share only the frozen JSON carrier and
schema. Shared helper imports between the runner and oracle are prohibited.

| Required control                            | Required failure observation                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Wrong exact fingerprint                     | `UnknownFingerprint` or mismatch refusal before action 1                                 |
| Reordered catalogue entries                 | Catalogue fingerprint changes; existing version is refused rather than reinterpreted     |
| Constant novelty mutant                     | At least one `state-action-count/v1` receipt value diverges from oracle on a known trace |
| Train/test start swap                       | Held-out split fingerprint mismatch or a distinct oracle return                          |
| Q/count update during evaluation            | Evaluation trace or post-evaluation table digest diverges from frozen-table oracle       |
| Ambient RNG mutant                          | Replay digest diverges or ambient-source guard rejects the runner                        |
| Dropped/reordered transition receipt        | Canonical trace digest fails validation                                                  |
| Soft-match promotion mutant                 | `SoftMatchNotAdmitted` path fails rather than selecting a catalogue                      |
| Candidate equals a baseline by construction | The result reports no new selector claim rather than a self-comparison win               |

Canonical evidence state remains a content-addressed union of receipts. The
aggregate score is a deterministic query over that state, not a CRDT merge and
not a Bayesian posterior. Receipt source order, correction, retraction,
conflict, and unknown states must remain visible.

For this finite carrier, the post-training Q table is ordered by `(x,y,action)`,
where `action` uses the already declared `north`, `east`, `south`, `west` order,
and each `float64` is represented by its 16 lower-case hexadecimal IEEE-754
bits before hashing. Therefore the F# and Python oracle emit a bit-exact
conformance field as well as byte-identical action/transition receipts. A
different bit digest is a retained `MISMATCH` observation, not a rounded-away
success. This is a bounded test of this declared calculation and runtime pair,
not a claim of generic reproducible floating-point arithmetic.

## 7. Lexical, Geometric, and Society Boundaries

The user-declared lexical-geometric calibration receipt is intentionally absent
from v1. A later optional condition may map a finite declared prompt to one of
the four action symbols, but it must retain unknown/conflict results, never
overwrite input, and be measured as prompt-to-action coverage only. It would not
establish English understanding, geospatial semantics, cortical structure, or a
medical/neuroscience mechanism.

Likewise, mutual empowerment is not an individual reward in this benchmark.
`SocietyBootstrap` currently measures deduplicated, attested Gaussian precision
loss under single-agent removal and refuses unattested or conflicting evidence;
it explicitly does not certify independence. `empowermentBound` currently filters
declared candidate interactions using consent, floor, and externality conditions;
its linear blend is documented as vacuous. Neither primitive selects an action
in this single-agent grid. A future PettingZoo or Melting Pot contract must
freeze agent identities, consent declarations, bystander externalities,
provenance, and a separate consensus protocol before any society-level result is
reported. [3] [4] [5]

## 8. Implementation Gate

Implementation may begin only after these files are added in one focused change:

| Deliverable                    | Required content                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Canonical environment manifest | Exact transition/reward/split bytes and SHA-256                                                |
| Versioned evaluator manifest   | Catalogue rows in canonical order plus SHA-256                                                 |
| F# runner                      | Fixed-seed execution and full receipt emission                                                 |
| Independent Python oracle      | No shared policy/transition implementation; strict schema verifier                             |
| Mutation tests                 | Every row in Section 6 fails for its intended fault                                            |
| Result document                | Seed roster, raw receipt paths/hashes, metrics, null outcome handling, and explicit non-claims |

The first implementation records a **one-seed conformance preflight** at
`docs/research/data/2026-09-05-contextual-grid-v1-one-seed-preflight.json`.
It is deliberately not the required 100-seed benchmark: its value is that the
F# runner and Python oracle replay four full-budget traces and Q-table digests
exactly. The retained negative held-out result must not be read as a ranking or
transfer conclusion.

No GitHub Pages card, leaderboard, or managed-mirror update is allowed before a
complete independently verified receipt exists. A public card must present a
negative result without visual demotion or reinterpretation.

## References

[1] [Jiang, Kolter, and Raileanu, _On the Importance of Exploration for Generalization in Reinforcement Learning_ (NeurIPS 2023)](https://proceedings.neurips.cc/paper_files/paper/2023/file/2a4310c4fd24bd336aa2f64f93cb5d39-Paper-Conference.pdf)

[2] [Official EDE implementation](https://github.com/facebookresearch/ede)

[3] [Jaques et al., _Social Influence as Intrinsic Motivation for Multi-Agent Deep Reinforcement Learning_ (ICML 2019)](https://proceedings.mlr.press/v97/jaques19a.html)

[4] [PettingZoo documentation](https://pettingzoo.farama.org/)

[5] [Google DeepMind Melting Pot repository](https://github.com/google-deepmind/meltingpot)
