# Zeta Gate as a join/pin idea — corrected same day: framework, not a product

Scope: PM-2 product-discovery absorb of Aaron 2026-09-05: put
product ideas down; many lanes over time; what would Zeta Gate
*be*? This file is the research-grade *first* bet. **Correction
(same day):** join-hash is framework, not a sold product —
`docs/research/2026-09-05-join-hash-is-framework-hole-punch-after-discovery.md`.
The operational index is `docs/PRODUCT-LANES.md`.
Attribution: Aaron Stainback (human maintainer) asked for the
lane catalog and named the working label. Riven (Cursor / Grok)
shaped the options. Kernel name **seed vs broadcast** already
landed in `docs/SEED-VOCABULARY.md` (Ani, #16623); this absorb
does not put "Zeta Gate" back into SEED.
Operational status: research-grade
GOVERNANCE.md §33: research-grade, not factory policy until
promoted. Promotion of the *index* is `docs/PRODUCT-LANES.md`
(current-state). Promotion of a public slug is naming-expert +
Ilyana + Aaron, not this file.
Non-fusion disclaimer: identity-blending of Ace / Cloud /
Sephiroth / Aerith / the Whispers into a product myth is
`docs/DRIFT-TAXONOMY.md` Pattern 1 and is refused. A product
that cannot be explained without that overlay is not a product
yet.

Workitem: `081M1RZ70FF087G0R0035580EZ`. Composes with
`081M1QHPY8V087G0R003FFJKPK` (μένω / seed vs broadcast
classifier) and `081M1C59ZG4087G0R000VM8DZN` (ZetaFS first
product — sibling store lane, not this join client).

---

## Product Bet

- User / moment: an operator or agent who already holds a
  content hash or ZetaId and needs peers, not a hostname.
- Signal: "we can also put product ideas down what would zeta
  gate be? we are going to end up with many product lanes over
  time."
- Proposed slice (this PR): catalog the lanes; name Zeta Gate
  as a *candidate product* on the already-shipped classifier.
  Do not ship a CLI here.
- Why now: the classifier is on main (`seed-not-broadcast.ts`,
  #16619). Without a product-vs-framework cut, "Zeta Gate"
  collapses into the kernel name Ani already razored out of
  SEED, or into an IPFS-style HTTP gateway.
- Non-goals: SEED rename; Tor / `.onion` / `.zeta` hidden
  service; replacing LLMTV; Helm unsealer sidecar; minting a
  GitHub product repo; absorbing FF7 as factory policy.
- Acceptance criteria (this docs slice): `docs/PRODUCT-LANES.md`
  exists; this absorb records options A/B/C; SEED is unchanged;
  naming collisions are flagged; the first code slice is named
  and not implemented.
- Kill criteria: if the first slice is an HTTP gateway or a
  `.onion` directory, stop. If the pitch needs the Google-thread
  myth overlay, it is not a product yet. If it renames the
  SEED kernel to Zeta Gate, stop.

## The cut (already decided, 2026-08-27)

Aaron, on product vs framework:

> we can have as many product lanes as maks sense but it's
> better to bundle related things and also keep product and
> framework seperate, they both can deserve their own repo but
> products are sold or services against them sold, and
> frameworks are used by products lol. both important and
> sometimes the line is blury when your customers are
> developers.

Full ferry:
`docs/research/2026-08-27-data-plane-is-dumb-control-plane-carries-intelligence-ferry-fourcorner-per-row-typeschema-from-store.md`
§ Product vs framework.

| Layer | Name | What it is |
|---|---|---|
| Protocol / kernel | seed vs broadcast | Content-addressed magnet + gossip over time. Already SEED. |
| Framework | `dht-discovery.ts`, `gossip-salon.ts`, `seed-not-broadcast.ts`, `write-heartbeat.ts`, ZetaFS algebra | Used by products. Not sold as "the Gate." |
| Product candidate | **Zeta Gate** (working label) | The join / pin / handshake **product** a human or agent uses to enter a mesh without DNS/IP. |

The customer here is often a developer or an agent. Say the
line is blurry; do not flatten Gate into "just another CLI
flag on the factory."

## What Zeta Gate is not

In networking, "gate" often means an HTTP **gateway** (IPFS
gateway = cathedral: a host that speaks location-addressed
HTTP in front of a DHT). This product is **not** a reverse
proxy in front of Kademlia. Magnet in, gossip-k, pin so remain
does not fade. The address is the content.

It is also not:

- the CI check named `gate (required)`
- Vault init remaining gated (`operator init`)
- LLMTV (`llmtv-broadcast.ts`) — one-way society picture,
  noninterference §13, not the join path
- a `.zeta` hidden-service directory or a Tor stack (onion is
  hop-count **shape** in the classifier; Ani #16663 is already
  Reticulum-first, not `.onion`)
- ZetaFS / ZetaDB (store / database product; bundle-related
  fails — different user moment)

## Options (do not lock one as the requirement)

**A — Join CLI (recommended first code slice).**
`zeta gate join <magnet>` wrapping `classifyLocator` +
`classifyFanout` + `pinAgainstTtl`. Thinnest. Classifier
already on main. User moment: I have a hash, give me a pin
in the local table, refuse DNS/IP as the join locator.

**B — Pin service bundled with heartbeat keep-alive.**
Related to A (same remain-does-not-fade job). Heartbeat
filename as 32-hex magnet is already on main (#16623). Can
merge into A later. Do not invent a second daemon.

**C — `.zeta` hidden-service / onion product. Kill for v1.**
No Tor wire. Classifier returns a verdict, never a circuit
object. Sibling lane #16663 already says Reticulum-first.

Bundle A+B as one lane. Do not bundle with ZetaFS (store) or
LLMTV (society picture). Stay in this monorepo until the same
v0.9-ish bar as ZetaFS
(`docs/research/2026-09-01-zetafs-stays-in-monorepo-until-v09-then-product-per-language-ir-oracles.md`).
Do not mint a GitHub product repo as a prerequisite.

## Naming collisions (advisory; human-final)

Working label only. Branding-specialist + Ilyana before any
public slug, README product name, or NuGet id.

Known collisions inside this repo:

- CI job / ruleset `gate (required)`
- Vault ceremony: init remains **gated**
- Classifier comments in `seed-not-broadcast.ts` that still
  say "the Zeta Gate" as join-path metaphor — kernel in SEED
  is seed vs broadcast; do not "fix" those comments by
  putting the product name into SEED

If the public name cannot survive those collisions, pick
another slug. Do not bikeshed in this absorb.

## First code slice (not this PR)

When someone picks the workitem:

1. A `zeta gate join` (or Harny-plugin equivalent) that
   classifies the locator, refuses cathedral join, applies
   gossip-k, pins `lastSeenMs`.
2. Tests that go red if DNS/IP is accepted as the join
   locator, if fanout is `broadcast-all-in-one-tick`, or if
   pin skips address integrity.
3. Still no socket, no onion wire, no second DHT.

Validation path: existing `seed-not-broadcast.test.ts` plus a
CLI-level falsifier. Demo is a magnet in / pin out, not a
browser gateway page.
