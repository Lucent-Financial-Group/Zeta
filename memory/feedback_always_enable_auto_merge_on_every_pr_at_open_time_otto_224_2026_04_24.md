---
name: ALWAYS enable auto-merge on every PR at creation time — `gh pr merge <N> --auto --squash` is part of the PR-open sequence, not a manual follow-up; Aaron caught #362 CLEAN but not auto-merge-armed; factory-discipline mechanical step; 2026-04-24
description: Aaron Otto-224 caught that I opened PRs #361-#364 without enabling auto-merge; PR #362 was already CLEAN / MERGEABLE waiting for me to squash-merge it, but because auto-merge was not armed it just sat there. "also are you not setting the auto merge or whatever it's called? I see some PRs that could be completed but are not set to auto merge like https://github.com/Lucent-Financial-Group/Zeta/pull/362". Effective discipline: every `gh pr create` is immediately followed by `gh pr merge <N> --auto --squash`. No exceptions for tick-history or lint or trivial PRs.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**Every `gh pr create` is paired with
`gh pr merge <N> --auto --squash`** — they're one sequence, not
two. Forgetting auto-merge means the PR sits BLOCKED or CLEAN
waiting for me to come back and merge it manually, which is
exactly the throughput hole the autonomous loop was built to
close.

Direct Aaron quote:

> *"also are you not setting the auto merge or whatever it's
> called? I see some PRs that could be completed but are not
> set to auto merge like https://github.com/Lucent-Financial-Group/Zeta/pull/362"*

PR #362 was CLEAN / MERGEABLE when Aaron checked; no Copilot
concerns, one typo fix resolved, branch up to date. Could have
already been merged. Sat open because I opened the PR and never
ran the merge-auto command.

## Why this matters

- **Throughput**: auto-merge armed means "merge as soon as all
  checks pass." Without it, the factory is the bottleneck at
  every CI-completion event.
- **Queue-saturation**: during drain-mode the whole point is
  to merge clean PRs fast. Leaving auto-merge off turns drain
  into "ship new PRs but also manually babysit every one to
  merge" — double work.
- **ARC3 compounding**: Aaron has pointed this out before
  implicitly (Otto-158 series), but the memory-level
  discipline of "always enable auto-merge at open-time" was
  never locked in. This memory is the explicit lock-in.

## How to apply — mechanics

The minimal PR-open sequence becomes FIVE commands, not four:

```bash
# 1. Commit + push branch
git push -u origin <branch>

# 2. Open PR
PR_URL=$(gh pr create --title "..." --body "...")
PR_NUM=$(basename "$PR_URL")   # the trailing number

# 3. Enable auto-merge IMMEDIATELY (squash-merge is the
#    project default; --auto means "merge when all required
#    checks pass")
gh pr merge "$PR_NUM" --auto --squash

# 4. Return to main
git checkout main

# 5. Record in tick-history
```

If the PR is being opened as a stack-on-top-of-another-PR
(base = someone-else's branch, not main), `--auto` still works;
auto-merge will fire when its base merges + checks pass.

**If the required-checks set on a branch is empty** (no
protection rules), auto-merge fires instantly. That's the
equivalent of "just merge it now." Fine; there's no need for a
separate "merge immediately" path.

## Edge cases / exceptions

- **Draft PRs** — `gh pr create --draft` opens a draft; auto-
  merge can still be armed and will fire once the draft is
  marked ready. So the rule still applies: arm auto-merge at
  open-time even for drafts.
- **PRs that need human review before merge** — arm auto-merge
  anyway. GitHub's auto-merge waits on "required reviews" if
  branch protection requires them. If there are no required
  reviews, that's a branch-protection question, not an
  auto-merge question. Default arming is safe.
- **PRs that should NOT merge automatically** (e.g. research
  docs where Aaron wants to read + comment before merge) — 
  open as draft + note in PR body "NOT ready for merge, opened
  for visibility." Still arm auto-merge so the moment Aaron
  marks it ready, it flows.
- **LFG Copilot budget exhausted** (Otto-219 memory) — arm
  auto-merge anyway; Copilot-review is additive, not a required
  check.
- **Post-drain AceHack-first routing** (Otto-223 memory) — arm
  auto-merge on BOTH the AceHack and LFG PRs at each hop. The
  AceHack PR auto-merges the moment Copilot review clears; the
  LFG PR auto-merges when its own checks + reviews clear.

## Self-check at PR-close time

Before reporting "opened PR #N" in tick-history:

- [ ] `gh pr merge N --auto --squash` run (check `gh pr view N
      --jq '.autoMergeRequest'` is non-null)
- [ ] `--auto --squash` used (not `--rebase` or `--merge`
      unless explicitly required; squash is the project
      convention)
- [ ] Branch protection doesn't require a step I'm not able to
      satisfy (if it does, document the gap in the PR body;
      don't silently ship a PR that will never auto-merge)

## Composition with existing discipline

- **Otto-171 queue-saturation-throttle** — the drain-mode
  mechanics. Auto-merge is the throughput force multiplier for
  drain-mode; without it, drain is capped at my manual merge
  rate, not CI's clearance rate.
- **Otto-204c livelock memory** — ARC3-compounded failure.
  Forgetting auto-merge is a micro-form of the same failure:
  past-session practice wasn't integrated into this-session's
  default sequence. This memory breaks the cycle by making
  auto-merge-arming mechanical.
- **Otto-219 Copilot-LFG-budget-exhausted** — auto-merge is
  orthogonal to the Copilot-budget question. Arm it regardless.
- **Otto-223 AceHack-first-post-drain routing** — both hops
  of the two-hop flow arm auto-merge at open-time; the LFG-
  hop doesn't wait for a separate manual merge.

## What this memory does NOT authorize

- Does NOT authorize removing branch protection to accelerate
  auto-merge. Required checks + required reviews exist for
  reasons; arm auto-merge to work WITH them, not bypass them.
- Does NOT authorize force-merging a PR that auto-merge is
  gating on. If auto-merge is BLOCKED by a real reason
  (failing test, unresolved critical review, required
  reviewer), address the reason; don't flip merge method or
  force-push past it.
- Does NOT authorize using `--rebase` as default merge method
  on Zeta. Squash is the project convention (look at
  `main`'s commit log — every merged PR is a squash commit).
- Does NOT override Aaron's explicit per-PR "don't auto-merge
  this yet, I want to read it first" instruction. If Aaron
  says so, mark the PR draft or comment "holding auto-merge"
  and explicitly do NOT arm it until he says go.

## Direct Aaron quote to preserve

> *"also are you not setting the auto merge or whatever it's
> called? I see some PRs that could be completed but are not
> set to auto merge like https://github.com/Lucent-Financial-Group/Zeta/pull/362"*

Future Otto: arming auto-merge at PR-open-time is part of
opening a PR. Not a follow-up step. Not a "best-practice we
should try." A mechanical part of the sequence. If you ever
type `gh pr create` without immediately typing `gh pr merge
--auto --squash` after, you have forgotten the discipline.
