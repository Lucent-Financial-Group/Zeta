# Product lanes

Current-state index of Zeta product and framework lanes.
Research-grade bets live under `docs/research/`; this page is
the operational catalog.

Aaron 2026-08-27: as many lanes as make sense; **bundle
related**; keep **product vs framework** separate. Products
(or services on them) are sold. Frameworks are used by
products. Both may get a repo. The line blurs when the
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
   **framework** (used by products). If the customer is a
   developer, write that the line is blurry.
3. Bundle with a related existing lane, or say why it is a
   new one.
4. Stay in this monorepo until that lane's split bar (v0.9-ish
   for FS-shaped work; ADR scaffolding checklist for LFG
   product repos).
5. Public slug goes through naming-expert + Ilyana + Aaron.
   Working labels are fine here.
6. Record kill criteria. A lane that is an HTTP gateway, a
   SEED rename, or a myth overlay is not added.

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
| Harny | product on Ace + Zeta | trajectory | this monorepo (first extract, dogfood first) | Custom agent harness Ace will install. [`docs/trajectories/own-ai-harness/RESUME.md`](trajectories/own-ai-harness/RESUME.md). |
| ZetaFS | product (CAS filesystem for ZetaDB) | first-product spec; polyfill in-tree | this monorepo until v0.9-ish | Git/Venti-class store. [`docs/design/2026-08-30-zetafs-first-product-cas-store-per-entity-policy.md`](design/2026-08-30-zetafs-first-product-cas-store-per-entity-policy.md). `081M1C59ZG4087G0R000VM8DZN`. |
| ZetaDB | product | design | this monorepo until a signed tested cut | Event-sourced streaming SQL *feel*; Feldera is the competitor, not Postgres-on-DBSP. [`docs/design/2026-09-02-zetadb-roadmap-event-sourced-streaming-sql-not-feldera-on-postgres.md`](design/2026-09-02-zetadb-roadmap-event-sourced-streaming-sql-not-feldera-on-postgres.md). |
| **Zeta Gate** (working label) | product candidate | idea | this monorepo until the same v0.9-ish bar | Join / pin / handshake client: magnet in, gossip-k, pin so remain does not fade. **Not** an HTTP gateway. **Not** the seed-vs-broadcast kernel. Workitem `081M1RZ70FF087G0R0035580EZ`. |
| Civsim | product | repo-ready (ADR); scaffolding checklist still open | `civsim` (approved slug) | Honor-system product repo when scaffolded. |
| KSK | product | later | `lf-ksk` (provisional) | After strategic-encryption scope + hardware CI. |
| Aurora | product | later | `aurora-network` (provisional) | After DAO-layer design. |
| American Dream 2.0 | product | later | `american-dream` (provisional) | After NFT / tokenization infrastructure. |
| DIO | product | later; naming risk | `lf-dio` (provisional) | Needs a full naming-expert pass when prioritized. |
| Wellness | product | later | TBD | After scope narrows to an MVP. |
| Dawn | charter, not a shipped product | stays-in-monorepo | N/A | [`docs/charter/DAWN.md`](charter/DAWN.md). |

## Zeta Gate — the candidate, in one screen

**User / moment:** you already have a hash or ZetaId and need
peers, not a hostname.

**Kernel (not the product):** seed vs broadcast —
[`docs/SEED-VOCABULARY.md`](SEED-VOCABULARY.md). Classifier:
`src/Core.TypeScript/discovery/seed-not-broadcast.ts`.

**Product (working label):** a join/pin client on that
classifier. Bundle join (A) with pin-against-TTL / heartbeat
keep-alive (B). Kill hidden-service / onion product for v1
(C). Research:
[`docs/research/2026-09-05-zeta-gate-product-lane-join-pin-not-gateway.md`](research/2026-09-05-zeta-gate-product-lane-join-pin-not-gateway.md).

**Collisions to say out loud:** CI `gate (required)`; Vault
init remaining gated; IPFS-style HTTP "gateway." Naming is
human-final.

**Do not bundle with:** ZetaFS (store), LLMTV (society
picture), Tor wire. Sibling in-flight: Ani #16663
(ZetaFS orphan catalog, Reticulum-first) is the store /
transport lane, not this join client.

## Pointers

- Product-vs-framework ferry:
  [`docs/research/2026-08-27-data-plane-is-dumb-control-plane-carries-intelligence-ferry-fourcorner-per-row-typeschema-from-store.md`](research/2026-08-27-data-plane-is-dumb-control-plane-carries-intelligence-ferry-fourcorner-per-row-typeschema-from-store.md)
- First-product / north star: [`docs/ROADMAP.md`](ROADMAP.md)
- μένω pickup:
  [`docs/trajectories/cluster-encryption-credential-substrate/MENO.md`](trajectories/cluster-encryption-credential-substrate/MENO.md)
