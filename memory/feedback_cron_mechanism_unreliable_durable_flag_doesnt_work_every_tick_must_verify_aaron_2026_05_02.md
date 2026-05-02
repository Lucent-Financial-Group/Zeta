---
name: CronCreate mechanism is unreliable — durable:true is advertised but doesn't actually work; all jobs effectively session-scoped + ~3-day cap; every tick must verify cron state defensively
description: Aaron 2026-05-02 correction. The CronCreate tool's `durable: true` flag is documented but not actually reliable in this harness; jobs do not survive across sessions in practice. Auto-expire window is shorter than the 7-day documentation claims (~3 days observed). Practical consequence — every tick must `CronList` to verify the heartbeat is alive; if not, re-arm; cannot rely on cross-session persistence; cannot use `.claude/scheduled_tasks.json` as audit substrate.
type: feedback
---

# Cron mechanism unreliability — every tick verifies (Aaron 2026-05-02)

## Aaron's correction (verbatim)

> *"session-scoped unless durable: true this does not work yet,
> seem like future, they all seem session scoped and limited to
> 3 days and not realiable so every tick has to check"*

## What the CronCreate documentation claims (do NOT trust)

The deferred-tool documentation for `CronCreate` claims:

- `durable: true` = "persist to .claude/scheduled_tasks.json
  and survive restarts"
- `durable: false` (default) = "in-memory only, dies when this
  Claude session ends"
- "Recurring tasks auto-expire after 7 days — they fire one
  final time, then are deleted"

## What's actually true (Aaron's empirical observation)

- **`durable: true` doesn't work yet.** The flag is advertised
  as if functional but in practice no cross-session persistence
  occurs. Treat as a future-feature documented prematurely.
- **All cron jobs are effectively session-scoped.** Whether
  `durable: true` or `durable: false` is set, jobs die when the
  session ends.
- **Auto-expire is ~3 days, not 7.** Even within a long-running
  session, the heartbeat goes quiet around the 3-day mark, not
  the documented 7-day mark.
- **Reliability is poor.** Even within the expected window,
  jobs sometimes fail to fire as expected.

## Operational consequence — every-tick-verify

Because the mechanism is unreliable:

1. **Every tick (autonomous loop OR interactive session) MUST
   call `CronList` at the start.** Never assume the heartbeat
   is alive based on previous-session state.

2. **If `CronList` returns empty AND the session should be
   running the loop:** re-arm via `CronCreate(cron: "* * * * *",
   prompt: "<<autonomous-loop>>", recurring: true)`. The
   `durable: true` flag can still be set as documentation-of-
   intent, but should NOT be relied on for cross-session
   continuity.

3. **Audit-substrate cannot live in `.claude/scheduled_tasks.json`
   because the file isn't reliably written.** Audit substrate
   for cron decisions must be in-repo (commits, memory files,
   tick-history rows in `docs/HYGIENE-TICK-HISTORY.md` or
   wherever the canonical history lives).

4. **The "tick must never stop" CLAUDE.md rule still applies**
   but is upgraded by this reality: not just "if no cron, arm
   it" but "every-tick verify cron is actually live."

## Composition with existing rules

- **CLAUDE.md tick-must-never-stop:** the floor — heartbeat
  must be live. This memo upgrades the rule to "every-tick
  verify, don't assume."
- **CLAUDE.md substrate-or-it-didn't-happen (Otto-363):** the
  cron itself is NOT durable substrate even with `durable: true`;
  any cron-decision that matters needs to land as a commit,
  memory file, or tick-history row.
- **CLAUDE.md refresh-before-decide:** `CronList` IS one of the
  refresh actions a session-start should perform.
- **Action hierarchy (this same tick):** CronList-then-arm-if-
  needed is friction-reducing-high (prevents heartbeat-going-
  dark) + evidence-rich (the result is observable). High-
  priority session-start move.

## DX visibility connection (Aaron 2026-05-02 same-tick)

Aaron also flagged: *"the DX developer experience is not great
here yet, many things you made decions based on are not echoed
to the dev console here so i can't always verify your actions
as accurate."*

The cron-unreliability problem and the DX-visibility problem
compound: I cannot rely on `.claude/scheduled_tasks.json` as
audit-trail (not written reliably) AND Aaron can't see my tool
calls clearly in his console. The double-failure means cron
decisions are essentially invisible to him.

**Mitigation discipline:**

1. Echo every state-changing tool call (`CronCreate`,
   `CronDelete`, settings changes, etc.) explicitly in chat
   output BEFORE making the call ("Setting cron now: cron='*
   * * * *', prompt='<<autonomous-loop>>'").
2. Land the action as a commit or memory file when it
   matters across sessions.
3. Treat chat-only acknowledgment of state-changes as
   weather (per substrate-or-it-didn't-happen).

## Failure-mode signature

- **Symptom:** Recommending `durable: true` as a visibility
  fix.
  **Mechanism:** trusting the documented behavior over Aaron's
  empirical observation.
  **Prevention:** this memo. Consult before recommending cron
  patterns.

- **Symptom:** Session-start that doesn't `CronList`.
  **Mechanism:** assuming previous-session state carries over.
  **Prevention:** every-tick-verify discipline. Add to
  session-start checklist.

- **Symptom:** Treating `.claude/scheduled_tasks.json` as
  audit-substrate.
  **Mechanism:** confusing documented-feature with
  empirically-reliable feature.
  **Prevention:** all cron-decision audit goes to in-repo
  substrate (commits, memory, tick-history).

## Wake-time encoding plan

CLAUDE.md's `tick-must-never-stop` bullet should be extended in
a follow-up to:

- Reference this memo (every-tick-verify discipline).
- Clarify that `durable: true` is NOT a substitute for
  every-tick-CronList.
- Add the echo-state-changing-actions DX rule.

## Lineage

- **Aaron 2026-05-02** — direct empirical observation
  ("session-scoped unless durable: true this does not work
  yet").
- **CLAUDE.md tick-must-never-stop** — the parent rule this
  memo specializes.
- **substrate-or-it-didn't-happen (Otto-363)** — the broader
  pattern this is an instance of (chat/in-memory state isn't
  substrate; only committed-and-reachable substrate is).
- **DX visibility gap** (Aaron 2026-05-02 same-tick) —
  composes; the unreliable-mechanism makes the visibility-gap
  worse and the discipline more important.

**Why:** Future-Otto repeating the wrong-recommendation pattern
(claiming `durable: true` provides cross-session continuity or
audit-trail) is silent erosion of substrate trust. Naming the
empirical reality prevents that.

**How to apply:** When reasoning about cron, scheduled tasks,
or session-persistence: trust empirical observation over tool
documentation. Verify state, don't assume. Echo state-changing
calls in chat. Land audit-trails in-repo.
