---
name: feedback-cut-feature-branches-from-origin-main-not-prior-local-branch
description: "Create each feature branch from origin/main, not the current local branch — carrying an already-squash-merged commit makes the PR go DIRTY"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Cut every new feature branch explicitly from `origin/main`
(`git fetch origin && git checkout -b <name> origin/main`), NOT from whatever
local branch HEAD happens to be.

**Why:** twice in one session (PR #9187, then #9189) a branch went `DIRTY` /
unmergeable because it was created with a bare `git checkout -b <new>` while
HEAD was still on the *previous* feature branch. That branch's commit had
already landed on main via **squash-merge** (a new SHA), so the new branch
carried a duplicate of already-merged changes that git could not reconcile
against main's squashed version → merge conflict on the adjacent `.fsproj`
compile-order lines.

**How to apply:** after a PR merges, before starting the next slice, run
`git fetch origin` then `git checkout -b <next> origin/main`. If a branch does
go DIRTY for this reason, `git rebase origin/main` drops the already-applied
commit ("skipped previously applied commit …") and a `--force-with-lease` push
clears it — but branching from `origin/main` in the first place avoids the
round-trip entirely. Working in the shared clone at
`/Users/acehack/.local/share/zeta-otto`. Relates to [[shared-checkout-is-view-only]]
(own-clone discipline) and the auto-merge-armed ship flow.
