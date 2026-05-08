---
id: B-0280
priority: P0
status: open
title: "Autonomous backlog pickup - PR publication and auto-merge"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0249
depends_on: [B-0279]
classification: blocked-on-B-0279
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
