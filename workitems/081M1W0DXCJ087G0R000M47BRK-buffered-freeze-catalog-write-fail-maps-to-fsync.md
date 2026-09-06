---
id: 081M1W0DXCJ087G0R000M47BRK
type: task
state: backlog
priority: P2
slug: buffered-freeze-catalog-write-fail-maps-to-fsync
title: "Buffered freeze catalog write-fail maps to Fsync"
created: 2026-09-06T18:41:57.138Z
depends_on: []
composes_with: []
---

# Buffered freeze catalog write-fail maps to Fsync

Journaled freeze maps catalog persist IOException/BUGGIFY to `FreezeError.Fsync`
inside FreezeLog. Buffered freeze never rides that boat: it `putObject`s then
`persistCatalog`s, and a write-fail throws. Map the Volume persist on that path
to Fsync and keep a prior Journaled freeze readable. History setter / reclaim
meter persist still throw. Recovery stays `toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1W0DXCJ087G0R000M47BRK-*.md` glob. -->
