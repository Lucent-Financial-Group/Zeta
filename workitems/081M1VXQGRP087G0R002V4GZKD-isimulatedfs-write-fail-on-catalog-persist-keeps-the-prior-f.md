---
id: 081M1VXQGRP087G0R002V4GZKD
type: task
state: backlog
priority: P2
slug: isimulatedfs-write-fail-on-catalog-persist-keeps-the-prior-f
title: "ISimulatedFs write-fail on catalog persist keeps the prior freeze"
created: 2026-09-06T17:54:46.166Z
depends_on: []
composes_with: []
---

# ISimulatedFs write-fail on catalog persist keeps the prior freeze

Object puts already map `ISimulatedFs` write-fail to `FreezeError.Fsync`.
Catalog persist (`known.pins.0` / `known.pins.1` / `known.pins`) did not.
Same door: write-fail on catalog persist does not ack the freeze; prior freeze
stays readable. Recovery stays `toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1VXQGRP087G0R002V4GZKD-*.md` glob. -->
