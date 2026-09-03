---
id: 081M1JW6T4A087G0R003DWRHRT
type: bug
state: backlog
priority: P1
slug: typescript-had-no-durable-snapshot-store-while-claiming-mani
title: "TypeScript had no durable snapshot store while claiming manifest-tracked recovery"
created: 2026-09-03T08:10:00.000Z
depends_on: []
composes_with: []
---

# TypeScript had no durable snapshot store while claiming manifest-tracked recovery

Found by reading two of the six unpinned F#↔TypeScript pairs. This is sharper than a missing treaty.

`src/Core/SnapshotStore.fs` ships **two** stores: `InMemorySnapshotStore` and `DiskSnapshotStore`.
`snapshot-store.ts` shipped **only the in-memory one**, whose "manifest" is a private field that
dies with the process.

And `recoverable-spine.ts` describes itself — copying the F# wording — as tying the log to
*"cadenced snapshots (via a manifest-tracked `ISnapshotStore`) and a restore → replay recovery
path"*, while the F# is explicit about what that manifest buys:

> *"Because the snapshot store records the latest pointer in a durable manifest, recovery survives a
> process restart with NO externally-held pointer."*

**The TypeScript could not survive a restart and said "manifest-tracked" anyway** — a claim stronger
than the mechanism.

## The mechanism

`durability/disk-snapshot-store.ts`. Three things must agree with the F# exactly, and each fails in
a different quiet way:

| | why it matters |
|---|---|
| **the filename** `snapshot-%020d.snap` | twenty digits, zero-padded, so lexical order **is** sequence order. Unpadded, a listing sorts `snapshot-10` before `snapshot-9` |
| **the manifest** `LATEST.json`, flat `string→string` | F# serialises a `Dictionary<string,string>`, so `seq` is a **STRING**. `{"seq": 7}` is a manifest F# cannot deserialise — and it fails at *recovery* |
| **atomicity** temp + rename | a reader must never observe half a snapshot or half a manifest |

The manifest is written **after** the snapshot it points at: publishing the pointer first would
advertise a file a reader could not yet open.

`latest()` distinguishes **absent** (`null` — nothing written) from **unreadable** (throws).
Collapsing them would turn a corrupt pointer into *"start from scratch"*, silently discarding every
snapshot in the directory and losing committed deltas without reporting anything.

## What it does NOT claim

The F# takes an optional `fsyncOnWrite` and, when set, flushes the file **and** fsyncs the containing
directory so the rename itself is durable. Node has no portable directory fsync. So this store does
the rename and says plainly that **the rename's durability against power loss is the platform's to
give**: it is atomic with respect to readers, which is what the manifest needs, and it is not a
claim about surviving a crash between the rename and the OS flushing metadata. Overstating that
would be worse than not having the option.

## The interop is checked, not assumed

`tests/Tests.FSharp/SnapshotManifestInterop.Tests.fs` deserialises the **exact bytes** TypeScript
writes through the **same call** `DiskSnapshotStore.LatestAsync` makes, and asserts the naive
`{"seq": 11}` form **throws** — so the requirement is pinned from both directions rather than only
the happy one. It also computes the filename both ways and asserts they are identical.

Honest limit, stated: the snapshot **bytes** need codec parity (CBOR both sides), which is a separate
treaty. This pins the **addressing** — the manifest and the filename — which is what lets either
runtime find what the other wrote.

## Falsifiers

```
bun test src/Core.TypeScript/durability/                                    # 21 pass
dotnet test tests/Tests.FSharp --filter SnapshotManifestInterop|IoBoundaryTreaty   # 11 passed
bun src/Core.TypeScript/lint/lint-typescript.ts                             # exit 0
```

## Still open

Four unpinned pairs remain: `ErasureCharge`, `IndexedZSet`, `RecoverableSpine`,
`SpecializationCache`. And `recoverable-spine.ts` can now be *given* a durable store — nothing wires
one to it yet, so the claim in its header is true only for a caller that supplies one.
