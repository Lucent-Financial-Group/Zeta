# F# `src/Core/*.fs` quality survey — 2026-05-04

Scope: Read-only audit of every top-level `src/Core/*.fs` file in
`Zeta.Core`. Inventory + line counts + recent-churn flags + public-surface
observations + pattern observations + smell scan. No source files modified.
Authored by Otto under the autonomous-loop on the human maintainer's
2026-05-04 explicit signal *"are you doing F# work too?"*.
Attribution: Otto (factory Claude instance) authoring; the human maintainer
prompt-driver and code-author of `src/Core`. External AIs not involved in
this survey.
Operational status: Research-grade observation. Not a directive — recommended
cleanup order is for the maintainer to consider, not an obligation. No
behavioural rules introduced; no code rewrites proposed beyond the named
smells.
Non-fusion disclaimer: This document does not propose fusing two F# files,
modules, or types. It is a snapshot inventory + smell list, not a
refactor proposal.

## 1. Build / quality posture

The repo treats warnings as errors at the
`Directory.Build.props` level
(`Directory.Build.props:6`):

```
<TreatWarningsAsErrors>true</TreatWarningsAsErrors>
```

Three F# warnings are silenced project-wide
(`Directory.Build.props:11`):

```
<NoWarn>FS3517;FS3261;FS0893</NoWarn>
<WarningsNotAsErrors>FS0052;FS0064</WarningsNotAsErrors>
```

Zeta.Core's `.fsproj`
(`src/Core/Core.fsproj:5`)
opts in to four additional info-level warnings:

```
<WarnOn>3390;3517;3570;3578</WarnOn>
```

Two F# analyzer packs ship with the project
(`Core.fsproj:88-101`): `G-Research.FSharp.Analyzers 0.22.0` and
`Ionide.Analyzers 0.15.0`, run via
`dotnet msbuild -t:AnalyzeFSharpProject`.
`AssemblyInfo.fs` enumerates exactly six `InternalsVisibleTo` consumers
(`src/Core/AssemblyInfo.fs:11-16`).

## 2. File inventory (74 `.fs` files, 13 199 LOC total)

Listed in compile order from
`src/Core/Core.fsproj:13-86`,
omitting `obj/` build outputs.

| # | File | LOC | Purpose summary |
|---|------|----:|-----------------|
| 1 | `AssemblyInfo.fs` | 17 | InternalsVisibleTo declarations for tests + benchmarks + `Zeta.Core.CSharp`. |
| 2 | `Algebra.fs` | 25 | `Weight = int64` ring + zero/one/isZero/neg helpers (the Z-set scalar). |
| 3 | `Pool.fs` | 68 | Low-level `ArrayPool` rent/copy primitives, JIT-specialised per `'T`. |
| 4 | `ZSet.fs` | 563 | Core retraction-native `ZSet<'K>` with `ZEntry`, span access, sort/merge/consolidate. |
| 5 | `IndexedZSet.fs` | 300 | Per-key `KeyGroup` + indexed view used by joins. |
| 6 | `Circuit.fs` | 285 | `Op` abstract base + `Circuit` registration, scheduling, `Build`. |
| 7 | `PluginApi.fs` | 222 | Public `IOperator<'T>`, `StreamHandle`, `PublishChannel` plugin surface. |
| 8 | `PluginHarness.fs` | 78 | Test-time scheduler-less driver for plugin operators. |
| 9 | `LawRunner.fs` | 191 | Deterministic-simulation law checks (linearity, retraction). `Result<unit, LawViolation>`. |
| 10 | `Primitive.fs` | 112 | `DelayOp` (`z^-1`), `IntegrateOp`, `DifferentiateOp`. |
| 11 | `Operators.fs` | 289 | `MapZSetOp`, `FilterZSetOp`, `JoinOp`, `DistinctOp`, `UnionOp` etc. — the workhorse battery. |
| 12 | `Handles.fs` | 155 | `ZSetInputOp`, `OutputHandle<'T>` — public input/output ports. |
| 13 | `Environment.fs` | 107 | `ISimulationEnvironment` seam (`UtcNow`, `Ticks`, `NextInt64`). |
| 14 | `FeatureFlags.fs` | 143 | `FlagStage` (Experimental/ResearchPreview/Stable) + `FeatureFlags` registry. |
| 15 | `Simd.fs` | 53 | `Vector<T>`-based SIMD sum helpers with scalar fallback. |
| 16 | `HardwareCrc.fs` | 89 | x86 SSE4.2 + ARM NEON CRC32C with managed fallback. |
| 17 | `SplitMix64.fs` | 67 | Vigna's SplitMix64 finaliser (golden-ratio mixer). |
| 18 | `Sketch.fs` | 111 | HyperLogLog approximate distinct-count. |
| 19 | `CountMin.fs` | 163 | Count-Min Sketch over signed weights (linear in `D`/`I`). |
| 20 | `BloomFilter.fs` | 533 | Blocked + counting Bloom filters; `NativePtr.stackalloc` zero-alloc hashing. |
| 21 | `Watermark.fs` | 113 | Event-time `WatermarkStrategy` DU + monotone bound. |
| 22 | `ConsistentHash.fs` | 219 | Jump / Rendezvous (HRW) / Memento consistent hashing. |
| 23 | `Crdt.fs` | 136 | G-Counter / PN-Counter / OR-Set / LWW-Register over Z-sets. |
| 24 | `NovelMath.fs` | 264 | Tropical semiring `(min, +)`, Boolean semiring; matrix mul over weights. |
| 25 | `NovelMathExt.fs` | 198 | Residuated lattices, Heyting algebra; principled inverse for `min`/`max`. |
| 26 | `FastCdc.fs` | 223 | FastCDC content-defined chunker (Xia 2016) with Gear hash. |
| 27 | `Merkle.fs` | 163 | Merkle-tree checkpoint over chunked digests. |
| 28 | `Residuated.fs` | 129 | `O(log k)` retraction for non-invertible aggregates (`max`/`min`). |
| 29 | `Aggregate.fs` | 312 | `CountOp`, `SumOp`, `AverageOp`, `MinOp`, `MaxOp`, `GroupByOp`. |
| 30 | `RobustStats.fs` | 155 | Median + MAD with 3-sigma outlier filter. |
| 31 | `TemporalCoordinationDetection.fs` | 341 | Phase-locking, cross-correlation, mean phase offset (Amara substrate). |
| 32 | `Veridicality.fs` | 248 | `Provenance`, `Claim<'T>`, `validateProvenance`; Aurora claim-scoring foundation. |
| 33 | `Graph.fs` | 854 | ZSet-backed retraction-native graph substrate; largest file in `src/Core`. |
| 34 | `PhaseExtraction.fs` | 105 | `epochPhase` + `interEventPhase` event-stream → radian-phase converters. |
| 35 | `Window.fs` | 63 | Tumbling / sliding window types; `[<Measure>] type tick`/`ms`. |
| 36 | `Advanced.fs` | 449 | `InspectOp` + advanced operators (semi-recently expanded). |
| 37 | `Fusion.fs` | 94 | Fused `map ⨾ filter ⨾ map` single-pass operator. |
| 38 | `Spine.fs` | 132 | LSM-trace cascading-merge spine. |
| 39 | `SpineAsync.fs` | 85 | Channel-driven async-merge variant of the spine. |
| 40 | `BalancedSpine.fs` | 123 | MaxSAT-inspired greedy balanced merge scheduler. |
| 41 | `SpineSelector.fs` | 57 | `SpineMode` chooser (Sync / Async / AsyncOnDisk) by workload size. |
| 42 | `SimdMerge.fs` | 112 | SIMD-accelerated merge of sorted `int64` runs. |
| 43 | `TimeSeries.fs` | 204 | As-of join `AsofJoinOp` (left-outer with largest-ts ≤ left-ts). |
| 44 | `Upsert.fs` | 130 | `UpsertOp` DU + `UpsertHandle` for primary-keyed CDC. |
| 45 | `Transaction.fs` | 216 | Transactional `z^-1` with `BeginTransaction`/`Commit`/`Rollback`. |
| 46 | `Shard.fs` | 248 | `PaddedCounter` (cache-line padded), shard helpers, fastrange. |
| 47 | `Metrics.fs` | 56 | `System.Diagnostics.Metrics` per-op observability. |
| 48 | `Tracing.fs` | 112 | `ActivitySource` distributed tracing wrapper. |
| 49 | `ChaosEnv.fs` | 130 | Fault-injection `ChaosPolicy` for FoundationDB-style sim tests. |
| 50 | `HigherOrder.fs` | 178 | `D²`, `D³`, …, `Dⁿ` higher-order differentials (Aitken acceleration). |
| 51 | `DiskSpine.fs` | 259 | On-disk `IBackingStore` for the spine (spillable beyond RAM). |
| 52 | `Durability.fs` | 206 | `DurabilityMode` DU; `WitnessDurable` is documented stub (see §5). |
| 53 | `NestedCircuit.fs` | 125 | Sub-circuit with own clock; LFP for recursive queries. |
| 54 | `Runtime.fs` | 99 | `DbspRuntime` — multi-worker pinned-shard runtime. |
| 55 | `WorkStealingRuntime.fs` | 86 | TPL Dataflow `ActionBlock`-based work-stealing variant. |
| 56 | `Recursive.fs` | 346 | `RecursiveSemiNaive` LFP + `FeedbackOp` for recursive queries. |
| 57 | `Hierarchy.fs` | 246 | Incremental closure-table hierarchy over edge-stream Z-sets. |
| 58 | `Plan.fs` | 97 | `OpCost` + `Circuit.Explain()` cost-annotated plan tree. |
| 59 | `Incremental.fs` | 131 | `Q^Δ = D ∘ Q ∘ I` automatic-incrementalization helpers. |
| 60 | `Dsl.fs` | 120 | `Fn<'A, 'B>` interop wrapper (F# fn ↔ `Func<>`). |
| 61 | `Query.fs` | 88 | LINQ-style extension methods (`Where`, `Select`, `Distinct`). |
| 62 | `Injection.fs` | 162 | DI seams: `IBackingStore`, `IClock`, `IMetricsSink`, `IHashStrategy`. |
| 63 | `InjectionExt.fs` | 101 | Pluggable watermark-strategy seam beyond the baseline four. |
| 64 | `SpeculativeWatermark.fs` | 144 | Speculative early-emission with retraction-native correction. |
| 65 | `Sink.fs` | 158 | `DeliveryMode` DU + `AppendResult` (the doc-cited Result-shape for sinks). |
| 66 | `MailboxRuntime.fs` | 107 | F# `MailboxProcessor`-based shard runtime (A/B vs `WorkStealing`). |
| 67 | `FSharpApi.fs` | 194 | Pipe-friendly `Pipeline.filter`/`map`/etc. F# surface. |
| 68 | `Rx.fs` | 95 | `IObservable<'T>`/`IQbservable<'T>` bridge for `OutputHandle`. |
| 69 | `Serializer.fs` | 210 | Tiered serialization seam (TLV / raw-span / FsPickler / Arrow). |
| 70 | `ArrowSerializer.fs` | 99 | Tier-4 Apache Arrow IPC `int64`-keyed columnar serializer. |
| 71 | `DeltaCrdt.fs` | 138 | Delta-state CRDTs + Dotted Version Vectors (Almeida 2018, Preguiça 2010). |
| 72 | `SignalQuality.fs` | 486 | Composable content-quality dimensions (compression, structure, prediction). |

(72 in the compile manifest. Two extra files exist on disk — `Rx.fs` and
`Serializer.fs` are in the manifest above; the manifest contains 72 entries
total. The `find` initially returned 74 because two `obj/` build-output files
were included; they are ignored.)

**Top-level files NOT in the compile manifest:** `src/Core/RecursiveSigned.fs`
(82 lines, parked skeleton per `RecursiveSigned.fs:3-21`; intentionally
excluded from `Core.fsproj` per the file-header comment). Counting it
brings the on-disk top-level `.fs` total to 73. Survey scope is the 72
compiled files; `RecursiveSigned.fs` is discussed separately in §5 (S4)
as the stub-aging observation.

## 3. Hot-churn / large-file flags

### 3.1 Files larger than 500 LOC (audit candidates)

| File | LOC | Notes |
|------|----:|-------|
| `Graph.fs` | 854 | ZSet-backed graph substrate; recently expanded across Amara 11th-14th ferries. Largest file in `src/Core`. Worth a read-pass for module-cohesion: at this size a split into `Graph.Core` (types) + `Graph.Algorithms` (algorithms) may be on the table eventually. |
| `ZSet.fs` | 563 | Core data type — size is justified given it carries `ZEntry`, `ZSetCmp`, `ZSet<'K>`, span/sort/merge/consolidate, and the public surface. No obvious split candidate. |
| `BloomFilter.fs` | 533 | `#nowarn "9"` justified by `NativePtr.stackalloc` zero-alloc hashing path. Carries blocked + counting variants in one file; cohesion looks intentional (counting Bloom is the retraction-safe variant of the regular Bloom). |
| `SignalQuality.fs` | 486 | Composable quality dimensions — compression-gap, structure, prediction. Distinct dimensions in one module; could split if more dimensions land. |
| `Advanced.fs` | 449 | "Core missing operators" header in the file (`src/Core/Advanced.fs:11-13`); a generic `Advanced` name is a smell — see §5.4. |

### 3.2 Recent change activity (last ~10 days)

`git log --since="2026-04-25"` over `src/Core/`: 31 commits touching the
directory. Top files by recent change frequency:

| File | Touches |
|------|--------:|
| `Graph.fs` | 8 |
| `TemporalCoordinationDetection.fs` | 6 |
| `Veridicality.fs` | 4 |
| `SignalQuality.fs` | 4 |
| `Shard.fs` | 3 |
| `RobustStats.fs` | 3 |
| `Circuit.fs` | 3 |

`Core.fsproj` itself was touched 10 times in the same window — consistent
with files being added (each new `<Compile Include>` is a touch).

The hot-churn cluster is the Aurora-substrate cluster: `Graph.fs`,
`TemporalCoordinationDetection.fs`, `Veridicality.fs`, `SignalQuality.fs`,
`RobustStats.fs`, `PhaseExtraction.fs`. The non-Aurora hot files are
`Shard.fs` and `Circuit.fs` — the engine core, where 3 touches in 10 days
on load-bearing infrastructure is normal-cadence work.

## 4. Public-surface observations

- **Single namespace:** every file declares `namespace Zeta.Core` (no
  sub-namespaces under the namespace level — F# modules within the namespace
  do the partitioning). The compiled `Zeta.Core.dll` therefore exposes one
  flat top-level namespace, matching the design intent.
- **`InternalsVisibleTo` discipline:** exactly six consumers, all
  factory-internal (Tests.FSharp, Tests.CSharp, Benchmarks, Bayesian.Tests,
  Core.CSharp.Tests, Zeta.Core.CSharp). Comment at
  `AssemblyInfo.fs:5-10` explicitly notes Zeta.Bayesian uses the public
  `IOperator<'T>` surface, not internals — a stated public-API contract.
- **`type internal` count:** 13 in `Operators.fs`, 9 in `Advanced.fs`, 7 in
  `Aggregate.fs`, 4 in `Primitive.fs`, 3 each in `Shard.fs`, `HigherOrder.fs`,
  `Handles.fs`. Operator types are correctly hidden; the public surface is
  the `Stream<_>`, `Op<_>`, and extension-method shape.
- **`[<RequireQualifiedAccess>]` and `[<Sealed>]`:** widely applied. Top
  five by per-file count: `Shard.fs` 5, `Pool.fs` 5, `Metrics.fs` 5,
  `ConsistentHash.fs` 5, `Tracing.fs` 4. Consistent F#-idiomatic discipline.
- **Top-level F# modules** (other than the namespace types): `DeltaCrdt.fs`
  declares 3 modules (`DeltaCrdt.GCounter`, `DeltaCrdt.GSet`,
  `DeltaCrdt.AddWinsSet`). `ZSet.fs`, `Merkle.fs`, `Graph.fs`,
  `FSharpApi.fs`, `FastCdc.fs`, `BloomFilter.fs` declare 2 each. None of
  these are unusual.
- **`PluginApi.fs:1-25`** carries the deliberate public stable surface;
  `PluginHarness.fs` is the test-time companion. Both have
  `[<RequireQualifiedAccess>] module` shape (where applicable).

## 5. Pattern observations

### 5.1 Result/DbspError discipline (CLAUDE.md §"Result-over-exception")

The CLAUDE.md rule reads: *"User-visible errors surface as
`Result<_, DbspError>` or `AppendResult`-style values; exceptions break
the referential-transparency the operator algebra depends on."*

Empirical state in `src/Core`:

- `LawRunner.fs:66`, `LawRunner.fs:103`, `LawRunner.fs:155`:
  `Result<unit, LawViolation>` — compliant.
- `Sink.fs:107`: `type AppendResult` — the named exemplar from CLAUDE.md.
  `Sink.fs:140` confirms *"never throws for concurrency conflicts"* in the
  XML doc. Compliant.
- `Veridicality.fs:232`: `Result<Claim<'T> list, string>` for
  `antiConsensusGate` — compliant; the `string` error type is a soft
  smell (typed errors preferred), but acceptable for the gate's narrow use.

I did **not** find a unified `DbspError` discriminated-union type used as
the canonical error channel across the library. The CLAUDE.md text reads
*"`Result<_, DbspError>` **or** `AppendResult`-style"* — i.e., either
shape is acceptable. The library currently picks Result-shape per surface
(`LawViolation`, `AppendResult`, `string`); no single `DbspError`
canonical DU exists. This is **consistent with the rule** as written but
worth flagging if future work wants a single error taxonomy.

### 5.2 Exceptions / `failwith` / `raise`

- `Durability.fs:123`, `Durability.fs:130`: two `raise (NotImplementedException(...))`
  calls inside `WitnessDurableBackingStore.Save`/`Reload`. The file-level
  XML doc (`Durability.fs:18-26`) explicitly documents this as a
  research-skeleton stub: *"The implementing `WitnessDurableBackingStore`
  below throws on `Save` until the paper's protocol is fully implemented
  and TLA+-verified."* This is intentional and properly documented;
  callers who select `WitnessDurable` know they get the stub.
- `DiskSpine.fs:176`: one `failwithf "Spine batch %d not found" id`. This
  is an internal-invariant check (the batch was registered but the lookup
  missed) and represents a programmer-error path, not user-error. A
  borderline case under the Result-over-exception rule — internal
  invariant violations are a legitimate place for `failwithf`, and the
  message prints the missing id for debuggability.
- `Rx.fs:81`: one `raise (OperationCanceledException())` — standard .NET
  cancellation idiom, expected.

No `failwith` / `raise` in any other top-level operator file. **Exception
discipline holds.**

### 5.3 `#nowarn` pragmas

- `BloomFilter.fs:2`: `#nowarn "9"` — `NativePtr.stackalloc` is
  unverifiable. Justified by zero-alloc hot path; the hot-path
  `NativePtr.stackalloc<byte>` calls are at `BloomFilter.fs:112`, `:119`,
  `:126`, `:133`. Locally scoped to one file.
- `Shard.fs:2`: `#nowarn "9"` — covers the
  `[<Struct; StructLayout(LayoutKind.Explicit, Size = 128)>] PaddedCounter`
  type at `Shard.fs:17-23` (cache-line padding to avoid false sharing
  on multi-thread counter increment) and the `Span<byte>` cast at
  `Shard.fs:44` for `RandomNumberGenerator.Fill`. No SIMD intrinsics
  in this file (earlier survey draft over-claimed); the suppression
  is bounded to the cache-line + Span constructs.

Both pragmas are file-scoped and justified by performance-critical
unmanaged code. **Compliant with the warning-as-error stance.**

### 5.4 F# idiom adherence

- **`[<MethodImpl(MethodImplOptions.AggressiveInlining)>]`** is widely
  applied on hot-path single-line members.
- **`[<Struct; IsReadOnly; NoComparison>]`** on `ZEntry`, `KeyGroup`,
  `Fn<'A,'B>`, `StreamHandle`, `PaddedCounter` etc. — proper struct
  discipline; spans/cursors stay copy-free.
- **`[<AbstractClass; Sealed>]`** for static-method-only "modules-but-as-a-
  type" used for C# discoverability — `Pool`, `Simd`, `SimdMerge`,
  `IncrementalExtensions`, `Metrics`. F#-idiomatic shape for the C# shim.
- **`ValueTask`** used instead of `Task` in 23 of the 72 files
  (every `StepAsync`/`AfterStepAsync` override). Allocation discipline
  consistent with the hot-loop scheduler.
- **`[<Measure>] type tick / ms`** in `Window.fs:13-14` — F# units of
  measure correctly applied to the time-domain primitives.
- **`Volatile.Read` / `Volatile.Write` / `Interlocked.*`** appear in
  `Recursive.fs`, `Handles.fs`, `Shard.fs`, `SpineAsync.fs`, `Circuit.fs` —
  consistent threading-primitive discipline (per the `race-hunter` skill).

## 6. Quality smells (per-file findings)

### 6.1 No TODO / FIXME / HACK / XXX / `BUG:` markers anywhere

`grep -rn -E "TODO|FIXME|HACK|XXX|BUG:" src/Core/*.fs` returned **zero**
matches. This is a strong positive signal: any open work is in
`docs/BACKLOG.md` and `docs/BUGS.md` rather than left as inline tags. The
CLAUDE.md verify-before-deferring rule + Otto-363 substrate-or-it-didn't-
happen are visibly enforced.

### 6.2 Documented stubs (intentional, not smells)

- `Durability.fs:18-26`: `WitnessDurable` is documented research-skeleton;
  throws `NotImplementedException` on `Save`/`Reload`.
  `Durability.fs:72`: *"protocol is validated, `Save` throws
  `NotImplementedException`"*. Properly flagged.
- `RecursiveSigned.fs:3-21`: file-header comment block names this as a
  "Round-35 stub. Sibling to `Recursive.RecursiveSemiNaive` and
  `Recursive.RecursiveCounting`. The design lives in
  `docs/research/retraction-safe-semi-naive.md` (§"Option 7 — gap-monotone
  signed-delta") and `tools/tla/specs/RecursiveSignedSemiNaive.tla`."
  Properly flagged + cross-referenced.

### 6.3 Genuine smells (small, addressable)

| # | File | Line | Smell | Suggested action |
|---|------|-----:|-------|------------------|
| S1 | `Advanced.fs` | 11-13 | File name "Advanced" is content-free — the header reads *"Core missing operators"*. Future grep-ability suffers; new arrivals can't tell what's in `Advanced.fs` from the name. | When the file gets re-touched, consider rename to e.g. `OperatorsAdvanced.fs` or split by operator family (`InspectOp` → `Inspection.fs`, etc.). Not urgent; cosmetic naming. |
| S2 | `DiskSpine.fs` | 176 | `failwithf "Spine batch %d not found" id` for a missing-batch invariant violation. | Borderline (internal-invariant check). Either keep `failwithf` and add a `<exception>` doc tag on the public surface that can reach this path, or convert to a typed error if any caller would want to recover. Lean: keep it; document. |
| S3 | `Veridicality.fs` | 232 | `Result<Claim<'T> list, string>` — string error channel. | When a second error case lands, replace `string` with a typed DU. Today's single-string is fine for one error mode. |
| S4 | `RecursiveSigned.fs` | 1-82 | "Round-35 stub" — the file has been a documented stub for some time. Not a code smell, but a "stub-aging" observation: confirm the design is still the planned shape before the stub turns into shadow architecture. | Cross-check against `tools/tla/specs/RecursiveSignedSemiNaive.tla` to confirm the TLA+ spec is still the live target. |
| S5 | All files | — | No central `DbspError` DU exists despite CLAUDE.md mentioning it as a canonical shape (alongside `AppendResult`). | Acceptable as-is (rule says "or"). If future work wants a unified error channel, this is the gap to close. |

### 6.4 No commented-out code blocks

Spot scan for commented-out code patterns (lines like `// let x = ...`,
`(* let *)`, etc.) returned only legitimate XML-doc comments and section
banners. The codebase reads cleanly; no graveyards.

## 7. Recommended cleanup order

Ranked by friction-reduction (per CLAUDE.md amortized-speed lens) divided
by effort. None of these are blocking; the codebase is in good shape.

1. **S5 (deferred)** — leave the `DbspError` taxonomy until a second error
   shape forces the issue. Premature unification would invent a DU
   without a use case.
2. **S4 (verify)** — re-cross-check `RecursiveSigned.fs` stub vs the live
   TLA+ spec when the next round opens; either land an implementation tick
   or rename to clarify the stub status.
3. **S2 (document)** — add an `<exception>` doc tag on the
   `DiskSpine`-public method that can transitively reach line 176, so the
   internal-invariant exception is discoverable from the public surface.
   Trivial.
4. **S3 (defer)** — convert `Result<_, string>` in `Veridicality.fs:232`
   to a typed DU when a second error case arrives. Premature otherwise.
5. **S1 (defer)** — `Advanced.fs` rename / split is cosmetic; only act
   when the file gets touched for a substantive reason.

## 8. Closing observations

- **No TODO/FIXME/HACK markers** is the headline. The codebase enforces
  Otto-363 substrate-or-it-didn't-happen at the file level: open work
  lives in tracked surfaces, not as inline tags. This is rare and worth
  preserving.
- **Result/exception discipline holds** — the only `failwith` is one
  internal-invariant check; the only `NotImplementedException` calls are
  documented research-stubs in `Durability.fs`.
- **F# idiomatic shape is consistent across files** — struct discipline,
  `ValueTask` everywhere on hot paths, `[<RequireQualifiedAccess>]`,
  `[<Sealed>]`, `[<AggressiveInlining>]`, units of measure.
- **Hot-churn cluster** is the Aurora substrate (`Graph.fs`,
  `TemporalCoordinationDetection.fs`, `Veridicality.fs`,
  `SignalQuality.fs`, `RobustStats.fs`, `PhaseExtraction.fs`) — expected
  given the recent rounds' courier-ferry absorption work.
- **Largest file is `Graph.fs` at 854 LOC**, the second-largest is
  `ZSet.fs` at 563. Neither is alarming for the load each carries; both
  are coherent single-purpose files.

End of survey.
