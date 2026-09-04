---
id: 081M1PZKGK9087G0R001E7A0QG
type: task
state: backlog
priority: P2
slug: exercise-weaviate-bm25-and-hybrid-search-before-anyone-plans
title: "exercise Weaviate BM25 and hybrid search before anyone plans on it"
created: 2026-09-04T19:51:19.913Z
depends_on: []
composes_with: []
---

# exercise Weaviate BM25 and hybrid search before anyone plans on it

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1PZKGK9087G0R001E7A0QG-*.md` glob. -->

## The claim, and why it needs exercising

Weaviate 17.8.3 is deployed, and its own chart values describe a hybrid query surface —
*"Performs a hybrid search combining vector similarity and keyword matching (BM25) on a
collection."* If that holds, **we already have an application-level text index** and need
no separate search engine for most purposes: keyword search, vector search, and the hybrid
of the two, in one engine already running.

**Nobody has run it.** The capability is read from the chart's values and from upstream's
documented feature set. That is a declared capability, not an exercised one — and a
declared capability planned upon is the shape this repo keeps finding as a defect.

## The check, which is small

1. Create a collection with a text property.
2. Index a handful of documents.
3. Run a **BM25 keyword** query — assert it ranks on term match, not embedding distance.
4. Run a **hybrid** query — assert it returns results a pure-vector query would miss
   (an exact-token match with no semantic neighbourhood) and vice versa.

Step 4 is the one that matters. A hybrid query that returns the same ranking as a vector
query has not demonstrated hybrid anything, which is the vacuity form of this test.

## What turns on the answer

If it holds, the search question is **closed** for application-level use and the engines
listed in the research doc (OpenSearch, Quickwit, Zoekt, Meilisearch) stay unneeded.

If it does not, the constraint is licence-shaped: **Elasticsearch is the obvious name and
the wrong answer** — SSPL/ELv2 are not OSI-approved. OpenSearch (Apache-2.0) is the fork
that exists because of that, and Quickwit (Apache-2.0) would sit directly on the seaweedfs
we already run.

Research: `docs/research/2026-09-04-cassandra-turns-on-nothing-here-and-we-already-have-a-text-index.md`
