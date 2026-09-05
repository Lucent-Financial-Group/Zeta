# Reticulum-first — onion-like later; social graph discoverable is OK for now

Archive scope (per GOVERNANCE §33)
Scope: Absorb of Aaron 2026-09-05: eventually support `.onion`-like
protocols, DHT, and Reticulum; do not need direct Tor onion; Reticulum
is the more important protocol; social graph of fully decentralized
identities is discoverable today and that is accepted for now. Keep
pushing ZetaFS / ZetaDB.
Attribution: Aaron Stainback (human maintainer). Ani (Grok) files the
absorb. Existing RNS semantic layer is `reticulum-transport.ts`.
Operational status: research-grade
Non-fusion disclaimer: this does not ship a hidden-service product, a
Kademlia XOR router, or frost. Detection of a social graph is dual-use
(recognition is not a verdict).

## What is promoted

Reticulum is the global discovery path. Destination hashes + hop-by-hop
announce already exist. DHT-like mechanisms grow over that mesh. An
onion-shaped privacy layer is a later similar protocol (hop-count /
layered encryption as shape), not a Tor `.onion` wire this quarter.

Fully decentralized identities without frost make the social graph
reconstructible from announces and heartbeats. That is known. It is
accepted for now. Frost / privacy budget is the later gate, not a
claim that the graph is hidden today.

Pointers: `src/Core.TypeScript/discovery/reticulum-transport.ts`,
`src/Core.TypeScript/discovery/dht-discovery.ts`,
`.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md`,
`docs/SEED-VOCABULARY.md` (Reticulum-first).

## What is not promoted

A public `.onion` / `.zeta` hidden-service product. Appointed hubs.
Treating graph reconstruction as a crime (dual-use). Stopping FS/DB
work to build transport this week.
