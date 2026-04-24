# PR #329 — Rebase Recovery Log

**PR:** https://github.com/Lucent-Financial-Group/Zeta/pull/329
**Title:** core: Graph.internalDensity + exclusivity + conductance — 15th graduation (Amara #3 correction)
**Branch:** `feat/graph-cohesion-exclusivity-conductance`
**Context:** PR was closed-as-superseded, then reopened. Main had advanced with new Graph
primitives (`coordinationRiskScore`, `coordinationRiskScoreRobust`) that landed in the
interim. Rebased `feat/graph-cohesion-exclusivity-conductance` onto `origin/main` at
`a54bdf114c70b9a3bbb02acaa5fb388d3a22837b`.

## Conflicts resolved

### 1. `src/Core/Graph.fs` (lines 452 – 709 in the conflicting state)

- **Shape:** both sides added new `let` bindings at the same insertion point in the
  `Graph` module (directly after `labelPropagation`). HEAD added two composite-risk
  functions (`coordinationRiskScore`, `coordinationRiskScoreRobust`). The PR branch
  added three cohesion primitives (`internalDensity`, `exclusivity`, `conductance`).
- **Classification:** substantive code. **NOT** an append-only / audit-trail surface —
  `-X ours` would have discarded one entire side's primitives. Resolved by careful
  union: keep both sides, one after the other, with a blank line between blocks.
- **Resolution choice:** union-keep-both, HEAD first, then PR-branch additions.
- **Rationale:** the two sets of functions are disjoint — no shared identifiers, no
  shared signatures, no shared data dependencies. Each side cites distinct Amara
  ferries (17th Part 2 correction #4 for risk scores; 17th Part 2 correction #3 for
  cohesion primitives). Landing both is the correct semantic outcome; the conflict
  was purely positional (same line range in the source file), not semantic.
- **Verification:** confirmed `largestEigenvalue`, `labelPropagation`, `modularityScore`
  (lines 290 – 309, 322 in pre-rebase) and `RobustStats.robustZScore` all remain
  reachable from their callers. No symbol renames needed.

### 2. `tests/Tests.FSharp/Algebra/Graph.Tests.fs` (lines 340 – 535 in the conflicting state)

- **Shape:** identical structural pattern — HEAD added test fixtures for
  `coordinationRiskScore` + `coordinationRiskScoreRobust` + `robustZScore` (7 tests).
  The PR branch added test fixtures for `internalDensity` + `exclusivity` +
  `conductance` (6 tests).
- **Classification:** substantive test code (not append-only).
- **Resolution choice:** union-keep-both, HEAD first, then PR-branch additions, with
  blank-line separator between the two `// ───` section banners.
- **Rationale:** same reasoning as Graph.fs — disjoint fixtures exercising disjoint
  primitives. Each test block is self-contained; no shared test helpers introduced
  by one side get clobbered by the other.

## Build & test

- `dotnet build -c Release` — result recorded in the commit trailer.
- `dotnet test Zeta.sln -c Release` — result recorded in the commit trailer.

## Unresolved threads

7 unresolved review threads from the previous open period remain on the PR. These
were **intentionally** not drained in this pass — the scope of the recovery was
rebase-only. They are deferred to a later re-drain pass.
