---
id: 081M1W3WCPG087G0R00217F66M
type: task
state: backlog
priority: P2
slug: d10-documented-mapping-durabilitymode-to-freeze-class
title: "D10 documented mapping DurabilityMode to freeze class"
created: 2026-09-06T19:42:17.296Z
depends_on: []
composes_with: []
---

# D10 documented mapping DurabilityMode to freeze class

D10 asked for one named class or a documented mapping. This is the mapping,
not a merge: `OsBuffered`/`InMemoryOnly` → freeze `Buffered`;
`StableStorage`/`WitnessDurable` → freeze `Durable`. Freeze `Journaled` has
no DurabilityMode twin. Not an equivalence (Windows Durable refuse vs
StableStorage still ships; Darwin F_FULLFSYNC vs fsync). Falsifier: total
match on all four modes; Journaled maps to None. Does not unify the cache.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1W3WCPG087G0R00217F66M-*.md` glob. -->
