---
id: B-0281
priority: P0
status: open
title: "Autonomous pickup — filter backlog for buildable-now items"
created: 2026-05-08
parent: B-0249
depends_on: []
classification: buildable-now
decomposition: atomic
---

# B-0281 — Buildable-now filter

Extend tools/backlog/autonomous-pickup.ts to filter items
by classification: buildable-now. Skip blocked, decomposed
umbrellas, and items with unmet depends_on.

## Acceptance criteria

- autonomous-pickup.ts reads classification field
- Only returns items marked buildable-now
- Skips umbrellas with decomposition: decomposed
- Test verifying filter logic
