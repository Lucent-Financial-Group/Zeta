---
id: 081M1ETY8TY087G0R0022CT4R5
type: task
state: backlog
priority: P1
slug: dbsp-ingest-ofarray-k-way-input-coalesce-vs-pairwise-add
title: "DBSP ingest: ofArray + k-way input coalesce vs pairwise add"
created: 2026-09-01T15:55:54.078Z
depends_on: []
composes_with: []
---

# DBSP ingest: ofArray + k-way input coalesce vs pairwise add

Nexmark Q1–Q8 used to `Send` N singleton Z-sets then one `Step`.
`ZSetInputOp` pairwise-added the queue (O(n²) allocs). Feldera batches.

Acceptance:

- `ZSet.ofArray` equals `ofKeys` on the same array; empty is empty.
- N singleton Sends then one Step equals one `ofArray` Send then Step
  (queue + channel input).
- `ofArray` allocates less than pairwise singleton `add` at N=256.
- Feldera.Bench Q1/Q2 hoist circuit construction out of the iteration.
- `docs/BENCHMARKS.md` does not compare micro-ops to Feldera events/s.

Beacon: Budiu et al. VLDB 2023 (DBSP batches); Feldera Nexmark harness.
