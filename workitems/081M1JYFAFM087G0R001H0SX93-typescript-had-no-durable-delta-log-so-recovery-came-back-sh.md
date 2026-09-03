---
id: 081M1JYFAFM087G0R001H0SX93
type: task
state: backlog
priority: P2
slug: typescript-had-no-durable-delta-log-so-recovery-came-back-sh
title: "TypeScript had no durable delta log, so recovery came back short and said nothing"
created: 2026-09-03T06:14:36.276Z
depends_on: []
composes_with: []
---

# TypeScript had no durable delta log, so recovery came back short and said nothing

## The defect, which is worse than a missing feature

F# ships **four** durable `IDeltaLog` backends — `DiskDeltaLog`, `GroupCommitDiskDeltaLog`,
`ZetaFsDeltaLog`, `GitDeltaLog`. TypeScript shipped **one**, `InMemoryDeltaLog`.

So with the durable snapshot store now in place, `RecoverableSpine.recover` restored the snapshot and
then replayed a tail that had died with the process. It did not throw. It did not warn. **It returned
a spine missing every commit made since the last snapshot.** At a cadence of 64, a crash costs up to
63 committed deltas and reports success.

A missing feature announces itself. A recovery path that comes back short does not.

## The format is F#'s, deliberately

`%020d.delta`, one file per entry, the whole entry as canonical CBOR through the four-language-locked
`DeltaLogEntry` codec, temp+rename appends, high-water recovered from the filenames, truncate as an
unlink. Inventing a TypeScript-shaped format would have been easier and would have left the two
runtimes unable to read each other.

## The byte-lock was green over a function nothing shipped

`src/Core.TypeScript/delta-log-entry/golden-vectors.test.ts` is the TypeScript oracle for the entry frame, and it passes.
But `entryToTagged` — the function that produced those bytes — **lived inside the test file**. The
lock proved TypeScript _can_ produce the canonical frame while nothing in `durability/` _could_.

It is now `src/Core.TypeScript/delta-log-entry/entry-codec.ts`, imported by the test, so the lock covers the product. It
also gained the half it never had: a **decoder**. Every prior assertion went encode → hex, or
hex → decode → **re-encode** → hex — both directions through the encoder — so a decoder could have
been absent or wrong and the vectors stayed green.

## The crossing the golden vectors do not cover

Frame parity is a codec treaty. It says nothing about the DIRECTORY the frames live in: the filename,
the padding, the exclusive replay boundary, high-water recovery. Two implementations can agree on
every byte of every frame and still be unable to read each other's log.

`generate-delta-log-interop-fixture.ts` writes a real log with the real writer and records the bytes
verbatim as hex-in-JSON — `no-binary-in-proof-lineage` keeps binary out of the proof lineage, and
that rule's enforcer is scoped to `src/wasm-dla/bytelock/`, so a binary fixture here would be
unaudited as well as forbidden. `DeltaLogInterop.Tests.fs` materialises those files and replays them
with the **real F# `DiskDeltaLog`**. 3/3 green on the first run.

## Mutation matrix — mutate the TypeScript WRITER, ask whether F# notices

| mutant                                       | F# crossing |
| -------------------------------------------- | ----------- |
| weights written as magnitudes (sign dropped) | **killed**  |
| captured metadata dropped                    | **killed**  |
| framed seq off by one from the filename      | **killed**  |
| entry files use a different extension        | **killed**  |
| filename padded to 19 digits                 | survived    |
| delta keys sorted case-insensitively         | survived    |

**Both survivors were predicted, and both are owned by the check that should own them** — verified by
running that check under the mutant, not asserted:

- **19-digit padding** — F# recovers the sequence with `Int64.TryParse`, so any width parses. The
  padding buys LEXICAL ordering, and both sides sort numerically, so it genuinely is not part of the
  crossing contract. Killed by the TypeScript test that owns it (_"filenames are twenty digits"_).
- **case-insensitive collation** — the frame's key ORDER changes, but decoding builds a ZSet, which
  is order-independent, so the crossing cannot see it. Killed by the byte-lock (`captured_ordinal`),
  which is exactly where a canonical-order violation belongs.

A survivor at one boundary is a gap unless another boundary owns it. These two are owned.

## A test that passed for the wrong reason, found while writing it

The first version of _"the disk log does not lose it"_ reused a snapshot store whose manifest said
seq 1 alongside a **brand-new** log — and the commit vanished. Not a defect in the new class:
`recover` resolves a base sequence from the snapshot and replays the log PAST it, so a snapshot ahead
of the log's history masks the entire log. F#'s `RecoverAsync` does the same.

Pinned as its own test rather than guarded, because quietly diverging from F# would break the parity
these two implementations exist to hold. Pairing the two stores is the caller's contract; the test
records what breaking it costs, so the behaviour is known rather than discovered during an incident.

## Falsifiers

```
bun test src/Core.TypeScript/durability/ src/Core.TypeScript/delta-log-entry/   # 47 pass
dotnet test tests/Tests.FSharp --filter FullyQualifiedName~DeltaLogInterop      # 3 passed
bun src/Core.TypeScript/hygiene/audit-proof-lineage-binaries.ts                 # exit 0
```

## Still open

Three unpinned F#↔TypeScript pairs remain: `ErasureCharge`, `IndexedZSet` (the largest surface, and
the DBSP core), `SpecializationCache`. And nothing in the observe loop constructs a durable spine yet
— the mechanism exists and is unwired, which is the same shape of gap this work item closed one layer
down.
