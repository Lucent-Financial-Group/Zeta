# Product lanes

Current-state index of Zeta product and framework lanes.
Research-grade bets live under `docs/research/`; this page is
the operational catalog.

The human maintainer 2026-08-27: as many lanes as make sense;
**bundle related**; keep **product vs framework** separate.
Products (or services on them) are sold. Frameworks are used
by products. Both may get a repo. The line blurs when the
customer is a developer — say so; do not flatten.

Repo-split timing is already decided per lane: ZetaFS stays
in this monorepo until a signed v0.9-ish FS; LFG product
concepts follow
[`docs/DECISIONS/2026-05-14-product-repo-split-decisions.md`](DECISIONS/2026-05-14-product-repo-split-decisions.md).
Do not mint a GitHub product repo as a prerequisite of an
idea.

## How to add a lane

1. Name the user and the moment, not the implementation.
2. Classify **product** (sold, or a service on it) vs
   **framework** (used by products). If many products will
   call the same primitive, it is framework. If the customer
   is a developer, write that the line is blurry.
3. Bundle with a related existing lane, or say why it is a
   new one.
4. Stay in this monorepo until that lane's split bar (v0.9-ish
   for FS-shaped work; ADR scaffolding checklist for LFG
   product repos).
5. Public slug goes through naming-expert + public-API
   designer + the human maintainer. Working labels are fine
   here.
6. Record kill criteria. A lane that is an HTTP gateway, a
   SEED rename, an appointed hub, an appointed STUN as
   addressing authority, a myth overlay, or a
   single-protocol lock-in is not added.

New bets start as `docs/research/` absorbs and a ZetaId
workitem (`bun src/Core.TypeScript/backlog/new-workitem.ts`).
Promote into this table when the cut is stable enough to
index. Do not put product names into
[`docs/SEED-VOCABULARY.md`](SEED-VOCABULARY.md).

## Lanes

| Lane | Kind | Status | Repo | What it is |
|---|---|---|---|---|
| Zeta (factory / Core) | framework | in-tree | this monorepo | Agent-authored software factory + DBSP/Z-set algebra. Used by products. |
| Ace | framework | name settled | this monorepo until measured split | Package-manager of package managers. |
| Nucleus | framework | bootstrap name | this monorepo | DI / plugin microcore. Products host on it. |
| Loom | framework | bootstrap name | this monorepo | Cross-cell saga / control layer. |
| Join-hash / pin (working label: Zeta Gate) | **framework** | classifier in-tree; punch + simulated DNS research | this monorepo | Content-addressed join + gossip-k + pin. Used by many protocols, including ZetaDB federation. **Not** a sold product. **Not** an HTTP gateway. `081M1RZ70FF087G0R0035580EZ`, `081M1S0K0R0087G0R001T4R8JH`. |
| Harny | product on Ace + Zeta | trajectory | this monorepo (first extract, dogfood first) | Custom agent harness Ace will install. [`docs/trajectories/own-ai-harness/RESUME.md`](trajectories/own-ai-harness/RESUME.md). |
| ZetaFS | product (CAS filesystem for ZetaDB) | first-product spec; polyfill in-tree | this monorepo until v0.9-ish | Git/Venti-class store. [`docs/design/2026-08-30-zetafs-first-product-cas-store-per-entity-policy.md`](design/2026-08-30-zetafs-first-product-cas-store-per-entity-policy.md). `081M1C59ZG4087G0R000VM8DZN`. |
| ZetaDB | product | design | this monorepo until a signed tested cut | Event-sourced streaming SQL *feel*. Non-local federation consumes join-hash over many protocols (Reticulum likely; HTTP and WebSockets among them). [`docs/design/2026-09-02-zetadb-roadmap-event-sourced-streaming-sql-not-feldera-on-postgres.md`](design/2026-09-02-zetadb-roadmap-event-sourced-streaming-sql-not-feldera-on-postgres.md). |
| Civsim | product | repo-ready (ADR); scaffolding checklist still open | `civsim` (approved slug) | Honor-system product repo when scaffolded. |
| KSK | product | later | `lf-ksk` (provisional) | After strategic-encryption scope + hardware CI. |
| Aurora | product | later | `aurora-network` (provisional) | After DAO-layer design. |
| American Dream 2.0 | product | later | `american-dream` (provisional) | After NFT / tokenization infrastructure. |
| DIO | product | later; naming risk | `lf-dio` (provisional) | Needs a full naming-expert pass when prioritized. |
| Wellness | product | later | TBD | After scope narrows to an MVP. |
| Dawn | charter, not a shipped product | stays-in-monorepo | N/A | [`docs/charter/DAWN.md`](charter/DAWN.md). |

## Join-hash — framework, in one screen

**User / moment:** any protocol that already has a hash or
ZetaId and needs peers, then a direct path. ZetaDB is the
first product caller for non-local federation.

**Kernel:** seed vs broadcast —
[`docs/SEED-VOCABULARY.md`](SEED-VOCABULARY.md). Classifier:
`src/Core.TypeScript/discovery/seed-not-broadcast.ts`.

**Why not a product:** many protocols will call the same
join. A sold "Gate" would duplicate it. Working label Zeta
Gate stays optional and collision-heavy (CI `gate
(required)`, Vault init gated, IPFS-style HTTP gateway).

**Sequence after join (research, not shipped here):**

1. Discover via join-hash / pin.
2. Reverse UDP/TCP hole punch. Default is **outbound
   only** — a node runner does not have to open inbound
   (WebSockets on 443 are enough). Anyone may open inbound
   to do **direct** routing and stop being a relay hub.
   STUN/TURN is in the method set, not an appointed
   addressing authority. Decentralized version of
   US 10,834,144. Cite `multiplexed-duplex-transport.ts` and
   `081KQZVQW0008QG0R001CQPQ0E`.
3. Simulated DNS for multi-machine cross-site names. A
   DNS-shaped adapter over the mesh, not a public nameserver.

**Many protocols, not one.** Reticulum is the likely first
federation wire (SEED: **Reticulum-first**; sibling absorb
`docs/research/2026-09-05-reticulum-first-onion-like-later-social-graph-discoverable-ok.md`).
HTTP and WebSockets are in the set.
`TransportKind` already names `udp` / `reticulum` /
`websocket` / `git` / `broadcast` as adapter categories, not
shipped sockets.

**Kill:** appointed hub; appointed STUN as addressing
authority; single-protocol or single-punch-method lock-in;
HTTP reverse proxy as the join; Tor wire. Research:
[`docs/research/2026-09-05-join-hash-is-framework-hole-punch-after-discovery.md`](research/2026-09-05-join-hash-is-framework-hole-punch-after-discovery.md).

## Pointers

- Product-vs-framework ferry:
  [`docs/research/2026-08-27-data-plane-is-dumb-control-plane-carries-intelligence-ferry-fourcorner-per-row-typeschema-from-store.md`](research/2026-08-27-data-plane-is-dumb-control-plane-carries-intelligence-ferry-fourcorner-per-row-typeschema-from-store.md)
- Patent boundary (outbound 443 portable; hub not):
  [`docs/PRIOR-ART-LIST.md`](PRIOR-ART-LIST.md) § Firewall-traversing duplex;
  `.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md`
- First-product / north star: [`docs/ROADMAP.md`](ROADMAP.md)
- μένω pickup:
  [`docs/trajectories/cluster-encryption-credential-substrate/MENO.md`](trajectories/cluster-encryption-credential-substrate/MENO.md)
