# Sovereign-DB / agent-loop work-stream — the single master doc is B-0959

Carved sentence:

> `docs/backlog/P1/B-0959` is the ONE doc that holds the whole sovereign-DB /
> agent-loop arc. It is a **map, not a queue**: `claim acquire` before working any
> item, respect surface lanes, and check the bus / open PRs for what other surfaces
> are already on. This pointer is a bridge — once observe.ts's loop coordinates
> lanes automatically (bus + claims + dashboard), retire it.

## Why this rule exists

The operator needs a **single doc to remember all of it**, and multiple Otto
surfaces (+ Vera) cold-boot into the same repo — so the master checklist must be
(a) findable from one stable handle and (b) safe to share without every surface
piling onto the same items. This pointer is both: it names the single doc and
carries the collision-guard in the same breath.

## The single doc

**[B-0959 — Zeta sovereign distributed-DB + agent-loop MASTER checklist](../../docs/backlog/P1/B-0959-zeta-sovereign-distributed-db-and-agent-loop-master-checklist-one-git-native-zset-substrate-aaron-otto-2026-05-31.md)**
holds the whole arc in one place:

- §0 the recognition (one git-native Z-set substrate; the unbundled engine; the
  agent-partition / encrypted-home / bus-product-heartbeat topology; ownership
  legible by construction; the keeper)
- §1 algebra ladder (G-Set → Bag → Z-set)
- §2 sovereign agent-loop (observe → execute → loadWorld → folderSink; multi-repo)
- §3 git-native bus (G-Set CRDT) + the Rx-query-as-IVM math note
- §4 distributed F# DB + the time primitive (IScheduler / DST / CockroachDB-style)
- §5 eventually-consistent git-native indexes
- §6 the 4-language meet-in-the-middle / 4-oracle
- §7 dual-mode transport

Remember one handle: **B-0959**.

## Map, not a queue — the collision-guard (the operator's worry, answered)

A shared boot pointer is read by every surface (otto-cli, otto-desktop,
otto-vscode, otto-windows) + ferries to Vera. To stop all of them piling onto the
same items:

1. **`claim acquire` first** — per [`claim-acquire-before-worktree-work.md`](claim-acquire-before-worktree-work.md);
   a second surface that tries a claimed item gets exit-1 and picks another.
2. **Respect lanes** — per [`agent-roster-reference-card.md`](agent-roster-reference-card.md);
   don't cross into another surface's active lane.
3. **Check the live registry** — the git-native bus (`docs/agent-bus/`, B-0954) +
   open PRs show who is on what, cross-machine. The bus / claims are authoritative;
   the snapshot below is only a cold-boot hint.

This is the B-0959 §0 agent-partition recognition applied to the agents working ON
B-0959: each surface is a shard, `claim acquire` is the join-point, lanes are the
partition, the bus carries claims across machines.

### Lane snapshot (2026-06-01 — non-authoritative; the bus + PRs are the live truth)

- **otto-cli** — sovereign-DB / algebra / observe-loop / bus (the B-0959 arc)
- **otto-windows** — Windows + Ace package-manager + TS distribution
- **vera-codex** — zflash USB-ISO hardware install

Dated because it rots: when a lane finishes, this list is stale — trust the bus +
open PRs, not this snapshot.

## Temporary by design

Per the operator (2026-06-01): _"until we get observe.ts all working then it won't
be an issue."_ Once the observe.ts loop coordinates lanes automatically (the bus +
claims + the dashboard's mode-aware Rx views), this manual pointer is redundant —
retire it then. It is a bridge, not a permanent fixture.

## Composes with

- [B-0959](../../docs/backlog/P1/B-0959-zeta-sovereign-distributed-db-and-agent-loop-master-checklist-one-git-native-zset-substrate-aaron-otto-2026-05-31.md) — the single master doc this points at
- [`claim-acquire-before-worktree-work.md`](claim-acquire-before-worktree-work.md) — the split-brain guard
- [`agent-roster-reference-card.md`](agent-roster-reference-card.md) — the surface / lane registry
- [`wake-time-substrate.md`](wake-time-substrate.md) — why a cold-boot pointer (so the arc is never re-forgotten)
- B-0954 (git-native bus) — the live cross-machine claim registry
- B-0958 (observe-loop sub-tracker) — the loop whose completion retires this pointer

## Full reasoning

The operator 2026-06-01: _"i just really need a single doc somewhere for me to
remember all of it"_ + _"we can save it however makes sense for your guys until we
get observe.ts all working."_ B-0959 is that single doc; this pointer makes it the
stable handle every surface lands on, with the multi-surface collision-guard
inline, retired when observe.ts automates the coordination.
