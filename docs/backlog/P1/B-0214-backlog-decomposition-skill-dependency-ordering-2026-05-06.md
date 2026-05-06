---
id: B-0214
priority: P1
status: open
title: "Backlog decomposition skill — break architectural directions into dependency-ordered items"
created: 2026-05-06
last_updated: 2026-05-06
decomposition: atomic
depends_on: []
---

# B-0214 — Backlog decomposition skill

A reusable skill for taking a large architectural direction
(like "fractal BFT" or "shadow listening") and decomposing it
into concrete backlog items with proper `depends_on:` chains,
classifying what can be built now vs what has prerequisites.

## What the skill does

1. Takes an architectural concept or session output as input
2. Identifies the concrete deliverables within it
3. Maps dependencies between deliverables
4. Creates backlog items (B-NNNN) with frontmatter including
   `depends_on:` pointing to prerequisites
5. Classifies each item: buildable-now / blocked-on-X / research-needed
6. Regenerates BACKLOG.md index

## Distinct from

- `backlog-scrum-master` — grooms/prioritizes existing items;
  this skill CREATES items from architectural directions
- `next-steps` — recommends what to work on; this skill
  decomposes what exists into workable units
- `skill-creator` — creates skills; this creates backlog items

## Acceptance criteria

1. SKILL.md authored via skill-creator workflow
2. Can decompose a session's architectural output into 5+ items
   with correct dependency ordering in under 10 minutes
3. Generated items pass the backlog schema validation
