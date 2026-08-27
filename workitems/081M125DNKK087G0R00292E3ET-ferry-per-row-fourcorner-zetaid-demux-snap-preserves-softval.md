---
id: 081M125DNKK087G0R00292E3ET
type: task
state: backlog
priority: P1
slug: ferry-per-row-fourcorner-zetaid-demux-snap-preserves-softval
title: "Ferry per-row FourCorner + ZetaId demux; snap preserves SoftValue uncertainty"
created: 2026-08-27T17:48:56.819Z
depends_on: []
composes_with: ["081M10AAVAT087G0R0027M0GV5", "081M10AZ6KS087G0R0000SSFMH"]
---

# Ferry per-row FourCorner + ZetaId demux; snap preserves SoftValue uncertainty

Aaron 2026-08-27: the ferry is the **universal adapter** between
increment-one-at-a-time and batch. Caller may submit a single item
and the boat batches underneath; caller may submit a batch and the
processor may still be one-at-a-time. Dual interface. DoP=1 is the
FoundationDB loop; the same type scales to N. Anti-Nagle: a boat
sails with what is queued *now*, never waits to fill.

**Four corners even in batch.** Each *row* of a boat carries
`FourCornerOwnership` (in / out / outFeedback / inFeedback). Batch
results and failures are **per-row**, not whole-boat. Muxed feedback
over bidirectional channels demuxes by **ZetaId** on the other side —
the same demux key the transports already use. Original Itron
throttler was missing four-corner; we should have it in batch mode
now. If the tree is missing it, that is the gap, not a reason to
look at the original (clean-room: requirements, never expression).

## What is already in the tree (do not rebuild)

`src/Core/FerryThrottler.fs`:

- DoP knob (`MaxDegreeOfParallelism`, `FerryThrottlerConfig.deterministic`
  is 1). Same `fillBoat` / ferry-loop on DoP=1 and N.
- Anti-Nagle boats (`MaxBatchSize` capacity, never a delay).
- Single-arity: `EnqueueAsync` one item; `processBatch` takes a boat.
- Result-arity: `ProcessAsync` one item; `processBatch` returns an
  index-aligned `'TResult array`; `completeBoat` fans back to each TCS.
- Contextual arity threads `(item, ctx)` as data, not AsyncLocal.

## What is missing (the work)

1. **Batch → single adapter.** No `ProcessMany` / `EnqueueMany`. The
   vice-versa half of the universal adapter is not there: a caller
   with a batch still cannot present it as one boat to a single-item
   processor (or receive a boat of results from one call).
2. **FourCorner per row.** `processBatch` is `'TItem -> 'TResult`.
   Nothing requires `'TResult` to be `FourCornerOwnership`. Feedback
   corners are not a boat-row field.
3. **Per-row failure.** `faultBoat` sets the **same exception on every
   row** when `processBatch` throws or the result length mismatches.
   A row whose feedback corner is an error cannot stay a success
   sibling. Whole-boat fault is the current contract.
4. **ZetaId demux.** Result fan-in is **index alignment inside one
   boat**. Reorder / mux over a duplex wire (`duplex-transport.ts`
   demuxes by *channel* `normal|feedback|close`, not by identity)
   has no ZetaId key on the row. Index is boat-local; ZetaId is
   cross-channel.

Do **not** wire `FourCornerOwnership` into the ferry this slice if
the record is a heap object on the hot path (Naledi). Smallest
falsifier first: boat of 2 ZetaIds, corners permuted, row-1
feedback=error **without throw**; row-0 still completes. That test
does not exist.

Alloc / SIMD: Naledi, static, unmetered — **5 heap objects per
`ProcessAsync` item** on the unbounded no-cancel path (TCS + Task +
`FerryRequest` class + F# `task{}` + boxed CE). `fillBoat` is a
drain loop — not a SIMD candidate. Batching *is* the win that
already exists. Measure before adding SIMD. Per-row failure is the
P0 (today `faultBoat` clones one exception onto every row; tests
lock that in).

White-room spec from original Itron code: **not required** for this
row. Dual interface (single-in / batch-underneath) is already here.
The gap is FourCorner-per-row + ZetaId demux + the batch-in adapter.
Requirements from this session; do not open the original.

## Also recorded here (same session, not a second item)

- **Data plane stays fast and dumb.** No intelligence in the store
  path. Futamura (`Cogen` / `MixCogen`), zetadb/fs merge, stored
  procs, and `gen/` live in the **control plane**. That split is
  what lets the data plane stay cutting-edge on performance. This
  is a sharpening of the existing two-plane north star (ROADMAP:
  reliable data plane vs control plane of cells), not a third plane.
- **TypeSchema from DynamicValue.** Today
  `src/Core.CSharp/TypeSchema.cs` +
  `SchemaSourceGenerator` consume AdditionalFiles / JSON IR, not
  the store. Next honest slice: `TypeSchema` from a `DynamicValue`
  (store-native), then existing generators consume it. `gen/` is
  the plan (`gen/README.md`); not wired to `ZetaFs` / `DagFs`.
- **Guessed TypeSchema keeps the SoftValue.** Do **not** change
  `SoftValue.snap` (it stays the collapse). A schema guessed from
  a SoftValue is a **different constructor** that carries the
  still-soft distribution: reporting stays calibrated, later
  `combine` / `observe` still commute. Snap-then-forget as the
  schema path is the defect.
- **Tick-N loads tick-(N−1).** Self-editing compiler. Still needs
  the epoch layer (VISION: DESIGNED). Bounded ticks make the load
  well-defined; the wire does not exist.
- **ForgeHost extra-git is not Zeta and not Harny.** Surfaces
  already live in `src/Core.TypeScript/forge-host/`. Zeta
  (`clis/` `sim`/`mea`/`cut`) is git-native. Harny is the agent
  harness. Plug ForgeHost verbs into **Nucleus** / the existing
  command core (roadmap item #1) as plugins (k8s-controller
  shape). Do not mint **Quay** (Red Hat collision). Do not mint
  a fourth CLI product. If a binary name is later demanded:
  **Port** (hexagonal), glossary-gated. Design, not
  implementation.

Beacon: Van Jacobson ACK-clocking (anti-Nagle self-clock);
FoundationDB single-thread run loop (DoP=1); Itron
`IThrottler`/`MaxDegreeOfParallelism` as the *requirement*
anchor (not the expression); FourCorner as the I/O pipe (not a
fermion); Linstedt DV2 change-rate for where intelligence sits;
Syme/Battocchi 2012 type providers for TypeSchema-from-store.

Pointers: `docs/ROADMAP.md` (north star, 8b, P1, continuous);
`docs/VISION.md` §compiler ladder + epoch; `src/Core/FerryThrottler.fs`;
`src/Core/FourCorner.fs`; `src/Core/SoftValue.fs`;
`src/Core.CSharp/TypeSchema.cs`; `gen/README.md`; `clis/README.md`.
