# MiniGrid Empty-5x5 v3.1.0 Adapter Contract

**Status:** proposed external-adapter conformance contract. This document admits
no policy score, transfer result, curiosity result, or general-learning claim.

> **Decision:** the first external carrier is a fixed-start,
> `MiniGrid-Empty-5x5-v0` adapter at upstream MiniGrid v3.1.0. The first
> required result is source/transition conformance, not a learner comparison.

The contract intentionally does **not** alter the internal
`zeta.contextual-grid/v1` or `v1-reflect-x` carrier families. Those receipts
remain separate finite controls and cannot be pooled with this external carrier.

## 1. Upstream and Runtime Admission

The adapter is admitted only when all byte and version identifiers below agree.
An equivalent parsed source tree, a moving branch, or a dependency floor is
insufficient.

| Field                                         | Required value                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Upstream owner/repository                     | `Farama-Foundation/Minigrid`                                                                |
| Tag                                           | `v3.1.0`                                                                                    |
| Resolved commit                               | `90928729376741a41222a257911343b97103b548`                                                  |
| Environment ID                                | `MiniGrid-Empty-5x5-v0`                                                                     |
| Registry kwargs                               | `{"size":5}`                                                                                |
| Required source: `minigrid/envs/empty.py`     | SHA-256 `9daabf330a51023f5fe2a8884b9b6b26482ee489cbee68604712271e818e5ae6`                  |
| Required source: `minigrid/minigrid_env.py`   | SHA-256 `23490887fbaadd8f4973b4375cd40a23b7636e7aedf59561f767315c36cd0371`                  |
| Required source: `minigrid/core/actions.py`   | SHA-256 `787274f08bc91a76dba83b322ff5ee8fdb8ea7843cb706a1b5371029ac234e28`                  |
| Required source: `minigrid/core/constants.py` | SHA-256 `5e82c8765064461001b8a5e07b2c5f693ce65297418755a11d7917dacbd204ac`                  |
| Required upstream license                     | Apache License 2.0                                                                          |
| Python fixture runtime                        | CPython `3.12.3`; `minigrid==3.1.0`; `gymnasium==1.3.0`; `numpy==2.5.1`; `pygame-ce==2.5.8` |

The listed runtime identifies the observed fixture environment, rather than
asserting that MiniGrid’s dependency declarations themselves freeze an ABI. Any
change to any listed source or package identity must return
`UPSTREAM_IDENTITY_MISMATCH` and emit no comparison receipt.

## 2. Fixed Environment and State Projection

The upstream environment creates a 5 × 5 world with walls around its boundary,
the agent at `(1,1)` facing direction `0` (east), and the goal at `(3,3)` [1]
[2]. The adapter’s _internal conformance state_ is the following finite record:

```text
position: (x:int, y:int)
direction: 0 | 1 | 2 | 3
stepCount: uint
terminated: bool
truncated: bool
world: fixed `empty-5x5/walls+green-goal@3,3`
```

This state is not the upstream agent observation. MiniGrid’s regular observation
contains a partial 7 × 7 × 3 tile image, direction, and a mission string [2].
Neither that image nor the mission text participates in the first adapter
policy interface. A later image- or language-facing carrier must obtain a new
fingerprint, observation serializer, independent oracle, and baseline protocol.

`reset(seed)` must be called **before every episode** by the upstream fixture.
For this fixed-start carrier, the reset probes for seeds 42 and 43 have the same
observed initial projection, but the seed remains in the receipt. The equality
does not permit an implementation to omit reset calls or treat MiniGrid’s other
environments as seed-invariant.

## 3. Action, Transition, Reward, and Terminal Semantics

Only the upstream action space subset below is allowed. Every action row stores
both its declared string and integer; changing either is a conformance failure.

| Canonical action order | Integer | Meaning                                                   |
| ---------------------- | ------: | --------------------------------------------------------- |
| `left`                 |       0 | Decrement heading modulo 4; position stays fixed.         |
| `right`                |       1 | Increment heading modulo 4; position stays fixed.         |
| `forward`              |       2 | Move one cell along heading only if the cell can overlap. |

The adapter must increment `stepCount` before executing the action. Reaching the
goal makes `terminated=true`; reaching `maxSteps` makes `truncated=true` [3].
The carrier fixes `maxSteps=100`. On a goal at step `s`, it records both (a) the
upstream binary64 reward bits and (b) a declared integer diagnostic conversion
`round(1_000_000 × reward)`. The diagnostic conversion cannot replace the raw
binary64 field in source conformance. Non-goal reward is `0.0` and uses the
corresponding binary64 encoding.

## 4. Mandatory Source-Oracle Receipt

The upstream Python fixture must import/register MiniGrid, construct
`gymnasium.make("MiniGrid-Empty-5x5-v0", max_steps=100)`, and emit a canonical
UTF-8 trace containing runtime identities, reset seed, projection state, action
integer/string, reward binary64 bits, `terminated`, and `truncated`. It must not
call F# or consume a Zeta transition result.

The independent F# adapter must consume only this contract plus the frozen
carrier bytes. It must not spawn Python, import MiniGrid, or copy fixture output
as a transition source. Canonical bytes agree only when every field agrees.
The first required fixture is the following fixed trace:

| Step | Action        | Expected position | Expected heading | Reward | Terminated | Truncated |
| ---: | ------------- | ----------------- | ---------------: | -----: | ---------- | --------- |
|    1 | `forward` / 2 | `(2,1)`           |                0 |  0.000 | false      | false     |
|    2 | `forward` / 2 | `(3,1)`           |                0 |  0.000 | false      | false     |
|    3 | `right` / 1   | `(3,1)`           |                1 |  0.000 | false      | false     |
|    4 | `forward` / 2 | `(3,2)`           |                1 |  0.000 | false      | false     |
|    5 | `forward` / 2 | `(3,3)`           |                1 |  0.955 | true       | false     |

The initial observation-projection digest observed under seeds 42 and 43 is
`bbb0d1c0527b767dd4b926b057e3a1a1c3977b0ca5d6417ff6c36faa15bc4b6d`.
It is a fixture check only, not an environment fingerprint, PRNG proof, or
rendering claim.

## 5. Stage Gates and Comparison Protocol

No training or evaluation comparison may run until the adapter conformance
receipt and all mutations in Section 6 pass in two independent implementations.
After that gate, a future `minigrid-empty-5x5/policy-comparison/v1` contract
must declare, before execution:

| Required field   | Required property                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Carrier identity | New hash binding the upstream source/runtime identities and chosen state projection.                                                 |
| Seed roster      | Exact ordered values, reset per episode, and a refusal for missing/duplicate/reordered entries.                                      |
| Policy interface | Full static adapter state only, unless a newly pinned partial-observation carrier replaces it.                                       |
| Baselines        | Named fixed policies with the same three actions, episode count, horizon, and compute/action budget.                                 |
| Novelty          | A versioned statistic and explicit pre/post increment ordering; it remains a local descriptive accounting term, not a global reward. |
| Evaluation       | Training/evaluation separation, frozen policy state during evaluation, terminal/truncation treatment, and exact return serializer.   |
| Statistics       | Prespecified resampling seed/draw procedure and canonical receipt order.                                                             |
| Cross-check      | Upstream Python fixture versus independently authored F# adapter; no shared transition code.                                         |
| Non-claims       | No MiniGrid-wide, transfer, language, non-Gaussian, society, energy, or parameter-efficiency conclusion.                             |

## 6. Required Refusals and Mutations

| Mutation or invalid input                                         | Required observation                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Any source/runtime/carrier identity mismatch                      | `UPSTREAM_IDENTITY_MISMATCH` before run.                   |
| `1=left` instead of `1=right`                                     | Step-3 pose and final trace bytes differ.                  |
| Reward before step increment                                      | Step-5 reward bits and ppm diagnostic differ.              |
| Omit `terminated` or `truncated`                                  | Schema refusal, even where the omitted value is false.     |
| Treat the upstream image/mission as the declared static state     | Projection identity/schema refusal.                        |
| Reuse v1/reflection receipt or evaluator fingerprint              | Unknown-carrier/evaluator refusal before action one.       |
| F# calls the Python fixture, or Python consumes F# adapter output | Cross-oracle independence failure; no conformance receipt. |
| Missing/duplicated/reordered future policy-roster seed            | Result-receipt refusal.                                    |

## 7. What This Contract Does Not Claim

The carrier is a static fixed-start grid with a small action set. It does not
test broad exploration, long-horizon planning, random starts, dynamic obstacles,
visual perception, language grounding, or real-world navigation. It does not
validate a curiosity engine or establish that `count-first/v1` transfers from
the existing contextual-grid controls. It does not use the user’s
lexical-geometric calibration, TangleNavigator as a reward/control law, or any
society-level consensus/empowerment objective.

## References

[1] [MiniGrid v3.1.0 registry and `EmptyEnv` source](https://github.com/Farama-Foundation/Minigrid/tree/v3.1.0)

[2] [MiniGrid v3.1.0 documentation](https://minigrid.farama.org/)

[3] [MiniGrid v3.1.0 `MiniGridEnv.reset` and `step` source](https://github.com/Farama-Foundation/Minigrid/blob/v3.1.0/minigrid/minigrid_env.py)
