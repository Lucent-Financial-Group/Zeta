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

- Factory rust is mise-pinned **1.96.0** via `tools/setup/install.sh`
  (ace). Feldera 0.342.0 MSRV is 1.93.1. rustc **1.97.0 is first-bad**
  (`dbsp` ICE); 1.96.0 is last-good. Do not `rustup install` a second
  compiler to build prior-art.
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
Factory pin is rustc **1.96.0** (last-good). Compiling Feldera's
`dbsp` crate on 1.97.0 and 1.98.0 ICE's in `rustc_next_trait_solver`.
1.98.0 also SIGSEGV'd this Darwin LLVM twice before the ICE became
reproducible. SplitMix64 oracle + golden vector pass on 1.98.0. Do not
quote 1.97+ Feldera events/s. The table below is the 1.93.1 binary
(Feldera MSRV), labeled as such. A 1.96.0 `dbsp` lib linked on this
box 2026-09-01; Nexmark numbers from that compiler are not in this
table yet.

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
cloned there. Native `dbsp` compile is
`.github/workflows/feldera-native.yml` (`workflow_dispatch`, plus a
self-path filter so this PR can run it before the file is on main).

## Native compile deps (install.sh, all OSes)

Feldera's from-sources README (`references/prior-art/feldera/README.md`)
names rust + C/C++ + cmake + libssl-dev + libsasl2-dev + zlib1g-dev +
libzstd-dev + pkg-config + clang, then a longer brew line that also
pulls go / graphviz / openjdk / maven / bun / node.

Declared in `tools/setup/manifests/{apt,brew}` (realized by
`install.sh`): cmake, pkg-config, OpenSSL headers, SASL headers, zlib
headers, zstd headers. `zstd` binary was already on apt (ollama
`.tar.zst`).

Not declared, on purpose: golang (`--features fips` only), graphviz,
JDK/maven (SQL compiler), librdkafka (Kafka connectors; Feldera wants
`./scripts/install-librdkafka.sh` against AWS-LC, not the distro
package). bun/node/python stay on mise.

Windows cmake is **Microsoft Visual Studio C++ CMake tools**
(`Microsoft.VisualStudio.Component.VC.CMake.Project`), not
scoop/winget/choco cmake. `install.ps1` prepends the vswhere-found
`cmake.exe` + `ninja.exe` dirs to PATH when the component is present,
and warns (does not scoop) when it is not. Unix cmake is apt/brew.

## Not yet a result

A longer unique-key BDN pasted into `docs/BENCHMARKS.md`, and a
factory-rust **1.96.0** Nexmark run of Feldera (lib linked; harness
not yet timed).

## rustc bisect (Feldera `dbsp` `--release`, debuginfo=0)

Same box, 2026-09-01, `cargo +<ver> build --release -p dbsp`.
Feldera 0.342.0 `48312b69`. Separate `CARGO_TARGET_DIR` per version.

| rustc | date | `dbsp` |
|---|---|---|
| 1.93.1 | MSRV | PASS (earlier Nexmark binary) |
| 1.94.0 | 2026-03-02 | not probed (between two PASSes) |
| 1.95.0 | 2026-04-14 | not probed (between two PASSes) |
| **1.96.0** `ac68faa20` | 2026-05-25 | **PASS** (last-good) |
| **1.97.0** `2d8144b78` | 2026-07-07 | **FAIL rc=101** (first-bad) |
| 1.98.0 `88d9e12ae` | 2026-08-18 | FAIL rc=101 (same ICE; also earlier LLVM SIGSEGV) |

1.94/1.95 were skipped: 1.93.1 and 1.96.0 both PASS, so the break is
in (1.96.0, 1.97.0]. Factory pin is **1.96.0**.

1.98.0 first SIGSEGV'd LLVM, then ICE'd in `rustc_next_trait_solver`
compiling `dbsp`. Cache-corruption was a live hypothesis on this Mac;
it is now **checked**. 2026-09-01: `rm -rf target` (5.8G) +
`CARGO_INCREMENTAL=0` under rustc 1.98.0. aws-lc-sys / cmake / zstd-sys
compiled; `dbsp` ICE'd after ~5 min of a clean graph (exit 101).
debuginfo=0 did not change the ICE. 1.97.0 ICE'd the same way.

The ICE is a **structured** `panic!`, not a SIGSEGV:

```
could not replace Alias { kind: ProjectionTy {
  def_id: ... core::ops::function::FnOnce::Output }, ...
  StarJoinFuncTrait<...> ...
} with term from from dyn [ ... StarJoinFuncTrait ... ]
```

Stack: `ReplaceProjectionWith::try_eagerly_replace_alias` <-
`predicates_for_object_candidate`. The `panic!` is still in rustc
1.97.0 / 1.98.0 at `structural_traits.rs` `try_eagerly_replace_alias`
("This shouldn't happen."). Same site and panic string as
rust-lang/rust#152789 (2026-02-18, `-Znext-solver` dyn object
candidates). rust-analyzer#21605 is the same panic on `dyn Fn`
`Output` projections. This instance is Feldera `StarJoinFuncTrait` +
`FnOnce::Output` on a dyn object bound.

A coherent panic_fmt naming `StarJoinFuncTrait` is a compiler-bug
class, not a bit-flip. The earlier LLVM SIGSEGVs on this Mac remain a
separate hardware-shaped symptom. `feldera-native.yml` compiles
factory rust (now 1.96.0) `dbsp` on GHA ubuntu-24.04 / macos-26 /
windows-2025. Same-box Nexmark numbers stay the 1.93.1 binary until a
1.96.0 harness run is timed.
