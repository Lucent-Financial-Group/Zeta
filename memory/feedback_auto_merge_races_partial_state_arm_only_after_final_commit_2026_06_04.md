---
name: feedback-auto-merge-races-partial-state-arm-after-final-commit
description: Auto-merge can fire between commits pushed to the same branch and squash-merge a partial state — arm auto-merge only after the final commit is pushed.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f7267d2e-43e4-4c62-984c-d19e6e7c34ef
---

2026-06-04 incident: armed `gh pr merge --auto --squash` on PR #6679 after the
first commit (rules + skill + streaming-and-execution *prototype*), then pushed a
second commit (the 261-skill blueprint-pack migration) to the same branch. The
auto-merge fired against the **first** commit's state before the second push
registered, squash-merging only the prototype. The migration silently never
landed on main (caught later when a follow-up cherry-pick conflicted; main's
squash commit title said "prototype"). Recovered by cherry-picking the intact
local migration + trim commits onto main and re-PRing as #6680.

**Why:** `--auto` merges the moment required checks pass on whatever the branch
tip is at that instant. A later push is a separate event; if checks were already
green, the merge can win the race and capture a partial state. Squash hides it —
the squash message is the first commit's, so the loss isn't obvious.

**How to apply:**
- Push ALL commits for a change BEFORE arming `--auto`. Arm auto-merge last.
- If more work is needed on a branch with auto-merge already armed, either
  `gh pr merge --disable-auto` first, or expect it may merge mid-stream.
- After an auto-merge lands, verify main actually contains the expected files
  (`git cat-file -e origin/main:<path>`), don't assume the squash captured the
  latest push — especially for multi-commit branches.
- Recovery pattern: the unmerged commits survive locally; cherry-pick them onto
  fresh-from-main and re-PR. Migration-style commits whose parent ≈ main apply
  cleanly.

Composes with git-workflow / fork-pr-workflow blueprints (now under the
`workflows` category pack).
