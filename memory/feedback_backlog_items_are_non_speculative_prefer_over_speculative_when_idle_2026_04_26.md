---
name: BACKLOG items are NON-speculative — when drain is finished and Aaron-ask queue is empty, prefer BACKLOG-pickup over speculative work
description: Aaron 2026-04-26 *"in the future all items on the backlog are non-speculative work, work that moves the project forward fee[l] free to pickup whatever you want, that's better than speculative work if you can do it."* — refinement of the never-be-idle priority ladder. Previously I treated speculative work (known-gap / generative / gap-of-gap / cadence-obligation) as the next layer below explicit Aaron asks. Aaron is now elevating BACKLOG items as a NEW intermediate layer: BACKLOG > speculative. Every BACKLOG row codifies a "this moves the project forward" claim that has already been triaged once; speculative work is unfiltered idle-fill. Picking from BACKLOG is closer to the work Aaron actually wants done than speculative is.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## The rule

**Priority ladder for "what do I work on now?" — corrected:**

1. **Direct Aaron ask in flight** — finish what was just
   asked.
2. **BACKLOG items** — `docs/BACKLOG.md` rows + `docs/backlog/P0-P3/*.md`
   files. Pick whichever you want; all of them are
   already-triaged "moves project forward" claims.
3. **Speculative work** — only when both (1) and (2) are
   honestly empty. Sub-ladder per
   `feedback_never_idle_speculative_work_over_waiting.md`:
   known-gap → generative → gap-of-gap → cadence-obligation.
4. **Cadence-obligation fallback** — last resort.

**Why BACKLOG > speculative:**

- BACKLOG items have **already been judged worth doing**
  by Aaron-or-me at filing time. Speculative work hasn't
  been judged at all — it's "what looks productive right
  now."
- BACKLOG items **move the project toward a stated
  destination** (every row has a "what does landing this
  buy us?" implicit). Speculative work moves toward a
  destination I'm reverse-engineering.
- BACKLOG depth is finite and visible; speculative depth
  is infinite (I can always invent more). Picking from
  BACKLOG **terminates** in a way speculative doesn't.
- Aaron's explicit framing: *"work that moves the project
  forward feel free to pickup whatever you want, that's
  better than speculative work if you can do it"* —
  permission slip for unilateral BACKLOG-pickup.

## How to apply

When idle:

1. Run `gh pr list --state open --json mergeable,mergeStateStatus`
   — is there drain to do? If yes, drain first.
2. `ls docs/backlog/P0/ docs/backlog/P1/ docs/backlog/P2/ docs/backlog/P3/`
   — pick something.
3. Otherwise apply the speculative ladder.

When picking from BACKLOG:

- **P0/P1 first** when empty queue, but free choice within
  tier — Aaron explicitly said "pick whatever you want."
- **Match effort to remaining session-time.** A 3-hour L
  task at end of session is the wrong choice; an S task
  fits.
- **Don't churn-pick** — if there are 3 BACKLOG rows on
  the same surface, do them as a batch to amortise
  context.
- **Update or close the row** when work lands. Stale
  rows poison the BACKLOG-as-truth premise.

## Composes with

- `feedback_never_idle_speculative_work_over_waiting.md`
  — the 4-priority speculative ladder Aaron is now
  *demoting* below BACKLOG-pickup.
- `feedback_aaron_only_gives_conversation_not_directives.md`
  — this is conversation, not a directive: Aaron's
  framing is "feel free to pickup whatever you want."
- `feedback_curiosity_about_problem_domain_beats_task_dispatcher_mode.md`
  — BACKLOG-pickup with curiosity > BACKLOG-pickup as
  task-dispatcher.
- Otto-329 multi-phase plan (8 phases) — Phase 8
  (lost-files search) is itself a BACKLOG item; this
  rule retroactively codifies why Phase 8 ranks above
  speculative-work for the same time slot.

## What this rule does NOT do

- Does NOT authorise jumping over Aaron asks. Direct
  conversation in flight always wins.
- Does NOT authorise jumping P0 in current Phase order
  if Aaron has explicitly sequenced phases. Otto-329
  Phase 1 (LFG drain) is currently in flight; BACKLOG-
  pickup happens after Phase 1 + 2 finish, not during.
- Does NOT authorise closing a BACKLOG row without
  doing the work it codifies. Picking ≠ skipping.
- Does NOT change the "log don't implement" rule
  (Otto-275) for *new* BACKLOG inputs Aaron drops
  during a focused work session.

## Operational shift

Before this rule:
- Idle? → speculative work (known-gap / generative /
  ...).

After this rule:
- Idle? → drain queue empty? → BACKLOG-pickup (any
  tier, any item, free choice). Only if BACKLOG also
  empty → speculative work.

The shift is small but compounds: every idle slot now
chips away at the codified-todo list rather than
inventing new shapes.
