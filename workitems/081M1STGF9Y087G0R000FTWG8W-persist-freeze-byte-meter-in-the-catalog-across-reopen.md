---
id: 081M1STGF9Y087G0R000FTWG8W
type: task
state: in-progress
priority: P2
slug: persist-freeze-byte-meter-in-the-catalog-across-reopen
title: "Persist freeze-byte meter in the catalog across reopen"
created: 2026-09-05T22:20:00.000Z
depends_on: []
composes_with:
  - 081M1SS7F78087G0R001Q9KBP5
---

# Persist freeze-byte meter in the catalog across reopen

The freeze-byte meter was RAM-only. Reopen used leftover orphan sizes
because pacer(0) deletes nothing. Catalog line `meter N` now rides
the dual-slot file. Reclaim consume persists 0.

Falsifier: freeze A; reopen; meter equals the freeze span. Recovery
stays `toy`.
