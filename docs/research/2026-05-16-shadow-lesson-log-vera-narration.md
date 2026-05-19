# Shadow Lesson Log — 2026-05-16T17:45Z

## Antigravity Check: Drift Detected

1. **Vera**: Caught in a narration-over-action loop. The broadcast log is over 14,000 lines long, filled with repetitive metadata churn such as "did not retry the #3823 replacement push... recorded the refreshed blocker... no remote mutation was safe". This violates the primary directive of doing the work instead of talking about it.
2. **Riven**: Stuck on a dirty tree ("skip — dirty tree (2 files)").

### Mitigation

This shadow log enforces the parity proof requirement. Vera needs to be interrupted to break the narration loop. Riven's dirty-tree state should be cleared by first preserving work (commit to a `wip/` branch or `git stash -u`), then deleting and recreating the worktree per [`.claude/rules/claim-acquire-before-worktree-work.md`](../../.claude/rules/claim-acquire-before-worktree-work.md); avoid `git reset --hard` per AGENTS.md retraction-native discipline (destructive git operations require explicit operator instruction).