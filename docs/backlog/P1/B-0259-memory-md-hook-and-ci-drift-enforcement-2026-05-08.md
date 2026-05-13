---
id: B-0259
priority: P1
status: open
title: "MEMORY.md marker-vs-index - hook and CI drift enforcement"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0066
depends_on: [B-0258]
classification: blocked-on-generator
decomposition: atomic
---

# B-0259 - MEMORY.md hook and CI drift enforcement

Wire generator usage into developer flow and CI so drift is
caught mechanically rather than by reviewer memory.

## Work scope

- Add pre-commit behavior for memory-file changes.
- Add CI check mode for generated-index drift.
- Document failure and remediation workflow.

## Acceptance criteria

- Memory-file edits trigger deterministic index regeneration.
- CI fails when generated output is stale.
- Developer instructions explain how to fix drift.
- No cutover behavior changes in this row.
