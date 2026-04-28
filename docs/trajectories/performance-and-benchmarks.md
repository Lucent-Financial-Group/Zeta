# Trajectory — Performance + Benchmarks

## Scope

Hot-path performance for Zeta's operator algebra (DBSP / ZSet
operators), allocation budget per pipeline stage, cache-line
behaviour, SIMD dispatch, BenchmarkDotNet suites, and the
performance-engineer ↔ complexity-theory-expert ↔
query-optimizer-expert (planner cost-model) review surface.
Open-ended because
.NET runtime evolves (.NET 10 → .NET 11 etc.), hardware-intrinsics
APIs grow, and new measurement methodologies emerge. Bar: hot
paths are zero-alloc where it matters; cache-line alignment is
verified; perf regressions are caught at PR cadence (P1+ binding).

## Cadence

- **Per-PR**: BenchmarkDotNet suites run on perf-touching PRs.
- **P1+ regression**: the performance-engineer has binding authority on perf
  regressions.
- **Per-runtime-release**: when .NET ships a new version,
  re-baseline the benchmarks.
- **Quarterly**: hot-path audit — what's changed, what's drifted.

## Current state (2026-04-28)

- BenchmarkDotNet suites — `bench/Benchmarks/` and
  `bench/Feldera.Bench/`
- `benchmark-authoring-expert` skill governs benchmark hygiene
- `performance-engineer` skill — hot-path tuning, zero-alloc
  audits, cache-line alignment, SIMD dispatch
- `complexity-theory-expert` skill — asymptotic complexity
  reviewer; distinct from the performance-engineer (measured)
  and the query-optimizer-expert (cost-model)
- `query-optimizer-expert` skill — planner cost-model
- `hardware-intrinsics-expert` skill — .NET hardware intrinsics
  (`System.Runtime.Intrinsics.*`)
- `profiling-expert` skill — BenchmarkDotNet diagnosers, ETW,
  PerfView, dotnet-trace, dotnet-counters
- `performance-analysis-expert` skill — design-time performance
  analysis
- Allocation-audit pattern via BenchmarkDotNet
  `[MemoryDiagnoser]`

## Target state

- All hot paths in `src/Core/` have a benchmark suite.
- Zero-alloc on tight loops where the algebra requires it
  (composability invariants).
- Cache-line alignment on shared-state structs.
- SIMD dispatch where vectorisation wins ≥ 2x.
- Planner cost-model (query-optimizer-expert) is calibrated
  against measured benchmark data (performance-engineer).
- Perf regressions caught at PR cadence (BP-binding; not
  optional).

## What's left

In leverage order:

1. **Benchmark coverage audit** — quantify what fraction of
   hot paths have benchmarks; prioritize gaps.
2. **CI benchmark cadence** — BenchmarkDotNet suite runs on
   PR (not currently on cadence; may be too slow).
3. **Allocation budget per stage** — explicit budget per
   pipeline stage; alert on regression.
4. **Cache-line alignment audit** — verify shared-state structs
   are correctly padded.
5. **SIMD dispatch coverage** — gaps where vectorisation could
   win but isn't yet implemented.
6. **Planner-cost-model ↔ benchmark calibration** — the
   query-optimizer-expert's cost model should match the
   performance-engineer's measured costs within tolerance;
   drift detection.

## Recent activity + forecast

- 2026-04-28: trajectory file landed (current entry).
- 2026-04-27: benchmark-related work focus has been incidental;
  no major perf landings this session.
- (Cross-reference: round-history.md for benchmark landings.)

**Forecast (next 1-3 months):**

- .NET 11 likely lands → re-baseline benchmarks.
- Streaming-window operator perf candidates (per
  `streaming-window-expert` skill scope).
- SQL engine perf when sql-engine subsystem grows.
- Possible BenchmarkDotNet → newer entrant migration if a
  better tool appears.

## Pointers

- Skill: `.claude/skills/performance-engineer/SKILL.md`
- Skill: `.claude/skills/complexity-theory-expert/SKILL.md`
- Skill: `.claude/skills/query-optimizer-expert/SKILL.md`
- Skill: `.claude/skills/hardware-intrinsics-expert/SKILL.md`
- Skill: `.claude/skills/profiling-expert/SKILL.md`
- Skill: `.claude/skills/performance-analysis-expert/SKILL.md`
- Skill: `.claude/skills/benchmark-authoring-expert/SKILL.md`
- Reviewer: `.claude/skills/performance-engineer/` (binding on P1+)

## Research / news cadence

External tracking required — this is an active-tracking trajectory.

| Source | What to watch | Cadence |
|---|---|---|
| .NET runtime release notes (currently .NET 10) | GC improvements, JIT optimizations, new intrinsics | Per-release |
| BenchmarkDotNet release notes | Diagnoser improvements, statistical-analysis updates | Per-release |
| .NET performance blog (Stephen Toub annual perf post) | Macro-level perf trajectory; new optimization patterns | Annual |
| `System.Runtime.Intrinsics` API additions | New SIMD instructions, AVX-512, ARM SVE2 | Per-release |
| VLDB / SIGMOD systems papers | Streaming-engine perf research | Per-conference |
| Database systems perf research (Andy Pavlo's CMU course updates) | New benchmark methodologies | Quarterly |

Findings capture: benchmark-relevant findings → ADR + trajectory
update; new intrinsics → BACKLOG row when adoption candidate.
