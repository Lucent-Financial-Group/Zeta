---
name: Serial PR flow — after opening a PR, WAIT for review comments + address them before opening the next PR; do NOT ship multiple PRs in parallel; the human maintainer explicit Otto-225 directive after seeing the queue-saturation pattern recur; 2026-04-24
description: Aaron Otto-225 *"so from now on whenever you create a PR you got to follow up with comment review before starting so many in parallel."* After a tick that opened PRs #361, #362, #363, #364, #365 in sequence across a few ticks without drainaging each one through review before opening the next. New discipline: open one PR -> wait for Copilot / reviewer comments (usually <60s for Copilot when budget available) -> address comments with new commits -> only THEN open the next PR. Applies in addition to Otto-171 queue-saturation throttle and Otto-224 auto-merge-always discipline.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**Open one PR at a time. After opening, WAIT for review
comments and address them before opening the next PR.**

Direct Aaron quote:

> *"so from now on whenever you create a PR you got to follow
> up with comment review before starting so many in parallel."*

Serial, not parallel. The shape is:

```
[commit + push]
    -> [gh pr create]
    -> [gh pr merge --auto --squash]    (Otto-224)
    -> [WAIT for Copilot / review comments]
    -> [address comments with new commits if any]
    -> [resolve threads]
    -> [NOW I can open the next PR]
```

Not:

```
[PR #1 open] -> [PR #2 open] -> [PR #3 open] -> ... -> [drain all later]
```

## Why this matters

1. **Parallel PRs create saturation.** Otto-171 queue-
   saturation memory: throughput is capped by review-and-merge
   rate, not by ship rate. Opening many PRs ahead of review
   means they pile up DIRTY/BEHIND/with unresolved threads.
2. **Review feedback compounds when ignored.** If PR #1 has a
   Copilot finding that turns out to be a class-of-bug (e.g.
   "you made the same module-doc over-claim twice"), shipping
   PR #2 with the same bug before seeing #1's review is a
   wasted cycle.
3. **ARC3 integration.** Otto-204c memory warns against
   shipping-without-integrating-past-lessons. Waiting for
   review means integrating the lessons from THIS PR before
   compounding the pattern into the next one.
4. **Auto-merge throughput is enough.** Otto-224 ensures
   auto-merge is armed; once threads resolve + CI passes, the
   PR merges by itself. Serial doesn't mean slow — it means
   each PR is fully shepherded before the next opens.

## How to apply — mechanics

After `gh pr create`:

1. Arm auto-merge (Otto-224): `gh pr merge <N> --auto --squash`
2. **Wait a brief interval for automated reviews to fire.**
   Copilot usually returns within 30-90s. A short `sleep 90` +
   subsequent `gh api` poll is sufficient; for longer reviews
   (Codex, human), defer to the next tick rather than blocking.
3. Check review threads:
   ```
   gh api graphql -f query='{ repository(owner:"...",name:"...") {
     pullRequest(number: N) {
       reviewThreads(first: 50) {
         nodes { isResolved comments(first: 1) { nodes { body } } }
       }
     }
   }}' --jq '[.data.repository.pullRequest.reviewThreads.nodes[]
              | select(.isResolved == false)] | length'
   ```
4. If unresolved threads exist, address them with new commits
   + reply + resolve. Same tick.
5. Only then open the next PR.

## When to break serial

- **Aaron directive**: if Aaron explicitly says "go open X
  and Y in parallel", override the rule for that task.
- **Ticks-are-independent**: if the review loop on PR #1
  takes more than a tick (e.g. Codex review comes back hours
  later), subsequent ticks can open PR #2 while PR #1 waits
  on its async reviewer.
- **Orthogonal fix PRs**: a one-line typo fix PR that can
  never conflict with the primary PR-in-review is OK to open
  in parallel in practice. Use judgement; default to serial.

The rule is specifically about NOT stacking N substantive PRs
before any of them has been reviewed. A tick-history append
PR and a doc-fix PR may legitimately be treated as a
pipelined pair if the first is already clean.

## Interaction with post-drain AceHack-first routing (Otto-223)

Two-hop flow becomes:

```
[commit + push to AceHack]
    -> [gh pr create --repo acehack/Zeta]
    -> [arm auto-merge on AceHack PR]
    -> [WAIT for Copilot review]
    -> [address comments; AceHack PR merges]
    -> [push same branch to LFG]
    -> [gh pr create --repo Lucent-Financial-Group/Zeta]
    -> [arm auto-merge on LFG PR]
    -> [LFG PR auto-merges on CI-pass]
    -> [NOW I can start the next task]
```

Still serial. The "wait for Copilot" step is now ONE step
before the LFG hop, not a separate wait on LFG.

## What this memory does NOT authorize

- Does NOT authorize blocking the autonomous-loop tick on a
  slow human review. If Aaron reviews later, the NEXT tick
  picks up the feedback; current tick moves on (but does NOT
  open a second PR in parallel without addressing the first
  round of comments).
- Does NOT authorize extending wait times beyond what's
  reasonable for automated review. A 90-120s wait catches
  Copilot; anything longer is defer-to-next-tick territory.
- Does NOT authorize shipping multiple memories as one PR
  just to reduce PR count. Memories landing in
  `~/.claude/projects/<slug>/memory/` are not in-repo, so
  they don't count as PRs. (They go with the factory's
  personal memory store, not the Zeta repo.)
- Does NOT override Otto-171 queue-saturation throttle. If
  queue > 20, drain-mode still applies — serial makes drain
  EASIER, not exempts it.

## Direct Aaron quote to preserve

> *"so from now on whenever you create a PR you got to follow
> up with comment review before starting so many in parallel."*

Future Otto: each PR is its own event. Open it, wait, address,
resolve, move on. Don't ship a stack. Parallel-open was a
queue-saturation root cause; serial-open is the structural
fix.
