---
id: B-0347
priority: P1
status: open
title: "Carved-sentence skill descriptions — fit 200+ skills into routing budget"
effort: M
created: 2026-05-09
last_updated: 2026-05-09
depends_on: []
classification: buildable-now
decomposition: atomic
owners: [skill-expert]
type: friction-reducer
tags: [skill-routing, context-budget, carved-sentence]
---

# B-0347 — Carved-sentence skill descriptions

## Problem

`/doctor` reports 54 skill descriptions exceed the per-entry
cap and 209 descriptions are dropped from the skill listing.
At the default 1% `skillListingBudgetFraction` (raised to 2%
as immediate relief), multi-paragraph skill descriptions
consume too much context budget — causing the router to drop
skills entirely, making them invisible to cold-start agents.

## Fix

Carve every skill's `description:` frontmatter field down to
a single routing-quality sentence. The description's job is
to trigger correct routing, not to teach the skill's content
— that's what the skill body is for.

### Shape

```
# Before (200+ tokens, gets truncated/dropped):
description: Capability skill ("hat") — Elasticsearch /
  OpenSearch narrow. Owns the distributed engine layer
  above Lucene: cluster topology (master / data / ingest /
  coordinating-only / ML / transform roles), shard
  allocation ... [500 words]

# After (one carved sentence, routes correctly):
description: Elasticsearch / OpenSearch — shards, ILM,
  Query DSL, aggregations, kNN, cross-cluster, security.
```

### Rules for the carved sentence

1. One sentence, under 120 characters preferred
2. Name the domain and 3-7 key routing terms
3. No "Capability skill (hat)" boilerplate — the router
   doesn't need it
4. No "Owns the..." or "Covers the..." preamble
5. No citations, no "Wear this when...", no "Defers to..."
   — those belong in the skill body
6. Test: would a cold-start agent match this description
   to the right task? If yes, it's carved enough.

## Acceptance criteria

- [ ] All 200+ skills have description under 150 chars
- [ ] `/doctor` reports 0 descriptions exceeding per-entry cap
- [ ] `/doctor` reports 0 descriptions dropped
- [ ] Routing quality verified: spot-check 10 skills by
  asking the router and confirming correct match

## Immediate mitigation (done)

`skillListingBudgetFraction` raised to 0.02 (2%) in
`.claude/settings.json`. This doubles the budget but is
a band-aid — the structural fix is shorter descriptions.

## Composes with

- B-0161 (CLAUDE.md trim) — same context-budget pressure
- The skill-router-as-substrate-inventory CLAUDE.md bullet
- `skill-tune-up` and `skill-improver` — they can execute
  the carving pass
