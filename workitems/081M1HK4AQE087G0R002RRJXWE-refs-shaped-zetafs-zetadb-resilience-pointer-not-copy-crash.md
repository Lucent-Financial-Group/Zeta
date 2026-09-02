---
id: 081M1HK4AQE087G0R002RRJXWE
type: task
state: backlog
priority: P1
slug: refs-shaped-zetafs-zetadb-resilience-pointer-not-copy-crash
title: "ReFS-shaped ZetaFS/ZetaDB resilience: pointer-not-copy, crash DST, cache co-design, CoW amplification bound"
created: 2026-09-02T17:37:07.310Z
depends_on: []
composes_with: ["081M1HGD1QA087G0R001GRHPFW", "081M1C59ZG4087G0R000VM8DZN"]
---

# ReFS-shaped ZetaFS/ZetaDB resilience: pointer-not-copy, crash DST, cache co-design, CoW amplification bound

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1HK4AQE087G0R002RRJXWE-*.md` glob. -->

Beacon: Windows ReFS (allocate-on-write, block cloning, integrity streams) — **feel, not a port**.

D9–D12 live in:

- [`docs/design/2026-09-02-zetadb-roadmap-event-sourced-streaming-sql-not-feldera-on-postgres.md`](../docs/design/2026-09-02-zetadb-roadmap-event-sourced-streaming-sql-not-feldera-on-postgres.md)
- [`docs/design/2026-08-30-zetafs-first-product-cas-store-per-entity-policy.md`](../docs/design/2026-08-30-zetafs-first-product-cas-store-per-entity-policy.md)

This slice: the requirements plus two falsifiers (Jumprope 1-byte edit reuses chunks; rolling(2) of 5 versions leaves 3 reclaim-eligible). Crash recovery stays `toy` until first-product PR12. Do not claim ReFS-class repair on one disk.
