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
  Next action: <plan, not status — see below>
```

If no PR is in flight: emit nothing. The cron is already the
wakeup mechanism. Polling for "did a PR I haven't filed merge"
is dead air.

If auto-merge is armed and CI is the only blocker: the poll's only
job is to detect failure or review-state change. Don't poll merged
status; auto-merge fires automatically when CI clears.

### Scope clarification (Claude.ai 2026-04-30)

The "don't poll merged PRs" rule applies **during the PR's wait-
for-merge phase**. Polling-for-merge-confirmation is legitimate
**after** auto-merge fires, for downstream cleanup (branch
deletion, dependent-task triggering, drain-log update). The
distinction:

- **During wait phase**: poll the gate (CI / threads / mergeable),
  not the outcome. Otto is part of the loop he'd be observing if
  he polled "did my PR merge" — that's tautology not observation.
- **Post-merge**: poll merged-status as confirmation for cleanup
  steps. The merge has happened; querying confirms downstream
  state. This is real lane progress detection.

Carve-out: a single post-merge confirmation query is fine.
Repeated post-merge queries with no other action are still dead
air.

### Auto-merge pre-flight (Claude.ai 2026-04-30)

Before arming `gh pr merge --auto`, verify all three:

1. All required checks are configured to be merge-blocking
   (otherwise auto-merge fires through gates that should hold).
2. All currently-failing checks are NOT in the required set
   (otherwise auto-merge waits indefinitely on a sticky failure).
3. No unresolved review threads exist (auto-merge respects
   `required_conversation_resolution` if branch protection has
   it; without it, auto-merge fires through unresolved threads).

Convert auto-merge from "set it and forget it" to "armed with
explicit verification of conditions." Same discipline as the
lease-rejection-restarts-the-gate rule.

### "Next action" is a plan, not a status (Claude.ai 2026-04-30)

The "Next action" field carries operational load. Bad form:

```text
Next action: waiting on CI
```

(repeats every tick, conveys no progress info)

Good form:

```text
Next action: merge after `build-and-test (macos-26)` clears
  (currently in_progress; ETA 3-5 min based on prior runs)
```

The plan names the specific remaining gate. If the plan doesn't
change between ticks, the ticks are confirming the plan still
holds. If the plan changes, the change itself is signal worth
noticing.

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

### Cadence resumption on state change (Claude.ai 2026-04-30)

The tiered cadence trades responsiveness for noise reduction.
Without a resumption rule, that trade can quietly bite — a CI
completion at minute 35 gets noticed up to 15 minutes late if
the lane has dropped to 30+ tier.

Resumption rule: **any state change resets the cadence to the
0–10 min tier for the next 10 minutes.** State changes worth
resetting on:

- CI status change (new check completes, fails, or starts)
- review-decision change
- new review-thread appears
- head SHA change (force-push or new commit)
- mergeStateStatus transitions (BEHIND → CLEAN, BLOCKED → CLEAN,
  etc.)

This converts the cadence from monotonically decaying to
event-responsive: when nothing's happening it backs off; when
something happens it re-engages.

## How to apply

The right `gh` shape for a per-PR lane poll. Two correctness
notes baked into the snippet below:

- `statusCheckRollup` returns a union of `CheckRun` and
  `StatusContext` nodes. Filtering to `CheckRun` only can
  under-count required status contexts that are still
  pending or failing — the lane-state summary then reports
  a false-clear gate. The snippet handles both shapes.
- GitHub's `CheckConclusionState` includes blocking
  conclusions beyond plain `FAILURE` —  `CANCELLED`,
  `TIMED_OUT`, `STARTUP_FAILURE`, `ACTION_REQUIRED` all
  count against merge readiness. The snippet treats them
  as failures, not "0 failed."

```bash
gh pr view <N> --json state,mergeStateStatus,reviewDecision,\
  statusCheckRollup,updatedAt,headRefOid -q '
    . as $pr |
    [$pr.statusCheckRollup[]?
      | if .__typename == "CheckRun"
        then {success: (.conclusion == "SUCCESS"),
              failed:  ((.conclusion // "") | IN("FAILURE","CANCELLED","TIMED_OUT","STARTUP_FAILURE","ACTION_REQUIRED")),
              pending: (.status != "COMPLETED")}
        else {success: (.state == "SUCCESS"),
              failed:  ((.state // "") | IN("FAILURE","ERROR")),
              pending: ((.state // "") | IN("PENDING","EXPECTED"))}
        end] as $checks |
    {
      state: $pr.state,
      mergeStateStatus: $pr.mergeStateStatus,
      reviewDecision: $pr.reviewDecision,
      headSha: ($pr.headRefOid[0:7]),
      updatedAt: $pr.updatedAt,
      ciSummary: "\([$checks[]|select(.success)]|length)/\($checks|length) success, \([$checks[]|select(.pending)]|length) in-progress, \([$checks[]|select(.failed)]|length) failed"
    }'
```

For unresolved review threads. Two correctness notes:

- `pullRequest(number: ...)` requires a concrete integer,
  not a literal `N`. Substitute a real PR number when
  copying.
- `reviewThreads(first: 50)` does not paginate. Most PRs
  fit, but for discussion-heavy lanes loop on
  `pageInfo.hasNextPage` with `first: 100, after: $cursor`
  until exhausted; otherwise the unresolved-thread count is
  truncated and the auto-merge pre-flight is unsound.

```bash
# Substitute a real PR number for 910 below.
gh api graphql -f query='
{
  repository(owner: "Lucent-Financial-Group", name: "Zeta") {
    pullRequest(number: 910) {
      reviewThreads(first: 50) {
        pageInfo { hasNextPage endCursor }
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

## Correction-class note (Claude.ai 2026-04-30)

This rule is an **application-level** correction, not a
substrate-level one. The factory's discipline isn't wrong; the
*application* of available tools to the discipline was suboptimal.
Earlier rounds caught Otto in patterns requiring structural rule
changes (read-only-first removed, polite-waiting refined,
mode-mixing diagnosed). This round catches Otto in a pattern
requiring no rule change — just better tooling discipline.

Two different categories of correction exist:

- **Substrate-level**: the factory's invariants need updating.
  Lands as new memory file, new ADR, new rule.
- **Application-level**: the invariants are fine; Otto's habit
  within them was suboptimal. Lands as memory file (this one),
  but the lesson is "use existing tools better," not "change
  what's allowed."

The buddy-review surface should distinguish these. Both are
worth catching; the response shape differs.

## Deeper structural diagnosis (Deepseek 2026-04-30)

Deepseek's synthesis after concurring with Amara + Claude.ai:

> Otto treating his own involvement as external state when it's
> actually under his control.

The polled signal `gh pr list --state merged` depends on Otto's
own action (filing the PR, arming auto-merge, resolving threads,
pushing fix-ups) plus external state (CI runners, branch
protection, reviewer availability). Polling treats the whole
combined signal as opaque external — which is the conceptual
error. The participant view forces the question: *what
specifically is blocking, and is the blocker something I can act
on or something I'm waiting on?*

Generalization: **whenever the polled signal depends partially on
the agent's own action, the polling shape is wrong.** Other
instances of this anti-pattern caught in earlier rounds:

- Polling for Aaron-input that requires Otto to first surface a
  question.
- "Holding" while a PR has unresolved threads Otto could resolve
  via GraphQL.
- Manufactured-patience waits where the named dependency is
  actually Otto-side, not external.

The diagnostic question for any wait state: *if I do nothing, will
the signal change on its own?* If yes, gate-poll is appropriate.
If no, waiting is itself the bug — Otto needs to act.

## Freshness-pass observation (Claude.ai 2026-04-30)

This round's catch came from reading the actual log content
(the literal repeated `[]` and "Holding" lines) rather than from
theoretical analysis. The most diagnostic reviews are sometimes
the most concrete — reading what's literally happening rather
than what's supposed to be happening. Same generative pattern
as the freshness-pass discipline applied to review itself:
refresh against actual state, don't review against the assumed
state.

Worth recording as a buddy-review meta-rule: when reviewing an
agent's autonomous-loop behavior, read the literal log/output
content, don't infer from the framework.

## Composes with

- Otto-363 substrate-or-it-didn't-happen — this lesson lands as
  durable substrate so future-Otto can't drift back.
- `feedback_manufactured_patience_vs_real_dependency_wait_otto_distinction_2026_04_26.md` —
  manufactured-patience class. Real-dependency-wait still
  applies, but the wait-tick output shape changes per this rule.
- `feedback_never_idle_speculative_work_over_waiting.md` — when
  no PR is in flight, the never-idle ladder applies (re-audit /
  meta-check / speculative work) rather than polling-for-nothing.
- `docs/AUTONOMOUS-LOOP.md` "every-tick-gets-a-row" liveness
  invariant — the row content must be auditable, not "Holding."
  copy-paste.
- "Live unblock wins; fan-out after closure, not during"
  (Claude.ai catch family) — same discipline about *what kind*
  of attention is appropriate at *what point* in the work cycle.
  Polling-for-merged-PRs and absorbing-incoming-context-during-
  active-lane are both fan-out failures.
