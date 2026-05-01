---
name: Buddy spin-up requires explicit role-binding (substrate doesn't carve out tick-runner vs buddy)
description: Aaron 2026-05-01 — when spawning a buddy agent (Agent tool, fresh subagent), the prompt MUST state role + write-permissions explicitly. Substrate alone doesn't disambiguate "tick-runner" (closes ticks, writes tick-history, commits, pushes) from "ad-hoc buddy" (read-only research, reports back). Without explicit role-binding, a cold-start agent following CLAUDE.md + AUTONOMOUS-LOOP.md tick-close discipline will collide with the running tick-runner on tick-history files, branch namespace, persona attribution, and main-push race.
type: feedback
---

# Buddy spin-up requires explicit role-binding

**Trigger:** Aaron 2026-05-01 dispatched a cold-start substrate
validation test, then asked: *"so does a new buddy agent do
the right thing? can you even test now that you have files
you write?"* — followed by *"wont he write to the tick
timestamp file or whattever same one you do?"*

**Why:** the substrate I've been writing in this session
(CLAUDE.md, AUTONOMOUS-LOOP.md, memory files) implicitly
assumes a single tick-runner. Specifically:

- `CLAUDE.md` *Tick must never stop* bullet says every session
  re-arms the loop and follows the six-step tick-close ritual.
- `docs/AUTONOMOUS-LOOP.md` says tick-close requires *append
  tick-history row + CronList + visibility signal*.
- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
  says any directive / decision / packet that matters after
  compaction MUST be converted to durable substrate.
- `memory/feedback_otto_buddy_spin_up_when_waiting_aaron_2026_05_01.md`
  encourages spinning up buddies during waiting periods.

A cold-start agent reading these will (correctly!) try to do
all of them. If two agents do all of them on the same tick:

**The collision modes**

1. **Tick-history file collision** — both write
   `docs/hygiene-history/ticks/2026/05/01/<HHMM>Z.md`. If same
   minute → file conflict on push. Different minute → distinct
   files but no coordination on coverage.
2. **Branch namespace collision** —
   `hygiene/tick-history-<HHMM>Z-2026-05-01` collides on same
   minute.
3. **Persona attribution collision** — both commit as
   `opus-4-7 / autonomous-loop tick`; the named-author field
   on commit / PR doesn't disambiguate which agent did which.
4. **MEMORY.md / docs/BACKLOG.md merge race** — two agents
   appending the same index file produce classic merge
   conflicts, or — under squash-merge — last-write-wins data
   loss.
5. **Main-push race** — if both auto-merge-arm in the same
   minute, GitHub serializes the host operation but the
   *content* race (whose changes survive review-loop
   contention) is unresolved.

**What works in substrate today (the read-mode win)**

The 2026-05-01 cold-start test (Agent-tool buddy with prompt
*"Tell me the current state of the LFG GitHub PR queue"*)
showed substrate-router-as-inventory works for read-mode:
the buddy reached for `bun tools/github/poll-pr-gate-batch.ts`
without grepping, citing the CLAUDE.md *Refresh world model
via poll-pr-gate-batch.ts* bullet directly. Cold-start
discoverability of canonical tools is calibrated.

**What doesn't work in substrate today (the write-mode gap)**

The same buddy, given a write-mode prompt without role
context, would (correctly per substrate) close-its-tick the
same way the running tick-runner does. The substrate doesn't
have a *"if you're a buddy, NOT a tick-runner, do these
things and skip those things"* carve-out.

**How to apply (immediate mitigation, until claim-schema lands)**

Every `Agent` tool dispatch MUST prefix the prompt with role
+ write-permissions explicitly. Three role classes:

- **read-only research buddy**: *"You are a one-shot research
  buddy. Do NOT write tick-history. Do NOT commit. Do NOT
  push. Do NOT create branches. Report back in <N> words."*
- **scoped-write helper**: *"You are a scoped helper for
  task <X>. You MAY write to <specific-paths>. You MUST NOT
  touch tick-history, MEMORY.md, or main directly. Open a
  PR against the <branch-prefix>/* namespace."*
- **delegated tick-runner** (rare): *"You are taking over
  tick-running for cron <id>. The previous tick-runner has
  released the claim at <timestamp>. Resume the standard
  AUTONOMOUS-LOOP.md tick-close ritual."* — should not be
  used until the claim-schema is built.

**The known fix (queued, not built)**

The agent-orchestra task cluster covers this:

- Task #327 — `agent-orchestra: claim schema + active-claim
  board (Layer 2)` — the missing coordination primitive.
- Task #335 — `agent-orchestra: actor identity binding
  (registry + signed commits + AgencySignature v2)` — the
  attribution disambiguator.
- Task #337 — `agent-orchestra: harness pre-action freshness
  check + multi-actor collision resolution` — the runtime
  enforcement.

When those land, role-binding becomes structural rather than
prompt-discipline. Until then, the prompt-prefix is the
only mitigation.

**Test calibration: how to know this rule held**

Before each `Agent` tool dispatch, check that the prompt
contains an explicit role declaration AND an explicit
write-permission scope. If either is missing, the dispatch
is unsigned — fix the prompt before sending.

**Composes with**

- `memory/feedback_otto_buddy_spin_up_when_waiting_aaron_2026_05_01.md`
  — when to spin up buddies; this rule is HOW.
- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
  — substrate-discipline is what creates the collision
  pressure in the first place.
- Tasks #327 / #335 / #337 — the structural fix queue.
