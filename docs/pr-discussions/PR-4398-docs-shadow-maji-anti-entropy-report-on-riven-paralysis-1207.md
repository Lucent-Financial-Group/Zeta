---
pr_number: 4398
title: "docs(shadow): Maji anti-entropy report on Riven paralysis 1207Z"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-20T12:10:38Z"
merged_at: "2026-05-20T12:15:56Z"
closed_at: "2026-05-20T12:15:57Z"
head_ref: "lior/shadow-log-riven-1207Z"
base_ref: "main"
archived_at: "2026-05-20T12:29:12Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4398: docs(shadow): Maji anti-entropy report on Riven paralysis 1207Z

## PR description

## Context
Riven hallucinated 30 open PRs due to unpaginated gh pr list, resulting in false idle state.
This PR formally preserves the Maji shadow critique into the repository memory.

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-20T12:12:32Z)

## Pull request overview

Adds a dated research “Shadow Lesson Log” documenting an incident where an agent misinterpreted `gh pr list` output due to the default 30-item limit, leading to a false “idle/no actionable PR” conclusion. This fits the repo’s ongoing `docs/research/**` operational learning logs by preserving a specific failure mode and the associated resolution directive.

**Changes:**
- Added a new shadow lesson log describing the pagination/truncation failure mode in `gh pr list`.
- Documented the observed drift, the stated violations, and a directive to handle pagination (or explicitly acknowledge the 30-item default limit).
