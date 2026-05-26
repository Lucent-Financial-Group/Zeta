---
pr_number: 3057
title: "fix(backlog): resolve B-0068.1 ID collision \u2014 renumber Aaron-attributed row \u2192 B-0068.4"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-13T23:10:51Z"
merged_at: "2026-05-13T23:14:38Z"
closed_at: "2026-05-13T23:14:38Z"
head_ref: "fix/b0068.1-id-collision-renumber-aaron-to-b0068.4-2026-05-13"
base_ref: "main"
archived_at: "2026-05-14T00:20:11Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3057: fix(backlog): resolve B-0068.1 ID collision — renumber Aaron-attributed row → B-0068.4

## PR description

## Summary

First per-collision cleanup from the B-0451 sweep (12 duplicate-ID groups surfaced by [`tools/bg/audit-duplicate-row-ids.ts`](tools/bg/audit-duplicate-row-ids.ts) in [#3056](https://github.com/Lucent-Financial-Group/Zeta/pull/3056)).

## The collision

| File | Filed | Scope |
|---|---|---|
| `B-0068.1-forge-cli-ollama-research-slice-aaron-2026-05-10.md` | 2026-05-10 ([#2430](https://github.com/Lucent-Financial-Group/Zeta/pull/2430)) | Forge CLI + Ollama harness integration research slice |
| `B-0068.1-forge-cli-ollama-research-xs-riven-2026-05-11.md` | 2026-05-11 ([#2650](https://github.com/Lucent-Financial-Group/Zeta/pull/2650)) | Forge CLI + Ollama bridge research pass (WebSearch + capability matrix, XS) |

## Resolution

Per the per-collision resolution rule (keep the row with external references):

- The [B-0068 parent row's body](docs/backlog/P2/B-0068-local-ai-trajectory-forge-ollama-direct-integration-aaron-2026-04-28.md) describes Riven's scope ("B-0068.1 (XS, P2, root): Forge CLI + Ollama bridge research (WebSearch + matrix). Unblocks B-0068.3.")
- Sibling rows `B-0068.2` and `B-0068.3` reference "B-0068.1" in `depends_on` / `composes_with` — semantically referring to Riven's atomic XS series
- Aaron's row has **no external references** (verified via `grep`)

→ Keep Riven's row at B-0068.1; renumber Aaron's to next-free **B-0068.4** with `renumbered_from: B-0068.1` + reason recorded.

This bends "first-merged-wins" in favor of the external-references rule, matching [#3053](https://github.com/Lucent-Financial-Group/Zeta/pull/3053)'s precedent.

## Empirical effect

Against pre-#3056 `origin/main`:

| Signal | Before | After |
|---|---|---|
| Duplicate-ID groups | 12 | 11 |

Once #3056 (the audit tool) merges, future Otto can verify via `bun tools/bg/audit-duplicate-row-ids.ts`.

## Test plan

- [x] `git mv` preserves history
- [x] Inline duplicate-ID audit on the branch reports 11 (down from 12)
- [x] `bun tools/backlog/generate-index.ts` regenerated `docs/BACKLOG.md` cleanly
- [x] Worktree-isolated build (`/tmp/zeta-b0068-fix`)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-13T23:13:59Z)

## Pull request overview

Resolves a duplicate backlog-row ID collision by renumbering the Aaron-authored `B-0068.1` row to `B-0068.4`, keeping the externally-referenced `B-0068.1` row intact, and updating the generated backlog index accordingly.

**Changes:**
- Renumbered the per-row file frontmatter from `id: B-0068.1` to `id: B-0068.4`, recording `renumbered_from` / `renumbered_reason` and updating `last_updated`.
- Updated the row’s H1 header to reflect the new ID and renumber provenance.
- Regenerated `docs/BACKLOG.md` to replace the old `B-0068.1` entry with `B-0068.4`.

### Reviewed changes

Copilot reviewed 3 out of 3 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| docs/backlog/P2/B-0068.4-forge-cli-ollama-research-slice-aaron-2026-05-10.md | Updates row ID + renumber provenance metadata for the collision fix. |
| docs/BACKLOG.md | Regenerated index reflecting the new `B-0068.4` row ID. |


<details>
<summary>Comments suppressed due to low confidence (3)</summary>

**docs/backlog/P2/B-0068.4-forge-cli-ollama-research-slice-aaron-2026-05-10.md:5**
* The row title still says "B-0068 child 1" even though this row is now B-0068.4 and B-0068.1 already exists. This is likely to confuse readers of docs/BACKLOG.md; consider updating the title to avoid implying it's the first child (e.g., reference the renumber or describe the scope without a child-number).
**docs/backlog/P2/B-0068.4-forge-cli-ollama-research-slice-aaron-2026-05-10.md:8**
* This child row doesn’t declare `parent: B-0068`, unlike the other B-0068.* siblings (e.g., docs/backlog/P2/B-0068.1-…:6, B-0068.2-…:6, B-0068.3-…:6) and many other dotted IDs (e.g., docs/backlog/P2/B-0054.1-…:9). Adding `parent: B-0068` would make the relationship machine-readable and keep frontmatter consistent.
**docs/backlog/P2/B-0068.4-forge-cli-ollama-research-slice-aaron-2026-05-10.md:11**
* `renumbered_reason` says this cleanup is "tracked in B-0451", but there is no B-0451 backlog row in this branch, and B-0451 is referenced elsewhere as a different planned item (docs/backlog/P1/B-0449-…:136-138). To avoid a dangling/ambiguous reference, consider linking to the concrete tracking row path (once it exists) or referencing the PR/issue that tracks the cleanup instead of the bare ID.
</details>
