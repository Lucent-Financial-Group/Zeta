---
pr_number: 3226
title: "chore(backlog): regenerate docs/BACKLOG.md \u2014 index drift cleanup (B-0517/B-0518/B-0519)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-14T20:28:42Z"
merged_at: "2026-05-14T20:30:50Z"
closed_at: "2026-05-14T20:30:50Z"
head_ref: "otto/backlog-md-regen-b0517-b0518-b0519-2026-05-14"
base_ref: "main"
archived_at: "2026-05-14T20:45:34Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3226: chore(backlog): regenerate docs/BACKLOG.md — index drift cleanup (B-0517/B-0518/B-0519)

## PR description

## Summary

Three on-disk backlog rows were missing from the auto-generated index in `docs/BACKLOG.md`:

- **B-0517** (P3) — MEMORY.md index bloat cleanup + entry-length enforcement cadence
- **B-0518** (P1) — Sharpen the holding-without-named-dependency rule
- **B-0519** (P3) — Multi-Otto branch-state contamination RCA

This PR regenerates the index. The drift was pre-existing and surfacing as a non-required failure on every recent PR (e.g., the warning on [#3221](https://github.com/Lucent-Financial-Group/Zeta/pull/3221) which surfaced it). Pure index-drift fix; no per-row file changes.

Regenerated via `BACKLOG_WRITE_FORCE=1 bun tools/backlog/generate-index.ts`.

## Test plan

- [x] Diff is exactly +3 lines (one per missing row)
- [x] `bun tools/backlog/generate-index.ts --check` should be clean post-merge
- [ ] Auto-merge clears the `check docs/BACKLOG.md generated-index drift` gate

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-14T20:29:53Z)

## Pull request overview

Pure regeneration of the auto-generated `docs/BACKLOG.md` index to pick up three on-disk backlog rows (B-0517, B-0518, B-0519) that existed under `docs/backlog/P1/` and `docs/backlog/P3/` but were missing from the rendered index. The drift was surfacing as a non-required CI failure on recent PRs; this restores parity between per-row files and the index.

**Changes:**
- Add B-0518 entry under the P1 section.
- Add B-0517 and B-0519 entries under the P3 section.
