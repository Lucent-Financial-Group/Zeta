# CI workflow design — Zeta

**Round:** 29
**Status:** design draft — awaiting Aaron sign-off before any
YAML lands in `.github/workflows/`.
**Scope:** shape, triggers, permissions, matrix, and gate
strategy for Zeta's GitHub Actions. Read-only reference:
`../SQLSharp`.

## Discipline recap

- `../SQLSharp/.github/workflows/` is a **read-only model**
  for shape. No file is copied. Every workflow Zeta ships is
  hand-crafted here.
- Aaron reviews every trigger, matrix axis, permission block,
  and concurrency group before it lands.
- Cost discipline: each job earns its slot. Default narrow;
  widen only with a stated reason. Stryker and other slow
  gates never run on every push.
- Companion doc: `docs/research/build-machine-setup.md`. The
  build-machine scripts will be shared between local dev and
  CI so the verifier toolchain installs identically.

## What `../SQLSharp` teaches (paraphrased)

SQLSharp's `.github/workflows/` directory carries seven
workflows across three categories:

1. **`ci.yml`** — main quality + automation gate on every
   PR and push-to-main. Splits into parallel Unix (ubuntu +
   macos), Windows, and WSL tracks; final aggregator jobs
   collapse the matrix into two PR checks.
2. **Reusable sub-workflows** — `reusable-coverage-collect.yml`
   and `reusable-benchmarks-collect.yml` encapsulate the
   multi-OS collection step so `coverage.yml` and
   `benchmarks.yml` can call them twice (head vs base SHA)
   without duplicating YAML.
3. **Comparison workflows** — `coverage.yml` and
   `benchmarks.yml` run head vs base, diff, and publish
   both to PR comments and `$GITHUB_STEP_SUMMARY`.
4. **`format.yml`** — auto-fixes formatting on PRs from the
   same repo (via a GitHub App token), fails hard on PRs
   from forks.
5. **`claude-pr-review.yml`** — dispatches a Claude-based
   review on PR events; OIDC auth (`id-token: write`).

**Discipline patterns that stand out:**

- **Concurrency groups with `cancel-in-progress: true`** on
  PR-level workflows so stale runs stop burning minutes.
- **Third-party actions pinned by full commit SHA**, not
  mutable `@v4` tags. Every `uses:` line carries a SHA.
- **Least-privilege `permissions:` blocks** — default
  `contents: read`; jobs that need to comment elevate to
  `pull-requests: write` locally.
- **Timeout discipline** — every job has `timeout-minutes`
  scaled to the expected SLA (45 for quality, 60 native
  benchmarks, 90 for WSL).
- **`fail-fast: false`** on matrix so one OS failing doesn't
  hide a second OS also failing.
- **Reusable workflows for matrix-heavy collection** — the
  DRY win is real.

## What Zeta should borrow

| Pattern | Source | Why it fits Zeta |
|---|---|---|
| Concurrency groups with `cancel-in-progress: true` | `../SQLSharp/.github/workflows/ci.yml` | Cost discipline — stale PR runs stop burning minutes the moment a new push arrives. |
| Full-SHA action pinning | `../SQLSharp/.github/workflows/ci.yml` (`actions/checkout@de0fac2e...`) | Supply-chain defence. Mateo's threat model treats third-party actions as untrusted; SHA pins make substitution-attack visible as a diff. |
| Default `permissions: contents: read` | `../SQLSharp/.github/workflows/ci.yml` | Least-privilege token; elevate to `pull-requests: write` only in the specific job that needs it. |
| Per-job `timeout-minutes` | `../SQLSharp/.github/workflows/ci.yml` | Hang protection. Zeta verifiers (Stryker especially) can run long; cap them explicitly so a stuck job doesn't eat the whole 6-hour job budget. |
| `fail-fast: false` on OS matrix | `../SQLSharp/.github/workflows/ci.yml` | Cross-platform bugs surface together rather than one at a time. |
| Reusable sub-workflows for multi-OS collection | `../SQLSharp/.github/workflows/reusable-coverage-collect.yml` | Zeta will grow per-verifier gates (Alloy, Lean, TLC, Stryker). Reusable callers keep matrix expansion cheap. |

## What Zeta should **not** borrow

| Pattern | Source | Why it doesn't fit |
|---|---|---|
| Windows + WSL tracks on every PR | `../SQLSharp/.github/workflows/ci.yml` | Round-29 discipline: macOS + Linux only until a Windows-breaking test justifies a slot. |
| `bun run validate:quality` | `../SQLSharp/.github/workflows/ci.yml` | Zeta is .NET/F#, not a Bun/TS codebase. Gates call `dotnet build` / `dotnet test` / verifier scripts directly. |
| Auto-format-and-push via GitHub App token | `../SQLSharp/.github/workflows/format.yml` | Auto-pushes from CI are high-risk on Zeta's branch-protection discipline; a failing fantomas check should fail the build, not rewrite the PR. |
| Empty `sonarqube-scan:` job stub | `../SQLSharp/.github/workflows/coverage.yml` | Dead YAML is a maintenance hazard. Zeta only writes workflows we actually intend to populate. |
| `claude-pr-review.yml` pattern | `../SQLSharp/.github/workflows/claude-pr-review.yml` | Cool but out of scope for round-29. Revisit when the AI-factory paper's infra roadmap lands. |

## Proposed round-29 workflow landing sequence

**Each sub-step is a separate Aaron review gate.** No YAML
is written until the preceding design decision is signed off.

### Step 1 — Gate inventory

Before any YAML exists, we agree on what Zeta's CI gates
*are*. Draft lives in `docs/research/ci-gate-inventory.md`
(separate doc).

### Step 2 — `build-and-test.yml` (the minimum useful CI)

Single workflow, single job per OS, two OSes:

- Trigger: `pull_request` (`opened`, `reopened`,
  `synchronize`, `ready_for_review`) + `push` on `main` +
  `workflow_dispatch`.
- Permissions: `contents: read`.
- Concurrency: `group: build-${{ github.event.pull_request.number || github.ref }}`, `cancel-in-progress: true`.
- Matrix: `os: [ubuntu-latest, macos-latest]`, `fail-fast: false`.
- `timeout-minutes: 30` (builds are fast; 30 minutes is a
  generous cap).
- Steps: checkout (SHA-pinned) → setup-dotnet 10 (SHA-pinned)
  → `dotnet build Zeta.sln -c Release` → `dotnet test Zeta.sln -c Release`.
- Actions pinned by full commit SHA. List documented in
  this design doc (not in YAML) so a reviewer sees the
  version history.

**Nothing else lands until Aaron signs off on the above.**

### Step 3 — add gates one at a time

After `build-and-test.yml` is green for a week, add the next
gate — **one per PR**, each with its own design doc update:

- `lint.yml` — Semgrep + (if we keep it) fantomas check.
- `verifiers.yml` — Alloy (needs JDK, opt-in via matrix
  axis), TLC (same), Lean (lake build).
- `mutation.yml` — Stryker. **Scheduled or manual only**,
  not per-PR, because Aaron specifically flagged CI cost.

Each addition gets its own cost estimate (CI minutes per
run × expected runs per month) before it lands.

## Security discipline

- Every third-party action pinned by **full 40-char commit
  SHA**. Mutable tags (`@v4`) are rejected in review.
- Every workflow declares `permissions:` at the top with
  the minimum needed. If a job needs to write PR comments,
  the elevation is scoped to that job.
- `secrets.*` usage is documented in the design doc before
  the workflow lands. No secret is added just because it
  might be useful.
- `GITHUB_TOKEN` scope tracked per workflow; if a workflow
  doesn't need write access, it doesn't get it.
- Compliance with GitHub's own hardening guidance:
  [security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions).

## Cost accounting

| Workflow | Cadence | Runners | Minutes/run (est.) | Monthly (est.) |
|---|---|---|---|---|
| `build-and-test.yml` | every PR + push to main | 2 (ubuntu + macos) | 10-15 each | depends on PR volume; baseline |
| `lint.yml` | every PR | 1 (ubuntu) | 3-5 | cheap |
| `verifiers.yml` | every PR | 2-3 (verifier-dependent) | 15-30 each | moderate |
| `mutation.yml` | weekly + `workflow_dispatch` | 1 (ubuntu) | 60-180 | expensive; schedule only |

Numbers are deliberately-imprecise placeholders until we
measure on real runs.

## Open questions for Aaron

1. **Matrix shape for step 2.** `ubuntu-latest` +
   `macos-latest` is the minimum. Do we pin the runner
   image by digest (`ubuntu-22.04`) for reproducibility, or
   follow the moving `-latest` label and accept the
   update-drift risk?
2. **`setup-dotnet` action vs a bootstrap script.** Option A
   — use `actions/setup-dotnet@<sha>` for the dotnet SDK,
   keep CI minimal. Option B — run `tools/setup/install.sh`
   (from the build-machine-setup design) so CI and local
   dev install identically. Option B is the parity play
   `../scratch` implements; option A is simpler but drifts.
   Recommend B once `tools/setup/` is stable.
3. **Branch protection rules.** Does `main` need the
   build-and-test workflow marked as a required check in
   branch protection? Recommend yes, after one week of
   clean runs.
4. **Fail-fast vs see-all on the OS matrix.** SQLSharp
   uses `fail-fast: false`; this costs more minutes but
   surfaces cross-platform bugs together. Recommend follow
   SQLSharp's choice.
5. **Concurrency key.** `github.event.pull_request.number
   || github.ref` (SQLSharp's form) cancels stale PR runs
   but keeps main-branch runs serialised. Confirm?
6. **Windows timeline.** When (if ever) does Windows join
   the matrix? Currently deferred; we should state a
   trigger condition ("first Windows-breaking test lands"
   or "a contributor asks for it") so the decision is
   explicit.
7. **Caching.** NuGet cache (`~/.nuget/packages`) via
   `actions/cache@<sha>` keyed on `packages.lock.json`
   hash — standard, saves ~2 minutes/run. Adopt from step
   2 or defer? Recommend adopt immediately; the savings
   are real.
8. **Third-party actions list.** Initial set: `actions/
   checkout`, `actions/setup-dotnet`, `actions/cache`,
   `actions/upload-artifact`. Any others Aaron wants pre-
   approved so we don't pause at each introduction?
9. **PR comment bot.** SQLSharp uses `peter-evans/create-
   or-update-comment` to publish coverage and benchmark
   diffs. Do we want the same pattern for verifier
   results, or is `$GITHUB_STEP_SUMMARY` enough until we
   have something comparable to diff?
10. **Failure triage.** When a verifier gate fails, what's
    the desired behaviour? Hard-fail the workflow
    (SQLSharp's choice for quality/automation), or flag
    with a comment and continue? Recommend hard-fail on
    build + test, hard-fail on lint, hard-fail on
    verifiers, hard-fail on mutation (scheduled only, so
    failure blocks a human).

## What lands after sign-off on this doc and the gate inventory

1. `docs/research/ci-gate-inventory.md` — separate doc,
   exhaustive list of gates and their costs.
2. `.github/workflows/build-and-test.yml` — the minimum
   useful CI, ubuntu + macos, SHA-pinned actions, least-
   privilege permissions, concurrency group, 30-minute
   timeout.
3. One week of green runs before step 3 (add next gate).
