---
id: 081M1TBFTYF087G0R001AKT57E
type: task
state: backlog
priority: P2
slug: persist-objectsets-in-known-pins-so-reopen-hash-verifies-jum
title: "Persist ObjectSets in known.pins so reopen hash-verifies jumprope internals"
created: 2026-09-06T03:16:45.647Z
depends_on: []
composes_with: []
---

# Persist ObjectSets in known.pins so reopen hash-verifies jumprope internals

Replay used to fill ObjectSets from freeze-intent (trunk + leaves). Jumprope
internals were pinned and stored but not hash-verified after reopen. Catalog
now writes `set <content-hex> <id-hex>...` under the dual-slot CRC generation.
Replay keeps a non-empty catalog set. Falsifier: XOR a jumprope internal, reopen,
`isReadable` is false. Recovery stays `toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TBFTYF087G0R001AKT57E-*.md` glob. -->
