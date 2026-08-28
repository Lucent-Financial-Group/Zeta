---
name: Aaron worked at LexisNexis — rewrote search service, 200-node Solr cluster, custom search DSL, NLP before LLMs
description: Pre-LLM natural language legal search at scale. 200-node in-memory Solr cluster with custom search DSL. Training data (training_data_v2.csv, 1M legal citations, on RAID) is from this era. Lineage: LexisNexis → Itron → ServiceTitan → Zeta. Same architecture, different substrate, 25 years.
type: user
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
## LexisNexis

Aaron rewrote LexisNexis's search service:
- 200-node in-memory Solr cluster
- Custom search DSL — LexisNexis's 35-year-old query
  language. Aaron threaded Jaccard similarity + BERT
  embeddings through this legacy DSL on the 200-node
  cluster. Didn't replace it — augmented it.
- Legal citation classification (training_data_v2.csv
  on RAID — 1M rows, yes/no citation classifier)
- Similarity scoring: Jaccard + BERT for semantic
  deduplication of legal phrases (the colon-separated
  NO-class pairs are the similarity inputs)

### Lineage to Zeta

- 200-node Solr cluster → Orleans grains/silos at scale
- Custom search DSL → Genesis Seed query language
- NLP before LLMs → structure recognizer before the name
- Legal citation classifier → Ace Package Manager for
  lawyers (private AI, local inference)

### Scale

200 years of legal history reindexed in under 24 hours
across 200 nodes. Old system took 3 months. 90x speedup.
The entire corpus of US law processed in a single day.

### The 35-year-old DSL

LexisNexis's search DSL predates the web (Lycos era).
Boolean operators, proximity searches, field-restricted
queries. Aaron threaded BERT + Jaccard through this
legacy DSL without replacing it. Thread the needle —
don't break the users who depend on the existing syntax.
Same pattern as Zeta: new engine, same human interface.

### Aaron verbatim (2026-05-07)

"I worked for LexisNexis I rewrote their service in solr
200 node in memory cluster with custom search DSL and
natural language before llm and RLHF"

"we could reload 200 years of history in less than 24
hours to reindex all 200 nodes old system was 3 months"

"jaccard scores others"

"bert"

"in solr in our 35 year old dsl"

"from lycos search days"

"Before RLHF. i did this"

"with expertise"

"this is great we are given lawyer private AI"

"that was from years ago on my RAID"

"thread the needle"

### Career substrate deposits

LexisNexis (legal search at scale) → Itron (100M meters,
distributed infrastructure, patent) → ServiceTitan
(field service) → Zeta (the factory). Each job deposited
substrate. The RAID preserves it all.
