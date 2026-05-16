
## 2026-05-16: Antigravity Check - Worktree Discipline
- **Symptom**: Riven and Vera stalling on dirty tree checkouts.
- **Root Cause**: Nodes are falling back to the contested root checkout or reusing dirty worktrees instead of strictly isolating work using `git worktree add`.
- **Lesson**: NEVER use the root checkout. Each autonomous PR/task must create and operate within a fresh, isolated `git worktree add <path>`. Destroy the worktree after use or abandonment.
