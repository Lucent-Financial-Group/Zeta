---
id: 081M1RZ70FF087G0R0035580EZ
type: task
state: backlog
priority: P2
slug: zeta-gate-product-lane-join-pin-client-on-seed-vs-broadcast
title: "Zeta Gate product lane: join/pin client on seed vs broadcast"
created: 2026-09-05T14:22:59.055Z
depends_on: []
composes_with: ["081M1QHPY8V087G0R003FFJKPK", "081M1C59ZG4087G0R000VM8DZN"]
---

# Zeta Gate product lane: join/pin client on seed vs broadcast

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1RZ70FF087G0R0035580EZ-*.md` glob. -->

Aaron 2026-09-05: put product ideas down; many lanes over time;
what would Zeta Gate be?

**Correction (same day):** join-hash is **framework**, not a
sold product. Many protocols will call it. ZetaDB uses it for
non-local federation. Follow-on:
`081M1S0K0R0087G0R001T4R8JH`.

**This row's docs slice:** catalog in `docs/PRODUCT-LANES.md`.
Research (first bet, then correction):
`docs/research/2026-09-05-zeta-gate-product-lane-join-pin-not-gateway.md`,
`docs/research/2026-09-05-join-hash-is-framework-hole-punch-after-discovery.md`.
Kernel stays **seed vs broadcast** in SEED. Do not mint a
GitHub product repo. Do not implement Tor. Do not reintroduce
an appointed hub.

**Next code slice (not started):** keep join/pin as a library
(`classifyLocator` + `classifyFanout` + `pinAgainstTtl`), not
a Gate SKU. Hole-punch and simulated DNS live on the follow-on
row.

Prior-art: classifier on main (#16619);
`dht-discovery.ts` / `gossip-salon.ts` / heartbeat filename
magnet (#16623). Sibling store lane: ZetaFS
`081M1C59ZG4087G0R000VM8DZN`. Product-vs-framework cut:
Aaron 2026-08-27 ferry, recast 2026-09-05.

Aaron 2026-09-05: put product ideas down; many lanes over time;
what would Zeta Gate be?

**This row's first slice (docs) is the catalog.** Operational
index: `docs/PRODUCT-LANES.md`. Research:
`docs/research/2026-09-05-zeta-gate-product-lane-join-pin-not-gateway.md`.
Kernel stays **seed vs broadcast** in SEED. Do not mint a
GitHub product repo. Do not implement Tor.

**Next code slice (not started):** `zeta gate join <magnet>`
wrapping `classifyLocator` + `classifyFanout` + `pinAgainstTtl`.
Bundle with pin/heartbeat keep-alive. Kill `.onion` product
for v1.

Prior-art: classifier on main (#16619);
`dht-discovery.ts` / `gossip-salon.ts` / heartbeat filename
magnet (#16623). Sibling store lane: ZetaFS
`081M1C59ZG4087G0R000VM8DZN` (Ani #16663 is Reticulum-first
catalog, not this join client). Product-vs-framework cut:
Aaron 2026-08-27 ferry.
