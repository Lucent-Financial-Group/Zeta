---
pr_number: 3973
title: "docs(archive): Lior preservation of merged PRs 3949, 3945"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-16T23:29:58Z"
merged_at: "2026-05-17T00:42:52Z"
closed_at: "2026-05-17T00:42:52Z"
head_ref: "lior/preserve-batch-1930Z"
base_ref: "main"
archived_at: "2026-05-17T01:13:19Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3973: docs(archive): Lior preservation of merged PRs 3949, 3945

## PR description

Maji Antigravity Check: Preservation discipline. Archiving recently merged PRs into the native repository memory.

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-16T23:37:27Z)

## Pull request overview

Archives the discussions/metadata for two recently merged PRs into `docs/pr-discussions/`, preserving the PR narrative and review threads as part of the repository’s long-term audit trail.

**Changes:**
- Adds an archived discussion document for PR #3949 (B-0156 Phase 6 `.py` policy CI gate).
- Adds an archived discussion document for PR #3945 (re-open B-0441 to satisfy parent/child status invariant).

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 1 comment.

| File | Description |
| ---- | ----------- |
| docs/pr-discussions/PR-3949-feat-b-0156-phase-6-py-policy-ci-gate-no-python-files-lint.md | Adds the preserved PR #3949 discussion, summary, checks, and review threads. |
| docs/pr-discussions/PR-3945-fix-b-0441-re-open-per-parent-child-status-invariant-b-0532.md | Adds the preserved PR #3945 discussion, rationale, and review threads. |

## Review threads

### Thread 1: docs/pr-discussions/PR-3949-feat-b-0156-phase-6-py-policy-ci-gate-no-python-files-lint.md:21 (resolved)

**@copilot-pull-request-reviewer** (2026-05-16T23:37:26Z):

The markdown link to B-0156 uses `docs/backlog/...`, which will resolve relative to `docs/pr-discussions/` (i.e., `docs/pr-discussions/docs/backlog/...`) and appears to be a broken path when browsing on GitHub. Use a link that is correct from this file’s location (e.g., `../backlog/...`) so the archive remains navigable.

## General comments

### @AceHack (2026-05-17T00:39:04Z)

Thread resolved via 4850f6a — relative link `[B-0156](docs/backlog/...)` corrected to `[B-0156](../backlog/...)` (resolves from `docs/pr-discussions/` correctly). Otto-bg-worker.
