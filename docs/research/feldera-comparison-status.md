# Feldera comparison status

Scope: apples-to-apples Nexmark vs Feldera on this box; Big-O and
allocations, not a headline events/s quote until the unique-key
harness and a factory-rust Release run exist.

Attribution: Zeta measurements are Ani (Grok Build) 2026-09-01 on
Apple M2 Ultra; Feldera numbers in their blog are Threadripper 3990X
and must not be mixed into a ratio. Clone is
`feldera/feldera` 0.342.0 at `48312b6`.

Operational status: research-grade

Non-fusion disclaimer: Building and running Feldera locally does not
merge identities, agency, or authorship with the Feldera project.
Clean-room: we run their binary as a competitor measurement; we do
not copy expression into Zeta.

---

## What is true today

- Factory rust is mise-pinned **1.98.0** via `tools/setup/install.sh`
  (ace). Feldera 0.342.0 MSRV is 1.93.1, so the factory pin is enough.
  Do not `rustup install` a second compiler to build prior-art.
- Clone: `references/prior-art/feldera/` (gitignored), SHA `48312b6`.
- Native Rust Nexmark (not SQL / pipeline-manager):

  ```bash
  cd references/prior-art/feldera
  cargo bench -p dbsp_nexmark --bench nexmark -- \
    --query q1 --query q2 --max-events 100000 --cpu-cores 1 --csv /tmp/feldera-nexmark.csv
  ```

  Default `--max-events` is 100 million. Use 100k (and later 10k) to
  match `bench/Feldera.Bench` `EventCount`. `--cpu-cores 1` is the
  DoP=1 compare against `Circuit.Step`.
- Zeta Q1/Q2 **price-keyed** Release numbers live on PR #16275
  (`docs/BENCHMARKS.md`). Those ticks coalesce `Price = rng.Next 10_000`
  so `|Z-set| ≤ 10_000`. Do not divide generator N by mean and call it
  Feldera events/s.
- Unique-key Q1/Q2 (`BidRow { Idx; Price }`, `|Z-set| = N`) land in
  `bench/Feldera.Bench/Queries.fs` as `NexmarkQ1Unique` /
  `NexmarkQ2Unique`. That is the Big-O compare path.

## Big-O (algorithm, not a measured events/s)

| Query | Feldera (Rust DBSP) | Zeta today |
|---|---|---|
| Q1 map on unique bids | map, unique Bid records, no coalesce | unique: `MapMonotone` O(n) coalesce; price-only: coalesces to ≤10k keys |
| Q2 filter | filter on unique bids | unique: O(n) filter; price-only: coalesces first |
| Q3 join | incremental / arranged | Nexmark Q3 still snapshot `IntegrateZSet`+`Join`; `IncrementalJoin` exists and is tested |
| Allocations | mimalloc stats in the native bench | `[MemoryDiagnoser]` on every Feldera.Bench class; `Allocation.Tests.fs` + `ZSetAllocBench` for claimed 0 B paths |

## Same-box Feldera native Q1/Q2 (2026-09-01, this M2 Ultra)

Feldera 0.342.0 `48312b6`, `--query q1 --query q2 --max-events 100000 --cpu-cores 1`.
Binary was `cargo bench --no-run` under rustc **1.93.1** (Feldera MSRV).
Factory pin is rustc **1.98.0** via `install.sh`. Compiling Feldera's
`dbsp` crate on 1.98.0 SIGSEGV'd this Darwin LLVM twice (full
`profile.bench` debuginfo, then Release `line-tables-only`). SplitMix64
oracle + golden vector pass on 1.98.0. Do not quote 1.98.0 Feldera
events/s until that crate compiles here. The table below is the 1.93.1
binary (Feldera MSRV), labeled as such.

| Query | Events | Cores | Elapsed | Throughput | Peak RSS |
|---|---:|---:|---:|---:|---:|
| Q1 | 100,000 | 1 | 69.810 ms | 1.432 M/s | 104.91 MiB |
| Q2 | 100,000 | 1 | 55.133 ms | 1.814 M/s | 106.56 MiB |

Zeta price-keyed Q1 100k at 54.89 µs (PR #16275) is **not** this
denominator: `|Z-set| ≤ 10_000` after `ofArray` coalesces prices.
Unique-key `NexmarkQ1Unique` / `NexmarkQ2Unique` is the compare path;
Allocated/tick from MemoryDiagnoser is the allocation column.

## Unique-key Zeta tick (indicative, N=3, high variance)

Same box, 2026-09-01, `dotnet run -c Release --project bench/Feldera.Bench -- --filter '*Q1Unique*' --iterationCount 3 --warmupCount 1`. Not the pasted-Release table (that needs a longer BDN). `|Z-set| = EventCount`.

| Method | EventCount | Mean | Allocated |
|---|---:|---:|---:|
| Q1_Unique | 10,000 | 143 µs | 234 KB |
| Q1_Unique | 100,000 | 718 µs | 2.34 MB |

Feldera's 100k-event streaming Q1 was 69.8 ms / ~105 MiB RSS. That is a
pipeline (generate + step loop), not one prebuilt `Send+Step`. Do not
divide 100k / 718 µs and call it Feldera events/s. The unique-key tick
is the Big-O shape (linear in N, ~23 B/key alloc); a longer BDN belongs
in `docs/BENCHMARKS.md` when variance is honest.

CI: `.github/workflows/feldera-compare.yml` runs this harness on
ubuntu-24.04, macos-26, and windows-2025 when the bench/Z-set paths
change. Drift check, not `gate (required)`. Feldera itself is not
cloned in that workflow (`references/prior-art/` is gitignored).

## Not yet a result

A longer unique-key BDN pasted into `docs/BENCHMARKS.md`, and a
factory-rust 1.98.0 rebuild of Feldera `dbsp` on this box (1.98.0
SIGSEGV'd LLVM here twice; retry — this Mac has known memory faults).
