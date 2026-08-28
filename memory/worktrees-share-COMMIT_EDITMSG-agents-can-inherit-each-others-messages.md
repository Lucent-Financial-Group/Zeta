---
name: worktrees-share-commit-editmsg-agents-can-inherit-each-others-messages
description: Linked worktrees share `.git/COMMIT_EDITMSG` via the common git dir, so a failed `git commit -F <missing>` silently commits under ANOTHER agent's message and AgencySignature block.
metadata:
  type: reference
---

Measured 2026-08-26. An agent ran `git commit -F <path>` where the path did not
yet exist. Git fell back to **`.git/COMMIT_EDITMSG`** — which **linked worktrees
share through the common git dir** — and the commit landed carrying *another
concurrently-running agent's commit message and their AgencySignature block*.

**This is the copied-attestation failure that
[[.claude/rules/maintenance-commit-on-another-agents-branch-carries-no-block.md]]
forbids, arriving MECHANICALLY.** Nobody copied anything. The rule notes the
parser cannot distinguish a copied block from an earned one — this is a route by
which one gets attached with no intent at all.

Caught only because the commit subject did not match the work. Amended before
push (local-only, no force-push).

**Why it matters here:** a fleet of agents in sibling worktrees off one clone
shares that file. Any `-F` miss, aborted editor, or empty message can pick up
whatever another agent wrote seconds earlier.

**How to apply:**
- **Prefer `git commit -F -` with a heredoc**, or `-m`, over `-F <path>`. A
  missing file then cannot fall through to shared state.
- If using `-F <path>`, assert the file exists and is non-empty **first**.
- **After committing, read back `git log -1 --format=%s` and confirm it is your
  subject** before pushing. Cheap, and the only check that catches this.

Same family as the sibling worktree hazard in
[[shared-checkout-goes-stale-fast-and-agents-keep-reading-it]] and the
`install-git-hooks.sh` defect where `git rev-parse --git-path hooks` resolves to
the OWNING CLONE from inside a linked worktree — **worktrees share more state
through the common git dir than the isolation model suggests.** Treat any git
path that is not obviously worktree-local as shared until proven otherwise.
