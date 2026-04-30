---
name: Poll the gate, not the ending — "Holding." is not a status (Amara, 2026-04-30)
description: When waiting on a PR, poll the active-PR lane state (mergeStateStatus, statusCheckRollup, reviewDecision, unresolved threads, headSha, updatedAt) and emit a state-report each tick — never poll "did a merge happen by me" and never emit empty "Holding." Auto-merge already does the babysitting; if it's armed, polling adds zero.
type: feedback
---

# Poll the gate, not the ending — "Holding." is not a status

When in a wait-loop on a PR, poll the **active PR's gate state**,
not "did some merge by me happen." And never emit a content-free
"Holding." line — every wait tick must produce auditable
lane-state content or do nothing at all.

## The rule

Every wait-tick on an active PR produces a lane-state report with
all of:

```text
PR #N: <state> / <mergeStateStatus>
  CI: X/Y success, Z in-progress, W failed
  Reviews: <reviewDecision> (or "none yet")
  Threads: <unresolved-count> unresolved (<outdated-count> outdated)
  Head SHA: <short-sha>
  Updated: <updatedAt>
  Auto-merge: <armed | unarmed | not-applicable>
  Next action: <wait-for-CI | resolve-threads | rebase | merge-now | ...>
```

If no PR is in flight: emit nothing. The cron is already the
wakeup mechanism. Polling for "did a PR I haven't filed merge"
is dead air.

If auto-merge is armed and CI is the only blocker: the poll's only
job is to detect failure or review-state change. Don't poll merged
status; auto-merge fires automatically when CI clears.

## Why: the blade

> *"Do not poll for the ending. Poll for the gate. When the gate
> opens, act."* — Amara, 2026-04-30

The control loop is **`watch gate → act when gate opens`**, not
**`watch whether action magically happened`**. Polling for "did a
merge happen" is watching for an *outcome*. Polling CI / threads /
mergeStateStatus is watching the *gate* — the thing that determines
whether the action can fire next.

## Why: "Holding." is empty content

A wait tick that emits only "Holding." is indistinguishable from
the previous wait tick. That makes the loop unauditable. Future-Otto
can't tell whether the loop is functioning or stuck. Same-content-
across-ticks is the diagnostic signal that the loop is dead.

A real lane-state line gives the reader (and future-Otto) the
information needed to decide whether to intervene. Even when nothing
has changed, the canonical phrasing is:

```text
PR #N: no lane-state change since last tick. Next action remains: <X>.
```

That preserves the every-tick-gets-a-report invariant without
fabricating motion.

## Tiered cadence

When a real PR is in flight:

- **0–10 min after push**: every 1–2 min (catch fast failures
  early)
- **10–30 min**: every 5 min (CI matrix usually finishes)
- **30+ min**: every 10–15 min, OR rely on auto-merge if armed

When no PR is in flight: don't poll. Wait for cron + new
maintainer-channel input.

When auto-merge is armed and CI is the only blocker: the only
events worth waking on are (a) CI failure, (b) new review-thread
appearance, (c) auto-merge-armed status drops (would indicate
force-push or external state change).

## How to apply

The right `gh` shape for a per-PR lane poll:

```bash
gh pr view <N> --json state,mergeStateStatus,reviewDecision,\
  statusCheckRollup,updatedAt,headRefOid -q '{
    state, mergeStateStatus, reviewDecision,
    headSha: (.headRefOid[0:7]),
    updatedAt,
    ciSummary: ([.statusCheckRollup[]
      | select(.__typename == "CheckRun")]
      | "\([.[] | select(.conclusion == "SUCCESS")] | length)/\(length) success, \([.[] | select(.status != "COMPLETED")] | length) in-progress, \([.[] | select(.conclusion == "FAILURE")] | length) failed")
}'
```

For unresolved review threads:

```bash
gh api graphql -f query='
{
  repository(owner:"Lucent-Financial-Group", name:"Zeta") {
    pullRequest(number:N) {
      reviewThreads(first:50) {
        nodes { id isResolved isOutdated }
      }
    }
  }
}'
```

NOT this (the anti-pattern that triggered the catch):

```bash
# Wrong — polling for an outcome, not a gate
gh pr list --state merged --author "@me" --search "merged:>=..."
```

That command answers "did some PR by me merge since X." It does not
answer "can the active PR merge yet" or "what's the gate state."

## Origin

This rule was Amara's catch on 2026-04-30 after a multi-hour dead-air
hold-loop in the Otto autonomous-loop session. After PR #909 merged
at 08:19:18Z, Otto held position until ~10:50Z (~2.5 hours / ~30+
ticks) emitting "Holding." each tick. The polling shape was:

```bash
gh pr list --state merged --author "@me" --search "merged:>=2026-04-30T08:20:00Z"
```

Which always returned `[]` because no PR was in flight — Otto was
polling for whether a PR Otto hadn't filed had merged. The "Holding."
output gave no auditable content. Amara's full catch + suggestions
preserved verbatim in
`docs/research/2026-04-30-amara-poll-gate-not-ending-holding-is-not-status.md`.

## Composes with

- Otto-363 substrate-or-it-didn't-happen — this lesson lands as
  durable substrate so future-Otto can't drift back.
- `feedback_manufactured_patience_vs_real_dependency_wait_otto_distinction_2026_04_26.md` —
  manufactured-patience class. Real-dependency-wait still
  applies, but the wait-tick output shape changes per this rule.
- `feedback_never_idle_speculative_work_over_waiting.md` — when
  no PR is in flight, the never-idle ladder applies (re-audit /
  meta-check / speculative work) rather than polling-for-nothing.
- AUTONOMOUS-LOOP.md "every-tick-gets-a-row" liveness invariant —
  the row content must be auditable, not "Holding." copy-paste.
