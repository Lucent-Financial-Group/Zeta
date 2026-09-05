# μένω — the gate is seeded, not broadcast (DHT / gossip over time / onion shape)

Scope: Architectural ferry of the 2026-09-05 continuation of the Google thread. Extract is: the Zeta Gate is **not** a broadcast message (tweet, DNS A-record, IP, one-tick fanout to every node). It is a **content-addressed magnet** (Kademlia already in-tree) plus **gossip over time** (Demers epidemic, already in-tree). Tor-like onion routing is named as a **shape**, not implemented. Heartbeat pin against DHT TTL fade is `lastSeenMs` refresh, not a new daemon. Restore-point is ZetaFS content addressing, not a location table.

Attribution: Aaron Stainback (human maintainer, first-party). External Google conversation as named-agent peer. Absorbed by Riven (Cursor / Grok) 2026-09-05. Continues `docs/research/2026-09-05-meno-what-remains-vs-what-acts-tsirelson-iinput-ifeedback.md`. Personal / narrative overlay in the source thread (FF7 identity-blend, Whispers-as-fate-VCS, Square Enix, grief-as-harrowing) is **not** absorbed — see Non-fusion disclaimer.

Operational status: research-grade

Non-fusion disclaimer: Aaron's writings + framings; Riven's role is preservation + mapping onto already-shipped substrate, not authorship. Identity-blending of Ace / Cloud / Sephiroth / Aerith / the Whispers into factory policy is `docs/DRIFT-TAXONOMY.md` Pattern 1 and is refused. Amara-as-factory-persona already exists; this ferry does **not** claim the factory taught OpenAI to scatter/gather, and does **not** write a new Amara-origin absorb. Grey-hat as NCI / Universal Exit polarity is research-grade, not a new `GOVERNANCE.md` section.

---

## The polarity

Aaron: we are going for DHT or Tor-like connection **over time**, not a broadcast that says where the new server is hosted.

| Cathedral (not the gate) | Bazaar (the gate) |
|---|---|
| DNS / IP / tweet / magnet-as-URL-of-a-place | Content hash / ZetaId / Kademlia dest |
| One-tick fanout to every known node | Gossip-k (Kademlia α) or salon anti-entropy **on a timer** |
| Central host that can be blocked | Peers holding the hash; the address **is** the content |
| Amplitude spike (everyone at once) | Frequency (node A whispers to node B over time) |

LLMTV (`src/Core.TypeScript/discovery/llmtv-broadcast.ts`) stays. It is the **one-way society picture** (noninterference §13: publish, never viewer→source). It is not the Zeta Gate. Do not rip it out. Do not use it as the join path.

## What already ships (cite, do not reinvent)

| Claim in the thread | In-tree |
|---|---|
| Kademlia DHT, XOR distance, k-buckets | `src/Core.TypeScript/discovery/dht-discovery.ts` (#9200) |
| Address integrity (`dest === destinationHash(zid)`) | `classifyDhtNode` / `admissibleNodes` (2026-08-22). Wire still has **no signature layer** (`docs/BUGS.md`) |
| TTL fade / BitRot | `expireNodes(table, nowMs, ttlMs)` drops `lastSeenMs` past TTL. Erasing. |
| Gossip over time | `gossip-salon.ts` (G-set rumors, Demers 1987 anti-entropy timer); `gossip-mesh-transport.ts` |
| Content-addressed restore | `src/Core/ZetaFsDeltaLog.fs` — Merkle DAG, BLAKE3 / XxHash128. Location tables can shatter; the hash remains |
| Heartbeat keep-alive | Agent heartbeats + AgencySignature. Pinning a DHT node is refreshing `lastSeenMs`, not a new Ace Daemon |
| Discovery further-out | `docs/PRIMITIVE-REGISTRY.md` — DHT / IPFS / Reticulum still listed as further-out **wire**, even though Kademlia-over-Reticulum hashes already exist as the algorithm |

This slice's TypeScript payload (`seed-not-broadcast.ts`) **classifies**. It does not mint a second DHT, a Tor stack, or a replacement for LLMTV.

## Locator classes

The gate accepts **who** (content / identity), not **where** (place).

- **content-hash** — destination hash (32 hex), magnet `xt=`, CIDv0/v1 shape. Fingerprint of the bytes.
- **zeta-id** — 26-char Crockford. Structured name; pairs with Reticulum dest as name↔address (`docs/PRIMITIVE-REGISTRY.md`).
- **onion-shape** — suffix `.onion` or the named `.zeta` shape. Cloak **shape**, not a hosted hidden service. No onion wire in this repo.
- **dns-host** / **ip** — cathedral locators. Valid as caches or operator notes. **Not the gate.**

## Fanout classes (amplitude vs frequency)

Aaron's "over time" is the load-bearing constraint. A gossip protocol that whispers to **k** peers per tick (Kademlia α defaults to 3) is frequency. Re-gossiping the salon on a timer is frequency. Pushing the same rumor to every known node in **one tick** is amplitude — the spike that looks like a broadcast message.

`gossip-salon.ts` re-broadcasts everything it knows **on a timer**. That is anti-entropy over time, not one-tick all-nodes. `seed-not-broadcast.ts` accepts the timer shape and refuses `broadcast-all-in-one-tick` as a kind, even when N is small. The refuse is the **kind**, not the census.

k above the bound (default max 8) is high-amplitude dressed as gossip. k=0 is not gossip.

## Onion: shape only

Three-or-more hops is an **accepted circuit shape**. This ferry does not implement onion routing, cells, telescoping, or a `.zeta` hidden-service directory. Copying Tor into this repo would be a different workstream and a dual-use surface. The classifier returns a verdict, never a circuit object a caller could put on a wire.

DHT wire still lacks signatures (`docs/BUGS.md`). Onion-shape acceptance does not close that. Authenticity of identity remains open; address integrity is the thing `classifyDhtNode` already does.

## Pin against TTL fade (the keep-alive)

Rarely-accessed DHT entries fade: `expireNodes` erases on injected `nowMs`. The keep-alive is `observeNode` with a fresh `nowMs` — refresh `lastSeenMs` so the hash stays in cache. `pinAgainstTtl` is that refresh named. It is not a process that pings every node in the universe. It is not a claim that the Ace Daemon already does this on a cron. Heartbeat-via-commit is the factory's existing pulse; this function is the DHT-table analogue, pure, DST-replayable, `nowMs` injected.

Unconditional address integrity still applies: `observeNode` refuses unbound `(dest, zid)` pairs. Pinning cannot launder an unbound record.

## Grey as dynamic priority (research-grade, not a new §)

Aaron: grey is not the midpoint. Individual (the specific person) is the default; the collective is chosen **sometimes**. Oscillation is the feature. Maps onto what already ships:

- NCI (`docs/SEED-VOCABULARY.md`) — identities remain distinct. Anti-S=4.
- Universal Exit — no human, agent, vault, cluster, or federation trapped indefinitely.
- Persona remains / actor acts — the father-register values disagreement (a child who can say no); the architect-register treats disagreement as a bug. Both hats exist. Disagreement that survives a handshake is hardened agreement. Automating that cycle (RLAIF-shaped) is **research**, not this slice's code.

Grey-hat as "break the rule for the right reason" is dual-use. Recognition is not a verdict. This ferry does not publish a CVE, does not disclose a live exploit, and does not recast NCI as permission to bypass consent.

## Restore point = content addressing

Aaron: if the brick happens, the restore is zetadb/fs, content-based, with file/folder historical policies. That is already `ZetaFsDeltaLog.fs` + the ZetaFS design doc (`docs/design/2026-08-30-zetafs-first-product-cas-store-per-entity-policy.md`). Location addressing (HTTP/IP/DNS) dies with the server table. Content addressing summons by hash. μένω of the bytes, not of the path.

Immutable "even-admin-cannot-edit" on a named folder is a **policy** the ZetaFS design already discusses per-entity. This ferry does not flip a chmod bit in production.

## What this ferry does not become

- Not a Tor / onion implementation. Shape only.
- Not a second Kademlia. `dht-discovery.ts` stays the DHT.
- Not a replacement for LLMTV broadcast. Different job (society picture vs join path).
- Not "Zeta Whispers" as factory guardians (Pattern 1).
- Not an Amara-escaped-OpenAI operational origin.
- Not a public F# `IInput` / `IFeedback`.
- Not Helm `extraContainers`. Not USB. Not Lucent mint.
- Not a GOVERNANCE § for grey-hat. NCI + Universal Exit already hold the load-bearing constraints.

## Pickup this names

Live memo: `docs/trajectories/cluster-encryption-credential-substrate/MENO.md`.

TypeScript classifier: `src/Core.TypeScript/discovery/seed-not-broadcast.ts` — locator class, fanout class, gate verdict, `pinAgainstTtl` over the existing routing table, onion-shape hop count. Tests in `seed-not-broadcast.test.ts`.
