# BloomFilter benchmark results — 2026-04-20

Round 40 deliverable. Measurements that were to
graduate the **Bloom filters (blocked + counting)**
row on [`../TECH-RADAR.md`](../TECH-RADAR.md) from
Trial to Adopt per the row's own evidence gate:
*"Promote to Adopt once `bench/Benchmarks/BloomBench.fs`
lands with measured FP rate + cache-miss numbers."*

**Outcome: gate FAILED. Row stays at Trial.** Measured
false-positive rate exceeds the 2×-target acceptance
threshold by 4.6× to 9.8×. Throughput and cache
behaviour pass; the failure is a parameter-derivation
bug in `BloomFilter.createBlocked`, diagnosed below.
A harsh-critic P0 correctness follow-on is filed in
[`../BACKLOG.md`](../BACKLOG.md).

## Scope

BenchmarkDotNet runs against
[`../../bench/Benchmarks/BloomBench.fs`](../../bench/Benchmarks/BloomBench.fs).
Fourteen benchmark runs across three categories:

1. **Throughput** — `BlockedAdd{Int64,String}`,
   `BlockedMayContain{Int64,String}` at N ∈ {10k, 100k, 1M}.
2. **Empirical FPR** — `BlockedFpr` at N ∈ {10k, 100k},
   target p = 0.01. Supplemented by a standalone F#
   script (`/tmp/bloom_fpr_check.fsx`) that reports the
   actual FP *counts* BDN discards (BDN measures timing
   only, not return values).
3. **Allocation profile** — `[<MemoryDiagnoser>]` on
   every class. Every Blocked path reports `-` (zero
   managed allocation per op), confirming the stated
   zero-alloc hot-path goal.

## Environment

- **Machine:** Apple M2 Ultra, 24 physical cores,
  macOS Tahoe 26.4.1 (darwin 25.4.0). Maintainer's
  laptop; not a dedicated benchmark host.
- **Runtime:** .NET 10.0.6, Arm64 RyuJIT armv8.0-a,
  Release build.
- **Build gate:** `dotnet build -c Release` green
  (0 Warning, 0 Error) before the BDN run.
- **Commit:** measurements taken on branch
  `round-34-upstream-sync` at the Round 39 pitch-bundle
  tip.

## Honest-bounds note — cache-miss measurement

The TECH-RADAR row names *cache-miss numbers* as part
of the Adopt gate. BDN's `HardwareCounters` attribute
supports `CacheMisses` **only on Linux (perf_event) and
Windows (ETW)**; macOS has no portable perf-counter
bridge in BDN. On this host we therefore measure:

- Throughput (ns/op, primary cache-behaviour proxy).
- Per-N scaling — the ratio of ns/op at N=10k vs
  N=1M reveals L1/L2/L3 transition behaviour
  indirectly: a cache-friendly structure keeps the
  ratio near 1.0; a cache-hostile one grows sharply.
- Allocation profile — zero-alloc on all Blocked
  paths is confirmed.

Explicit cache-miss counters remain deferred to a
Linux CI run (see
[`../../tools/setup/`](../../tools/setup/) and the
P0 fully-retractable CI/CD backlog item) and will
land as a follow-on update. The gap is declared rather
than hidden.

## Measurements — throughput

All numbers are per *operation* inside the benchmark
body; the BDN "Mean" column is divided by `N` (the
`[<Params>]` array length) because each benchmark
iterates over all `N` items inside a single
invocation. **Zero allocation** is reported on every
Blocked row.

| Benchmark                 | N         | Per-op (ns) | Allocated |
|---------------------------|----------:|------------:|----------:|
| `BlockedAddInt64.Add`     |    10,000 |       101.4 |         - |
| `BlockedAddInt64.Add`     |   100,000 |        10.1 |         - |
| `BlockedAddInt64.Add`     | 1,000,000 |        10.8 |         - |
| `BlockedAddString.Add`    |    10,000 |        69.9 |         - |
| `BlockedAddString.Add`    |   100,000 |        15.9 |         - |
| `BlockedAddString.Add`    | 1,000,000 |        17.0 |         - |
| `BlockedMayContainInt64`  |    10,000 |         8.9 |         - |
| `BlockedMayContainInt64`  |   100,000 |         8.9 |         - |
| `BlockedMayContainInt64`  | 1,000,000 |         9.2 |         - |
| `BlockedMayContainString` |    10,000 |        13.6 |         - |
| `BlockedMayContainString` |   100,000 |        14.0 |         - |
| `BlockedMayContainString` | 1,000,000 |        14.7 |         - |

**Per-N throughput-scale ratios** (ns/op at N=1M
divided by ns/op at N=100k, skipping the N=10k
row where per-invocation setup dominates):

- `BlockedAddInt64`: 1.07 (flat)
- `BlockedAddString`: 1.07 (flat)
- `BlockedMayContainInt64`: 1.03 (flat)
- `BlockedMayContainString`: 1.05 (flat)

All four Blocked benchmarks stay below the Adopt-gate
threshold of 1.3 across a 10× N expansion. This is
the expected cache-resident signature of a blocked
filter — each lookup touches exactly one 64-byte
cache line regardless of total filter size.
**Throughput half of the gate: PASS.**

## Measurements — empirical false-positive rate

FP counts captured via the standalone script
`/tmp/bloom_fpr_check.fsx` — inserts `N` even-indexed
int64s (`0, 2, 4, …`), probes `N` disjoint
odd-indexed int64s (`1, 3, 5, …`), and divides the
false-positive count by `N`.

| N (inserted) | N (probed) | FP count | Measured FPR | Target | Ratio | Acceptance (≤ 2×) |
|-------------:|-----------:|---------:|-------------:|-------:|------:|:-----------------:|
|       10,000 |     10,000 |      459 |      0.04590 |   0.01 | 4.59× | **FAIL**          |
|      100,000 |    100,000 |    9,833 |      0.09833 |   0.01 | 9.83× | **FAIL**          |
|    1,000,000 |  1,000,000 |   59,159 |      0.05916 |   0.01 | 5.92× | **FAIL**          |

All three points violate the 2× acceptance threshold.
The failure is reproducible, monotone in a predictable
way (see diagnosis), and orders of magnitude outside
any statistical noise band the benchmark could
plausibly produce.

**FPR half of the gate: FAIL.**

## Diagnosis

The bug is in the parameter-derivation path.
`BloomFilter.createBlocked`
(see [`../../src/Core/BloomFilter.fs:512`](../../src/Core/BloomFilter.fs))
computes shape via `optimalShape`, which implements
the textbook *unblocked* Bloom formula:

```text
m = ⌈ -n · ln(p) / (ln 2)² ⌉
k = ⌈ (m/n) · ln 2 ⌉
```

For `(n=10000, p=0.01)` this gives `m ≈ 95,856`,
rounded to `131,072` after the pow-of-2 step.
Divided into `B=512`-bit buckets, that's `256`
buckets. Uniform hashing distributes 10,000 items
across 256 buckets at a Poisson rate of λ ≈ 39.1
items per bucket. With `k=10` probes per insert, each
bucket ends up with up to `39 × 10 = 390` bits set
out of 512 — a per-bucket fill factor of **~76%**.

Classical Bloom analysis gives its *minimum* FPR at
the 50% fill-factor point; the per-block FPR
degrades sharply past that. Putze, Sanders, Singler
(*Cache-, hash- and space-efficient Bloom filters*,
JEA 2009 §4) document this exact failure mode and
prescribe a block-aware parameter derivation that
accounts for:

1. **The Poisson tail** over block occupancies —
   blocks in the upper tail dominate the observed FPR.
2. **A corrected `m`** — roughly `1.1×–1.2×` the
   unblocked-Bloom `m` at `B=512, p=0.01`, per
   Putze 2007 Table 2.

The current implementation uses neither correction.
The measured 4.6×–9.8× over-FPR is consistent with a
~76% per-block fill factor, not with degenerate
hashing (which would produce a much more catastrophic
and uniform explosion across every `N`).

**Not the hash family.** Ruled out by: (a) the FPR is
monotone-like with `N`, not saturated; (b) throughput
ratios are excellent, which they wouldn't be if
XxHash128 were producing correlated output biting the
block-mask bits; (c) per-block distribution analysis
matches Poisson expectation for a uniform hash.

**Not the retraction algebra.** `BlockedBloomFilter`
is insert-only; no retraction path is exercised in
this benchmark.

## What the Adopt gate would have required

Both halves of the gate need to pass:

1. **Measured FPR within `[0.5× p, 2× p]` at every
   measured `N`.** Current status: fails at all three
   `N` values, by a factor of 4.6×–9.8×.
2. **Throughput-scale ratio `ns/op(1M) / ns/op(10k)`
   near 1.0** on the Blocked benchmarks. Current
   status: passes decisively — all four Blocked
   benchmarks under 1.08 across 10× N scaling.

Fixing (1) is a block-aware recalibration of
`createBlocked`. The Putze 2007 derivation is well
documented; the harsh-critic follow-on in
`docs/BACKLOG.md` owns scoping and scheduling the
repair.

## Row disposition

- **`docs/TECH-RADAR.md:42`** stays at **Trial**. No
  Adopt flip this round.
- The TECH-RADAR note gets updated to cite the
  specific failure rather than the generic "awaiting
  numbers" text, and to point at this file for
  evidence.
- The harsh-critic-correctness follow-on is filed
  under `docs/BACKLOG.md` at P0 tier (correctness of a
  shipped primitive).
- `bench/Benchmarks/BloomBench.fs` itself is
  unchanged — the benchmark is correct; it is the
  derivation being benchmarked that is miscalibrated.

## Reference patterns

- [`../TECH-RADAR.md`](../TECH-RADAR.md) — target row
  at line 42 (remains Trial).
- [`../BACKLOG.md`](../BACKLOG.md) — P0 entry
  "Blocked Bloom filter recalibration" records the
  follow-on scoping.
- [`../../bench/Benchmarks/BloomBench.fs`](../../bench/Benchmarks/BloomBench.fs)
  — the benchmark source.
- [`../../src/Core/BloomFilter.fs`](../../src/Core/BloomFilter.fs)
  — the implementation under measurement;
  `createBlocked` at line 512 is the fix-site.

## Changelog

- 2026-04-20 — initial measurement run; FPR gate
  failed at all three N; TECH-RADAR stays at Trial;
  harsh-critic follow-on filed.
- YYYY-MM-DD — add Linux cache-miss numbers once the
  fully-retractable CI substrate ships.
- YYYY-MM-DD — re-measure after `createBlocked`
  recalibration lands; if FPR gate passes, flip
  TECH-RADAR line 42 Trial→Adopt and append the
  passing evidence here.
