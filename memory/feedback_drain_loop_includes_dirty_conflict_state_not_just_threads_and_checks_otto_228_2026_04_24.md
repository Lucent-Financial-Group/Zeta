---
name: Drain loop MUST include DIRTY/CONFLICTING state, not just unresolved threads and failing CI; a PR with all threads resolved and all checks green STILL won't auto-merge if `mergeStateStatus == "DIRTY"`; rebase the branch onto main to clear the conflict; this is the third axis of the drain loop alongside threads and checks; Aaron Otto-228 directive; 2026-04-24
description: Aaron Otto-228 *"on top of the comments and failures there is another check you have to add, some branches have conflicts merging to main ... This branch has conflicts that must be resolved ... you should be able to see that on the PRs and detect it, that needs to be part of your drain loop"*. Referenced PR #364 which had 0 unresolved threads + all checks pass BUT `mergeStateStatus: DIRTY / mergeable: CONFLICTING` — auto-merge won't fire in that state. Drain loop is THREE axes: unresolved threads + failing checks + merge conflicts. Miss any axis and the PR silently sits instead of merging.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**A PR auto-merges only when ALL THREE conditions clear:**

1. Zero unresolved review threads (Otto-225 / Otto-226 drain)
2. All required CI checks pass
3. Branch has no merge conflict with main (`mergeStateStatus` not `DIRTY`)

The drain loop must cover all three. Miss any axis and the PR
sits with auto-merge armed but unable to fire.

Direct Aaron quote:

> *"on top of the comments and faiures there is another check
> you have to add, some branches have conflics merging to main
> like Checks awaiting conflict resolution ... This branch has
> conflicts that must be resolved ... you should be able to
> see that on the PRs and detect it, that needs to be part of
> your drain loop"*

## How to detect

Per-PR check:

```bash
gh pr view <N> --json mergeStateStatus,mergeable \
  --jq '{state: .mergeStateStatus, mergeable: .mergeable}'
```

Values that block auto-merge:

| `mergeStateStatus` | `mergeable` | Meaning | Action |
|---|---|---|---|
| `DIRTY` | `CONFLICTING` | git-level conflict with main | Rebase branch onto main, resolve, push |
| `BEHIND` | `MERGEABLE` | branch behind main (after strict=false, this still auto-merges) | None required since Otto-223 branch-protection relax |
| `BLOCKED` | `MERGEABLE` | waiting on CI or required reviews | Wait |
| `CLEAN` | `MERGEABLE` | ready; auto-merge fires | None (auto-merge does its job) |
| `UNSTABLE` | `MERGEABLE` | non-required check failed | Usually auto-merge still fires |
| `UNKNOWN` | `UNKNOWN` | GitHub still computing | Re-check next tick |

Survey across own open PRs:

```bash
gh pr list --state open --author '@me' \
  --json number,mergeStateStatus,title \
  --jq '.[] | select(.mergeStateStatus == "DIRTY") | "#\(.number) DIRTY — \(.title)"'
```

## How to resolve

For each DIRTY PR:

1. Check out the branch (in a worktree — cleanest for parallel
   drain per Otto-226)
2. `git fetch origin main`
3. `git rebase origin/main`
4. If conflicts — resolve them (prefer keeping both sides when
   factory-authored logs or rows diverged; keep main's version
   when a newer PR already superseded the change)
5. `git rebase --continue` after each conflict resolution
6. `git push --force-with-lease`
7. Confirm state: `gh pr view <N> --json mergeStateStatus` —
   should be `CLEAN` or `BLOCKED`-pending-CI

Per Otto-226, this is subagent-dispatchable work — give the
subagent the PR number, branch name, and "resolve any DIRTY
rebase conflicts" as an explicit instruction in the prompt.

## Integration into the drain loop

Per-tick rhythm becomes:

```
1. Survey thread count on each open PR       (Otto-225)
2. Survey mergeStateStatus on each open PR   (Otto-228)
3. Survey failing CI on each open PR         (Otto-228)
4. Dispatch subagent batch per PR that needs
   thread-drain OR DIRTY-resolve OR CI-fix
   (Otto-226 parallel via worktree)
5. Wait for returns, aggregate
6. Close tick
```

## Why this matters structurally

Auto-merge armed (Otto-224) + branch-protection strict=false
(Otto-223) means BEHIND no longer blocks auto-merge. But DIRTY
is a git-level conflict, not a branch-protection setting — it
can't be relaxed away. Only actual file-level rebase-and-
resolve fixes it.

The queue-saturation throttle (Otto-171) gets worse when
DIRTY PRs accumulate because they can't self-clear — every
DIRTY PR needs human or agent intervention to rebase.
Detecting DIRTY early + resolving promptly is the only way
the queue drains monotonically.

## Composition with prior memory

- **Otto-225 serial PR opening** — limits NEW PR creation
  rate. This memory adds DIRTY-cleanup to the drain axis.
- **Otto-226 parallel subagent drain** — subagents can
  handle DIRTY rebase-resolve just as well as thread drain;
  dispatch prompt just needs the "if DIRTY, rebase+resolve"
  instruction.
- **Otto-223 branch-protection relax** — took BEHIND off the
  blocker list. DIRTY stays on the blocker list — it's not a
  protection setting.
- **Otto-224 auto-merge always armed** — necessary but not
  sufficient. Auto-merge armed + DIRTY = armed but paused
  until DIRTY clears.

## What this memory does NOT authorize

- Does NOT authorize force-merging DIRTY PRs via API
  bypass. The conflict is real; resolve it properly.
- Does NOT authorize abandoning a DIRTY PR without
  resolution. If the PR is superseded by another merged
  PR, close it with a "superseded by #<N>" comment instead.
- Does NOT authorize rebasing someone else's PR without
  their consent. For PRs authored by a human or other
  agent: comment that rebase is needed; don't force-push
  their branch.
- Does NOT authorize ignoring DIRTY state for PRs in the
  `_wait_` queue (explicitly held for next tick per Otto-225).
  Held is different from ignored; DIRTY status still matters.

## Direct Aaron quote to preserve

> *"on top of the comments and faiures there is another check
> you have to add, some branches have conflics merging to main
> ... This branch has conflicts that must be resolved ... you
> should be able to see that on the PRs and detect it, that
> needs to be part of your drain loop"*

Future Otto: drain loop is THREE axes, not two. Threads + CI
+ DIRTY. Survey all three every tick; dispatch fixes in
parallel via subagents; clear them monotonically.
