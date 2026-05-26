---
pr_number: 3103
title: "fix(backlog): regenerate BACKLOG.md \u2014 mark B-0259 closed"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-14T06:13:29Z"
merged_at: "2026-05-14T06:15:30Z"
closed_at: "2026-05-14T06:15:30Z"
head_ref: "fix/backlog-index-b0259-closed-drift-2026-05-14"
base_ref: "main"
archived_at: "2026-05-14T06:34:43Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3103: fix(backlog): regenerate BACKLOG.md — mark B-0259 closed

## PR description

## Summary

- PR #3100 set `docs/backlog/P1/B-0259-...md` to `status: closed` but did not regenerate `docs/BACKLOG.md` in the same commit
- This caused the `check docs/BACKLOG.md generated-index drift` CI check to fail (non-required, but persists on future PRs touching backlog files)
- One-line fix: `BACKLOG_WRITE_FORCE=1 bun tools/backlog/generate-index.ts`

## Test plan

- [x] `bun tools/backlog/generate-index.ts --check` → `ok: ... matches generator output`
- [x] Change: `docs/BACKLOG.md` line 118 flips `- [ ]` → `- [x]` for B-0259

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-14T06:14:41Z)

## Pull request overview

Regenerates `docs/BACKLOG.md` to reflect B-0259's `status: closed` set in PR #3100, fixing CI drift between per-row files and the generated index.

**Changes:**
- Flips B-0259 checkbox from `- [ ]` to `- [x]` in the generated index.
