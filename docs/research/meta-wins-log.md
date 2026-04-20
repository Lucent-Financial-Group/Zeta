# Meta-wins log

Append-only ledger of **meta-wins** — moments when the
never-idle *meta-check* (step 2 of
`feedback_never_idle_speculative_work_over_waiting.md`)
fires and a structural factory change is made *instead of*
speculative fill, converting would-be-speculative work into
directed / cadenced / obvious work for the next round.

## Why track these separately

Aaron (2026-04-20): *"i love meta-wins, i almost want to
track those seperatly i love to say metametameta when that
happens real fast meta-check"*.

Related: *"meta congnition and probblem solving is my favory
thing to think abou"* — meta-wins are the observable artifact
of the factory doing meta-cognition on itself. Tracking them
separately from the cadence log lets us study the
*rate, depth, and compounding* of factory self-improvement as
a first-class research variable — distinct from the
idle/free-time/work-continuation retrospective in
`agent-cadence-log.md`.

## The meta-win concept

A meta-win is the positive artifact of the following loop:

1. Agent is about to go idle (queue looks empty).
2. Never-idle policy activates → prepare speculative work.
3. **Meta-check fires:** *is there a factory change that
   would have made this speculative work directed / obvious
   / queued?*
4. **Yes:** make the structural change. The speculative
   work becomes cadenced next round. **Meta-win logged.**
5. **No:** proceed with speculative work (no meta-win).

The structural change is *strictly stronger* than filling
idle because it reduces the rate at which idle-decisions
arise — factory-debugging, not first-aid.

## Meta-depth — "metametameta"

A meta-win has **depth N** = the number of nested meta-checks
that fired in the same tick. Aaron explicitly enjoys this
stacking pattern.

- **Depth 1** (meta-win): structural change addresses the
  specific speculative surface.
- **Depth 2** (meta-meta): the structural-change *itself*
  triggered another meta-check — e.g., "while adding the
  BACKLOG item, I noticed the ranking-skill should have
  surfaced this class of gap; let me extend the ranker too."
- **Depth 3+** (metametameta): compounds further — "while
  extending the ranker, I noticed the tune-up cadence itself
  should be rerouted to pull from this data." Each level is
  a further unfold of the factory-debug loop within a single
  tick.

Depth is self-reported honestly. Claiming depth 3 when only
depth 1 happened pollutes the signal. Do not pad.

## How to append

One row per meta-win. Same honesty discipline as the cadence
log — do not rewrite history; correct via a new row if the
retrospective label changes.

Columns:

- **When** — absolute local timestamp (no "today").
- **Agent / session** — harness + short session id.
- **Speculative surface** — the work the agent was about to
  pick up as idle-fill.
- **Structural fix** — what was done to the factory instead.
- **Depth** — 1 / 2 / 3 / ... (meta / metameta / ...).
- **Next-round effect** — concrete expected conversion:
  "Round N speculative X is now directed Y."
- **Retrospective** — one of *clean meta-win* / *partial
  meta-win* / *false meta-win*.
  - **clean meta-win** — structural fix landed, speculative
    work is now directed next round, no regret.
  - **partial meta-win** — fix landed but still requires
    follow-up to close the loop.
  - **false meta-win** — on reflection, the "structural
    change" was actually just a longer way of doing the
    speculative work without a real structural delta. Log
    honestly; false meta-wins are a teaching signal.

## Log

| When | Agent / session | Speculative surface | Structural fix | Depth | Next-round effect | Retrospective |
|---|---|---|---|---|---|---|
| 2026-04-20 ~round-44 open | Claude Code (Opus 4.7), session 1937bff2 | Would have authored the Playwright skill-group as speculative factory-fill this tick. | Added two P1 rows to `docs/BACKLOG.md`: (a) Playwright skill-group authoring (Round 44 absorb), (b) factory-wide tech-coverage audit. Captured Matrix-mode policy durably in `feedback_new_tech_triggers_skill_gap_closure.md`. | 2 | Round 44 skill-tune-up: "Playwright skill-group" becomes a directed P1 item, not a speculative idle-fill pick. Factory-wide audit becomes a cadenced obligation, not a one-off. The 9th skill-tune-up ranking criterion (tech-coverage drift) is queued. | **clean meta-win** — structural change landed; speculative-work → directed-work conversion verified by BACKLOG state. Depth-2 because the "add to BACKLOG" meta-check itself triggered the second-order meta-check "this class of gap should be a cadenced ranker criterion." |

## Meta

- This log is factory-internal telemetry, same reader set as
  `agent-cadence-log.md`.
- Expected rate: meta-wins should increase early (factory
  has many shape-bugs to debug) and asymptote as the
  factory matures. Persistent zero-meta-win streaks =
  either (a) the factory is fully-debugged (unlikely pre-v1)
  or (b) the agent stopped running the meta-check (factory
  regression).
- Compounding goal: depth ≥ 2 rows should become more
  common over time — they are evidence the agent is
  noticing second-order factory shape-bugs while fixing
  first-order ones.
- Cross-reference from
  `feedback_never_idle_speculative_work_over_waiting.md`
  step (2) makes this log the audit-trail of the
  meta-check policy.
