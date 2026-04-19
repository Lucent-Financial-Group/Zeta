# CI gate inventory — Zeta

**Round:** 29
**Status:** design draft — awaiting Aaron sign-off before any
workflow YAML lands.
**Scope:** the exhaustive list of verifier + build gates Zeta
could run, with cost estimates and a staged landing sequence.
Companions: `docs/research/build-machine-setup.md`,
`docs/research/ci-workflow-design.md`.

## Organizing principle

Three phases, ordered by cost-per-signal:

- **Phase 1 — every PR.** Cheap, high-signal, fail-fast. Run
  on every push to a PR branch and every push to `main`.
- **Phase 2 — scheduled.** Moderate cost, moderate signal
  per run. Run on a cron schedule (daily or weekly); also
  available via `workflow_dispatch` for manual re-runs.
- **Phase 3 — opt-in / manual.** High cost, narrow signal.
  Scheduled weekly at most, plus `workflow_dispatch`. Never
  per-PR.

Aaron's round-29 framing: *"we have to be so careful when
running the CI stuff it's all so slow."* Phase discipline is
the cost-control lens. A gate moves up a phase only with a
stated reason.

## Inventory

### Phase 1 — every PR

| # | Gate | Command | Runtime (est.) | Matrix | Needs | Failure |
|---|---|---|---|---|---|---|
| 1 | **Build** | `dotnet build Zeta.sln -c Release` | 1-2 min | ubuntu-22.04 + macos-14 | dotnet 10.x | hard-fail; `0 Warning(s)` required (TreatWarningsAsErrors is on) |
| 2 | **Test** | `dotnet test Zeta.sln -c Release --no-build` | 2-5 min | ubuntu + macos | dotnet 10.x; test deps via nuget cache | hard-fail on red |
| 3 | **Lint — Semgrep** | `semgrep --config .semgrep.yml` | 30-60 s | ubuntu only (single OS is fine for lint) | python 3.x, semgrep pip pkg | hard-fail on any rule match |
| 4 | **Install-script two-run contract** | `tools/setup/install.sh && tools/setup/install.sh` (the `&&` is the contract — both must succeed) | +2-3 min over setup itself; see §three-way-parity | ubuntu + macos | the setup script itself | hard-fail if second run mutates state or downloads |

**Phase-1 cost sketch.** Per PR push, 2 OS × (5-7 min) = ~15
min wall-clock under `fail-fast: false`. With the NuGet cache
warm: ~10 min. Measurable after first three runs.

### Phase 2 — scheduled (daily or weekly)

| # | Gate | Command | Runtime (est.) | Cadence | Needs | Failure |
|---|---|---|---|---|---|---|
| 5 | **TLC model checker** | `tools/run-tlc.sh` (runs every .tla in `tools/tla/specs/`) | 5-30 min (variance high; SpineMergeInvariants is the long tail) | daily | JDK 21; tla2tools.jar | hard-fail; upload any `*_TTrace_*` artefacts to the run |
| 6 | **Alloy checker** | `java -cp alloy.jar:obj AlloyRunner tools/alloy/specs/*.als` | 2-10 min | daily | JDK 21; alloy.jar | hard-fail |
| 7 | **Lean proof** | `cd tools/lean4 && lake build` | 2-5 min steady-state with cached mathlib; 20-60 min on cold cache | daily | elan/lake/lean at pinned toolchain; cached mathlib .olean dir | hard-fail |
| 8 | **CodeQL** | GitHub CodeQL workflow on C# + F# | 5-10 min | weekly | GitHub CodeQL action (Microsoft-owned — acceptable pin) | hard-fail on new HIGH/CRITICAL alerts |
| 9 | **Dependency audit** | `dotnet list package --vulnerable --include-transitive` + `semgrep --config p/security-audit` | 1-2 min | daily | dotnet 10.x; semgrep | hard-fail on new HIGH/CRITICAL CVE |

**Phase-2 cost sketch.** Daily runs: ~45 min of total
wall-clock across 5 jobs (some parallelisable). Weekly
CodeQL adds ~10 min. Monthly: ~30 hours of minutes if
everything runs daily as designed; tunable with cron
spacing.

### Phase 3 — opt-in / scheduled-weekly

| # | Gate | Command | Runtime (est.) | Cadence | Needs | Failure |
|---|---|---|---|---|---|---|
| 10 | **Stryker mutation testing** | `dotnet stryker --config-file stryker-config.json` | 60-180 min | weekly + manual | dotnet stryker (global tool); full test suite green | hard-fail if `break` threshold (50%) missed; moderate cost if `low` (60%) missed — flag, don't fail (initially) |
| 11 | **Bench regression** | `dotnet run --project bench/Benchmarks -c Release` | 15-30 min per config | weekly + manual | BenchmarkDotNet; long warmup | no hard-fail yet (no published baseline); record + artefact upload |

**Phase-3 cost sketch.** Weekly Stryker alone is ~1-3 hrs.
That's the reason it's never per-PR — one mutation run for
every 10 PRs would eat the CI budget.

## Gates we explicitly skip on day 1

| Gate | Why skipped |
|---|---|
| **Coverage collection** | No coverage baseline exists. Collection without a diff target is just noise. Add when we have a published baseline and a tool like `coverlet` + `reportgenerator` in the install script. |
| **Coverage diff vs base** | Depends on coverage collection. See `../SQLSharp/reusable-coverage-collect.yml` for the shape when we adopt it. Backlog. |
| **Benchmark diff vs base** | Depends on a baseline. No benchmark has a committed "this is the expected throughput" file yet. Naledi's next perf round delivers the baseline. |
| **PR-comment bot (coverage/bench diffs)** | Backlog per Aaron round-29 call. `$GITHUB_STEP_SUMMARY` is the reporting surface until a diff flow exists. |
| **Fantomas format check** | Zeta doesn't currently enforce Fantomas. Adding it = code churn plus new gate; separate decision. |
| **fsharplint** | Same — not currently adopted; not a day-1 gate. |

## The three-way-parity install-script test

Gate 4 is load-bearing per GOVERNANCE §24. It's not "run
the installer and hope" — it's a deliberate parity test:

1. Runner boots clean image (`ubuntu-22.04` or `macos-14`).
2. `tools/setup/install.sh` runs. Must exit 0.
3. `tools/setup/install.sh` runs again (second run).
   Must exit 0. Must not re-download. Must not mutate PATH
   duplicates. (Second-run behaviour is checked by
   comparing `$GITHUB_PATH` / `$GITHUB_ENV` deltas.)
4. `dotnet --info` reports the pinned version from
   `.mise.toml`.
5. A `javac` invocation succeeds (proves JDK is on PATH
   for Alloy + TLC).
6. `lean --version` succeeds (proves elan installer was
   run).
7. `semgrep --version` succeeds.

If any step fails, the dev experience is broken and the PR
is blocked. Same failure bar as the build itself.

## Workflow file plan

Phase 1 lives in one workflow: `gate.yml` (name per
ci-workflow-design decision). Phases 2 and 3 are separate
workflows so they can have different triggers, permissions,
and matrix shapes. Suggested names (subject to Aaron
naming preference):

- `gate.yml` — Phase 1 (build, test, lint, install-script)
- `verify.yml` — Phase 2 TLC + Alloy + Lean (scheduled daily)
- `security.yml` — Phase 2 CodeQL + dependency audit (weekly)
- `mutation.yml` — Phase 3 Stryker (weekly + manual)
- `bench.yml` — Phase 3 benchmarks (weekly + manual)

**Nothing in Phase 2 or 3 lands until Phase 1 has one week
of clean runs.** Discipline: we prove the foundation before
stacking gates on top.

## Secrets inventory

Zeta does not currently need any CI secret. All gates above
run against public artefacts (upstream package registries,
GitHub-hosted actions, vendored jars). If any future gate
needs a secret (e.g. NuGet publish when Zeta ships), that
gate earns its own design doc + Aaron sign-off + the least-
privilege permissions story.

**Deliberate non-goal for round 29:** no workflow in this
plan references `secrets.*`. The first secret added to any
workflow is a design-doc moment.

## Third-party actions needed

Phase 1 (subject to full-SHA pinning in the workflow PR):

- `actions/checkout`
- `actions/setup-dotnet` (**temporary parity-drift flag**;
  backlog swap to `tools/setup/install.sh`)
- `actions/cache`
- `actions/setup-python` (for Semgrep; temporary — Semgrep
  moves into `tools/setup/` when `.mise.toml` adopts
  python)

Phase 2 adds:

- `actions/setup-java` (for TLC + Alloy; temporary, same
  backlog)
- `github/codeql-action/init` + `github/codeql-action/analyze`

Every action pinned by full 40-char commit SHA in the
workflow PR. SHAs recorded in the `ci-workflow-design.md`
ledger for history.

## Cost accounting summary

| Phase | Cadence | Wall-clock/run | Monthly minutes (est.) |
|---|---|---|---|
| 1 | every PR + push-to-main | 15 min (2 OS × 7 min) | highly PR-volume dependent; 10-30 hrs at modest volume |
| 2 | daily | 45 min (5 jobs, partial parallelism) | ~20 hrs |
| 3 | weekly | 90-120 min | ~8 hrs |

Figures are deliberately imprecise. We measure after first
three runs of each gate and update this table.

## Open questions for Aaron

1. **Phase-2 cadence.** Daily for TLC + Alloy + Lean +
   dependency audit feels right; confirm vs weekly?
2. **Stryker break threshold.** `stryker-config.json`
   currently sets `break: 50`. Do we keep that as the
   hard-fail line, and treat `low: 60` as a warning-not-
   failure initially? Recommend yes while we establish a
   baseline.
3. **Lean proof cold-cache story.** `lake build` on a
   cold cache (no mathlib .olean) is 20-60 min. `actions/
   cache` on the mathlib dir brings it to ~2-5 min steady-
   state. Confirm we invest in the mathlib cache from day
   one of Phase 2? Recommend yes.
4. **Fantomas / fsharplint adoption.** Both exist in the
   .NET ecosystem. Separate decision (churn cost) or
   adopt as part of the install-script backlog? Recommend
   backlog, not day-1.
5. **Phase-1 install-script gate — block or warn?** Hard-
   fail on day 1 (Aaron's "hard-fail everywhere" rule),
   OR warn-only for one week while the script settles?
   Recommend hard-fail from day 1; the discipline is
   worth the occasional red PR.
6. **Benchmark baseline publication.** When Naledi
   publishes the first baseline (next perf round), does
   it go in `docs/BENCHMARKS.md` only, or do we also
   commit a machine-readable JSON the CI can diff against?
   Recommend JSON + human-readable; aligns with `../SQLSharp`
   benchmark-collection shape.
7. **CodeQL — C# + F# languages.** F# is supported by
   CodeQL but coverage is thinner than C#. Worth running,
   or do we rely on Semgrep's F# rules + Mateo's
   security-researcher audits? Recommend run CodeQL
   anyway — free signal on the C# projects (Core.CSharp,
   Tests.CSharp).

## What lands after Aaron signs off on this inventory

1. `.github/workflows/gate.yml` — Phase-1 workflow only.
   One week of clean runs before Phase 2 starts.
2. Separate `docs/research/<name>.md` design doc for each
   Phase-2 workflow; each earns its own Aaron sign-off.
3. Phase-3 workflows never land during round 29 unless
   Phase 1 + 2 are already stable.
