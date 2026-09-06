# MiniGrid v3.1.0 Source and Reproducibility Audit

**Recommendation:** use `MiniGrid-Empty-5x5-v0` only as a _proposed external
carrier candidate_ after a separate, byte-pinned adapter contract is reviewed.
Do **not** yet call the internal contextual-grid controls a MiniGrid result,
paper reproduction, transfer result, or external benchmark comparison.

## Scope

This audit examines a narrow upstream surface: the maintained Farama MiniGrid
release **v3.1.0**, its `MiniGrid-Empty-5x5-v0` registry entry, and its
fixed-start execution path. It does not evaluate an RL algorithm, install
MiniGrid as a Zeta dependency, or admit a result receipt.

The candidate was chosen over Dynamic Obstacles because the latter moves
obstacles using upstream random placement during every `step`. It would demand
a larger source and random-stream compatibility surface before an independent
F# reimplementation could be falsifiably compared. Empty-5x5 is still an
external task interface, yet it has no random object placement when using the
non-random registered configuration. This makes it suitable for a first
adapter conformance study, not a novelty or partial-observability claim.

## Upstream Identity

| Item                     | Pinned observation                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Maintainer               | Farama Foundation                                                                         |
| Source revision          | Git tag `v3.1.0` → commit `90928729376741a41222a257911343b97103b548`                      |
| Published release        | MiniGrid 3.1.0, released 2026-05-11                                                       |
| Environment identifier   | `MiniGrid-Empty-5x5-v0`                                                                   |
| Registry kwargs          | `{"size": 5}`                                                                             |
| Upstream source license  | Apache License 2.0                                                                        |
| Upstream action integers | `0=left`, `1=right`, `2=forward`                                                          |
| Default max steps        | `4 × size²`, therefore 100 for the candidate                                              |
| Current probe runtime    | CPython 3.12.3; `minigrid==3.1.0`, `gymnasium==1.3.0`, `numpy==2.5.1`, `pygame-ce==2.5.8` |

The release is a valid immutable source boundary only when both the tag and
resolved commit are recorded. MiniGrid's own packaging specifies dependency
floors rather than a fully locked transitive environment. Consequently, the
probe runtime above is an observation, not a portable compatibility guarantee.
A later contract must pin all runtime artifact identities or use a vendored,
reviewed conformance fixture under the upstream license.

## Authoritative Interface Facts

MiniGrid documents a Gymnasium interface with `reset(seed=...)` and `step`,
where `step` yields observation, reward, terminated, truncated, and info
[1]. The v3.1.0 registry maps `MiniGrid-Empty-5x5-v0` to `EmptyEnv` with
`size=5`; the implementation fixes the agent at `(1,1)`, direction `0`, and
the goal at `(3,3)`, surrounded by a wall boundary [2]. Its general action
implementation increments the step count before it processes left, right, or
forward; a forward move onto the goal ends the episode and uses the upstream
time-discounted reward [3].

The current MiniGrid documentation describes the exact reward as
`1 - 0.9 × (step_count / max_steps)` on success and zero on failure [4]. For
the fixed five-action witness trace `forward, forward, right, forward,
forward`, this yields a terminal reward of `0.955` at the fifth step under a
100-step cap. The static task has a triangle-like agent, a discrete action
space, and a partially observable tuple-encoded image plus direction and
mission fields [1] [4]. None of these observables may be silently reduced to
the internal contextual-grid's cardinal-action state unless an adapter makes
the reduction explicit and testable.

## Fixed-Seed Probe

The controlled upstream probe was performed against the exact package version
shown above. It reset the registered non-random Empty-5x5 environment at seeds
42, 42, and 43, then ran the five-action witness trace. The first-observation
digest was identical for all three resets:

> `bbb0d1c0527b767dd4b926b057e3a1a1c3977b0ca5d6417ff6c36faa15bc4b6d`

This equality is expected only for the observed fixed-start configuration; it
does not say seeds are irrelevant to MiniGrid generally. It is neither a PRNG
conformance claim nor evidence about Dynamic Obstacles, random Empty variants,
wrappers, rendering, or future upstream releases.

| Witness step | Integer action | Agent position | Direction | Reward | Terminal |
| -----------: | -------------: | -------------- | --------: | -----: | -------- |
|            1 |  2 (`forward`) | `(2,1)`        |         0 |  0.000 | no       |
|            2 |  2 (`forward`) | `(3,1)`        |         0 |  0.000 | no       |
|            3 |    1 (`right`) | `(3,1)`        |         1 |  0.000 | no       |
|            4 |  2 (`forward`) | `(3,2)`        |         1 |  0.000 | no       |
|            5 |  2 (`forward`) | `(3,3)`        |         1 |  0.955 | yes      |

## Candidate-Selection Boundaries

| Candidate                      | First-carrier decision     | Reason                                                                                                                                            |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MiniGrid-Empty-5x5-v0`        | Proposed, pending contract | Fixed geometry, three-action interface, compact state/action witness, and upstream documentation/source permit a small adapter surface.           |
| `MiniGrid-Empty-Random-5x5-v0` | Deferred                   | Randomized starts require a pinned upstream random-stream/seed contract before independent matching.                                              |
| Dynamic Obstacles              | Deferred                   | Obstacles are randomly placed and repositioned at every step; a direct external runtime-only score would not independently validate a Zeta model. |
| BabyAI variants                | Out of scope               | Their synthetic mission generation introduces a language benchmark; it must not be used to imply English or lexical-geometric understanding.      |

The proposed external carrier must not use MiniGrid's image renderer, its
mission string, any wrapper, or an unpinned Gymnasium dependency as an ambient
source of truth. It must instead declare one canonical observation projection,
such as the complete static world state and agent pose, and retain a separate
upstream Python fixture that demonstrates each projected field agrees with the
pinned package. The independent F# side must be authored from that reviewed
contract, not by calling MiniGrid or by sharing its source implementation.

No suitable first-hand technical video from a maintainer or conference
presentation was identified in the requested search. The source audit therefore
relies on the official project documentation, versioned source, and the
controlled package probe rather than substituting a third-party video summary.

## Required Next Contract

Before implementation, a dedicated contract must freeze the upstream commit,
the source files and their hashes, Python/runtime distribution identities, the
non-rendered observation projection, the exact reset/termination sequence,
action encoding, canonical receipt serializer, train/eval split, and matched
action/compute budgets. It must require both an upstream-Python fixture and an
independently authored F# adapter. It must include wrong revision, wrong action
integer, altered projection, reward/step-order, terminal-flag, and stale
carrier-byte mutation controls.

## References

[1] [MiniGrid v3.1.0 documentation](https://minigrid.farama.org/)

[2] [MiniGrid v3.1.0 registry and EmptyEnv source](https://github.com/Farama-Foundation/Minigrid/tree/v3.1.0)

[3] [MiniGrid v3.1.0 `MiniGridEnv.step` source](https://github.com/Farama-Foundation/Minigrid/blob/v3.1.0/minigrid/minigrid_env.py)

[4] [MiniGrid v3.1.0 Dynamic Obstacles environment documentation](https://minigrid.farama.org/environments/minigrid/DynamicObstaclesEnv/)
