---
name: gh-pr-merge-auto-does-not-always-arm-three-causes
description: `gh pr merge --auto` exits 0 whether it armed, merged immediately, or silently failed. Three distinct causes measured in one session — always verify autoMergeRequest != null afterwards.
metadata:
  type: reference
---

**`gh pr merge --auto --squash` exits 0 in all of these cases.** The exit code
tells you the call was accepted, never what it did.

Three distinct causes measured 2026-08-26:

1. **Already mergeable -> merges IMMEDIATELY.** Not armed, merged. Seen on
   #15499, #15525, #15526. If you wanted a gate to run first, it didn't.
2. **Draft PR -> arming silently FAILS.** GraphQL returns
   `Pull request is a draft (enablePullRequestAutoMerge)`; a sweep that discards
   stderr reports success and nothing is armed. Seen twice on #15554 before I
   looked at `isDraft`.
3. **Unprotected base -> merges IMMEDIATELY.** An agent's nixpkgs upgrade landed
   straight onto another agent's `flake.lock` topic branch this way. On a topic
   branch there is no protection to wait for, so `--auto` is not a queue.

**How to apply:** after every `gh pr merge --auto`, read
`gh pr view N --json autoMergeRequest --jq '.autoMergeRequest != null'` and act on
THAT. Before arming, check `isDraft` and confirm the base is `main`. Never infer
arming from rc=0.

**Related defect class — a failure to observe wearing the costume of an
observation.** An agent's arming loop exited early because a transient `gh` call
returned an empty string and `[ "$st" != "OPEN" ]` read empty as a terminal state.
Guard with `[ -n "$st" ]` so unreadable means retry, not answered. Same family as
[[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]] and
[[gh-pr-checks-renders-cancelled-as-fail]].

**Also from the same session, worth keeping:** GitHub reports workflow step
boundaries at **one-second resolution**, so a step opening and closing inside one
second must be recorded `< 1 s`, never `0 s` — reading it as zero converts a
measurement *limit* into a measurement.
