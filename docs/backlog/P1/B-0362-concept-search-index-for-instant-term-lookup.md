---
id: B-0362
priority: P1
status: open
title: "Concept search index — pre-built term→file mapping for instant lookups"
effort: S
created: 2026-05-09
last_updated: 2026-05-09
depends_on: [B-0310]
classification: buildable-now
decomposition: atomic
owners: [architect]
type: friction-reducer
tags: [search, index, concept-registry, performance]
---

# B-0362 — Concept search index

## What

Build a pre-computed term→file index over memory/, docs/,
and .claude/ so concept lookups are instant instead of
grep-slow.

### Problem

`grep -rn "Confucius" memory/ docs/ .claude/` scans ~1500
files every time. With 930 in-repo memory files, 200+ skills,
and hundreds of docs, this takes seconds. Agents do this
lookup frequently (prior-art search, concept discovery,
lineage tracing).

### Solution

`tools/search/build-index.ts` — pre-builds a JSON index:
```json
{
  "confucius": ["memory/feedback_confucius_unfolding_*.md", ...],
  "pearl": ["reference_formal_methods_literature_map_*.md", ...],
  "shield": ["docs/backlog/P2/B-0359-*.md", ...]
}
```

`tools/search/lookup.ts <term>` — queries the index, returns
file paths in <1ms.

Index rebuilt on commit (or on-demand via `bun tools/search/build-index.ts`).

## Acceptance criteria

- [ ] `bun tools/search/build-index.ts` builds index in <5s
- [ ] `bun tools/search/lookup.ts <term>` returns results in <100ms
- [ ] Index covers memory/, docs/, .claude/skills/, .claude/rules/
- [ ] Supports multi-word queries (AND semantics)

## Origin

Aaron 2026-05-09: "why did this grep take so long? we need
to have an index"

## Composes with

- B-0310 (concept-registry — structured concept IDs)
- B-0361 (anchor to human lineage — needs fast lookup)
- B-0332 (load-bearing classifier — needs to scan references)
