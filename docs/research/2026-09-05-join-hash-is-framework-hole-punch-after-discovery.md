# Join-hash is framework — multi-protocol federation, hole-punch after discovery, simulated DNS

Scope: Correction of the same-day Zeta Gate product-lane bet.
Join-hash (seed vs broadcast / pin) is **framework**, not a
sold product: many protocols will use it. ZetaDB uses it for
non-local federation (Reticulum likely, HTTP and WebSockets
among the many). After discovery: reverse UDP/TCP hole punch.
A node runner does **not** have to open inbound; outgoing 443
WebSockets are enough. Anyone may open inbound to do direct
routing and stop being a relay hub. STUN/TURN is in the
method set, not an appointed addressing authority. Also
simulate DNS for multi-machine cross-site communications.
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

- User / moment: a node runner who can join without opening
  inbound ports; optionally opens inbound so a pair can go
  direct and they stop being a relay hub.
- Signal (join-hash is framework): many protocols will use
  this, including ZetaDB federation.
- Signal (inbound optional; STUN/TURN in the set): "if you
  are a node runner you don't have to open incoming ports if
  we do it right but to stop being an hub we allow anyone to
  open incoming ports and do the direct message routing,
  also we are likly going to want to support STUN/TURN too."
- Proposed slice (this PR): recast inbound as optional and
  permissionless; put STUN/TURN in the method set; do not
  ship a puncher, STUN server, or DNS daemon.
- Why now: the previous absorb said "no STUN/TURN." That
  over-killed a method. Same session, the maintainer
  corrected it.
- Non-goals: appointed hub; STUN/TURN as the *only* path or
  an appointed addressing authority; Tor / `.onion`;
  HTTP-only gateway; bumping Otto chart-currency pins;
  practicing Itron hub claims; the capability-layer red-team
  row `081KQZVQW0008QG0R001V420F0`.
- Acceptance criteria: PRODUCT-LANES says outbound-only is
  enough to run; inbound is how anyone exits being a relay;
  STUN/TURN is listed with the methods.
- Kill criteria: a mediating hub, a central addressing
  authority, or a leader-elected routing table. A vendor
  STUN that becomes the addressing authority. A slice that
  locks federation to one wire or one punch method.

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
   Default: outgoing only. WebSockets on 443 are enough that
   a node runner does **not** have to open inbound
   ("initiation direction ≠ capability direction",
   US 10,834,144, already in `docs/PRIOR-ART-LIST.md`).
   Multiplex-over-one-pipe is already
   `src/Core.TypeScript/model-backend/multiplexed-duplex-transport.ts`
   (ZetaId-keyed, no hub). F# port still open:
   `081KQZVQW0008QG0R001CQPQ0E`.
   STUN/TURN (RFC 5389 / RFC 8656) are **in the method set**,
   same shape as HTTP/WS among protocols: support them; do
   not appoint a vendor STUN as the addressing authority.
3. **Simulated DNS** so multi-machine cross-site comms can
   use names without cathedral DNS. A DNS-*shaped* adapter
   over the mesh, not a public BIND, not the k3d CoreDNS
   forward fix. Research only in this slice.

## Inbound is optional — opening it is how you stop being a hub

A node runner does not have to open incoming ports if the
outbound path is done right. Relays appear by use (emergent
degree). To *stop* being a hub, **anyone** may open inbound
and do direct message routing so the pair leaves the relay.

| Role | Ports | Meaning |
|---|---|---|
| Node runner (default) | outbound only | Enough to participate. WS/443 is the no-inbound-required path. |
| Volunteer inbound | anyone may | Direct routing. How a relay stops being a hub: the pair punches to direct. |
| Appointed hub | forbidden | Degree from use is fine; a title is not. |

This is the same cut as `itron-hub-patent-boundary`: hubs are
fine, appointment is not. Opening inbound is permissionless
volunteer capacity, not a role someone is given.

## Many protocols, not one — and many punch methods, not one

Reticulum is the likely first federation wire for ZetaDB
(SEED: Reticulum-first; sibling absorb
`docs/research/2026-09-05-reticulum-first-onion-like-later-social-graph-discoverable-ok.md`;
already in `zeta-transport-cell.ts` as a `TransportKind`). HTTP
and WebSockets are in the same set. UDP, git, broadcast
labels already exist as adapter categories. Presence of a
label is not a shipped socket
(`zeta-transport-cell.ts` says so).

Punch methods in the same set: reverse UDP/TCP hole punch,
WebSockets on outgoing 443, and STUN/TURN. Kill locking to
one of them. Kill a STUN/TURN *vendor* that becomes the
addressing authority (cathedral). Do not kill the protocols.

Perfect-world: the same join-hash + punch works over
**any open outgoing port and any protocol we support**.
Inbound is optional. Nodes that volunteer inbound punch
two others into **direct** so the pair stops relaying.

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
  `localDuplexPair` first; real WSS/443 later. STUN/TURN as
  adapters in the same set, never as an appointed addressing
  authority.
- Simulated DNS: a resolver adapter that answers from
  join-hash pins, not from a public zone. Kill if it
  becomes a cathedral nameserver.
