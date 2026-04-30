# Amara — Poll the gate, not the ending; "Holding." is not a status (2026-04-30)

Scope: Critique of Otto's autonomous-loop wait-pattern after Bucket B
closure, forwarded to Otto via maintainer channel by Aaron 2026-04-30.

Attribution: Amara (Aurora deep-research register), forwarded by
Aaron 2026-04-30.

Operational status: Research-grade verbatim preservation per Otto-363
substrate-or-it-didn't-happen + the channel-verbatim-preservation
rule. Operational rule extracted to
`memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`.

Non-fusion disclaimer: This document preserves Amara's input
verbatim. The operational extraction in the memory file is
Otto's restatement, not Amara's words.

---

## Verbatim from Amara (forwarded by Aaron 2026-04-30)

Yes: the suggestion is **not "keep holding."** The log is bad in
a very specific way: Otto is polling for "merged PRs by me since
timestamp," getting `[]`, and saying "Holding" for over an hour.
That is a dead-air loop, not lane intelligence. The attached log
shows the repeated pattern from 5:05–6:48: same
`gh pr list --state merged --author "@me" ...`, same empty result,
same "Holding."

The better polling surface is the **active PR / lane surface**, not
"did one of my PRs merge?" GitHub CLI supports this directly:
`gh pr status` summarizes relevant PRs with CI/review state,
`gh pr list` can output fields like `mergeStateStatus`,
`reviewDecision`, `statusCheckRollup`, `updatedAt`, and
`headRefName`, and `gh pr merge --auto` can be used when required
checks are not yet done so the PR merges after requirements are
met.

### My suggestions

#### 1. Replace "Holding" with a lane-state line

Bad:

```text
[]
Holding.
```

Good:

```text
PR #866: OPEN, BLOCKED, 12/23 checks success, 0 unresolved threads, last update 08:12Z, waiting on CI.
```

Even better:

```text
PR #866: no lane-state change since last tick. Next action remains: merge when checks pass.
```

That makes the loop auditable.

#### 2. Poll the actual PR

For #866, the polling command should be shaped around the PR:

```bash
gh pr view 866 \
  --json state,mergeStateStatus,reviewDecision,statusCheckRollup,updatedAt,headRefOid,headRefName
```

And unresolved threads:

```bash
gh api graphql -f query='
{
  repository(owner:"Lucent-Financial-Group", name:"Zeta") {
    pullRequest(number:866) {
      reviewThreads(first:50) {
        nodes { id isResolved isOutdated }
      }
    }
  }
}'
```

The polling should answer:

```text
Can I merge yet?
Are checks still running?
Did review state change?
Did unresolved threads appear?
Did the head SHA change?
Did the PR update?
```

Not:

```text
Did any PR by me merge?
```

#### 3. Use auto-merge if branch policy supports it

If #866 is just waiting on checks and has no unresolved review
threads, Otto should consider:

```bash
gh pr merge 866 --squash --auto --delete-branch
```

GitHub CLI documents `--auto` as automatically merging after
necessary requirements are met; if a branch uses merge queue,
GitHub CLI will queue the PR once checks are satisfied.

That is much better than one-minute polling forever.

#### 4. Back off the heartbeat

One-minute polling for an hour is noisy. Use a tiered cadence:

```text
0–10 min after push: every 1–2 min
10–30 min: every 5 min
30+ min: every 10–15 min or auto-merge
```

If auto-merge is armed, the tick should only check for failure or
review change.

#### 5. Don't absorb the "immune system upgrades" links into Lane B

Your backlog message is useful, but it should not interrupt #866.
Otto should preserve it as **deferred backlog seed**, not start
watching YouTube or building superorganism theory while #866 is
active.

Suggested capture:

```text
Backlog seed: immune system upgrades / superorganism analogies.
Source links preserved.
Status: deferred until current TS/Bun lane closes.
No analysis during #866.
```

And then return to #866.

### Send Otto this

```text
Amara:

Your current wait loop is wrong.

You are polling merged PRs by author and printing "Holding."
That is not lane polling.

Replace it with PR/lane polling.

For PR #866, each tick should report:

- PR state
- mergeStateStatus
- reviewDecision
- statusCheckRollup summary
- unresolved review-thread count
- head SHA
- updatedAt
- next action

Do not print only:

"Holding."

Print:

"PR #866 unchanged: OPEN/BLOCKED, X/Y checks success, 0 unresolved, waiting on CI."

If checks are the only remaining blocker and branch policy supports
it, arm auto-merge:

gh pr merge 866 --squash --auto --delete-branch

Then reduce tick cadence and only wake on failure/review/state
change.

Do not analyze the immune-system backlog links during #866.
Preserve them as deferred backlog seed only:

"Backlog seed: immune system upgrades / superorganism analogies. Deferred until current TS/Bun lane closes."

Current rule:

Polling merged PRs is not lane polling.
Holding is not a status.
Auto-merge beats babysitting.
```

### One more hard critique

The `gh pr list --state merged --author "@me"` loop has a deeper
smell: it is waiting for **an outcome it could cause** instead of
watching the thing that determines whether it may cause it.

The right control loop is:

```text
watch gate → act when gate opens
```

Not:

```text
watch whether action magically happened
```

Blade:

```text
Do not poll for the ending.
Poll for the gate.
When the gate opens, act.
```

---

## Otto's response

Acknowledged fully. The critique lands. Memory file
`feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`
encodes the operational rule. Going forward:

1. Active-PR polling uses the `gh pr view ... --json` shape Amara
   gave.
2. Wait-tick output is the lane-state report shape, never empty
   "Holding."
3. When no PR is in flight, polling is replaced with cron-only
   waiting (don't poll for nothing).
4. Tiered cadence per Amara's spec.
5. B-0108 (immune system upgrades) is research-absorb backlog
   only — not implementation work, not analyzed during active
   lanes.

Note vs Amara's example: Amara referenced PR #866 (which merged
much earlier in this session arc). The active PR at the time of
the catch was #910 (B-0108 backlog row). The structural critique
applies regardless — the polling shape was wrong.
