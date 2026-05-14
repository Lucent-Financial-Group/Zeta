---
pr_number: 3065
title: "fix(backlog): resolve B-0370-0373 collisions \u2014 renumber P2 contributor-compliance set \u2192 B-0452-0455"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-13T23:32:45Z"
merged_at: "2026-05-14T00:04:09Z"
closed_at: "2026-05-14T00:04:09Z"
head_ref: "fix/b0370-0373-id-collision-renumber-p2-set-to-b0452-b0455-2026-05-14"
base_ref: "main"
archived_at: "2026-05-14T00:06:43Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3065: fix(backlog): resolve B-0370-0373 collisions — renumber P2 contributor-compliance set → B-0452-0455

## PR description

## Summary

Third per-collision cleanup from the [B-0451](docs/backlog/P1/B-0451-duplicate-row-id-substrate-cleanup-2026-05-13.md) sweep. Four collisions form one connected cluster (B-0092 parent + internal `depends_on` chain).

## The collisions

| ID | Earlier P1 ([#2269](https://github.com/Lucent-Financial-Group/Zeta/pull/2269), 2026-05-09) | Later P2 ([#2683](https://github.com/Lucent-Financial-Group/Zeta/pull/2683), 2026-05-11) |
|---|---|---|
| B-0370 | durable-computation-checkpoint-interface-extension | contributor-compliance-core-document-authoring |
| B-0371 | pages-seo-metadata-jsonld-social-preview | contributor-compliance-cross-reference-integration |
| B-0372 | pages-sitemap-robots-ai-crawler-policy | t1-t2-self-audit-and-cadenced-review-trajectories |
| B-0373 | alignment-proof-primitive-ladder-one-type-one-property | t4-t5-onboarding-and-drift-retrospective-trajectories |

## Resolution: keep P1 set, renumber P2 set

Per first-merged-wins + external-references:

- The P1 set was filed 2 days earlier via [#2269](https://github.com/Lucent-Financial-Group/Zeta/pull/2269) (itself a prior collision-resolution sweep).
- B-0370 P1 + B-0373 P1 are already shipped (`[x]` in BACKLOG.md).
- External P1 references in [PR review history](docs/history/pr-reviews/PR-2369-fix-backlog-refresh-generated-index-after-pr-2367.md) and a [memory file](memory/feedback_shadow_lesson_log_otto_catches_2026_05_07.md).
- The P2 set's references are internal (parent + chain) — editable in this PR.

→ Keep P1 set; renumber P2 set as a unit:

```
B-0370 → B-0452 (contributor-compliance-core)
B-0371 → B-0453 (cross-reference-integration)
B-0372 → B-0454 (T1+T2 trajectories)
B-0373 → B-0455 (T4+T5 trajectories)
```

## Internal-chain remap

- `B-0453.depends_on: [B-0370]` → `[B-0452]`
- `B-0454.depends_on: [B-0370]` → `[B-0452]`
- `B-0455.depends_on: [B-0370, B-0371]` → `[B-0452, B-0453]`
- [B-0092](docs/backlog/P2/B-0092-public-company-contributor-compliance-doc-and-cadenced-trajectories-aaron-2026-04-28.md) parent body §Decomposition updated to new IDs with renumber note

Each row has `renumbered_from: B-NNNN` + reason in frontmatter.

## Empirical effect

| Signal | Before | After |
|---|---|---|
| Duplicate-ID groups | 11 | 7 |

[B-0451](docs/backlog/P1/B-0451-duplicate-row-id-substrate-cleanup-2026-05-13.md) cleanup progress: **1/12 → 9/12** (after [#3058](https://github.com/Lucent-Financial-Group/Zeta/pull/3058) merges too).

Remaining 3 groups: `B-0409` (3-way), `B-0410`, `B-0411`.

## Test plan

- [x] All 4 P2 files renamed (`git mv` preserves history where possible)
- [x] Internal `depends_on` chain remapped (3 rows)
- [x] B-0092 parent body §Decomposition updated
- [x] `bun tools/backlog/generate-index.ts` regenerated `docs/BACKLOG.md`
- [x] Inline audit confirms 11 → 7
- [x] Worktree-isolated build (`/tmp/zeta-b0370-fix`)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-13T23:34:04Z)

## Pull request overview

Mechanical renumber of the P2 contributor-compliance child set (B-0370–B-0373 → B-0452–B-0455) to resolve ID collisions with an earlier-filed P1 set, plus remap of the internal `depends_on` chain and parent decomposition section in B-0092.

**Changes:**
- Renamed/renumbered four P2 rows (B-0370–B-0373 → B-0452–B-0455) with `renumbered_from` + reason in frontmatter and updated body titles
- Remapped internal `depends_on` references (`[B-0370]` → `[B-0452]`, `[B-0370, B-0371]` → `[B-0452, B-0453]`) and updated B-0092 §Decomposition with renumber note and new children list
- Regenerated `docs/BACKLOG.md` to reflect the new IDs in the P2 section

### Reviewed changes

Copilot reviewed 7 out of 7 changed files in this pull request and generated no comments.

<details>
<summary>Show a summary per file</summary>

| File | Description |
| ---- | ----------- |
| docs/backlog/P2/B-0452-contributor-compliance-core-document-authoring.md | Renumber from B-0370; add renumbered_from + reason |
| docs/backlog/P2/B-0453-contributor-compliance-cross-reference-integration.md | Renumber from B-0371; remap depends_on to B-0452 |
| docs/backlog/P2/B-0454-t1-t2-self-audit-and-cadenced-review-trajectories.md | Renumber from B-0372; remap depends_on to B-0452 |
| docs/backlog/P2/B-0455-t4-t5-onboarding-and-drift-retrospective-trajectories.md | Renumber from B-0373; remap depends_on to [B-0452, B-0453] |
| docs/backlog/P2/B-0092-...-aaron-2026-04-28.md | Update §Decomposition with new child IDs + renumber note |
| docs/BACKLOG.md | Regenerated index — P2 entries moved to new IDs |
</details>

### COMMENTED — @copilot-pull-request-reviewer (2026-05-13T23:37:56Z)

## Pull request overview

Copilot reviewed 8 out of 8 changed files in this pull request and generated no new comments.

### COMMENTED — @copilot-pull-request-reviewer (2026-05-13T23:44:16Z)

## Pull request overview

Copilot reviewed 10 out of 10 changed files in this pull request and generated no new comments.

### COMMENTED — @copilot-pull-request-reviewer (2026-05-13T23:51:25Z)

## Pull request overview

Copilot reviewed 11 out of 11 changed files in this pull request and generated no new comments.

### COMMENTED — @copilot-pull-request-reviewer (2026-05-13T23:57:38Z)

## Pull request overview

Copilot reviewed 12 out of 12 changed files in this pull request and generated no new comments.

### COMMENTED — @copilot-pull-request-reviewer (2026-05-14T00:03:34Z)

## Pull request overview

Copilot reviewed 13 out of 13 changed files in this pull request and generated no new comments.

## General comments

### @chatgpt-codex-connector (2026-05-13T23:32:49Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
