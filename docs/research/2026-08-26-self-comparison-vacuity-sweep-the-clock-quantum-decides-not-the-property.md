# The self-comparison vacuity sweep — the clock quantum decides, not the property

**2026-08-26 · shadow · mutation-measured, not argued**

`FTA-5` (#15446) found that a `f x = f x` "no ambient clock" check survived a real
ambient-clock mutant, and handed forward two named, unanswered questions plus a general
suspicion. This is the sweep. Every verdict below was earned by **introducing the defect the
assertion claims to forbid and running the test**; nothing here is a reading of the code.

---

## 0. The mechanism, stated once

> **A self-comparison is vacuous exactly when the dimension it claims to vary is shared by
> both sides — and a wall clock is shared whenever both calls land in the same quantum.**

Measured on this machine (`dotnet fsi`, .NET 10.0.400, macOS arm64):

| quantity | measurement |
|---|---|
| `DateTime.UtcNow.Ticks` granularity | **10 ticks = 1 µs** (min observed delta over 200 transitions) |
| two *adjacent* reads returning the **same** value | **97 082 / 100 000 = 97.08 %** |

So an `f x = f x` determinism check is blind to an ambient clock with probability ≈ the
fraction of the quantum the inter-call work does *not* consume. The knob is **elapsed time
between the two sides**, never the number of repetitions.

Two corollaries, both confirmed below:

1. **Per-call ambient sources** (a clock read inside `f`) are caught *sometimes* — the escape
   rate is a timing measurement, not a property of the test.
2. **Once-per-process ambient sources** (machine identity, a lazily-initialised seed, a
   start-time epoch) are **never** caught — survival is deterministic, 100 %. This is the
   case that matters, because cross-process replay is what a DST claim is actually about.

---

## 1. `DSL-37` — VACUOUS. The open question from #15446, answered.

`tests/Tests.FSharp/DeclaredStanceLedger.Tests.fs`, adjudicated on 2026-08-25 as *"CORRECT
here and not vacuous — a determinism check has no other shape"*, with `M4` (an incrementing
ambient counter) cited as proof it discriminates.

**Mutant `M-CLOCK`** — the exact defect the test name forbids:

```diff
--- a/src/Core/DeclaredStanceLedger.fs
+++ b/src/Core/DeclaredStanceLedger.fs
@@ -195 +195 @@
-                  DeclaredAtPhase = declaredAtPhase
+                  DeclaredAtPhase = DateTime.UtcNow.Ticks // MUTANT M-CLOCK
```

| configuration | runs | mutant SURVIVED (suite green) |
|---|---|---|
| `--filter DeclaredStanceLedgerTests` (the realistic one) | 25 | **14 (56 %)** |
| `--filter DSL-37` alone | 10 | 0 |

**Every kill differed by exactly 10 ticks — one 1 µs quantum.** The check had zero margin: it
was decided by whether two adjacent calls straddled a clock boundary.

The isolated 10/10 is the trap worth naming: the first call in a filtered run also pays
tiered-JIT warm-up (observed delta 5 900 ticks = 590 µs), so **the reassuring measurement is
the one taken in a configuration the test never runs in.**

`M4` was true and did not generalise: **a counter always differs; a clock usually does not.**

**Repair** (same as #15446's): lower the *claim* to the arity the check has. `DSL-37` now pins
every `Declaration` field against the argument it must have come from, plus a control that a
different argument really moves the field. Re-measured against the identical `M-CLOCK`
mutant: **killed 20 / 20.** Census `registry/check-arity-census.json` lowered 2 → 1 in the
same commit, per R2's downward ratchet. `audit-check-arity.ts` → **rc=0**.

## 2. `DSL-36` — REAL, with its limit now written down.

The other counted self-comparison in the same file (`the same resolution sequence replays to
the same ledger`).

- **Per-call ambient entropy** → caught. A clock-derived perturbation inside `record` differs
  between the two folds.
- **Once-per-process capture** → **not caught, deterministically.**

**Mutant `M-STATIC`** — a realistic once-per-process capture:

```diff
+    let private ambientEpoch = int (DateTime.UtcNow.Ticks % 7L) + 1
@@ record @@
-                  ToOthers = current.ToOthers + (if ... then 1 else 0) }
+                  ToOthers = current.ToOthers + (if ... then 1 else 0) + ambientEpoch }
```

Result: **`DSL-36` PASSED. `DSL-17` and `DSL-31` — which pin VALUES rather than compare two
runs — both FAILED.** So the guarantee `DSL-36` actually carries is *same process, same
answer*. The cross-process half of DST replay is carried by the value pins, not by `DSL-36`.
It is kept, and the limit is now in the file header rather than in anyone's head.

## 3. Commit `1090eb0c0` — all three REAL, none vacuous, none removed. Independently reproduced.

`test(column-ops): adjudicate 4 counted self-comparisons`. Four counted sites resolve to
**three** distinct assertions (site C is counted twice). Each stated mutant was re-applied and
re-run here.

| site | line | mutant re-applied | result |
|---|---|---|---|
| **A** `Assert.Equal(sd, vd)`, `map (+)` | 172 | `MapAddVectorized` writes `x+delta+1` | **FAILED at line 172** — the counted line itself |
| **B** `Assert.Equal(sd, vd)`, `map (*)` | 200 | `MapScaleVectorized` writes `x*m+1` | **FAILED at line 200** |
| **C** `Assert.Equal(whole, parts)` | 351/364 | per-call position-0 bump on the `MapAdd` **dispatcher** | **FAILED at line 364, while A (172) and B (200) both PASSED** |

**Answer to the open question: 0 vacuous-and-removed, 3 real-and-kept, plus 1 real defect
found-and-fixed** (the `map` tests had no independent `Array.map` oracle where the `filter`
tests did — a twin comparison cannot see a fault hitting both paths, and two unwritten buffers
are both zeros).

These are **false positives of the detector, not of the author**: `sd`/`vd` and `whole`/`parts`
share an initialiser, so the binding-inliner normalises both sides to
`Array.zeroCreate<int64> n`. The varied dimension is which kernel wrote the buffer, and which
partition — neither is visible to a textual normaliser. The adjudication was right.

## 4. The sweep — F#

`scanFsharp` over the census: **153 self-comparisons in 110 files; 125 sit under a
determinism / purity / replay name.** Mutation-measured this round:

| # | site | claim | mutant | result | verdict |
|---|---|---|---|---|---|
| 1 | `DeclaredStanceLedger.Tests.fs:169` `DSL-37` | no ambient clock | `DeclaredAtPhase ← UtcNow.Ticks` | survived 14/25 | **VACUOUS** → repaired |
| 2 | `DeclaredStanceLedger.Tests.fs:437` `DSL-36` | DST replay | once-per-process `ambientEpoch` | survived 100 % | **REAL, limited** → documented |
| 3 | `GeneratorRegistry.Tests.fs:13` — *"same name+version yields same 32-hex id, **everywhere**"* | machine-independence | `idOf` mixes `Environment.MachineName` | **survived**; killed only by the *pinned-ZetaId byte-lock* on a neighbouring test | **VACUOUS** for the "everywhere" half |
| 4 | `ColumnLinearOps.Tests.fs:172 / 200 / 364` | see §3 | see §3 | killed | **REAL** ×3 |
| 5 | `DecorrelationExcess.Tests.fs:39` — *"same seed gives the same permutation"* | seeded-RNG replay | `st = seed ^^^ UtcNow.Ticks` | killed **7/10** warm, 10/10 isolated | **REAL but flaky** (30 % escape) |

Row 3 is the clean statement of corollary 2: the self-comparison contributed nothing, and a
**golden value pinned in the same file** is what caught the defect.

## 5. The sweep — TypeScript

Fourteen candidates mutated. **8 VACUOUS, 5 REAL (one 10/10, three flaky at 30–67 %), 1
initially unverifiable then resolved REAL.** Full detail in the PR body; the load-bearing
results:

- `tests/cross-verification/_harness/codegen-from-ir.test.ts:153-155` — a `Date.now()` build
  timestamp added to **all seven** emitted oracles (TS/F#/C#/Rust/Python/Go/Q#) left the whole
  file **15/15 green**. Swapping to `performance.now()` killed it immediately — proving the
  assertion is blind only *at or below the clock quantum*, which is exactly the defect it names.
- `src/Core.TypeScript/hygiene/mutation-findings.ts` — `findingAddress` is the **dedup key for
  the mutation denominator**, and its "the address ignores the clock" test survived a
  `Date.now()` in the address.
- `src/Core.TypeScript/hygiene/audit-orphaned-archive-refs.ts` — the injected `now` was ignored
  outright in favour of `Date.now()` and the self-comparison did not notice.
- `discovery/reticulum-announce-auth.test.ts:214` — **REAL, 10/10**, and it says why: 50
  Ed25519 verifications take longer than a millisecond, so the repetition crosses the quantum
  boundary every time.

## 6. Two detector gaps, reported not fixed

Both are in `src/Core.TypeScript/hygiene/audit-check-arity.ts`, which is a gate; naming them
here rather than changing gating behaviour under an autonomous tick.

1. **`SCAN_ROOTS = ["tests"]`** — none of the `*.test.ts` files under `src/Core.TypeScript/`
   are counted at all. Five of the eight TypeScript vacuities above live there.
2. **The R1 name vocabulary has `\bzero clocks?\b` but not `no clock` / `no ambient clock` /
   `no hidden clock`** — which is why `DSL-37` and `FTA-5` never tripped R1 despite naming an
   ambient channel in their own titles.

A third, milder point: the file's own header blesses *"determinism / DST replay — `f x = f x`
evaluated twice IS two executions"* as one of three legitimate shapes. That is true about
**arity** and misleading about **strength**, and this sweep is the measurement of the gap.
The header already says the pair "cannot see cross-process nondeterminism"; §2 and §4 row 3
turn that caveat into two numbers.

## 7. What this does NOT claim

- **Not** that all 125 determinism-named F# self-comparisons are vacuous. Five were measured.
  Row 5 shows the shape is sometimes a real check, and §3 shows three that are unambiguously
  real. Rounding the population up would be the same error in the opposite direction that
  made the original census credible.
- **Not** that flaky-real is fine. A 30 % escape rate is a check whose verdict is a race.
- The ~176 remaining TypeScript candidates under `src/Core.TypeScript` were **not** measured.
  8 of 14 measured were vacuous; that is a sample, not a rate, and it is not claimed as one.

## Anchors

- Clarkson & Schneider, *Hyperproperties*, CSF 2008 / JCS 18(6):1157 (2010) — k-safety; no
  monitor over a single execution decides a 2-safety property.
- Goguen & Meseguer, *Security Policies and Security Models*, IEEE S&P 1982 — noninterference.
- Rice (1953) — why arity must be declared and over-approximated, never inferred.
- `.claude/rules/toy-is-free-metered-must-be-earned.md` — a check that survives mutation is not
  a falsifier.
- `.claude/rules/never-assume-malice-where-mistake-is-possible.md` — every site in §1–§5 was
  written by someone making the check *stronger*. The shape is the defect, not the author.
