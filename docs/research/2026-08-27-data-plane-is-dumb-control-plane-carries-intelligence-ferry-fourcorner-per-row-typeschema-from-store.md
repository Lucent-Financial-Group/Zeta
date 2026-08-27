# Data plane is dumb; control plane carries intelligence — ferry FourCorner per row, TypeSchema from the store

Scope: research-grade absorb of Aaron 2026-08-27 (ferry dual-arity, FourCorner-per-row, TypeSchema-from-store, CLI kernel). Internal current-state absorb, not an archive import.
Attribution: Aaron (human) framed the requirements; Riven (Grok 4.6) measured the tree and wrote this absorb.
Operational status: research-grade
Non-fusion disclaimer: Shared vocabulary here does not imply merged agency, shared identity, or personhood.

*2026-08-27. Live pointers [`docs/ROADMAP.md`](../ROADMAP.md)
(north star, 8b, P1, continuous) and [`docs/VISION.md`](../VISION.md)
§compiler ladder + epoch. GOVERNANCE.md §33. Workitem
`081M125DNKK087G0R00292E3ET`.*

Aaron 2026-08-27, on the ferry:

> we want to review our code for low no allocations and simd
> support if that help even in some batch scenarios, if batching
> helps we way want an implicit ferry throttler that will invisibly
> batch things if needed and allow for bactch calling, it has a dual
> interface that allows for the caller to call, single instant but
> then then underneath they get batched and vice version it's like
> a universal adapter between incrementing one at a time and batch.
> If this is not what you see in our code it's a mistake and i'll
> need to get a whit room agent look at some of my origial code and
> write a spec around this, my origial code was missing the four
> corner stuff be we should have this even in batch mode now, we
> also tried to link up to a batch results failurs where each row
> in the batch has the four corners this lets us support muxed
> feedback over bidirectional channels with zetaids as the demux
> on the other side, a lot of our transports already work like this
> for communications. Also DoP=1 scale free to infinate is part of
> the ferry throttler design.

And, on gen / two planes / snap / CLI:

> gen/: the plan — reify types from git-history metadata; recursive
> sim/mea/cut inside the compiler. Not wired to ZetaFs/DagFs. we
> should get the wiring on the roadmap somewhere our futamara and
> zetadb/fs merge in the control plane and the stored procs, the
> data plane should be fast and dumb no intelligence, this two
> layer split is what lets us stay cutting edge on perforamce
> evntually. The gap is the schema source: AdditionalFiles / JSON
> IR today, not the store. Next honest slice is TypeSchema from a
> DynamicValue (the store's native type), then the existing
> generators consume it. Tick-N-loads-tick-(N−1) still needs the
> epoch layer (VISION: DESIGNED). yes this is a good move, also the
> typeschema from dynamic value can be a guessed snap from a
> softvalue too with a certain uncertany attached, whenever we snap
> we still want to preserve the uncertainy for reporting and also
> it can make thing commutive if we do it right. Also i think we
> are going to need some forge host cli that abstracts any forget
> host we are current on, all the extra stuff that's not git native,
> i'm not sure what cli this belongs under, likey harney, zeta is
> more the gitnative stuff not the forge host, feel free to come up
> with someother name for this too, we don't want to just shove
> everything in harney cli either, we want a nice decomposition,
> also all our clis should build off some based cli layer so we
> are not redoing things over and over, our verbs nouns and such
> could be a plugin model similar to k8s controllers but for clis,
> a lot of room to play and design here, don't have to rush into
> implmentation.

## What this corrects

Three things that look like they might already be done, and one
naming trap.

1. **The ferry dual interface is half-shipped.** Single-item call,
   boat underneath, DoP=1→N, anti-Nagle: **in the tree.** Batch-in
   / single-processor, FourCorner **per row**, per-row failure,
   ZetaId demux: **not in the tree.** Whole-boat `faultBoat` is the
   current contract. That is the mistake Aaron named, not a missing
   throttler.
2. **A guessed schema is not `snap`.** `SoftValue.snap` stays the
   collapse (`DynamicValue option`) and **does not change**. A
   TypeSchema guessed from a SoftValue is a **different
   constructor** that keeps the SoftValue attached (reporting +
   later `combine` / `observe` still commute). Snap-then-forget as
   the schema path is the defect; mutating `snap` is not the fix.
3. **Intelligence must not leak into the data plane.** The north
   star already splits "reliable data plane" / "control plane of
   cells". This session names the *performance* reason: the data
   plane stays dumb so it can stay fast; Futamura, stored procs,
   `gen/`, zetadb/fs merge sit in the control plane. Not a third
   plane. A sharpening.
4. **Harny is not the extra-git CLI.** Harny is the agent harness
   (8b). Zeta verbs are git-native (`clis/` `sim`/`mea`/`cut`).
   Extra-git lives in `src/Core.TypeScript/forge-host/` already.
   Dumping that into Harny is the wrong cut.

White-room / clean-room: **do not open the original Itron
throttler.** The dual-arity requirement is already expressed in
`FerryThrottler.fs` and in
`.claude/rules/async-all-the-way-truthful-signatures.md`. A
white-room agent is only needed if we cannot specify FourCorner-
per-row + ZetaId demux from this absorb. We can. Requirements
cross the wall; expression does not.

## What is already measured (do not rebuild)

| Half | In-tree |
|---|---|
| DoP=1 → N, same code path | `FerryThrottlerConfig.MaxDegreeOfParallelism`; `deterministic` is 1 |
| Anti-Nagle boats | `fillBoat` drains what is queued *now*, up to `MaxBatchSize`; no timer |
| Single → batch underneath | `EnqueueAsync` / `ProcessAsync` one item; `processBatch` takes `ReadOnlyMemory` |
| Index-aligned result fan-in | `completeBoat` (`FerryThrottler.fs`) |
| FourCorner 2×2 I/O record | `src/Core/FourCorner.fs` `FourCornerOwnership` — not a fermion, not Cl(p,q) |
| Duplex four-corner wire | `src/Core.TypeScript/model-backend/duplex-transport.ts` — demux by *channel*, not ZetaId |
| TypeSchema IR + Roslyn generator | `src/Core.CSharp/TypeSchema.cs`; `SchemaSourceGenerator` over `*.zetaschema.json` AdditionalFiles |
| SoftValue snap as only collapse | `src/Core/SoftValue.fs` `snap` / `SnapPolicy`; `observe`/`combine` commute on independent evidence |
| Epoch layer | VISION: **DESIGNED**. Store ships; epoch over it does not |
| Forge-host extra-git | `src/Core.TypeScript/forge-host/` (GitHub + GitLab adapters, worldview, PR gate) |
| CLI verb family | `clis/README.md` `sim`/`mea`/`cut`/`ben`/`cla`/`res` — git-native |
| gen/ plan | `gen/README.md` — not wired to ZetaFs/DagFs |
| Nucleus as plugin microcore | ROADMAP layer table (preliminary split; composability-over-layers absorb is in-flight as #15854) |

## What is missing

1. **`ProcessMany` / batch-in adapter.** Universal adapter needs
   both directions. Today: single-in, batch-underneath. Missing:
   batch-in, single-or-batch underneath, one result boat back.
2. **FourCorner per boat row + per-row failure.** `faultBoat`
   clones one exception onto every TCS. A row whose
   `TOutFeedback` is an error must not fail its sibling. Smallest
   falsifier (do not wire the heap record this slice): boat of 2
   ZetaIds, corners permuted, row-1 feedback=error without throw;
   row-0 still completes.
3. **ZetaId as the demux key.** Index alignment is boat-local.
   Muxed feedback over a bidirectional channel is how the
   transports already work; the other side demuxes by ZetaId, not
   by boat slot. `duplex-transport.ts` demuxes `normal|feedback|close`.
   Identity demux is the next increment on that wire, and the
   ferry row must carry the same key.
4. **TypeSchema from DynamicValue.** JSON AdditionalFiles is a
   bootstrap IR. Store-native constructor does not exist. Existing
   generators (`SchemaCodegen`, `SchemaSourceGenerator`, future
   `gen/` type providers) consume TypeSchema once it exists;
   they do not need a second IR.
5. **Guessed TypeSchema keeps the SoftValue.** Do not change
   `snap`. The schema-from-soft constructor carries
   `TypeSchema` plus the still-soft distribution, so reporting
   stays calibrated and `combine` after a guess still commutes.
   Snap-then-forget as the schema path leaks local collapse into
   the shared fold (sibling of
   `local-time-never-enters-the-shared-fold`).
6. **Tick-N loads tick-(N−1).** Named. Blocked on epoch
   (VISION DESIGNED). Do not fake a hot-reload over wall-clock.
7. **CLI kernel; ForgeHost verbs as Nucleus plugins.** Shared
   plugin host for verbs / nouns (k8s-controller shape: a verb
   is a controller, a noun is a typed resource). Extra-git is
   **not** Zeta and **not** Harny — it is already
   `src/Core.TypeScript/forge-host/`. Plug those verbs into
   Nucleus / the existing command core (roadmap item #1). Do
   **not** mint **Quay** (collides with Red Hat Quay). Do not
   mint a fourth CLI product named Forge either; Forge is the
   peer repo, ForgeHost is the extra-git surface. If a public
   binary name is later demanded: **Port** (hexagonal port /
   host-surface seam) is the coinage candidate, glossary-gated.
   Design, not this PR.

## Alloc / SIMD (honest)

`ProcessAsync` is not zero-alloc. Naledi (static graph, unmetered;
no FerryThrottler row in `docs/BENCHMARKS.md`): **5 heap objects
per item** on the unbounded `CancellationToken.None` path —
`TaskCompletionSource` + its `Task` + `FerryRequest` (class) + the
F# `task{}` outer `Task` + boxed CE state machine. Cancellation
registration is +1 when `ct.CanBeCanceled`. Boat buffers
(`items`/`requests`) are allocated once per ferry and cleared, not
per item. That is the current cost of the single-item awaitable
surface. Hypothesis for BDN `AllocatedBytes`, not a measured
baseline.

`fillBoat` is a `TryRead` drain. There is no dense numeric kernel
to vectorise. SIMD on boat assembly is a miss. If a *processor*
(the `processBatch` the caller supplies) has a columnar / numeric
inner loop, SIMD lives **there**, not in the throttler. Batching
is already the ferry's gift to that processor: one call, N items,
`ReadOnlyMemory`.

Do not add SIMD to the ferry this slice. Do not collapse the
single-item TCS away without a measured replacement for
"await this one item's result."

## Beacon

- **Van Jacobson**, *Congestion Avoidance and Control* (SIGCOMM
  1988) — ACK-clocking; the ferry's self-clocked boats (anti-Nagle).
- **Zhou et al.**, *FoundationDB* (SIGMOD 2021); Will Wilson,
  *Testing Distributed Systems w/ Deterministic Simulation*
  (Strange Loop 2014) — DoP=1 run loop.
- **Itron `IThrottler` / `MaxDegreeOfParallelism`** — requirement
  anchor for the dual-arity throttle (clean-room: the *need*, not
  the source).
- **FourCorner** as the bidirectional I/O pipe (in-tree
  `FourCorner.fs`; C₄ is a labeling, not Cl(p,q), not a fermion).
- **Linstedt**, Data Vault 2.0 — change-rate split: dumb store
  (hub/log) vs faster-changing control (satellites / stored procs).
- **Futamura**, partial evaluation / the three projections —
  compiler-compiler lives in the control plane.
- **Don Syme, Keith Battocchi et al.**, *Strongly-Typed Language
  Support for Internet-Scale Information Sources* (MSR, 2012) —
  type providers reify an external space; TypeSchema-from-store
  is that move against DynamicValue.
- **Kubernetes controllers + CRDs** — verb/noun plugin shape for
  CLIs (controller reconciles a typed resource). Not k8s-in-proc;
  the *shape*.
- **ADR 2026-04-22** three-repo split (Zeta / Forge / Ace) —
  ForgeHost extra-git verbs plug into Nucleus; do not mint Quay
  (Red Hat collision) or a fourth CLI product.
- **Alistair Cockburn**, hexagonal architecture — **Port** is the
  only new-name candidate if a binary is later demanded.

## Honesty

This document does not implement FourCorner-into-ferry, does not
add `ProcessMany`, does not write TypeSchema.ofDynamicValue, and
does not mint a CLI binary. Those are the P1 row. A white-room
agent is **not** dispatched on the strength of this absorb; the
gap is named in-tree.

Nagle is the thing we refuse (artificial delay to fill a boat).
The ferry already refuses it. The remaining defect is that a boat
row is a bare `'TItem` / `'TResult`, not a four-corner with a
ZetaId, and a boat fault is all-or-nothing.
