# Join-hash is framework — multi-protocol federation, hole-punch after discovery, simulated DNS

Scope: Correction of the same-day Zeta Gate product-lane bet.
Join-hash (seed vs broadcast / pin) is **framework**, not a
sold product: many protocols will use it. ZetaDB uses it for
non-local federation (Reticulum likely, HTTP and WebSockets
among the many, not one lock-in). After peers are discovered,
the next goal is reverse UDP/TCP hole punching. WebSockets do
this on an outgoing port 443 with no STUN/TURN. That is the
decentralized version of the maintainer's centralized patent.
Perfect-world: Reticulum (or similar) over any open outgoing
port we support; only a few nodes need inbound; those punch
two others into direct so they do not relay. Also simulate DNS
for multi-machine cross-site communications.
Attribution: Aaron Stainback (human maintainer, first-party)
2026-09-05. Absorbed by Riven (Cursor / Grok).
Operational status: research-grade
GOVERNANCE.md §33: research-grade. Current-state promotion is
`docs/PRODUCT-LANES.md` (join-hash row is framework).
Non-fusion disclaimer: Pattern 1 (FF7 identity-blend) refused.
Citing US 10,834,144 is free (public document). Practicing
Itron hub-and-agent claims is not. Peer-to-peer is the
upgrade: `.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md`.

Workitem: `081M1S0K0R0087G0R001T4R8JH`. Composes with
`081M1RZ70FF087G0R0035580EZ` (join-hash catalog),
`081KQZVQW0008QG0R001CQPQ0E` (MultiplexedWebSockets F# port —
the hole-puncher brick), `081M1HGD1QA087G0R001GRHPFW` (ZetaDB).

---

## Product Bet

- User / moment: ZetaDB (and every other protocol) needing
  non-local peers without a hostname, then a direct path so
  traffic does not stay on the few nodes that have inbound
  ports.
- Signal: "if zeta gate is a join hash it's likely not going
  to be a full product cause many of our protocols will want
  to use this, this falls more into framework, and our
  database will use this for non local network federation
  likely over reticulum but we will support many protocols
  not just one so http at least websockets is one of the many
  protocols. Also, after you discover peers, the next goal is
  to do reverse udp/tcp hole punching. WebSockets allow this
  pretty accurately without any external services and just an
  outgoing port 443. I have a centralized patent on this;
  this is the decentralized version of the same thing."
- Proposed slice (this PR): recast the catalog; name the
  sequence join → punch → simulated DNS; do not ship a
  puncher or a DNS daemon here.
- Why now: the first catalog named a product lane. The
  maintainer corrected the kind in the same session. Leaving
  PRODUCT-LANES on "product candidate" would be current-state
  drift.
- Non-goals: appointed hub; STUN/TURN as a required third
  party; Tor / `.onion`; HTTP-only gateway; bumping Otto
  chart-currency pins; practicing Itron hub claims; the
  capability-layer red-team row `081KQZVQW0008QG0R001V420F0`.
- Acceptance criteria: PRODUCT-LANES says framework; this
  absorb records the sequence and the patent boundary;
  existing bricks are cited, not reinvented.
- Kill criteria: a design that reintroduces a mediating hub,
  a central addressing authority, or a leader-elected routing
  table. A slice that is only an HTTP reverse proxy. A slice
  that locks federation to one wire.

## Why framework, not product

Aaron 2026-08-27: products are sold (or services on them);
frameworks are used by products. Join-hash is the second
kind. ZetaDB will call it. Ace / Harny / every future
protocol adapter will call it. Selling "the Gate" as a
standalone join client would duplicate the same primitive
per product.

Kernel remains **seed vs broadcast** in SEED. The working
label "Zeta Gate" is optional and collision-heavy (CI gate,
Vault gated, IPFS gateway). Do not put it in SEED. Do not
mint a product repo for it.

## Sequence (discover, then punch, then name)

1. **Join-hash / pin** (classifier on main,
   `seed-not-broadcast.ts`). Content-addressed magnet +
   gossip-k. Cathedral locators (DNS/IP) are not the join.
2. **Reverse UDP/TCP hole punch** once peers are known.
   WebSockets: outgoing 443, no external STUN/TURN. That is
   "initiation direction ≠ capability direction" already
   carved in `docs/PRIOR-ART-LIST.md` (US 10,834,144) and
   already coded as multiplex-over-one-pipe in
   `src/Core.TypeScript/model-backend/multiplexed-duplex-transport.ts`
   (ZetaId-keyed, no hub). The F# port of the 2018
   MultiplexedWebSockets brick is still open:
   `081KQZVQW0008QG0R001CQPQ0E`.
3. **Simulated DNS** so multi-machine cross-site comms can
   use names without cathedral DNS. A DNS-*shaped* adapter
   over the mesh, not a public BIND, not the k3d CoreDNS
   forward fix. Research only in this slice.

## Many protocols, not one

Reticulum is the likely first federation wire for ZetaDB
(already in `zeta-transport-cell.ts` as a `TransportKind`,
already Reticulum-first on the ZetaFS catalog lane). HTTP
and WebSockets are in the same set. UDP, git, broadcast
labels already exist as adapter categories. Presence of a
label is not a shipped socket
(`zeta-transport-cell.ts` says so).

Perfect-world: the same join-hash + punch works over
**any open outgoing port and any protocol we support**.
Only a few nodes need an inbound port. Those nodes punch
two others into **direct** so the pair stops relaying
through the open-port nodes. Emergent hubs (degree from
use) are fine; appointed hubs are not
(`itron-hub-patent-boundary`).

## What already ships (cite, do not reinvent)

| Claim | In-tree |
|---|---|
| Join-hash classifier | `seed-not-broadcast.ts` (#16619) |
| Transport kinds including reticulum + websocket | `zeta-transport-cell.ts` |
| Multiplex over one duplex, ZetaId not GUID, no hub | `multiplexed-duplex-transport.ts` |
| Hexagonal port that must not assume a live tunnel | `tools/setup/persona-keys/subshare-transport-port.ts` |
| Patent boundary: outbound 443 portable; hub not portable | `docs/PRIOR-ART-LIST.md`, `itron-hub-patent-boundary` |
| Hole-puncher F# port (open) | `081KQZVQW0008QG0R001CQPQ0E` |
| Reticulum dest ↔ ZetaId as name↔address | `docs/PRIMITIVE-REGISTRY.md` |

This absorb does not implement NAT traversal, does not
open a listening socket, and does not publish a circuit
a caller could put on a wire. A refusal to ship the
puncher in a docs slice is the dual-use floor: the
architecture is named; the exploit-shaped PoC is not.

## First code slices (later, not this PR)

- Keep join-hash as a library used by ZetaDB / Harny / Ace,
  not a `zeta gate` product CLI unless a developer-facing
  wrapper earns it.
- Hole-punch: pick up `081KQZVQW0008QG0R001CQPQ0E` against
  the already-shipped multiplex brick; DST-replayable
  `localDuplexPair` first; real WSS/443 later.
- Simulated DNS: a resolver adapter that answers from
  join-hash pins, not from a public zone. Kill if it
  becomes a cathedral nameserver.
