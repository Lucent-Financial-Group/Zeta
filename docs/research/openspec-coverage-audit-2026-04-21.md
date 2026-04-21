# OpenSpec Coverage Audit — 2026-04-21

**Audit date:** 2026-04-21
**Round:** 41 opener
**Author:** Architect (Kenji) — dispatched inventory; spec-zealot
(Viktor) to review adversarially post-land.
**Triggering question:** human maintainer, 2026-04-20 — *"opensepcs,
if I deleted all the code right now how easy to recreate based on the
openspecs"*.

## TL;DR

- **Disaster-recovery coverage today: ~6% by capability count,
  ~7% by line ratio.** 4 capabilities × ~200 lines of spec.md
  each (783 total) versus 66 top-level F# modules totalling
  **10,839** lines under `src/Core/`.
- **Band 1 (MUST BACKFILL)**: 8 modules / 1,629 lines — ZSet,
  Circuit, NestedCircuit, and the Spine family (Spine,
  DiskSpine, BalancedSpine, SpineAsync, SpineSelector). Without
  these, the disaster-recovery contract in `openspec/README.md`
  cannot be satisfied — the factory cannot rebuild a query
  engine from the specs alone.
- **Band 2 (HIGH)**: 12 modules / 2,008 lines — probabilistic
  sketches, CRDT family, hashing / integrity, serialization,
  SIMD dispatch.
- **Band 3 (MEDIUM)**: 45 modules / 6,585 lines — infrastructure,
  surfaces, runtimes, algebra extensions.
- **Band 4 (deliberately uncovered)**: `AssemblyInfo.fs` (17
  lines, build metadata).
- **Recommended cadence: one capability per round baseline, two
  if small.** See §Part D for the first 6-round sequence.
- **Round 41 starts by extending `operator-algebra`** with
  ZSet group operations + Circuit delay / clock semantics. That
  is the single highest-leverage move: it closes the largest
  semantic gap in the existing spec and sets the pattern for
  every subsequent capability.

## Part A — Module inventory (66 top-level modules / 10,839 lines)

Source: `ls src/Core/*.fs`, `wc -l src/Core/*.fs`.

Summary by band below; the Band definitions in this document are
the load-bearing artefact.

## Part B — What the 4 existing capabilities cover today

1. **`durability-modes`** (189 lines of spec.md) — covers
   `Durability.fs` (checkpoint encode/decode), `DiskSpine.fs`
   (`IBackingStore` seam), `Environment.fs` (platform
   detection), `FeatureFlags.fs` (witness-durable gating).
   **Gap:** `SpineAsync.fs` / `SpineSelector.fs` mode
   selection decision tree is not documented; the spec
   declares the modes exist but not the selector logic.
2. **`operator-algebra`** (184 lines of spec.md) — covers
   `Algebra.fs` (weight ring ℤ), `Operators.fs` (map /
   filter), `Watermark.fs` (causal stream semantics),
   `NestedCircuit.fs` (feedback cells). **Gap:** `Circuit.fs`
   `Op` base type + clock / tick / delay semantics is assumed
   but not stated; `ZSet.fs` group operations (add / negate /
   subtract) are named by type but not by law;
   `Incremental.fs` integration / differentiation primitives
   are absent. This capability is deep (RFC-2119 MUSTs +
   Gherkin scenarios), but its surface is incomplete — it is a
   reference model for a subset of the algebra, not the whole
   algebra.
3. **`repo-automation`** (230 lines of spec.md) — infra-only.
   Covers repo state declarativity, manifests, CI/CD posture.
   Does not cover `src/Core/*.fs` directly (no code overlap).
4. **`retraction-safe-recursion`** (180 lines of spec.md) —
   covers `NestedCircuit.fs` (feedback cells + inner clock
   iteration), `Recursive.fs` (least-fixed-point combinators),
   `RecursiveSigned.fs` (signed-weight recursive semantics).
   **Gap:** cross-references missing to `Crdt.fs` /
   `DeltaCrdt.fs` convergence and `Transaction.fs` rollback.

## Part C — Uncovered modules, sorted by blast radius

### Band 1 — MUST BACKFILL (8 modules / 1,629 lines)

Load-bearing for every query. Without these, there is no query
engine to recover; the disaster-recovery contract fails at the
first paragraph.

| Module | Lines | Disaster-recovery role |
|---|---|---|
| `ZSet.fs` | 563 | The canonical data structure; nothing else compiles without it. |
| `BloomFilter.fs` | 533 | Shipped with Adopt tech-radar status Round 40; now publicly committed, needs a spec to match. |
| `Circuit.fs` | 285 | `Op` base type + clock + tick + delay semantics. |
| `DiskSpine.fs` | 259 | Pluggable backing store; abstracts in-memory vs disk-swap. |
| `Spine.fs` | 132 | LSM trace over Z-set batches; O(log n) amortised insert. |
| `NestedCircuit.fs` | 125 | Nested sub-circuit with inner clock; recursive query / transitive-closure substrate. |
| `BalancedSpine.fs` | 123 | MaxSAT-inspired merge scheduler for bounded per-insert latency. |
| `SpineAsync.fs` | 85 | Async-merging LSM spine; defers merge to background worker. |
| `SpineSelector.fs` | 57 | Auto-select spine mode based on workload size. |

Note: `BloomFilter.fs` (533 lines) is listed here because
TECH-RADAR flipped it to Adopt in Round 40, and Adopt rows
carry an implied spec-contract commitment to external
consumers. Shipped-Adopt without spec coverage is a
backwards-compatibility hazard.

### Band 2 — HIGH (12 modules / 2,008 lines)

Probabilistic and algebraic substrates. Performance-critical or
correctness-load-bearing; query engine runs without them, but
poorly or incorrectly at scale.

`Sketch.fs` (99) HyperLogLog cardinality;
`CountMin.fs` (163) linear frequency estimation with retraction
support;
`Crdt.fs` (136) G-counter / PN-counter / OR-Set / LWW;
`DeltaCrdt.fs` (138) delta-state + DVV anti-entropy;
`ConsistentHash.fs` (221) Jump / Rendezvous / Memento;
`Merkle.fs` (163) checkpoint dedup;
`HardwareCrc.fs` (89) SSE4.2 / ARM CRC32C + managed fallback;
`Serializer.fs` (210) tiered DI seam;
`ArrowSerializer.fs` (99) Arrow IPC Tier 4;
`Simd.fs` (53) `System.Numerics.Vector<T>` dispatch;
`SimdMerge.fs` (112) SIMD merge of sorted int64 runs;
`FastCdc.fs` (225) content-defined chunking (Xia et al. 2016).

### Band 3 — MEDIUM (45 modules / 6,585 lines)

Infrastructure, surfaces, runtime, algebra extensions. Necessary
for a complete system but not for proving the core operator
algebra correct. These rows each become a capability once
Band 1 + Band 2 are covered.

Runtime family: `Runtime.fs`, `MailboxRuntime.fs`,
`WorkStealingRuntime.fs`, `Shard.fs`.
Plugin surface: `PluginApi.fs`, `PluginHarness.fs`.
Transactions + upsert: `Transaction.fs`, `Upsert.fs`.
Watermarks: `Watermark.fs`, `SpeculativeWatermark.fs`.
Streaming ops: `Operators.fs`, `Aggregate.fs`, `Fusion.fs`,
`Window.fs`, `TimeSeries.fs`, `Hierarchy.fs`, `HigherOrder.fs`,
`Rx.fs`, `Sink.fs`, `Advanced.fs`.
Query surface: `Query.fs`, `Plan.fs`, `Dsl.fs`, `FSharpApi.fs`.
Algebra + laws: `NovelMath.fs`, `NovelMathExt.fs`,
`Residuated.fs`, `LawRunner.fs`.
Recursion surface: `Recursive.fs`, `RecursiveSigned.fs`,
`Incremental.fs`.
DI: `Injection.fs`, `InjectionExt.fs`.
Indexing: `IndexedZSet.fs`.
Observability: `ChaosEnv.fs`, `FeatureFlags.fs`, `Metrics.fs`,
`Tracing.fs`, `Environment.fs`.
Checkpointing: `Durability.fs`.
Handles + pooling + primitives: `Handles.fs`, `Pool.fs`,
`Primitive.fs`.

### Band 4 — deliberately uncovered (1 module / 17 lines)

`AssemblyInfo.fs` — build metadata, no behaviour to specify.

## Part D — Recommended first 6-round backfill cadence

One capability per round, two if small. Prioritise Band 1 first;
Band 2 interleaves when a Band 1 capability ships in under a
full round.

| Round | Capability | Modules spanned | LOC | Rationale |
|---|---|---|---|---|
| 41 | **`operator-algebra` — extension pass** | `ZSet`, `Circuit`, `Incremental` added to existing spec | 979 | Close the largest semantic gap in the existing spec. Sets the pattern for every subsequent capability. |
| 42 | **`lsm-spine-family`** (new) | `Spine`, `DiskSpine`, `BalancedSpine`, `SpineAsync`, `SpineSelector` | 656 | Whole family; they co-depend. |
| 43 | **`circuit-recursion`** (new) | `NestedCircuit`, `Recursive`, `RecursiveSigned` | 542 | Recursive-query substrate; pairs with `retraction-safe-recursion`. |
| 44 | **`sketches-probabilistic`** (new) | `BloomFilter`, `Sketch`, `CountMin` | 795 | Bloom is Adopt on TECH-RADAR — must have spec-contract. |
| 45 | **`content-integrity`** (new) | `Merkle`, `HardwareCrc`, `FastCdc` | 477 | Checkpoint dedup + integrity primitives. |
| 46 | **`crdt-family`** (new) | `Crdt`, `DeltaCrdt`, `ConsistentHash` | 495 | Convergence + shard-assignment primitives. |

After Round 46: 5 new capabilities + 1 extension pass →
**9 capabilities / ~3,944 lines of spec.md estimated** (scaling
from existing 783/4 ≈ 196 lines-per-capability average).

Rounds 47–54 cover Band 2 completions (serialization,
SIMD dispatch) and Band 3 infrastructure.

## Success signal

A subsequent spec-zealot (Viktor) audit — run every round
on the freshly-landed capability — answers "if `src/Core/` were
deleted today, could I rebuild this module from this spec
alone?" with a clear **yes**. If the answer is *no*, the
capability is re-opened and the round counts as half-credit
for cadence purposes.

## Named exceptions

- `AssemblyInfo.fs` — deliberately uncovered (build metadata).
- `repo-automation` — intentionally covers no `src/Core/`
  module; it specifies the repo's meta-behaviour, not the
  library's.

## Open questions for Architect / Aaron

1. **Does the per-round baseline hold during paper-grade
   rounds?** A round spent on the Stainback conjecture proof or
   a Lean Mathlib landing cannot simultaneously ship a new
   capability. Propose: half-credit cadence allowed on
   paper-grade rounds, no more than 1 per 3 rounds.
2. **Is the Band 3 MEDIUM list the natural capability carve-up,
   or should it collapse into fewer larger capabilities?**
   45 modules → 45 capabilities is absurd; need a merging pass
   before those rounds.

## Handoff

- **Viktor (spec-zealot)** — review this audit adversarially.
  Is the banding honest? Are there Band 1 modules hiding in
  Band 3?
- **Aminata (threat-model-critic)** — any capability whose
  absence from spec creates a threat-model gap? (Specifically:
  `Merkle.fs` + `HardwareCrc.fs` integrity claims.)
- **Ilyana (public-API-designer)** — any capability crossing
  the published-library surface? (`BloomFilter.fs` now that
  it's Adopt; `Serializer.fs` as the public
  `ISerializer<'T>` seam.)
