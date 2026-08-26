# ZetaChase cannot see the agent — 10 of 12 decision mutations leave the score at 0.354

**Date:** 2026-08-26 · **Status:** measured, single environment · **Instrument:** `play(agent="pixel", seed=4)`

Carved sentence:

> The ARC pixel agent's **test suite** is a good instrument and its **environment
> score** is not. Twelve mutations to the agent's decision machinery: the 121-test
> suite catches **12 of 12**; the environment score moves on **1 of 12**. Ten
> leave it at *exactly* 0.354. A number that survives disabling the ageing, the
> commit gate, the conservative ranking, the Kalman gain, and the inert-suppression
> release is not measuring the mechanism it is being read as measuring.

## The measurement

Each mutation applied alone to a clean tree, tests and score run, tree restored
via `git checkout --` before the next. Baseline 0.354 / 3 levels / 12-11-22.

| mutation | tests | environment score |
|---|---|---|
| no ageing (body election) | red | **0.354 — same** |
| rank by `mu`, not `mu − 3σ` | red | **0.354 — same** |
| commit gate always true | red | **0.354 — same** |
| commit gate never true | red | **0.354 — same** |
| latch: incumbent never yields | red | *crashed* (`AttributeError` in `_key`) |
| inert suppression never expires | red | **0.354 — same** |
| inert suppression released instantly | red | **0.354 — same** |
| agreement sign flipped | red | 0.1157 — **moved** |
| Kalman gain fixed at 0.5 | red | **0.354 — same** |
| ageing a no-op (all three sites) | red | **0.354 — same** |
| `conservative == mu` (width ignored) | red | **0.354 — same** |
| layer ageing removed | red | **0.354 — same** |

The crash is counted as neither: a crash is detected by anything and says nothing
about discrimination.

## Why — and why it is not a bug in the agent

Across 40 ticks of seed 4 the agent perceives **4 distinct components and exactly
one that ever moves**. The body election therefore has no competitor, so every
ranking rule elects the same component and ageing has nothing to demote it in
favour of. The one mutation that moves the score inverts the meaning of agreement
itself, which breaks the single-mover case too.

This is a property of the *environment*, not of the agent. ZetaChase was built to
exercise a perception ladder, and it does; it was never built to discriminate
between election policies, and it does not.

## The consequence, stated plainly

Every future ARC change graded by `environment_score` alone is, with ~92%
probability on this evidence, **ungraded**. That includes work already done: the
decay-constant conversion held the score at 0.354 across all three call sites,
and the honest reading of that is *"the instrument could not see it"*, not
*"the change was neutral"*. The falsifiers that did discriminate were all
hand-built decoy fixtures (`test_a_body_that_stops_moving_loses_the_election...`,
`test_the_dynamics_factor_releases_a_still_body_sooner_than_decay_does`),
constructed precisely because the environment could not pose the question.

## The cheapest fix that would change the table

A ZetaChase level with a **second mover** — a distractor that moves on its own, or
one that mirrors the commanded direction. That single addition puts a competitor
in the election and makes ageing, the latch, the commit gate and the staleness
horizon measurable on the real scorer rather than only in unit fixtures.

Not done here: it changes a shared benchmark and the pinned score, which is a
decision, not a cleanup.

## Pointers

- `src/Arc.Python/zeta_arc/agent.py` — the machinery under test; `_elect_self`, `_update_evidence`, the inert leak
- `src/Arc.Python/tests/test_pixel_agent.py` §"the decoy world: what ZetaChase cannot ask" — the hand-built falsifiers and the measurement that forced them
- `src/Arc.Python/zeta_arc/dynamics.py` — the primitive the conversion runs on
- `workitems/done/2026/08/081M0YSD5VA087G0R000W2Q9QW-*` — the conversion whose score-neutrality this reinterprets
- [`.claude/rules/toy-is-free-metered-must-be-earned.md`](../../.claude/rules/toy-is-free-metered-must-be-earned.md) — a falsifier that cannot fail is not a falsifier; this is that rule pointed at a benchmark
