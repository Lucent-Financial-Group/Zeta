# MiniGrid Empty-5x5 v3.1.0 Adapter Conformance Result

**Status:** finite source/transition conformance result. It is **not** a policy
score, a MiniGrid benchmark comparison, a novelty result, a transfer result, or
a claim about general learning.

> **Decision:** the independently emitted F# static-adapter and upstream-Python
> fixture receipts are byte-identical for one fixed, five-action Empty-5x5
> witness under the pinned MiniGrid v3.1.0 source and declared fixture runtime.
> The adapter-conformance stage gate is met for this witness only. The
> no-policy-score gate remains in force.

## 1. Admitted Carrier and Receipt Identities

The carrier below fixes the upstream owner, tag, commit, selected source-file
hashes, fixture runtime, static-world projection, action encoding, reset labels,
and witness. It is admitted by raw SHA-256 before either implementation emits a
receipt. This separates immutable carrier identity from JSON parsing or an
equivalent-looking reformatted document.

| Item                          | Measured value                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Upstream environment          | `MiniGrid-Empty-5x5-v0`                                                                   |
| Upstream source               | `Farama-Foundation/Minigrid` v3.1.0 at `90928729376741a41222a257911343b97103b548` [1]     |
| Fixture runtime               | CPython 3.14.6; `minigrid==3.1.0`; `gymnasium==1.3.0`; `numpy==2.5.1`; `pygame-ce==2.5.8` |
| Carrier file                  | `2026-09-06-minigrid-empty-5x5-v310-adapter-carrier.json`                                 |
| Carrier SHA-256               | `49db9a4f6fd415ba4f15b613eba858511e6cf116ec7574cd5ee50cc7c2e46b07`                        |
| F# receipt bytes              | 1,295                                                                                     |
| Upstream-Python receipt bytes | 1,295                                                                                     |
| Both receipt SHA-256 values   | `651d5a8a874b7cf699673635c15d89c956d899471c2ec04664f0a88739244175`                        |

The Python fixture imports the pinned MiniGrid distribution, verifies its
installed source-file hashes and package/runtime versions, calls `reset(seed)`
for each declared seed, and invokes `step` for each action. The F# adapter is
written from the reviewed contract and raw carrier bytes; it neither imports
MiniGrid nor launches the Python fixture. A source-level process-bridge tripwire
is a useful regression control, but it is not a formal proof of independence.

## 2. Observed Fixed Witness

The carrier uses reset labels 42 and 43. Both produced the declared reset
observation digest
`bbb0d1c0527b767dd4b926b057e3a1a1c3977b0ca5d6417ff6c36faa15bc4b6d`
and the same static trace. The receipt records exact binary64 reward bytes so
the integer ppm diagnostic cannot conceal a floating-point difference.

| Step | Action / integer | Position | Direction | Reward binary64    | Reward ppm | Terminated | Truncated |
| ---: | ---------------- | -------- | --------: | ------------------ | ---------: | ---------- | --------- |
|    1 | `forward` / 2    | `(2,1)`  |         0 | `0000000000000000` |          0 | false      | false     |
|    2 | `forward` / 2    | `(3,1)`  |         0 | `0000000000000000` |          0 | false      | false     |
|    3 | `right` / 1      | `(3,1)`  |         1 | `0000000000000000` |          0 | false      | false     |
|    4 | `forward` / 2    | `(3,2)`  |         1 | `0000000000000000` |          0 | false      | false     |
|    5 | `forward` / 2    | `(3,3)`  |         1 | `3fee8f5c28f5c28f` |    955,000 | true       | false     |

The final reward agrees with MiniGrid’s documented success-reward form at a
100-step cap: `1 − 0.9 × 5 / 100 = 0.955` [2]. That arithmetic confirms this
particular transition order; it does not establish compatibility for other
MiniGrid environments, configurations, wrappers, random starts, observation
models, or releases.

## 3. Required Negative Controls

The new focused suites observed all contract-required mutation/refusal paths.

| Fault or invalid input                                       | Observed result                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Append one whitespace byte to the carrier                    | `UPSTREAM_IDENTITY_MISMATCH` before the adapter or upstream fixture runs. |
| Change `right` from integer 1 to 0                           | `INVALID_ACTION_MAPPING` in semantic carrier validation.                  |
| Change static projection to upstream image                   | `INVALID_STATE_PROJECTION`; image/mission are not silently admitted.      |
| Calculate terminal reward before the fifth step increment    | Its binary64 bits differ from the admitted terminal reward bits.          |
| Remove `terminated` or `truncated` from otherwise valid JSON | `INVALID_RECEIPT_SCHEMA`.                                                 |
| Alter any admitted receipt byte                              | `NONCANONICAL_RECEIPT` after replay.                                      |
| Add an F# process bridge to the Python fixture               | The source-level process-bridge tripwire fails.                           |

The F# suite passed **8/8** focused tests. The independent Python fixture suite
passed **6/6** tests, plus repository-pinned formatting, lint, and static type
checks. Both suites regenerate their own expected trace before comparing it to
the two committed receipt artifacts.

## 4. Remaining Gate

This result permits no reuse of the internal contextual-grid evaluator catalogue,
no `count-first/v1` policy call, and no aggregate return or bootstrap interval.
Any later learner comparison must be frozen in the new carrier family and must
provide matched policies, a versioned local novelty statistic, a seed roster,
train/evaluation separation, an explicitly declared state or observation
interface, fixed action/compute budgets, and independent replay. The internal
contextual-grid results remain separate controls.

The result also makes no claim about visual perception, mission-language
understanding, non-Gaussian inference, society-level consensus or empowerment,
real-world navigation, parameter efficiency, or energy use.

## References

[1] [Farama Foundation, MiniGrid v3.1.0 source tag](https://github.com/Farama-Foundation/Minigrid/tree/v3.1.0)

[2] [MiniGrid environment documentation](https://minigrid.farama.org/)
