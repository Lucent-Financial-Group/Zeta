---
name: non-isolated-subagent-shares-checkout-can-switch-your-branch
description: "A non-isolated subagent (general-purpose, no isolation:worktree) operates on the SAME working checkout — it can run `git checkout main` and leave you on main, so your next commit + `git push origin HEAD` goes DIRECTLY to origin/main, bypassing the PR flow. Isolate git-running subagents, or re-verify your branch after any subagent returns."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
  modified: 2026-08-02T21:04:31.027Z
---

**What happened (2026-08-02).** During the book-RAW others-protection audit, I spawned a
`general-purpose` subagent (NOT `isolation: worktree`) to review docs. Its read-only prompt began with
`git checkout -q main && git reset --hard origin/main` to sync — but a non-isolated agent shares the
**same working checkout** (`~/.local/share/zeta-otto`), so that left MY checkout on `main`. I then made
all the fix-Edits, `git add`, `git commit` — landing the commit on **local main** — and
`git push -u origin HEAD` pushed it **straight to origin/main** (bypassing branch + PR + auto-merge).
The PR-create then failed ("head branch main is the same as base"). Content was correct/verified and
docs-only, so no harm — but the *process* (PR+squash) was bypassed, and undoing it would need a
force-push (gated), so it was left in place with disclosure.

**Why:** subagents without `isolation: worktree` run in the same repo working copy; any `checkout` /
`reset` they do mutates YOUR branch state. `git push origin HEAD` from `main` is a **direct push to
origin/main** — no branch, no PR, no CI gate, no auto-merge.

**How to apply.**
1. For any subagent that will run **git checkout/reset/commit**, spawn it with **`isolation: worktree`**
   (its own worktree) — or give it a strictly read-only prompt that does NO checkout/reset (read files
   directly; it does not need to be on a branch to read).
2. **After any subagent returns, re-establish your own branch before committing:**
   `git fetch origin -q && git checkout -q main && git reset --hard origin/main -q && git checkout -b <branch>`
   — never `git commit` without confirming `git branch --show-current` is a feature branch, not `main`.
3. Guard: before `git push`, check you are NOT on `main` (`git branch --show-current`). `push origin
   HEAD` from main = direct-to-main.

Ties: [[shared-checkout-is-view-only]] discipline (this is the same hazard one layer in — a *subagent*
churning the writer's checkout); the PR+squash ship convention (CLAUDE.md §5).
