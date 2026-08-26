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

---

# Addendum — the second mover was built and run, and it found a defect in the conversion

The section above predicted that a second mover "would change the table". The
prediction was tested in a scratch variant before recommending the work, and it
holds — **but the newly-visible result is that the ageing is HURTING.**

Nothing in the repo was modified. `chase._build_level` was wrapped to add one
`decoy` sprite moving on a fixed `right, right, left, left` cycle, independent
of the commanded action, and `zeta_arc.play.ZetaChase` pointed at the subclass.
The agent now perceives **2 movers instead of 1**, and scores **0.1936**.

## Discrimination roughly sextuples

Same twelve mutations, same protocol:

| environment | movers | mutations that MOVE the score | invisible |
|---|---|---|---|
| ZetaChase | 1 | 1 of 11 (~9%) | 10 |
| two-mover variant | 2 | 6 of 11 (~55%) | 5 |

*(the latch mutation crashes on both and is excluded from the denominator)*

Newly visible, and they are precisely the mechanisms the decay→dynamics
conversion introduced: ageing (0.2659), conservative ranking (0.0), Kalman gain
(0.085), ageing-as-no-op everywhere (0.2659).

## The uncomfortable row

> **Removing the body ageing IMPROVES the two-mover score: 0.1936 → 0.2659.**

Reproduced directly, outside the sweep harness. The gain is almost entirely
level 1 — the WALL level — at 17 actions down to 11.

The mechanism was checked, not assumed:

| | body-identity flips | frames holding the DECOY as self |
|---|---|---|
| ageing ON (shipped) | 8 | 8 |
| ageing OFF | 4 | 2 |

Ageing doubles the identity flips and quadruples the frames the agent mistakes
the decoy for itself. The reason is intrinsic and not a quirk of the decoy:

> **This agent learns walls by BUMPING them, and a bump is a frame where the
> body does not move. Ageing reads that as staleness and demotes the true body
> — while a distractor that moves every frame keeps its confidence. The agent's
> own wall-learning strategy is what makes it periodically unobservable, and the
> ageing penalises exactly that.**

`EVIDENCE_DECAY` never had this failure, because it only touched components that
MOVED — the same `continue` that produced its welded-on defect also spared a
blocked body. The conversion fixed one failure and introduced its dual.

## What this does NOT establish

Single decoy design, single seed, scratch code that is not in the repo. A decoy
that moves every frame is the worst case for ageing, and a real environment may
not have one. What generalises is the *mechanism* (bump ⇒ unobserved ⇒ demoted),
not the magnitude.

The suggested repair, unimplemented and unmeasured: do not age on a frame whose
command was REFUSED. A blocked body is not stale evidence — it is explained
absence, and the two are different. That is a design change to landed work and
needs its own falsifier.

## Honest status of the conversion

The three-site decay→dynamics conversion is **not** validated by "score
unchanged at 0.354" — that was the blind instrument. On the one benchmark that
can see it, the conservative ranking and the Kalman gain earn their keep
decisively (removing either takes the agent to 0.0, i.e. solving nothing), and
the ageing costs score. Mixed, measured, and previously invisible.
