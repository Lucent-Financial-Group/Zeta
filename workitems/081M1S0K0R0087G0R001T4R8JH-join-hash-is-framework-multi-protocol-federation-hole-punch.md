---
id: 081M1S0K0R0087G0R001T4R8JH
type: task
state: backlog
priority: P2
slug: join-hash-is-framework-multi-protocol-federation-hole-punch
title: "Join-hash is framework: multi-protocol federation, hole-punch after discovery, simulated DNS"
created: 2026-09-05T14:47:01.120Z
depends_on: []
composes_with: ["081M1RZ70FF087G0R0035580EZ", "081KQZVQW0008QG0R001CQPQ0E", "081M1HGD1QA087G0R001GRHPFW"]
---

# Join-hash is framework: multi-protocol federation, hole-punch after discovery, simulated DNS

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1S0K0R0087G0R001T4R8JH-*.md` glob. -->

Aaron 2026-09-05: join-hash is framework (many protocols will
use it). ZetaDB federation likely over Reticulum, but HTTP
and WebSockets are in the set. After discovery: reverse
UDP/TCP hole punch (WS outgoing 443, no STUN/TURN) — the
decentralized version of US 10,834,144. Few inbound nodes
punch two others into direct. Also simulate DNS for
cross-site names.

Docs this slice: `docs/PRODUCT-LANES.md` +
`docs/research/2026-09-05-join-hash-is-framework-hole-punch-after-discovery.md`.

Do not implement the puncher here. Pickup of the existing
MultiplexedWebSockets F# port is `081KQZVQW0008QG0R001CQPQ0E`.
Do not practice Itron hub claims. Do not lock to one wire.
Do not pick up the capability-layer red-team row
`081KQZVQW0008QG0R001V420F0` as this work.
