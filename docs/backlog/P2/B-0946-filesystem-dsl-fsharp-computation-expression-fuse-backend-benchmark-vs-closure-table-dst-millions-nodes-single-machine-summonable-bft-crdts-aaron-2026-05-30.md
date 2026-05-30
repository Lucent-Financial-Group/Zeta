---
id: B-0946
priority: P2
status: open
title: Filesystem DSL as F# computation expression (fs {}) + FUSE backend (benchmark vs closure-table); cross-cutting -- all microkernel/db/fs/cluster work is DST-simulatable at millions-of-nodes on one machine via summonable-BFT + CRDTs
tier: substrate-deployment
ask: Aaron 2026-05-30
created: 2026-05-30
last_updated: 2026-05-30
decomposition: umbrella
composes_with:
  - src/Core/Hierarchy.fs
  - docs/backlog/P3/B-0016-research-just-bash-vercel-labs-and-lineage-symbiotic-deps-discipline-own-fuse-fs-eventually.md
  - docs/backlog/P2/B-0945-declarative-microkernel-substrate-in-house-trust-gradient-compression-engine-sequoia-memory-model-better-than-docker-aaron-2026-05-30.md
  - docs/backlog/P1/B-0944-tri-boolean-core-primitives-digital-qubit-floating-point-multi-language-build-compiler-parity-non-byzantine-bft-aaron-2026-05-30.md
  - docs/backlog/P2/B-0703-multi-oracle-consensus-with-bft-inside-dst-agreement-across-trust-gradient-architecture-aaron-2026-05-21.md
  - .claude/skills/file-system-persistence-expert/SKILL.md
tags: [filesystem, dsl, computation-expression, fsharp, fuse, closure-table, dst, deterministic-simulation, crdt, summonable-bft, microkernel, federation, substrate-deployment]
type: feature
---

# B-0946 -- Filesystem DSL (fs {}) + FUSE backend + DST-at-millions-of-nodes property

## The directive (Aaron 2026-05-30)

> *"we should have a file system dsl too"* + *"in computatinal expressions"*

> *"Also we are taking for any microkernal or db work we can run multi cluster federated multi
> node cluster efficently and determisisticlly simulated at scales of millions on single computer
> i can show you code than can do this if you can't figure it out but if you search latest
> research and such since we have on demand bft and crdts it's probably gonna be easy."*

## Part 1 -- Filesystem DSL as an F# computation expression

Same shape as the `tri { }` CE (B-0944 slice 2): an `fs { }` computation expression for filesystem
operations, monad-propagated via `Result<T, TFeedback>` (the OPLE / monad-propagation substrate),
so filesystem effects (NotFound / PermissionDenied / DiskFull / etc.) are surfaced as feedback,
not thrown. Example shape:

```fsharp
fs {
    let! dir  = mkdir "/foo"
    let! file = touch (dir / "bar")
    do!  write file "contents"
    return file
}
```

Backend evolution:

- **now**: the current F# closure-table filesystem -- `src/Core/Hierarchy.fs` (closure-table
  hierarchy algorithm; `tests/Tests.FSharp/Storage/ClosureTable.Tests.fs`).
- **next (B-0016)**: a **FUSE-based** backend -- "own fuse fs eventually" -- and **benchmark
  whether FUSE beats the closure-table algo** we use now (operator: "see about faster than the
  closure table algo we are using now").
- **eventual (B-0945)**: microkernel-native filesystem (the fs is a layer of the declarative
  microkernel substrate).

The CE is the DSL surface; per the supply-chain doctrine + summonable-BFT, the fs-DSL is
implementable across TS/F#/C#/Rust (cross-language oracle parity).

## Part 2 (cross-cutting) -- DST-simulatable at millions-of-nodes on a single computer

A property that applies to **ANY microkernel / db / fs / cluster work** in the substrate: the
multi-cluster, federated, multi-node cluster must run **efficiently AND deterministically
simulated at scales of millions on a single computer** (DST -- the always-active deterministic-
simulation discipline). Operator: this is "probably gonna be easy" because we already have
**on-demand BFT (summonable BFT, B-0944) + CRDTs** -- the consensus + convergence primitives that
make a deterministic, single-box simulation of a huge federated cluster tractable.

- **DST** (always-active discipline) -- the whole federated cluster simulated deterministically
  from a seed; millions of nodes on one machine; reproducible.
- **summonable BFT** (B-0944, on-demand BFT) -- consensus summoned per-decision, not a standing
  quorum; cheap to simulate.
- **CRDTs** (B-0132 composition) -- convergence without a coordinator; deterministic merge =
  simulation-friendly.
- **cluster-fork-as-trust-boundary** (B-0829) + **trust-gradient** (B-0703) -- the federation
  topology being simulated.

**Operator has reference code** that does millions-of-nodes DST on a single computer ("i can show
you code than can do this"). **Search-first (Otto-364)** the latest research before building:
FoundationDB deterministic simulation, TigerBeetle VOPR, Antithesis, madsim / turmoil (Rust
deterministic-sim), Shadow, and current deterministic-cluster-simulation literature. Ask the
operator for the reference code if the search + on-demand-BFT/CRDT substrate isn't enough.

## Acceptance

1. `fs { }` computation-expression DSL over the current closure-table backend (F# first).
2. FUSE backend + a benchmark vs the closure-table algo (B-0016).
3. The fs/db/cluster substrate is DST-simulatable at millions-of-nodes on one machine
   (deterministic, seed-reproducible), leveraging summonable-BFT + CRDTs.
4. Cross-language fs-DSL parity (TS/F#/C#/Rust) per the summonable-BFT pattern (later slice).

## Pre-start checklist (per backlog-item-start-gate)

- **Claim:** `bun tools/bus/claim.ts acquire --from otto-cli --item B-0946` -> claimed
  (c954be08..., 2026-05-30).
- **Prior-art search (2026-05-30):** the F# filesystem exists (`src/Core/Hierarchy.fs`,
  closure-table) + the FUSE direction (B-0016) + the fs-persistence skill; no fs-DSL-as-CE row +
  no millions-of-nodes-DST row (genuine gaps). Composes with B-0945 (microkernel), B-0944
  (summonable-BFT), B-0703 (trust-gradient/BFT), B-0829 (cluster-fork), B-0132 (CRDT), the DST
  discipline. External DST-at-scale prior-art (FoundationDB / TigerBeetle VOPR / Antithesis /
  madsim) to WebSearch before the DST slice.
- **Dependency check:** Part 1 (fs-DSL CE) can start now over the closure-table backend; FUSE +
  millions-DST depend on a backend decision + (for DST) the operator's reference code / a research
  pass.

## Why P2

Operator-directed; the fs-DSL is near-term buildable (CE over the existing closure-table fs); the
DST-at-millions property is cross-cutting + load-bearing for the microkernel/db program (B-0945).
Raise to P1 when the microkernel/db deployment substrate becomes the active build.
