---
id: B-0363
priority: P2
status: open
title: "Git-native full-text inverted index — Lucene-style search over repo substrate"
effort: M
created: 2026-05-09
last_updated: 2026-05-09
depends_on: [B-0362]
classification: research
decomposition: needs-decomposition
owners: [architect]
type: feature
tags: [search, lucene, inverted-index, git-native, full-text]
---

# B-0363 — Git-native full-text inverted index

## What

Build a Lucene-style inverted index stored as git-native
committed files. Two-layer search architecture:

| Layer | Purpose | Size | Speed |
| ----- | ------- | ---- | ----- |
| Concept index (B-0362) | Curated regex standing queries | ~1MB | 22ms |
| Full-text index (this) | Ad-hoc search across corpus | ~5-10MB | <100ms |

The concept index handles "what touches Otto-357?" (standing
queries). The full-text index handles "where did anyone mention
'watermark backpressure'?" (ad-hoc grep replacement).

## Design

- **Term dictionaries**: sorted JSON files, one per segment
- **Posting lists**: arrays of `{file, line, position}`
- **Merge policy**: compact segments on commit (like Lucene's
  tiered merge)
- **All git-tracked**: segments are committed artifacts, survive
  across sessions and hosts, diffable
- **Rebuild**: `bun tools/search/build-fulltext.ts` writes
  segment files
- **Query**: `bun tools/search/query.ts <terms>` reads segments

## Implementation options

1. **Pure TS**: custom inverted index in ~200 lines. No deps.
   Limited but sufficient for ~3000 files.
2. **minisearch**: tiny JS full-text search library (~10KB).
   Serialize index to JSON.
3. **Tantivy via FFI**: Rust-grade search. Overkill for this
   corpus size but exercises the `search-engine-library-expert`
   skill on own substrate.

## Origin

Aaron 2026-05-09: "we could always do git native lucene for
full text rx"

## Size guardrail

Per Vera's guardrails on B-0362: if the full-text index
exceeds 10MB, investigate whether the tokenizer is too
aggressive or the corpus has grown beyond the design point.

## Composes with

- B-0362 (concept index — curated layer stays as-is)
- `search-engine-library-expert` skill (Lucene idioms)
- `full-text-search-expert` skill (IR foundations)
- B-0360 (DBSP identity continuity — index as materialized view)
