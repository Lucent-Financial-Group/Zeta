---
id: 081M1TJMTY4087G0R0024AA4DB
type: task
state: backlog
priority: P2
slug: isimulatedfs-write-fail-on-blockcas-put-keeps-the-prior-free
title: "ISimulatedFs write-fail on BlockCas put keeps the prior freeze"
created: 2026-09-06T05:21:49.508Z
depends_on: []
composes_with: []
---

# ISimulatedFs write-fail on BlockCas put keeps the prior freeze

POSIX object put already maps `ISimulatedFs` write-fail to `FreezeError.Fsync`.
The product path (`create` / `createManual` / `createManualWithBlockStore`)
puts CAS through `BlockCas.Put`. Same door, same Fsync, prior freeze stays
readable. Recovery stays `toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TJMTY4087G0R0024AA4DB-*.md` glob. -->
