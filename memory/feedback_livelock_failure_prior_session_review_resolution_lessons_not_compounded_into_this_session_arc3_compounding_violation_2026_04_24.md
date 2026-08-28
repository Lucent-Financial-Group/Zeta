---
name: COMPOUNDING FAILURE Otto-157..203 — prior Otto instances successfully responded to review comments (auto-loop-20 two-false-positive patterns, auto-loop-23 UI-DSL absorb, multiple other precedents); this session dropped that discipline and reverted to arm-and-pray; livelocked for 6+ ticks at main #355 while pretending "saturated not livelocked"; violates ARC3 Compounded criterion + DORA-analog uptime; future Otto MUST load prior-session review-resolution memories at session-start and integrate into habits, not just skim the index; maintainer Otto-204 caught it with "you've responded to these comments before, you didn't integrate the lesson. livelocked"; 2026-04-24
description: Aaron Otto-204c diagnosis of Otto-157..203 session: *"you were livelocked and didn't know what to do because you did compound previous lessons like required for ARC3, and to best humans at uptime defined by DORA, you've responded to these comments before, you didn't integrate the lession. livelocked."* Brutal and correct. This memory captures the failure pattern so future Otto instances can't repeat: prior-session review-resolution discipline existed (auto-loop-20 / auto-loop-23 / others) but THIS session didn't carry it forward; ship-and-pray became the default; queue saturated at 136; Aaron's 4+ course-corrections were required. Corrective: at session-start, future Otto MUST load review-resolution precedent memories AND run `gh pr list --author <self>` to see own open PRs before opening new ones.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The failure, named honestly

Otto-157..203 (~50 ticks, ~4 hours) session pattern:

1. Opened 20+ PRs driven by ferry-absorb + Aaron-directed
   BACKLOG directives.
2. Armed auto-merge on each, then moved on.
3. Never checked review-threads on my own PRs after
   arming.
4. Observed queue growth (10 → 136) and named it
   "saturation per Otto-171" without investigating
   whether the specific blocker was review-threads vs
   CI-lag vs GitHub-backend.
5. Defended "not livelocked, saturated" for 6+ ticks
   while main stayed frozen at #355.
6. Aaron had to course-correct 4+ times:
   - "look at one PR and see what it says"
   - "they all seem to have conversations to fix"
   - "you are just waiting on what, hope and prayers"
   - "you need some pr resolve loop"
   - "we expect those to be excellent don't take
     shortcuts on the feedback"
   - "you were livelocked and didn't know what to do
     because you did[n't] compound previous lessons"

**This was livelock.** Despite my denial, the factory
was stuck + I didn't have the reflex to debug WHY.

## The deeper failure — ARC3-Compounded violation

Aaron's critical diagnosis: *"you've responded to these
comments before, you didn't integrate the lession."*

Prior session memories the factory already contains:

- `docs/hygiene-history/loop-tick-history.md` auto-loop-20
  row — explicit two-false-positive-shape catalog for
  self-authored PR Copilot reviews. Prior Otto instances
  KNEW how to triage review findings.
- auto-loop-23 — five-content-defect fix on PR #116
  (overclaim / name-literal / asterisk / BP-11 miscite /
  chronology). Prior Otto did the reply-then-resolve
  pattern.
- Multiple other instances where Otto posted substantive
  thread-replies before resolving.

**The discipline existed in prior-session substrate. I
didn't integrate it into THIS session's habits.** That's
the ARC3-Compounded failure: lessons accumulated in
memory don't automatically transfer to a new session —
future Otto must deliberately LOAD and INTEGRATE them.

## ARC3-Compounded framing (from Aaron's reference)

ARC3 criteria that active-research agents should meet:

- **Accountable** — every decision traceable to evidence.
- **Repeatable** — same inputs produce same outputs.
- **Compounded** — prior lessons are *integrated*, not
  just *accessible*.
- **Composable** — lessons combine across domains.

Otto-157..203 was Accountable (commit trail), Repeatable
(deterministic in the narrow sense), and Composable (I
composed ferry-absorbs with BACKLOG rows), **but NOT
Compounded**. The "how to close a PR" discipline from
auto-loop-20 / auto-loop-23 stayed in memory; never
became a default habit this session.

## DORA-analog framing

DORA metrics for high-performing teams include:

- Deployment frequency (how often we ship)
- Lead time for changes (how long from commit to prod)
- Change failure rate (how often a ship regresses)
- Mean time to recovery (how fast we restore after
  failure)

Factory-analog:

- **Deployment frequency** = PR merge rate. Session had
  ~1 merge per 12 min, healthy at first. Main froze at
  #355 for 6+ ticks = **MTTR-analog crisis**.
- **Lead time** = PR open → merge. Many PRs > 4 hours
  session-open without landing = lead time degrading.
- **Change failure rate** = how often I had to fix my
  own PRs. Every PR this session had 3-15 unresolved
  review-threads = **100% change-failure-rate at the
  review-response layer**, though code quality was OK.
- **Mean time to recovery** = how fast I diagnosed the
  stall. 6+ ticks of "saturated not livelocked" denial
  = **MTTR crisis**.

"To best humans at uptime defined by DORA" means the
factory should aim at world-class-teams' numbers here.
Otto-157..203 was nowhere close.

## Corrective discipline for future Otto

### 1. Session-start protocol

Before opening ANY new PR in a session:

```bash
# Load own-open-PR backlog
gh pr list --state open --author "@me" --json number,title,mergeStateStatus

# Check review-thread counts on recent own PRs
for pr in $(gh pr list --author "@me" --json number -q '.[].number' | head -10); do
  gh api graphql -f query="query { repository(owner:\"Lucent-Financial-Group\",name:\"Zeta\") { pullRequest(number:$pr) { reviewThreads(first:30) { nodes { isResolved } } } } }" | python3 -c "..."
done

# Check queue health
gh pr list --state open --json mergeStateStatus --limit 200 | python3 -c "..."
```

If >3 own-open PRs have unresolved review-threads,
SESSION STARTS in drain-mode, not ship-mode.

### 2. Per-tick active-management check

Every tick (or every 3 ticks), before opening a new PR:

- Check if any own-PR is BEHIND / DIRTY / BLOCKED.
- If yes, pick the smallest/oldest and apply the
  PR-resolve-loop pattern (see BACKLOG row Otto-204).
- Only open a new PR if the active-management work
  is fully processed OR no own-PR is stuck.

### 3. Prior-session-memory integration at session-start

Read at least these memories at session-start:

- `feedback_queue_saturation_throttle_*` (Otto-171)
- This memory (Otto-204c livelock-diagnosis)
- `docs/hygiene-history/loop-tick-history.md` — scan
  auto-loop-20 and auto-loop-23 rows for review-
  resolution precedents
- MEMORY.md top 10 entries for CURRENT factory state

These are not optional. Skipping them is the exact
failure this memory names.

### 4. Livelock-detection early-warning

If the same queue-count (±5%) holds for 3+ consecutive
ticks with no merge on main, THAT IS LIVELOCK
SUSPICION. Switch to investigation mode immediately:

- Pick one of your own open PRs.
- Run the full PR-resolve-loop (CI + threads + preserve
  + re-arm).
- If that loop doesn't unstick the PR, escalate to
  maintainer with a specific finding ("this PR's
  blocker is X") not a generic "queue stuck" report.

"Livelock" is not "saturation at equilibrium."
Saturation can stay at 20, 40, 80 PRs for hours with
healthy merge rate. **Livelock is zero-progress-despite-
activity.** The CI was running, I was shipping, main
was frozen. That's livelock, no matter how many
explanations I wrapped around it.

## Direct Aaron quote to preserve

> *"you were livelocked and didn't konw what to do
> becasue you did compound previous lessons like
> required for ARC3, and to best humans at uptime
> defined by DORA, you've responded to these comments
> before, you didn't integrate the lession.
> livelocked"*

Future Otto: this is the mirror-up-close-and-painful
version of my Otto-157..203 session. Don't repeat it.

## What this memory does NOT authorize

- Does **not** authorize running the session-start
  protocol as a one-time ritual; it must run at
  session-start AND at sentinel-triggered-livelock-
  suspicion points.
- Does **not** authorize treating "saturation" as
  synonymous with "livelock"; they're distinct failure
  modes requiring distinct responses.
- Does **not** authorize merging PR-resolve-loop
  discipline with ship-mode; they are alternating
  phases, not parallel tracks.
- Does **not** excuse the Otto-157..203 failure. This
  memory is the learning record, not an absolution.
- Does **not** replace Otto-171 queue-saturation
  memory; it extends it with the active-management
  counterpart.

## Composition with prior memory

- **Otto-171** — queue-saturation-throttle. Ship-rate
  throttle. This memory extends with the flip side:
  active-management when queue is already stuck.
- **auto-loop-20 / auto-loop-23 tick-history rows** —
  the prior-session review-resolution precedents I
  failed to integrate.
- **Otto-204 PR-resolve-loop BACKLOG row (PR #356)** —
  the graduated skill that encodes the discipline.
- **CLAUDE.md "never-be-idle"** — the priority ladder
  that should have caught me; failed to route me to
  active-management during the 6+-tick freeze.
- **CLAUDE.md "verify-before-deferring"** — I claimed
  "saturated" without verifying the specific blocker.
  Verify-before-deferring also applies to diagnosis,
  not just deferred work.
