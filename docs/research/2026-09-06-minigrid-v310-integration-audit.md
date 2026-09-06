# MiniGrid v3.1.0 External-Carrier Integration Audit

**Recommendation:** create a new `minigrid-empty-5x5/v1` adapter boundary.
Do not extend `ContextualGridBenchmark` until the new environment, action, and
observation semantics are separately pinned and independently checked. The
existing carrier is data-driven within its own finite grid family, but it is
not an interchangeable MiniGrid engine.

## Existing Zeta Carrier Boundary

`ContextualGridBenchmark` now verifies raw-byte manifests and evaluator
catalogues before action one. That behavior is useful and should be retained as
an admission pattern. Its current carrier, however, represents only the
following fixed finite semantics:

| Zeta contextual-grid element | Existing behavior                                | Consequence for MiniGrid                                                                     |
| ---------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| State                        | Absolute `(x,y)` position                        | Cannot represent an agent orientation or a partial observation without a new type.           |
| Actions                      | `north`, `east`, `south`, `west`                 | Cannot represent MiniGrid's `left`, `right`, `forward` transition rules.                     |
| Transition                   | Cardinal step, clamp at `0…4`                    | Cannot express rotate-in-place or forward-relative-to-heading behavior.                      |
| Reward                       | Integer ppm, fixed terminal/nonterminal values   | Cannot silently substitute MiniGrid's float time-discounted success reward.                  |
| Episode                      | Goal ends a path; no upstream truncation state   | Cannot distinguish MiniGrid `terminated` from `truncated` without an explicit receipt field. |
| Observation                  | None exposed to the policy                       | Cannot claim a MiniGrid image, direction, or mission interface.                              |
| Evaluators                   | Local fixed catalog bound to each local manifest | Cannot reuse a local evaluator catalogue as an external MiniGrid catalogue by name alone.    |

The fields are intentionally insufficient for an upstream environment. Reusing
the existing `Carrier` union or changing its cardinal action list would alter
the v1 and reflect-x replay boundary and invite a false result comparison.

## Required New Boundary

The smallest defensible shape is a _new_ static, finite adapter with an
immutable, byte-pinned source manifest and no dependency on a live MiniGrid
process at evaluation time. It should declare the following elements.

| Adapter field            | Required definition                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `upstream`               | Owner, source tag, resolved commit, source file hashes, upstream package version, and runtime distribution identities.                                  |
| `environmentId`          | Exact upstream registered ID: `MiniGrid-Empty-5x5-v0`.                                                                                                  |
| `reset`                  | Fixed seed policy, start pose, max-steps rule, and observed upstream reset record.                                                                      |
| `state`                  | Position, heading, step count, terminal/truncated flags, and an explicit static-world encoding.                                                         |
| `action`                 | Integer and string pairs `0=left`, `1=right`, `2=forward`, in fixed order.                                                                              |
| `transition`             | Turn and forward transition table, wall collision behavior, goal behavior, and step-before-action reward timing.                                        |
| `observation projection` | A deliberately selected finite non-rendered projection. This cannot be described as MiniGrid's raw image unless each byte is independently checked.     |
| `receipt`                | Exact reset and transition witness records, including terminated and truncated flags, plus a canonical serializer.                                      |
| `oracle division`        | Upstream Python fixture validates package behavior; independently authored F# code validates the frozen adapter rules. Neither side may call the other. |

The proposed first policy interface is **full static adapter state**, not the
upstream partial observation. That choice is a conformance simplification, not
a valid MiniGrid partially observable RL score. A later partial-observation
variant would need its own fingerprint, an image/observation byte record, and
separate policy baselines.

## Comparison Discipline

The two contextual-grid result receipts must not be pooled with any MiniGrid
adapter result. They differ in state definition, action arity, reward scale,
episode construction, and source provenance. A valid later comparison must
compare only policies that consume the exact same declared adapter state,
receive the same episodes/action cap, and use the same upstream-frozen
transition mechanics.

The first MiniGrid deliverable should therefore be an **adapter conformance
receipt**, not a 100-seed learner leaderboard. It should prove or falsify a
fixed reset and action trace against the byte-pinned Python package fixture.
Only after source conformance and mutations have passed can a policy benchmark
be contracted.

## Mandatory Fault Controls

The external-carrier contract must require all of the following to fail.

| Mutation                                                                            | Failure that must be observed                                               |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Upstream commit, source hash, package, or runtime identity changes                  | Carrier admission refuses.                                                  |
| Replace action `1=right` with `1=left`                                              | Witness orientation and terminal trajectory disagree.                       |
| Increment step count after reward computation                                       | Final witness reward differs from 0.955.                                    |
| Treat terminal success as truncation or omit either flag                            | Receipt validation refuses.                                                 |
| Replace full static state with the upstream image without a new projection identity | Schema or carrier identity refuses.                                         |
| Couple F# behavior to live Python/MiniGrid output                                   | Independence review fails; no cross-language conformance claim is admitted. |

## Boundary Statement

This audit identifies a feasible, narrow external adapter path. It does not
state that Zeta matches MiniGrid today, that the internal count-first rule
generalizes, that the proposed state projection is perceptually grounded, or
that either system learns in a human-like or general way. Dynamic Obstacles,
random starts, image observations, BabyAI language, external curiosity
benchmarks, multi-agent objectives, and society-level consensus remain outside
this first adapter.

## References

[1] [MiniGrid v3.1.0 source and fixed-start EmptyEnv](https://github.com/Farama-Foundation/Minigrid/tree/v3.1.0)

[2] [MiniGrid v3.1.0 documentation](https://minigrid.farama.org/)

[3] [MiniGrid v3.1.0 `MiniGridEnv.step` source](https://github.com/Farama-Foundation/Minigrid/blob/v3.1.0/minigrid/minigrid_env.py)
