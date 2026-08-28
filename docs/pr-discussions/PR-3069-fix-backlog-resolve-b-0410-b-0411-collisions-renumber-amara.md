---
pr_number: 3069
title: "fix(backlog): resolve B-0410-B-0411 collisions \u2014 renumber amara series \u2192 B-0457-B-0458"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-14T00:12:18Z"
merged_at: "2026-05-14T00:15:04Z"
closed_at: "2026-05-14T00:15:04Z"
head_ref: "fix/b0410-b0411-id-collision-renumber-amara-series-to-b0457-b0458-2026-05-14"
base_ref: "main"
archived_at: "2026-05-14T00:55:19Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3069: fix(backlog): resolve B-0410-B-0411 collisions — renumber amara series → B-0457-B-0458

## PR description

## Summary

Fourth per-collision cleanup from the [B-0451](docs/backlog/P1/B-0451-duplicate-row-id-substrate-cleanup-2026-05-13.md) sweep. B-0410 + B-0411 form one connected component (amara series: B-0411 depends on B-0410).

## The collisions

| ID | B-0118 amara series ([#2704](https://github.com/Lucent-Financial-Group/Zeta/pull/2704)) | B-0120 peer-call series ([#2706](https://github.com/Lucent-Financial-Group/Zeta/pull/2706)) |
|---|---|---|
| B-0410 | amara.ts core OpenAI API invoke | peer-call-persona-loader-ts-module |
| B-0411 | amara.ts README + courier-debt | grok-ts-persona-flag-impl |

## Resolution: keep B-0120 (peer-call) series

Per external-references rule:

- B-0120 parent's frontmatter lists `children: [B-0410, B-0411]` AND `depends_on: [B-0410, B-0411]` — strong references
- B-0412 (`codex-gemini-ts-persona-flag-impl`) `depends_on: [B-0411]` with body referring to grok-ts integration — refers to peer-call series
- B-0118 parent only has body-text mentions (editable here)

→ Keep B-0120's children at B-0410/B-0411. Renumber amara series:

```
B-0410 → B-0457  (amara.ts core)
B-0411 → B-0458  (amara.ts README + closure)
```

## Empirical effect

| Signal | Before | After |
|---|---|---|
| Duplicate-ID groups | 3 | 1 |

[B-0451](docs/backlog/P1/B-0451-duplicate-row-id-substrate-cleanup-2026-05-13.md) cleanup progress: **9/12 → 11/12**. Only B-0409 3-way remains for future-Otto.

## Test plan

- [x] `git mv` preserves history
- [x] Internal `depends_on` chain remapped (B-0458 → B-0457)
- [x] B-0118 parent body updated to new IDs
- [x] `BACKLOG_WRITE_FORCE=1 bun tools/backlog/generate-index.ts` regenerated
- [x] `bun tools/bg/audit-duplicate-row-ids.ts` confirms 3 → 1
- [x] Worktree-isolated build (`/tmp/zeta-b0410-b0411-fix`)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-14T00:13:47Z)

## Pull request overview

Fourth per-collision cleanup from the B-0451 sweep: renumbers the amara series (B-0410/B-0411) to B-0457/B-0458 to resolve duplicate-ID collisions with B-0120's children (peer-call persona-loader / grok-ts persona flag). The peer-call series is kept at B-0410/B-0411 because B-0120's frontmatter and B-0412 hold stronger external references.

**Changes:**
- Renumber `B-0410` → `B-0457` (amara.ts core) and `B-0411` → `B-0458` (amara.ts README + closure), with `renumbered_from` / `renumbered_reason` frontmatter and remapped internal `depends_on` (B-0458 → B-0457).
- Update B-0118 parent body to point at new child IDs and add note about the renumber.
- Regenerate `docs/BACKLOG.md` so the amara rows appear at B-0457/B-0458 and the duplicate B-0410/B-0411 lines are dropped.

### Reviewed changes

Copilot reviewed 5 out of 5 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| docs/backlog/P2/B-0457-amara-ts-core-openai-api-invoke-flag-parity-ts-first-riven-2026-05-11.md | Renames id to B-0457, bumps last_updated, adds renumbered_from/reason and tag. |
| docs/backlog/P2/B-0458-amara-ts-readme-update-courier-debt-closure-test-invoke-ts-first-riven-2026-05-11.md | Renames id to B-0458, remaps depends_on/composes_with to B-0457, adds renumber metadata. |
| docs/backlog/P2/B-0118-amara-peer-call-headless-cli-bootstrap-end-courier-debt-2026-04-30.md | Updates parent index/status notes to reference new child IDs. |
| docs/BACKLOG.md | Removes old B-0410/B-0411 amara entries; adds B-0457/B-0458 entries. |
