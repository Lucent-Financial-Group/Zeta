---
id: B-0275
priority: P1
status: open
title: "Structure recognizer — shape-indexed catalog without labels"
created: 2026-05-08
parent: B-0240
depends_on: [B-0274]
classification: blocked-on-B-0274
decomposition: atomic
---

# B-0275 — Shape-indexed catalog

Build a catalog that indexes code structures by
fingerprint, not by name/label. Query by shape.

## Acceptance criteria

- Catalog data structure defined
- Query function: given a shape, return matching structures
- At least one test with real Zeta code as input
