
## The defect

`_note_blocked_cell` learns walls by bumping and writes them to `self.blocked`.
Only `_route_plan` ever read that map. The greedy fallback — which runs whenever
the router returns no plan — chose by heading alone:

```python
action = max(moves, key=lambda a: ACTION_VECTORS[a][0] * dx + ACTION_VECTORS[a][1] * dy)
```

So a move into a cell the agent had *already mapped as solid* was fully
eligible, and once chosen it repeated forever: the body does not move, so
`(dx, dy)` is unchanged, so `max` returns the same action next tick.

## Measured on `ZetaPocket` level 1

```
cell (7,1)   blocked = [(6,1), (7,2)]   plan = 0
  -> ACTION3 x382 of 400 actions   (95.5% of the episode)
```

Both walls in `blocked` are real and correctly learned. The agent walked into
one of them for the rest of the episode. The way out — up, to (7,0) — scores
lower on the heading and was therefore unreachable by argmax.

## Found by building the environment, not by reading the code

`ZetaPocket` was built to reproduce a *different* bug (the bootstrap trap,
081M0YH0S80087G0R001KCAMJS) and **failed to** — `_route_plan` routes around the
pocket from the first frame. It surfaced this instead. The environment is kept
as the regression instrument for what it actually found, and its docstring says
plainly that it does not test what it was built for.

That is the case for local instruments generally: the 1-second loop found a
382-action deadlock that no unit test was looking for.

## Honest state after the fix

Level 1 is **still not solved**. The wall-hammer becomes a two-cycle:

| | top action | share |
|---|---|---|
| before | `ACTION3` x382 | 95.5% |
| after | `ACTION1` x198 / `ACTION2` x193 | 49.5% |

`distinct_grids` 15 -> 16. Strictly better — the agent no longer walks into a
mapped wall — and strictly not solved. The oscillation is the failure the
`_plan` commitment comment already names: replanning against an optimistic map
produces a two-cycle, and the real repair is making `_route_plan` succeed here
rather than widening the fallback again.

## Falsifiers

- `test_the_agent_stops_walking_into_a_wall_it_has_already_mapped` — episode
  share of the top action under 60% (pre-fix: 95.5%).
- `test_greedy_never_chooses_a_move_into_a_cell_it_believes_is_solid` — the
  decision itself, because a share assertion can pass for the wrong reason: an
  agent oscillating between two useless moves also spreads its budget.

Both go red when greedy stops consulting `blocked`.
