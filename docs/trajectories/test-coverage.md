# Trajectory — Test Coverage

## Scope

Unit tests, integration tests, property-based tests (FsCheck),
mutation tests (Stryker.NET), end-to-end tests, and coverage
metrics across the test suite. Open-ended because new features
land continuously and coverage gaps drift; mutation-test thresholds
need ratcheting; flaky tests need root-causing (Otto-248: never
ignore flakes per DST discipline). Bar: every load-bearing
behavior has at least one test; mutation score doesn't regress;
DST-everywhere holds.

## Cadence

- **Per-PR**: tests added with the change (TDD discipline);
  build-and-test legs run on every PR.
- **Per-flake**: when a test flakes, root-cause investigation
  begins immediately (Otto-248 — flakes are non-determinism
  smell, NOT noise).
- **Quarterly**: mutation score audit; coverage gap analysis;
  flake history review.

## Current state (2026-04-28)

- **Test surfaces**:
  - Unit tests under `tests/Zeta.Core.Tests/`
  - Property-based tests via FsCheck
  - Mutation testing configured via Stryker.NET (cadence not
    yet active — see ci-infrastructure trajectory)
  - DST (deterministic simulation testing) discipline
    everywhere; pinned random seeds (Otto-272 / Otto-273 /
    Otto-281 / Otto-248)
- **Test infrastructure**:
  - `dotnet test Zeta.sln -c Release` is the canonical gate
  - `gate.yml` build-and-test matrix runs on every PR
  - `low-memory.yml` ubuntu-slim leg per-merge cadence
- **DST discipline** (Otto-272):
  - DST-everywhere is the baseline (every test is deterministic)
  - DST-exempt-is-deferred-bug (Otto-281): if a test claims
    exemption, it's tracking a real bug to fix
  - Pinned random seeds (Otto-273): when seed is needed, it's
    explicit + Aaron-preference for 69/420 if it doesn't
    compromise (BP whimsy)
  - Never ignore flakes (Otto-248): retries are non-determinism
    smell, NOT noise; root-cause investigate
- **Skills**:
  - `deterministic-simulation-theory-expert` (DST)
  - `fscheck-expert` (property-based)
  - `stryker-expert` (mutation testing)
  - `claims-tester` (when README/comment makes a claim, verify it)

## Target state

- 100% of load-bearing behaviors have at least one test.
- Property-based tests cover every algebraic invariant.
- Mutation score ≥ threshold (TBD); doesn't regress on PRs.
- Zero accepted flakes; every flake traces to a fixed
  determinism gap.
- DST-exempt list shrinks toward zero (each exemption is a
  scheduled bug-fix per Otto-281).
- E2E test coverage for the demo target (task #244).

## What's left

In leverage order:

1. **Stryker.NET cadence activation** — mutation testing
   configured but idle; needs scheduled run + threshold gate.
2. **Coverage report** — quantify what fraction of source has
   test coverage; identify dead-zones; per-file +/- since last
   audit.
3. **DST-exempt audit** — list of currently exempt tests + bug
   each is tracking; ensure none have aged into "permanent
   exemption."
4. **Flake history review** — git log for retries / re-runs /
   skips; root-cause any pattern.
5. **Property-based test gap analysis** — algebraic invariants
   that don't yet have FsCheck suites.
6. **E2E test infrastructure for demo target** (task #244) —
   factory-demo path 0-to-production-ready needs E2E coverage.

## Recent activity + forecast

- 2026-04-28: trajectory file landed (current entry).
- 2026-04-23: pinned-seeds-as-DST-resolution memory landed
  (Otto-273).
- 2026-04-23: never-ignore-flakes-per-DST memory (Otto-248
  reinforced).

**Forecast (next 1-3 months):**

- Stryker activation candidate.
- Coverage tooling (e.g. coverlet integration) audit.
- Test infrastructure for factory-demo (task #244) when demo
  starts.
- Possible flake-history report from CI run-data.

## Pointers

- Skill: `.claude/skills/deterministic-simulation-theory-expert/SKILL.md`
- Skill: `.claude/skills/fscheck-expert/SKILL.md`
- Skill: `.claude/skills/stryker-expert/SKILL.md`
- Skill: `.claude/skills/claims-tester/SKILL.md`
- Code: `tests/Zeta.Core.Tests/`
- Workflow: `.github/workflows/gate.yml` (build-and-test legs)
- Workflow: `.github/workflows/low-memory.yml` (ubuntu-slim)
- BACKLOG: task #244 factory-demo
- Memory: `memory/feedback_*_dst_*.md` (DST cluster)
- Memory: `memory/feedback_pinned_*seed*.md` (seed-locking)
- Memory: `memory/feedback_*_flake*.md` (flake discipline)
- Cross-trajectory: formal-analysis.md (mutation testing as
  proof-coverage proxy; Stryker overlap)
- Cross-trajectory: ci-infrastructure.md (workflow-level perspective)
