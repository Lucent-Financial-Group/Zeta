---
id: 081M1W4DW1Y087G0R000WR0JRN
type: task
state: backlog
priority: P2
slug: superagent-is-a-capability-ratchet-each-run-routes-the-next
title: "Superagent is a capability ratchet: each run routes the next one to less intelligence"
created: 2026-09-06T19:51:50.078Z
depends_on: []
composes_with: []
---

# Superagent is a capability ratchet: each run routes the next one to less intelligence

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1W4DW1Y087G0R000WR0JRN-*.md` glob. -->

Written up in
`docs/research/2026-09-06-a-superagent-routes-the-next-run-to-less-intelligence-the-capability-ratchet.md`.

Aaron 2026-09-06, carved: **"Superagent is the best honest router."** Longer form, given
first: *"one who every time it works decides how to route the next same task to an agent with
less experience or intelligence."*

## Why it is worth keeping

It is a **different kind of definition** from the six-capability card it answers. That card
lists properties the agent HAS — unfalsifiable, and a specification for a *bigger* agent.
Aaron's is a **change in the world**: each execution must lower the intelligence required for
the next execution of the same task. That can be measured, and it can fail.

It also **inverts the incentive**: a capability-defined superagent is rewarded for being
necessary; a ratchet-defined one is rewarded for making itself unnecessary.

**"Honest" cuts both ways**, which is what stops it being a cost-cutting slogan —
over-claiming the floor (routing down to something that fails), under-claiming it (hoarding
the task to stay necessary), moving the bar instead of the floor, and claiming a reduction
with no artifact are all dishonest routing.

## The mechanism is already here

A check, a CLI verb, a written measurement, a named refusal, a `LIFTS WHEN` — each removes
something the next run would have had to do. The definition supplies the **scoreboard** those
five have been missing: they are one act, not five habits.

## Open

`floor(task)` is not directly observable — you learn it by trying a cheaper agent, which costs
a run per measurement. So the meter is `toy` until something measures a real floor twice.

