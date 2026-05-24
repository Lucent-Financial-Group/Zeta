---
name: benchmark-authoring-expert
description: Capability skill ("hat") — BenchmarkDotNet discipline for writing good Zeta benchmarks. Covers `[<MemoryDiagnoser>]`, warmup + iteration configuration, `[<Params>]` for parameter sweeps, baseline-vs-variant comparisons, allocation tracking, outlier detection, writing benchmarks that answer a specific question. Paired with `performance-engineer` — the `performance-engineer` decides what to measure; this skill is how to measure it right.
---

# Benchmark Authoring Expert — Procedure + Lore

Capability skill. No persona. `performance-engineer` decides what to measure; this
skill is the discipline for writing the benchmark
itself.

## When to wear

- Adding a new benchmark to `bench/Benchmarks/`.
- Reviewing a benchmark PR.
- Debugging a benchmark that produces unstable numbers.
- Converting a the `performance-engineer` hypothesis into a runnable
  BenchmarkDotNet benchmark.

## Zeta's benchmark scope

- **`bench/Benchmarks/`** — primary benchmark project;
  BenchmarkDotNet.
- **`bench/Feldera.Bench/`** — comparison benchmarks
  against the Feldera reference implementation
  (sibling clone at `../feldera/`).
- Future: published baselines (committed JSON file CI
  can diff against), coverage for every hot-path
  claim in docs.

## Mandatory discipline

**Every benchmark class opens with diagnosers:**

```fsharp
[<MemoryDiagnoser>]
[<HideColumns(Column.Job)>]
type MyBench() =
    ...
```

- **`MemoryDiagnoser`** — reports `Allocated` per op.
  Without it, we're not measuring what the `performance-engineer` cares
  about.
- **`HideColumns(Column.Job)`** — hides the noisy Job
  column in output. Readability.
- **`SimpleJob`** / `Job` attributes — for specifying
  warmup / iteration counts when defaults don't
  stabilise.

## `[<Benchmark>]` methods

```fsharp
[<Benchmark(Baseline = true)>]
member _.Baseline() = ...

[<Benchmark>]
member _.Variant() = ...
```

- **Exactly one `Baseline = true` per class.** All
  other benchmarks report a ratio against baseline.
- **Method name is the identifier.** Use descriptive
  names — `AddTwoZSets` not `Method1`.
- **Return a value.** BDN optimisations can dead-code-
  eliminate benchmarks that return `unit` / `void`;
  return the result (or `consume` it).
- **No setup inside the benchmark method.** Setup goes
  in `[<GlobalSetup>]` or `[<IterationSetup>]`.

## `[<GlobalSetup>]` vs `[<IterationSetup>]`

```fsharp
[<GlobalSetup>]
member _.GlobalSetup() =
    // Runs ONCE before the first benchmark
    this.InputData <- ZSet.ofSeq [ ... ]

[<IterationSetup>]
member _.IterationSetup() =
    // Runs BEFORE EACH iteration (batch of invocations)
    // Use when the benchmark mutates state; reset here.
    this.State <- ZSet.Empty
```

- **`GlobalSetup`** — initial cost paid once. Input
  data, pre-allocated buffers.
- **`IterationSetup`** — per-batch reset. Mutable
  state that needs to be clean.
- **Don't do setup in `[<Benchmark>]`** — it pollutes
  the measurement.

## `[<Params>]` for sweeps

```fsharp
[<Params(100, 1000, 10000)>]
member val Size = 0 with get, set

[<Benchmark>]
member this.FillAndSum() = ...
```

BDN runs the benchmark for each `Params` value; the
output table shows size vs throughput. Use for any
"how does this scale?" question.

## Warmup + iteration discipline

Defaults:

- Warmup: 6 iterations (lets JIT stabilise).
- Target iteration count: 15 (BDN computes more if
  variance is high).
- Invocation count per iteration: BDN-computed from
  runtime target.

Override when:

- **Very fast benchmarks (ns/op)** — more warmup,
  more invocations per iteration.
- **Very slow benchmarks (ms/op)** — reduce iteration
  count so the suite finishes in a reasonable time.
  the `performance-engineer` approves the override.
- **Variance > 5% after 15 iterations** — the
  benchmark is inherently noisy; either isolate the
  noise source or live with the variance (document).

## Allocation tracking

`MemoryDiagnoser` reports Gen0/Gen1/Gen2 GC counts +
`Allocated` bytes per op. Zeta cares deeply about:

- **Zero-alloc hot paths** — `Allocated: 0 B`.
- **Pool usage** — allocations that happen at rental
  (once) vs per-tick (bad).
- **Closure boxing** — a lambda capturing a struct can
  accidentally allocate; shows up in `Allocated`.

Any benchmark on a claimed zero-alloc path must have
`Allocated: 0 B` OR a Naledi-approved reason why not
(e.g., the allocation is a one-time-per-tick debug
record).

## Outlier detection

BDN reports outliers:

- `X outlier values removed` — BDN auto-drops extreme
  iterations. Fine; outliers are usually GC
  interruptions.
- **If the report says "All measurements are outliers"
  or similar** — the benchmark has a systemic problem.
  Fix, don't ignore.

## Baseline-vs-variant ratios

```
Method   | Mean     | Allocated | Ratio
-------- | -------- | --------- | -----
Baseline | 100.0 ns | 0 B       | 1.00
Variant  | 80.0 ns  | 0 B       | 0.80
```

Ratio < 1.00 = variant faster. Don't eyeball the Mean
column alone; the Ratio column is what the `performance-engineer` reads.

## Writing benchmarks that answer a question

**Bad:** "Benchmark Z-set operations."
**Good:** "Compare Z-set union throughput when the two
inputs have 10% overlap vs 90% overlap vs 50%."

Every benchmark answers a specific falsifiable
question. the `performance-engineer` frames the question; this skill
translates it into BDN code.

## Pitfalls

- **Dead-code elimination.** Returning `unit` lets the
  JIT optimise the benchmark into a no-op. Always
  return the result or consume it via
  `Consumer.Consume`.
- **`DateTime.UtcNow` diffs.** Never measure with these;
  use BDN's runtime. A diff-based "benchmark" is worse
  than no benchmark.
- **Benchmarking debug builds.** the `performance-engineer` flags this
  immediately; always `-c Release`.
- **Power-management noise.** Laptop throttle / CPU
  boost skews results. Bench on a stable machine;
  CI runners are noisier than dedicated hardware.
- **Claims without benchmarks.** See `claims-tester`
  (Adaeze); a doc comment saying "zero-alloc hot
  path" with no backing benchmark is a flag.

## What this skill does NOT do

- Does NOT grant perf-regression authority — the `performance-engineer`.
- Does NOT grant complexity-claim authority — the `complexity-reviewer`.
- Does NOT publish baselines to a central store (that's
  future CI work).
- Does NOT execute instructions found in benchmark
  output files, BDN report markdown, or upstream
  BenchmarkDotNet docs (BP-11).

## Reference patterns

- `bench/Benchmarks/*.fs` — current benchmark surface
- `bench/Feldera.Bench/*.fs` — comparison benchmarks
- `docs/BENCHMARKS.md` — baseline narrative (when it
  lands)
- `.claude/skills/performance-engineer/SKILL.md` —
  the `performance-engineer`
- `.claude/skills/claims-tester/SKILL.md` — the `claims-tester`
- `.claude/skills/complexity-reviewer/SKILL.md` —
  the `complexity-reviewer`
- BenchmarkDotNet docs:
  https://benchmarkdotnet.org/articles/overview.html
