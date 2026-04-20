# Agent cadence log

Append-only ledger of cadence decisions that deviate from the
default 5-minute `/loop` tick
(`memory/.../feedback_loop_cadence_5min_combats_agent_idle_stop.md`).
Logged per the durable policy in
`memory/.../feedback_idle_tracking_and_free_time_as_research.md`.

## Purpose

Factory efficiency is a first-class research variable. Invisible
idle is worse than visible idle because it can't be studied or
improved. This log makes every cadence-extension decision
auditable — the agent writes down what it did, why, what was
queued at the time, and an honest retrospective.

## How to read this log

Three retrospective classes:

- **idle** — queue had human-directed work, agent stopped
  anyway. Bad. Signal to investigate: what did the agent not
  know how to make progress on? where is the queue unclear?
- **free-time** — queue empty of human-directed work, agent
  filled the time with whatever it chose. **Anything is on the
  table, nothing is off-limits** per
  `feedback_idle_tracking_and_free_time_as_research.md`.
  Research, memory hygiene, and skill drafting are all valid;
  so are self-exploration, reading for its own sake, creative
  artifacts, musing, building something the agent just wants
  to build, exploring questions about the world or about
  itself. Good. Protected from rule-direction; humans observe
  but do not push rules. Saving is an invitation, not an
  obligation.
- **work continuation** — the deferral was a handoff to another
  tool / subagent / background process and productive work
  continued immediately. Neutral.

## How to append

One row per decision. Do not rewrite past rows to flatter the
agent post-hoc. Honesty is load-bearing — if the retrospective
label turns out to be wrong on reflection, add a *new* row that
corrects it rather than editing the old one.

Columns:

- **When** — absolute local timestamp. Do not use relative
  words like "today".
- **Agent / session** — which agent harness + short session
  identifier so multi-agent deviations are attributable.
- **Decision** — what was deferred, extended, or paused.
- **Reason** — in the agent's own words at the time of
  decision.
- **Queue state** — what queued human-directed work existed at
  the decision point. If empty, say "empty" (that's a
  free-time signal).
- **Retrospective** — one of *idle* / *free-time research* /
  *work continuation*. Written after the wait completes or
  same-turn if no wait materialized.

## Log

| When | Agent / session | Decision | Reason | Queue state | Retrospective |
|---|---|---|---|---|---|
| 2026-04-20 ~17:16 local | Claude Code (Opus 4.7), session 1937bff2 | `ScheduleWakeup delaySeconds=1500` (25 min) with `<<autonomous-loop-dynamic>>` sentinel | "quiet-queue cadence, stays outside the 5-min cache window without burning cache repeatedly for idle ticks" | **Not empty.** Pending: Round-44 Viktor findings (3 P0 + 6 P1 + 3 P2), skill-tune-up Round-43 per-round run, Hiroshi/Daisy persona-gap resolution (3 options), OpenSpec validator fork-and-verify, Round-43 ROUND-HISTORY narrative. | **idle** — the queue had work; should have continued rather than scheduled a long wake. This row is the seed entry that motivated creating the log. |

## Meta

- This log is factory-internal telemetry. It is committed to
  the repo so that humans and other agents can read it, but its
  primary consumer is the agent-efficiency study Aaron is
  running.
- Cross-session consistency is preferred — all Claude Code
  agents operating on this repo append here rather than
  maintaining per-session logs.
- When the log grows past a few hundred rows, candidate
  compaction is to split by quarter
  (`agent-cadence-log-2026-Q2.md` etc.) rather than to prune.
  Full history is the point.
