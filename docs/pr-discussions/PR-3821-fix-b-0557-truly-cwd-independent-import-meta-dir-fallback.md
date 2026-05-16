---
pr_number: 3821
title: "fix(B-0557): truly cwd-independent \u2014 import.meta.dir fallback"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-16T08:07:13Z"
merged_at: "2026-05-16T08:11:55Z"
closed_at: "2026-05-16T08:11:55Z"
head_ref: "fix/b0557-detect-repo-root-import-meta-fallback-otto-cli-2026-05-16"
base_ref: "main"
archived_at: "2026-05-16T08:26:45Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3821: fix(B-0557): truly cwd-independent — import.meta.dir fallback

## PR description

## Summary

- Closes the scope gap that Copilot flagged on [PR #3819](https://github.com/Lucent-Financial-Group/Zeta/pull/3819): slice 3's cwd-independence acceptance bullet (\`cd /tmp && bun /path/to/...\`) was only partially shipped — `git rev-parse --show-toplevel` from /tmp fails (no git repo), and my fallback to `process.cwd()` returned /tmp which has no backlog.
- Fix: when `git rev-parse` fails, fall back to `path.resolve(import.meta.dir, "../..")`. The tool lives at `<repo>/tools/hygiene/X.ts` so two levels up reaches the repo root regardless of cwd.

## Verification

**Smoke from /tmp** (the original failing case):

```
$ cd /tmp && bun /path/to/tools/hygiene/audit-backlog-status-drift.ts --json | head -5
# Now produces the same 33+ candidate output as running from the repo root
# (was previously empty `[]`).
```

## Test plan

- [x] `bun test` → 20 pass / 0 fail / 40 expect calls (no regression)
- [x] Smoke from /tmp now produces 33+ candidates (was empty)
- [x] `git rev-parse` still preferred when available (subdir-of-repo case)
- [x] Closes the scope-honesty gap on PR #3819

## Unblocks PR #3819

Once this PR lands, [PR #3819](https://github.com/Lucent-Financial-Group/Zeta/pull/3819) (B-0557 close-row) can resolve its outstanding thread — slice 3's acceptance is now fully shipped, not partial.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-16T08:09:20Z)

## Pull request overview

This PR completes B-0557 slice 3’s “cwd-independence” guarantee for `tools/hygiene/audit-backlog-status-drift.ts` by making repo-root detection work even when invoked from outside any git worktree (e.g., `/tmp`), ensuring backlog-relative reads and `existsSync` checks remain correct.

**Changes:**
- Update `detectRepoRoot()` to prefer `git rev-parse --show-toplevel`, but when that fails, fall back to deriving the repo root from the script’s own location via `import.meta.dir`.
- Add a hygiene-history tick log entry documenting the related audit/close activity.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| tools/hygiene/audit-backlog-status-drift.ts | Make repo-root detection robust when executed outside a git repo by falling back to `resolve(import.meta.dir, "../..")`. |
| docs/hygiene-history/ticks/2026/05/16/0758Z.md | Add tick log entry for the session/audit context. |
