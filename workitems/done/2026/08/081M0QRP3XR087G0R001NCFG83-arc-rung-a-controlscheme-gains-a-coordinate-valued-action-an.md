---
id: 081M0QRP3XR087G0R001NCFG83
type: task
state: done
priority: P2
slug: arc-rung-a-controlscheme-gains-a-coordinate-valued-action-an
title: "ARC rung A - ControlScheme gains a coordinate-valued action and arcAgi3/atari2600 schemes; the non-embedding is recorded, not papered over"
created: 2026-08-23T16:53:57.816Z
completed: 2026-08-28T11:48:41Z
depends_on: []
composes_with: []
---

# ARC rung A - ControlScheme gains a coordinate-valued action and arcAgi3/atari2600 schemes; the non-embedding is recorded, not papered over

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0QRP3XR087G0R001NCFG83-*.md` glob. -->

**Register: `implemented`.** Design: `docs/design/2026-08-23-arc-agi-3-integration-design-chip8-chip9-atari-and-the-arena.md` §2.

`src/Core/ActionGrammar.fs` is a 16-bit held-key set over a 4x4 grid; ARC-AGI-3's action space is
`RESET` + `ACTION1..ACTION7` where **`ACTION6` carries `{x,y}` over a 64x64 field** (4096 points).
A 16-cell alphabet does not contain it, and forcing it in would be a false universal.

Do: add exactly one case to `ControlScheme.Action` — `| Point of x: int * y: int` — and register
`arcAgi3` and `atari2600` schemes beside `chip9Pad` / `keyboardWasd` / `gamepadStandard`. Atari's
18-action ALE set embeds cleanly with no new constructor; ARC does not, and that asymmetry is the
result, not a defect.

**Falsifier (this is the point of the rung, not a nicety):** `translate` must return `None` for every
ARC input the grammar cannot hold, and a test must assert a `Point` never round-trips through a
16-cell `GridBinding` without loss. A grammar that accepts everything is the vacuity class.

No Python, no network, no dependency on any other rung. Cheapest real start.

## Evidence

- `src/Core/ControlScheme.fs` adds `Point of x: int * y: int` to the canonical meaning space and
  encodes it as the invariant crossing payload `point:<x>:<y>`.
- `PointInput` describes coordinate-bearing physical inputs as data. `arcAgi3` accepts only canonical
  `ACTION6:<x>:<y>` spellings inside the declared 64x64 bounds, so the module does not allocate a
  4,096-entry startup map or special-case the scheme by name.
- `arcAgi3` preserves 4,103 distinct meanings: seven atomic inputs plus all 4,096 points.
  `atari2600` preserves all 18 ALE actions without collisions. Both schemes are ZetaId-addressed and
  registered in `ControlScheme.known`.
- `tests/Tests.FSharp/ControlScheme.Tests.fs` has nine passing focused tests. They pin malformed,
  non-canonical, null, and out-of-bounds refusal; complete ARC and Atari cardinalities; point wire
  encoding; and the 4x4 falsifier. The latter exhibits two unequal points that project to the same
  clamped cell and shows the first value is lost when both are bound there.
- `MetaControl.gamepadMeta`, the only direct `Scheme` record constructor outside this module, now
  declares `PointInput = None`; the compiler checks that every future constructor chooses a coordinate
  policy explicitly.
- `registry/complexity-registry.yaml` prices ARC translation as `O(input)` time and space and Atari
  translation as `O(input)` time with `O(1)` extra space. The generated F# and TypeScript registries
  carry the same rows, and the focused ARC plus shelf-cost regression set passes 14/14.

## Honest boundary

`ACTION6:<x>:<y>` is Zeta's canonical input spelling for this adapter. Rung B still has to map the
toolkit's structured REST action into this representation and prove one live environment step. This
rung does not claim the toolkit's network wire already uses that string, and it adds no Python or
network dependency.
