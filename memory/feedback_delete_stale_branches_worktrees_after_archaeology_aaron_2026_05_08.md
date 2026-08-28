---
name: Delete stale branches and worktrees after archaeology — they're clutter not archive
description: Aaron 2026-05-08 — stale git branches and worktrees should be deleted after archaeology extracts what's useful. They're clutter, not archive. If the HD is lost they're gone anyway. The Maji archives what matters in substrate (memory files, docs/research, backlog rows), not in stale git refs.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Delete stale branches and worktrees after archaeology is done. They are clutter, not archive.

**Why:** Aaron 2026-05-08. If the hard drive is lost, those branches are gone anyway — they're not durable substrate. The valuable content gets extracted into substrate (memory files, docs/research/, backlog rows, committed code) during the archaeology pass. After extraction, the branch/worktree is redundant. Keeping it accumulates dead refs that confuse future agents (e.g., Riven's `feat/riven-loop-tick` branch was dozens of commits stale and unusable but looked like active work).

**How to apply:**
- During any archaeology pass (B-0139 or similar): walk the branch, extract what's useful into substrate, delete the branch.
- During routine cleanup: `git branch -r --list 'origin/*' | wc -l` — if claim/feature branches are accumulating past ~20, do a cleanup pass.
- Worktrees under `.claude/worktrees/` from completed subagents: delete after confirming the PR merged.
- The Maji function archives to substrate, not to git refs. A committed file survives HD loss (it's on GitHub). A local branch/worktree does not.
- All agents have authority to delete stale branches and worktrees after archaeology. No permission needed.
