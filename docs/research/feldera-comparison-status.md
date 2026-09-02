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

- Factory rust is mise-pinned **1.99.0-beta.3** via `tools/setup/install.sh`
  (ace). Feldera 0.342.0 MSRV is 1.93.1. rustc **1.97.0 is first-bad**
  (`dbsp` ICE on 1.97.0 and 1.98.0). 1.96.1 is last-good stable; 1.99.0-beta.3
  is the first later line that compiles `dbsp` (GHA + this box). Do not
  `rustup install` a second compiler to build prior-art.
- Clone: `references/prior-art/feldera/` (gitignored), SHA `48312b6`.
- Native Rust Nexmark (not SQL / pipeline-manager), factory rust
  **1.99.0-beta.3**:

  ```bash
  cd references/prior-art/feldera
  cargo bench -p dbsp_nexmark --bench nexmark -- \
    --query q1 --query q2 --max-events 100000 --cpu-cores 1 --csv /tmp/feldera-nexmark.csv
  ```

  Default `--max-events` is 100 million. Use 100k (and later 10k) to
  match `bench/Feldera.Bench` `EventCount`. `--cpu-cores 1` is the
  DoP=1 compare against `Circuit.Step`. GHA `feldera-native.yml`
  `native` runs this after `cargo build -p dbsp` on ubuntu-24.04 and
  macos-26 (path-filtered; not every PR). Windows omitted (unix fd).
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
Factory pin is rustc **1.99.0-beta.3**. Compiling Feldera's
`dbsp` crate on 1.97.0 and 1.98.0 ICE's in `rustc_next_trait_solver`.
1.98.0 also SIGSEGV'd this Darwin LLVM twice before the ICE became
reproducible. SplitMix64 oracle + golden vector pass on 1.98.0. Do not
quote 1.97+ Feldera events/s. The table below is the 1.93.1 binary
(Feldera MSRV), labeled as such. A 1.96.1 `dbsp` lib linked on this
box 2026-09-01; Nexmark numbers from that compiler are not in this
table yet.

| Query | Events | Cores | Elapsed | Throughput | Peak RSS |
|---|---:|---:|---:|---:|---:|
| Q1 | 100,000 | 1 | 69.810 ms | 1.432 M/s | 104.91 MiB |
| Q2 | 100,000 | 1 | 55.133 ms | 1.814 M/s | 106.56 MiB |

### Factory pin 1.99.0-beta.3 (2026-09-02, same M2 Ultra)

Same command, rustc **1.99.0-beta.3** (`cbae9b4ca`), `CARGO_PROFILE_RELEASE_DEBUG=0`
`RUSTFLAGS=-C debuginfo=0`. One run per host, not a compiler-speed claim.

| Host | Query | Events | Cores | Elapsed | Throughput | Peak RSS |
|---|---|---:|---:|---:|---:|---:|
| this M2 Ultra | Q1 | 100,000 | 1 | 74.161 ms | 1.348 M/s | 99.33 MiB |
| this M2 Ultra | Q2 | 100,000 | 1 | 49.138 ms | 2.035 M/s | 105.08 MiB |
| GHA ubuntu-24.04 (Xeon 8573C 2c/4t) | Q1 | 100,000 | 1 | 95.193 ms | 1.050 M/s | 152.5 MiB |
| GHA ubuntu-24.04 | Q2 | 100,000 | 1 | 62.324 ms | 1.605 M/s | 152.5 MiB |
| GHA macos-26 (M1 virtual, 3 cores) | Q1 | 100,000 | 1 | 127.798 ms | 0.782 M/s | 104.3 MiB |
| GHA macos-26 | Q2 | 100,000 | 1 | 81.798 ms | 1.223 M/s | 110.1 MiB |

GHA CSVs: run [33603177913](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33603177913)
(`feldera-nexmark-ubuntu-24.04`, `feldera-nexmark-macos-26`). Same-box vs
the 1.93.1 binary: Q1 ~6 % slower, Q2 ~11 % faster, RSS in the same
band. Runners are slower than this Mac (ubuntu Q1 ~1.3×, GHA mac
virtual ~1.7×) — hardware, not a different algorithm. Windows omitted
(unix fd).

Zeta price-keyed Q1 100k at 54.89 µs (PR #16275) is **not** this
denominator: `|Z-set| ≤ 10_000` after `ofArray` coalesces prices.
Unique-key `NexmarkQ1Unique` / `NexmarkQ2Unique` is the compare path;
Allocated/tick from MemoryDiagnoser is the allocation column.

## Unique-key Zeta tick (indicative, N=3, high variance)

`dotnet run -c Release --project bench/Feldera.Bench -- --filter '*Unique*' --iterationCount 3 --warmupCount 1`. `|Z-set| = EventCount`. Means move; **Allocated** is the cross-OS column. GHA run [33606669849](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33606669849) (PR #16334). this-Mac Q1 is the 2026-09-01 box run. Windows uses `--inProcess` (out-of-process BDN hung 84 min on "Building 1 exe", run 33598890480).

| Host | Q1 10k | Q1 100k | Q2 10k | Q2 100k | Alloc Q1 100k / Q2 100k |
|---|---:|---:|---:|---:|---|
| this M2 Ultra | 143 µs | 718 µs | — | — | 2.34 MB / — |
| GHA ubuntu-24.04 | 217 µs | 1.87 ms | 47 µs | 1.23 ms | 2.34 MB / 1.17 MB |
| GHA macos-26 | 244 µs | 1.51 ms | 134 µs | 1.57 ms | 2.34 MB / 1.17 MB |
| GHA windows-2025 | 333 µs | 2.01 ms | 126 µs | 1.41 ms | 2.34 MB / 1.17 MB |

Lookup N=4096, 0 B: ubuntu 24.9 ns, macos 22.8 ns, windows 17.8 ns.

Feldera's 100k-event streaming Q1 was 69.8–74.2 ms / ~100 MiB RSS. That is a
pipeline (generate + step loop), not one prebuilt `Send+Step`. Do not
divide 100k / 718 µs and call it Feldera events/s. The unique-key tick
is the Big-O shape (linear in N, ~23 B/key alloc); a longer BDN belongs
in `docs/BENCHMARKS.md` when variance is honest.

CI: `.github/workflows/feldera-compare.yml` runs this harness on
ubuntu-24.04, macos-26, and windows-2025 when the bench/Z-set paths
change. Drift check, not `gate (required)`. Feldera itself is not
cloned there. Windows stays on this lane (our F# benches). Native
`dbsp` compile + Nexmark Q1/Q2 100k/1-core is unix-only
(`feldera-native.yml`, ubuntu + macos).

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

A longer unique-key BDN pasted into `docs/BENCHMARKS.md` (GHA N=3 Error
bars are not publication-grade).

## rustc bisect (Feldera `dbsp` `--release`, debuginfo=0)

Same box, 2026-09-01, `cargo +<ver> build --release -p dbsp`.
Feldera 0.342.0 `48312b69`. Separate `CARGO_TARGET_DIR` per version.

| rustc | date | `dbsp` |
|---|---|---|
| 1.93.1 | MSRV | PASS (earlier Nexmark binary) |
| 1.94.0 | 2026-03-02 | not probed (between two PASSes) |
| 1.95.0 | 2026-04-14 | not probed (between two PASSes) |
| **1.96.0** `ac68faa20` | 2026-05-25 | **PASS** |
| **1.96.1** `31fca3adb` | 2026-06-26 | **PASS** (last 1.96 patch; last-good stable) |
| **1.97.0** `2d8144b78` | 2026-07-07 | **FAIL rc=101** (first-bad ICE) |
| 1.98.0 `88d9e12ae` | 2026-08-18 | FAIL rc=101 (same ICE; also earlier LLVM SIGSEGV) |
| **1.99.0-beta.3** `cbae9b4ca` | 2026-08-28 | **PASS** (factory pin; 4m 47s, debuginfo=0) |
| 1.100.0-nightly `0dfb098f3` | 2026-08-31 | 4-line ICE repro PASS; `dbsp` not re-run |

1.94/1.95 were skipped: 1.93.1 and 1.96.0 both PASS, so the ICE break is
in (1.96.1, 1.97.0]. No 1.96.2 exists. Factory pin is **1.99.0-beta.3**
(Aaron 2026-09-02: latest beta for now). 1.96.1 remains last-good stable.

### Two failures, do not mix

**ICE (compiler bug, version-bisected).** Structured `panic!` in
`rustc_next_trait_solver` `try_eagerly_replace_alias`. Query stack
on this box (1.97.0, 2026-09-01):

```
#0 instantiate_and_check_impossible_predicates  StarJoinFuncTrait
#1 first_method_vtable_slot  dyn StarJoinFuncTrait<..., Output = ()>
   for the implementation of dyn_clone::DynClone
```

Same site as rust-lang issue 159457 (closed 2026-09-01, fix merged
as rust-lang PR 161080, milestone 1.99.0). The minimized 4-liner
from that issue still ICEs on 1.97.0 and 1.98.0 here and PASSes on
1.96.1 / 1.99.0-beta.3 / 1.100.0-nightly:

```rust
const N: usize = 6;
pub trait CustomPassFn: FnOnce(&[u32; N]) {}
impl<F: FnOnce(&[u32; N])> CustomPassFn for F {}
pub fn run(f: Box<dyn CustomPassFn>, b: &[u32; N]) { f(b) }
```

Feldera's trigger is heavier (`StarJoinFuncTrait` + `DynClone`
vtable slot, associated-type projections, nested `dyn FnMut`) but
the same `first_method_vtable_slot` path. StarJoin-shaped 10-liners
without a named-`const` array length compile on 1.97; the 4-liner
is the tiny form. rust-lang issue 152789 is the older
`-Znext-solver` relative (closed); this is the stable 1.97
regression of that family.

Not filed from this clone: rust-lang bans LLM-created issue bodies
and public comments on rust-lang/rust. A human can confirm Feldera
0.342.0 as another instance of issue 159457 still broken on 1.98
and passing on 1.99-beta.

**SIGSEGV (this Darwin box, 1.98.0 only, not filed).** Two
`EXC_BAD_ACCESS` reports the same afternoon, codesign
`rustc_main-0b10645c097e9d55` =
`~/.rustup/toolchains/1.98.0-aarch64-apple-darwin/bin/rustc`:

| time (local) | site | address |
|---|---|---|
| 14:05:59 | `rustc_codegen_ssa::mir::FunctionCx::monomorphize` | PAC failure at `0x44004101240a15e3` (not in any region) |
| 14:08:06 | LLVM ThinLTO `lto cgu.11` `MCRegisterInfo::getCachedAliasesOf`; sibling thread `VarLocBasedLDV` | `0x10f3b0120` in a CoreMedia Capture Data gap |

1.97.0 never reached LLVM for `dbsp` (typeck ICE first). After
`rm -rf target` + `CARGO_INCREMENTAL=0`, 1.98.0 ICE'd instead of
SIGSEGV. Two different crash sites plus a wild PAC pointer is
hardware-shaped on this Mac; it is not a tiny rustc repro. GHA
on 1.98 with ThinLTO + debuginfo would be the discriminator; we
did not run that.

`feldera-native.yml` `native` compiles factory rust **1.99.0-beta.3**
`dbsp` then times `dbsp_nexmark` Q1/Q2 100k events / 1 core on GHA
ubuntu-24.04 / macos-26. Windows is omitted: Feldera 0.342.0
`feldera-storage` uses `std::os::fd` / `libc::pread` (measured FAIL
on windows-2025). `probe` is workflow_dispatch only.

GHA run 33561885627 (PR #16304, 2026-09-01),
`cargo build --release -p dbsp` debuginfo=0, Feldera `48312b69`:

| runner | rustc | verdict |
|---|---|---|
| ubuntu-24.04 | 1.96.1 | PASS |
| macos-26 | 1.96.1 | PASS |
| windows-2025 | 1.96.1 | FAIL `feldera-storage` `std::os::fd` / `libc::pread` (unix-only; not the ICE). Native job no longer runs Windows. |
| ubuntu-24.04 | 1.97.0 | ICE+match `StarJoinFuncTrait` / `first_method_vtable_slot` / `DynClone` rc=101 |
| macos-26 | 1.97.0 | ICE+match (same) |
| ubuntu-24.04 | 1.98.0 | ICE+match (same) |
| macos-26 | 1.98.0 | ICE+match rc=101; **no SIGSEGV** |
| ubuntu-24.04 | 1.99.0-beta.3 | PASS |
| macos-26 | 1.99.0-beta.3 | PASS rc=0 |

The ICE is a compiler bug, not this Mac. The 1.98 LLVM SIGSEGV did
**not** reproduce on GHA macos-26 (debuginfo=0). Factory pin is
**1.99.0-beta.3**. The 1.93.1 table above is the MSRV binary; factory-pin
Nexmark is `feldera-native.yml` `native` (ubuntu + macos) plus this Mac.
