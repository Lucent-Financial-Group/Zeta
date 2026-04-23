# Checked vs unchecked arithmetic — when safety is free and when it costs throughput

**Subject:** production-dotnet
**Level:** applied (default) + theoretical (opt-in)
**Audience:** contributors already comfortable with F# types,
spans, and Z-set basics; moving from "it compiles" to "it runs
fast *and* correctly under adversarial input"
**Prerequisites:** an onboarding-tier Z-set foundation — of the
planned onboarding modules (zset-basics, retraction-intuition,
operator-composition, semiring-basics), `retraction-intuition`
ships on main today as `docs/craft/subjects/zeta/retraction-
intuition/`; the other three are in-flight PRs. Also assumes
BenchmarkDotNet literacy.
**Next suggested:** `subjects/production-dotnet/zero-alloc-hot-
loops/` (forthcoming — stubbed in the per-tier README)

---

## The anchor — a loop that sums 100 million `int64`s

You're writing a Z-set aggregation. Somewhere in the hot path
you have this:

```fsharp
let sumWeights (span: ReadOnlySpan<ZEntry<'K>>) : int64 =
    let mutable total = 0L
    for i in 0 .. span.Length - 1 do
        total <- Checked.(+) total span.[i].Weight
    total
```

On a 100-million-entry span this loop runs ~40-60 ms on a
modern laptop. Drop `Checked.` and the same loop runs in ~10-
15 ms — a 3-4× throughput improvement. On a hotter workload
(SIMD-vectorisable, tight inner) the gap widens further
because `Vector<int64>` does not exist with checked semantics.

**But if you drop `Checked.` carelessly, a cumulative weight
sum can sign-flip your entire multiset** (this is the
canonical Zeta hazard documented at `src/Core/ZSet.fs:227-
230`). The production-tier question is never "checked vs.
unchecked in the abstract" — it is "can we prove the bound,
and if yes, does the measurement earn the demotion?"

---

## Applied track — the decision framework

### F# defaults (know these cold)

- F# operators `+`, `-`, `*` on integer types are **unchecked
  by default** — silent wraparound on overflow.
- `Checked.(+)`, `Checked.(-)`, `Checked.(*)`,
  `Checked.( ~-)` from `Microsoft.FSharp.Core.Operators.
  Checked` opt in to `OverflowException` on overflow.
- There is no `checked { }` / `unchecked { }` block in F# —
  the choice is per-call-site via qualifier.
- The project-wide `<CheckForOverflowUnderflow>` MSBuild
  property exists but we do not use it. Explicit-opt-in per
  site is our discipline.
- `Unchecked.defaultof<'T>` is **unrelated** — it asks the
  type system for a zero value. Do not confuse it with
  unchecked arithmetic.

### The six-class site decision matrix

Classify every arithmetic site into one of six classes before
deciding whether to use `Checked.`:

| Class | Definition | Default |
|---|---|---|
| **Bounded-by-construction** | The type system or a compile-time constant proves overflow impossible (e.g. `byte + byte → int32`). | unchecked (F# default) |
| **Bounded-by-workload** | An invariant of the running system proves the sum cannot reach `MaxValue` within any reasonable lifetime (e.g. a counter incrementing once per op, `int64` range, sub-exaflop workload). | unchecked + citing comment |
| **Bounded-by-pre-check** | A cheap upstream guard makes overflow impossible inside the hot loop (the guard is outside the loop). | unchecked inside loop; check at boundary |
| **Unbounded stream sum** | A cumulative value over an unbounded stream — no bound is provable because the stream never ends. | **keep `Checked.`** |
| **User-controlled product** | A product of two caller-provided values that a hostile caller could pick adversarially. | **keep `Checked.`** |
| **SIMD-candidate** | A loop eligible for `Vector<int64>` vectorisation where checked arithmetic is architecturally unavailable. | unchecked with block-boundary overflow detection |

### Decision tree (read top to bottom)

1. Is the bound provable by the **type system** (e.g. `byte +
   byte` cannot overflow `int32`)? → **unchecked.**
2. Is the bound provable by an **upstream pre-check** (e.g. a
   `guard` that refuses inputs past a threshold)? → **unchecked
   inside the loop; keep the pre-check outside.**
3. Is the bound provable by a **workload invariant** (e.g.
   counter monotonic, lifetime < 2^63 ops)? → **unchecked with
   a citing comment pointing at the invariant.**
4. Is the loop **SIMD-vectorisable** and the width would
   material-ise a measured speedup? → **unchecked; detect
   overflow at the block boundary** (compare sum-of-absolutes
   pre-vs-post, or watch for sign-flip).
5. Otherwise — `Checked.` stays.

### The measurement gate

Before landing any demotion, produce a BenchmarkDotNet micro-
benchmark comparing the two:

```fsharp
[<MemoryDiagnoser; DisassemblyDiagnoser(maxDepth = 3)>]
type CheckedVsUnchecked() =
    let data = Array.init 100_000_000 (fun i -> int64 i)

    [<Benchmark(Baseline = true)>]
    member _.Checked () =
        let mutable total = 0L
        for i in 0 .. data.Length - 1 do
            total <- Checked.(+) total data.[i]
        total

    [<Benchmark>]
    member _.Unchecked () =
        let mutable total = 0L
        for i in 0 .. data.Length - 1 do
            total <- total + data.[i]
        total
```

A demotion that does not deliver ≥ 5 % measured improvement
on this workload is not worth the correctness risk. Small
speedups on cold paths do not justify giving up overflow
detection; in that case the `Checked.` stays.

### Silent-overflow detection in production

Even with a proved bound, belt-and-braces discipline says you
should be able to catch a bound violation in production
without crashing:

- **Invariant assertions at stream boundaries** — when a
  computed total leaves a hot path, assert `total >= 0L`
  (or whatever sign invariant holds). The assertion is free;
  the information is not.
- **Metric sensors** — emit `max(abs(intermediate))` as a
  per-operator metric. A silent wraparound appears as a
  sudden jump from near-`MaxValue` to deeply-negative.
- **Property tests on the bound** — your FsCheck harness
  should generate inputs at ±2^62 to exercise the boundary
  directly. If the production code ever reaches those
  magnitudes in the wild, the tests have validated the
  behaviour.

---

## Theoretical track — how to prove a bound

Three techniques, in order of preference.

### 1. Type-system proof (free, always preferred)

If widening makes overflow impossible, demote without
argument:

```fsharp
// byte + byte cannot overflow int32 (max 255 + 255 = 510)
let inline sum2 (a: byte) (b: byte) = int32 a + int32 b
```

### 2. Algebraic bound argument

Cite a workload invariant in a comment. Example (`Z-set
weight sum on a windowed stream with max window size W`):

```fsharp
// Bound: a window holds at most W entries, each with
// |Weight| <= 2^31. Cumulative sum bounded by W * 2^31.
// For W < 2^32 (our configured max), sum stays within int64.
let mutable total = 0L   // unchecked, bound justified above
```

The comment turns a silent assumption into a reviewable
claim. A reviewer who disagrees can challenge the invariant;
a reviewer who agrees has validated the demotion.

### 3. Property-test coverage (FsCheck)

For workload bounds that are not closed-form, a property test
documents the bound operationally:

```fsharp
// Helper mirroring the hot-path shape but over plain int64
// so the bound test stands alone. The real `sumWeights` in
// `src/Core/ZSet.fs` takes `ReadOnlySpan<ZEntry<'K>>` and
// reads `.Weight` per entry; the arithmetic is identical.
let sumInt64s (span: ReadOnlySpan<int64>) : int64 =
    let mutable total = 0L
    for i in 0 .. span.Length - 1 do
        total <- total + span.[i]   // unchecked; see property below
    total

[<Property(MaxTest = 10_000)>]
let ``sum stays in int64 range for bounded inputs``
    (values: NonEmptyArray<int64>) =
    let bounded =
        values.Get
        |> Array.map (fun x -> x % (1L <<< 40))  // bound magnitude
    let s = sumInt64s (ReadOnlySpan(bounded))
    abs s < (1L <<< 62)  // sum stays 2 bits below MaxValue
```

The property codifies "inputs bounded at 2^40, sum bounded at
2^62" — a demotion to unchecked is justified under that
contract. If production ever violates the contract, the
workload invariant is wrong, not the code.

---

## Zeta-specific choice — what the audit preserves

The canonical `Checked.` site in Zeta is here:

```fsharp
// src/Core/ZSet.fs:227-230
// `Checked.(+)` — Z-set weights are int64 but nothing
// stops a stream from running forever; silent wraparound
// on overflow would turn a +2^63 multiset into a -2^63
// multiset and corrupt every downstream query.
let s = Checked.(+) sa.[i].Weight sb.[j].Weight
```

This site is class **Unbounded stream sum** — the bound is
not provable because nothing in the DBSP contract bounds
stream lifetime. A production-grade Zeta deployment
processing 1 B retractions/s would reach `Int64.MaxValue` in
~292 years; that is long but not ∞, and a correct-by-
construction library should not have a silent time-horizon
bug. **This site stays `Checked.`**.

Candidate demotions from the same file that merit per-site
analysis under the audit (`docs/BACKLOG.md` P2 — Production-
code performance discipline):

- `src/Core/ZSet.fs:289-295` — **SIMD-candidate**. Loop-
  unrolled 4× partial sums. `Vector<int64>` could replace
  the four scalar adders at 2-4× throughput; but the
  overflow-detection-at-block-boundary pattern is needed
  to preserve the Z-set weight invariant.
- `src/Core/NovelMath.fs:87` — **Bounded-by-workload**. A
  counter `count <- Checked.(+) count 1L`. Bound:
  "incrementing once per tropical-semiring element takes
  longer than the universe has existed at any achievable ops/
  s". Demote with a comment citing the invariant.
- `src/Core/CountMin.fs:77` — **Bounded-by-workload** with a
  soft cap. Count-Min counters are by construction small;
  workload-bounded by Sketch accuracy parameters. Demote
  with bound citation.
- `src/Core/Aggregate.fs:30` — **Unbounded stream sum** in
  the group-sum case. Keep `Checked.` — class matches
  ZSet.fs:227.

**The audit is not "demote everything"; it is "classify
every site and demote only what passes the measurement gate."**
Over half the sites will keep `Checked.` on correctness
grounds. That is the correct outcome.

---

## Composes with

- `subjects/zeta/retraction-intuition/` — the onboarding-
  tier module on main that introduces signed weights; the
  canonical "Z-set weight" vocabulary this module builds on.
- `subjects/zeta/zset-basics/` (in-flight via PR #200) —
  the foundational Z-set introduction once it merges; you
  need to know what a Z-set weight *is* before reasoning
  about its overflow behaviour.
- `subjects/zeta/operator-composition/` (in-flight via
  PR #203) — establishes why weight-sum correctness is
  load-bearing for every downstream operator.
- `docs/BACKLOG.md` § "P2 — Production-code performance
  discipline" — the two BACKLOG rows this module supports
  (audit + Craft production-tier ladder).
- `src/Core/ZSet.fs:227-230` — the canonical rationale
  comment; this module is the pedagogical expansion of that
  comment.
- **Out-of-repo** (per-user memory, not yet in-repo)
  factory-generic memory
  `feedback_samples_readability_real_code_zero_alloc_
  2026_04_22.md` — the samples-vs-production discipline this
  production tier extends to pedagogy (candidate for
  Overlay-A migration when that memory is promoted
  in-repo).
- `docs/BENCHMARKS.md` "Allocation guarantees" section — the
  sibling surface where the audit's measurement deliverables
  land.

---

## What this module is NOT

- **Not a mandate to demote every `Checked.` site.** The
  canonical stream-weight-sum case stays Checked on
  correctness grounds; roughly half the audit's sites will
  land in the "keep Checked" column.
- **Not authorisation to disable `CheckForOverflowUnderflow`
  project-wide.** Our discipline is explicit opt-in per call
  site, not a project-flag flip.
- **Not a substitute for property tests.** Every demotion
  demands an FsCheck property asserting the claimed bound.
  Demoting without the test is a latent regression.
- **Not onboarding material.** A reader who does not yet
  understand what a `ZEntry<'K>` is will not benefit from
  this module — they will return to `subjects/zeta/zset-
  basics/` first.
- **Not micro-optimisation for its own sake.** The
  measurement gate (≥ 5 % improvement) is load-bearing. A
  demotion that saves 1 % on a cold path is not worth the
  correctness risk; the `Checked.` stays.

---

## Self-check — did this module work for you?

After reading, a production-tier reader should be able to:

1. Name the six site classes and give a one-line criterion
   for each.
2. Write a BenchmarkDotNet harness comparing `Checked.(+)` to
   `(+)` on a hot loop.
3. Recognise the `src/Core/ZSet.fs:227-230` site as an
   **unbounded stream sum** and explain why it stays
   `Checked.`
4. Propose a concrete demotion candidate in Zeta with an
   accompanying FsCheck property and a bound-argument comment.

If any of those four are shaky, the module failed on that
axis. Open a GitHub issue (or propose a revision PR) — the
Craft discipline (bidirectional alignment) treats your
confusion as evidence the module needs work, not evidence
that you do. `docs/WONT-DO.md` is the curated list of
explicitly declined features — not an issue tracker; use
GitHub issues for the report itself, reserve `WONT-DO.md`
for declined-with-reason entries once triage concludes.
