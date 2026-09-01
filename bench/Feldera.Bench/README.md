# Feldera.Bench

Side-by-side benchmark harness comparing **Zeta.Core** against **Feldera**
(https://github.com/feldera/feldera) on **Nexmark** and **TPC-H-streaming**
workloads.

## Running locally

```bash
dotnet run -c Release --project bench/Feldera.Bench --filter "*"
```

Each query **builds the circuit once** in `[<GlobalSetup>]` and ticks
`Send(one ZSet.ofArray batch) + Circuit.Step`. Q1 uses `MapMonotone`
(`p * 100` is non-decreasing on generated prices). Do not reconstruct
the circuit inside the iteration (that measures `Circuit.create`, not
the tick) and do not `Send` N singletons (the input op used to
pairwise-add those — O(n²) allocs; it now k-way merges, but a single
batch is still the Feldera-shaped path).

BenchmarkDotNet runs each query across `EventCount ∈ {10K, 100K}` and
reports:

- **Mean / P95 / P99** wall-clock latency
- **Allocations / tick** via `[<MemoryDiagnoser>]`
- **Gen0 / Gen1 / Gen2** GC counts

Results land in `BenchmarkDotNet.Artifacts/` with a JSON + CSV pair.

## Comparing to Feldera

Feldera publishes Nexmark numbers in
https://www.feldera.com/blog/nexmark-vs-flink. Representative expected
numbers at 100 M events / 16 worker threads (Threadripper 3990X):

| Query | Feldera | DBSP target |
|-------|---------|-------------|
| Q1/Q2 projection-only | 10–40 M events/s | ≥ 70 % of Feldera |
| Q3 hash join          | 3–8 M/s          | ≥ 60 % |
| Q7 windowed top-1     | 5–10 M/s         | ≥ 60 % |
| Q5 tumbling top-N     | 2–5 M/s          | ≥ 50 % |

Our near-term target is to **beat Feldera on projection/filter** and
match within 2× on joins. **Not yet a result:** a 2026-09-01 Release
run of this harness is in `docs/BENCHMARKS.md` (Q1/Q2 mean + alloc).
That tick coalesces `Price = rng.Next 10_000` so `|Z-set| ≤ 10_000`.
Do not quote generator-N / mean as Feldera events/s. Unique-key Q1/Q2
(`NexmarkQ1Unique` / `NexmarkQ2Unique`) keep `|Z-set| = N`. Same-box
Feldera numbers and the three-OS CI job:
`docs/research/feldera-comparison-status.md`,
`.github/workflows/feldera-compare.yml`.

## Roadmap

- **Now**: Q1 projection, Q2 filter — shipped
- **Next**: Q3 hash join, Q7 windowed top-1 (needs `Window.fs` wiring)
- **Later**: Q5 tumbling top-N (residuated-lattice `ResidualMax`!),
  Q8 self-join, Q12 pre-fix
- **TPC-H**: Q1 scalar agg, Q5 multi-join

## Output comparison

Export Feldera's `benchmark/results.json` alongside our `Artifacts/`
JSON, then a side-by-side table prints via `FelderaCompare.fs`
(future helper). The `q12` optimization story from Feldera's blog is
a particularly useful micro-benchmark to replicate — it exercises
spine compaction + sink backpressure together.
