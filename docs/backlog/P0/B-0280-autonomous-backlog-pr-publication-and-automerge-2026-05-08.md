---
id: B-0280
priority: P0
status: open
title: "Autonomous backlog pickup - PR publication and auto-merge"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0249
depends_on: [B-0279]
classification: buildable-now
decomposition: atomic
owners: [architect, codex]
---

# B-0280 - PR publication and auto-merge

Turn one autonomous backlog pickup into a reviewable GitHub PR
without the maintainer acting as courier or permission surface.

## Acceptance criteria

- Runs the focused checks required by the selected row.
- Commits with the Codex `Co-Authored-By` trailer.
- Pushes the claim branch.
- Opens a PR with summary, checks, and selected backlog row.
- Arms auto-merge only when the PR has no unresolved review threads
  and required checks are clean or pending.

## Progress

- 2026-05-08: First implementation slice adds
  `tools/backlog/pr-publication-plan.ts`, a deterministic PR packet
  builder for selected backlog rows, focused check summaries, and
  auto-merge eligibility. Full row remains open until the executor path
  performs the push/create/auto-merge sequence end to end.
- 2026-05-08: Second implementation slice adds the deterministic Codex
  commit command, including the required Codex co-author trailer, to the
  publication plan.
