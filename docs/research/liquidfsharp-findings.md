# LiquidF# — round-35 Day-0 findings: Hold (tool dormant)

`docs/research/liquidfsharp-evaluation.md` scoped a one-week
evaluation with an explicit Day-0 stop-rule:

> **Stop-rule.** If LiquidF# is not buildable against our
> toolchain without heavy patching, the evaluation terminates
> here with a **Hold — tool dormant** finding and a line in
> TECH-RADAR.

Round 35 ran Day-0. This doc records the finding.

Owner: formal-verification-expert (Soraya).
Reviewer: fsharp-expert.

---

## Day-0 evidence

Four targeted web searches on `2026-04-19`:

1. `LiquidFSharp fsprojects GitHub repository current status 2026`
   — no hit. `fsprojects/` org listing shows Paket, FSharpPlus,
   FSharp.Data, awesome-fsharp. No `LiquidFSharp`.
2. `"LiquidFSharp" OR "Liquid F#" refinement types .NET 10 last commit`
   — no hit on the exact name. Results surface LiquidHaskell
   (ACM SIGPLAN '14), F7 (Microsoft Research, 2012), F* (active,
   separate language).
3. `site:github.com LiquidFSharp` — no GitHub repository by
   that name. Results are unrelated Liquid-template projects
   (Fluid, Liquid.NET, Shopify Liquid, Liquidsoap).
4. `F# refinement types checker tool current maintained 2025 2026`
   — surfaces F7 with Microsoft Research page last updated
   May 2020 and the download artefact dated 2012. No active
   F#-native refinement checker. F* is active but is a distinct
   language that can *translate to* F#, not a refinement layer
   over F#.

## Verdict

**Hold — tool dormant.** Day-0 stop-rule fires.

There is no currently-maintained F#-native refinement-type
checker that can be pointed at `FastCdc.fs` today. The
originally-implied "LiquidF#" appears to have been an
informal name for either (a) F7 (2012, dormant) or
(b) a hypothetical Liquid-style port that does not
actually exist as a shipped tool.

Steps 1-4 of the evaluation plan (replay past bug, plant
fresh bug, ergonomic-cost measurement, verdict) are
**not run**. The stop-rule terminates the evaluation.

## What the project loses by not adopting LiquidF#

The TECH-RADAR row framed LiquidF# as catching the
"off-by-one / bad-index class that keeps reappearing in
`FastCdc.fs`, `Crdt.fs`, SIMD merge." That bug class remains
uncovered by a refinement-type checker.

Compensating coverage today:

- **FsCheck properties** cover monotonicity invariants at the
  property-test level (not at the type level). Catches the
  bug class post-hoc, not at type-check time.
- **Z3-driven TLA+ specs** cover the algorithmic-level
  invariants (e.g. `tools/tla/specs/RecursiveSignedSemiNaive.tla`).
  Catches the *algorithm-level* bug, not the F#-source-level
  off-by-one.
- **Lean 4 + Mathlib** covers the mathematical-correctness
  layer (e.g. `tools/lean4/Lean4/DbspChainRule.lean`). Does
  not close the loop to F# source.

The gap between property-level and source-level verification
remains open. This is the same gap LiquidHaskell closes for
Haskell.

## Candidate follow-up paths

Ranked by effort vs. payoff. None are round-35 work — this
is future triage.

### Path A — F* integration (future round, L)

F* is actively maintained (Wikipedia page touched January 2026)
and can extract to F#. Investigating F* → F# extraction for
one target module (`FastCdc.fs`) is the closest substitute
for the original LiquidF# plan. Effort: 2-3 weeks for a
proof-of-concept; higher than LiquidF#'s estimated 1 week
because F* is a different source language.

### Path B — F7 resurrection (future round, L)

F7's 2012 source is downloadable from Microsoft. Porting
it to a modern F# toolchain is possible but high-risk —
abandonware revival rarely stays cheap.

### Path C — Stay with FsCheck + Z3 + Lean (status quo, S)

The current verification stack catches most of the target
bug class at the property level. The off-by-one bugs that
LiquidF# would have caught at the type level instead get
caught at the FsCheck shrink level, usually within one
property run. The cost is that the failure mode is a failing
test, not a failing type-check — feedback latency is
seconds vs. milliseconds.

### Path D — SMT-backed F# analyzer (new build, XL)

Write a G-Research-style F# analyzer that emits SMT
obligations for specific invariant patterns. Covers the
target bug class at the source level. Effort: months, not
weeks. Only worth it if F* integration (Path A) is found
to be a poor fit for extract-to-F#.

## Recommended action this round

1. Keep the round-35 evaluation terminated at Day-0.
2. Update TECH-RADAR "LiquidF# refinement types" row from
   **Assess** to **Hold — tool dormant**.
3. Add a **F\* extraction** row in TECH-RADAR at Assess,
   pointing at Path A above. This is the successor
   investigation, not a direct replacement.
4. Leave FastCdc.fs / Crdt.fs / SIMD merge refinement
   coverage as an open gap. Acknowledge the gap in
   `docs/research/proof-tool-coverage.md` rather than
   pretending the evaluation succeeded.

## Reference

- `docs/research/liquidfsharp-evaluation.md` — the plan this
  finding terminates.
- `docs/research/proof-tool-coverage.md` — the map of
  F#-relevant proof tools this finding updates.
- `docs/TECH-RADAR.md` — the row modified as a result.
