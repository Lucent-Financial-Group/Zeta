---
id: 081M1TF1ZAJ087G0R001BHVDPS
type: task
state: backlog
priority: P2
slug: pwrite-during-freeze-keeps-contentid-at-snapshot-g
title: "pwrite during freeze keeps ContentId at snapshot G"
created: 2026-09-06T04:19:05.682Z
depends_on: []
composes_with: []
---

# pwrite during freeze keeps ContentId at snapshot G

PR7 protocol: snapshot mutbuf generation G before CDC; concurrent pwrite
hits G+1. Falsifier: `createManualStream`, enqueue Journaled freeze, pwrite
different bytes, `pumpLog`. ContentId equals Jumprope of G, not G+1.
Does not promote PR12 recovery out of `toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TF1ZAJ087G0R001BHVDPS-*.md` glob. -->
