# CI workflow design — Zeta

**Round:** 29
**Status:** Aaron-reviewed 2026-04-18 — ready to write YAML
once the gate inventory lands.
**Scope:** shape, triggers, permissions, matrix, concurrency,
and caching for Zeta's first GitHub Actions workflow and the
sequenced follow-ups. Read-only reference:
`../SQLSharp`. Companion: `docs/research/build-machine-setup.md`.

## Discipline recap

- `../SQLSharp/.github/workflows/` is a read-only model.
  No file copied. Every workflow is hand-crafted.
- Aaron reviews each trigger / matrix / permission /
  concurrency / caching change before it lands.
- Cost discipline: every job earns its slot. Default
  narrow; widen only with a stated reason.
- **The workflow is the developer-experience gate.** Per
  GOVERNANCE.md §24, CI runs the same `tools/setup/
  install.sh` as dev laptops and devcontainers. The
  matrix exists to test the developer experience across
  platforms.

## What `../SQLSharp` teaches (paraphrased)

Seven workflows:
- `ci.yml` — quality + automation gate across Unix
  (ubuntu + macos), Windows, WSL.
- `reusable-coverage-collect.yml`, `reusable-benchmarks-
  collect.yml` — DRY helpers called twice (head vs base).
- `coverage.yml`, `benchmarks.yml` — head-vs-base diff
  and PR comments.
- `format.yml` — same-repo auto-fix, fork hard-fail.
- `claude-pr-review.yml` — Claude-based PR review.

Discipline patterns: concurrency with `cancel-in-progress`,
full-SHA action pinning, least-privilege `permissions:`,
per-job `timeout-minutes`, `fail-fast: false`, reusable
sub-workflows for matrix-heavy collection.

## Zeta's adoption — decisions locked

**Runner pinning — digest-pinned.** Aaron: *"Pinning is
fine, this is a research project I like reproducibility."*
Runners pinned: `ubuntu-22.04` and `macos-14` rather than
the moving `-latest` label. Bumps to the digest are explicit
PRs with the version history visible in `git log`.

**Parity over simplicity — Option B.** Aaron: *"Parity is
what we are going for, but I'm fine if that happens over
time just backlog it so we don't forget. Dev setup, build
machine setup, and dev container setup all share common
setup."* We start with `actions/setup-dotnet@<sha>` in the
first workflow for speed (day-one CI beats a perfect
day-three CI). Parity is the backlog commitment: swap in
`tools/setup/install.sh` the moment it's stable. Backlog
entry captures the trigger condition.

**Branch protection — not yet.** Aaron: *"No, that
build-and-test is a legacy thing, we can do whatever we
want with whatever names we want."* Two things in that
answer: (a) the workflow name `build-and-test` isn't
load-bearing — **proposed rename: `gate.yml`** to fit
Zeta's lexicon (every discipline rule in this repo talks
about gates). (b) No required-check rule on `main` yet; we
add it after one week of clean runs.

**`fail-fast: false` on matrix.** Aaron: *"agree."*

**Concurrency key — research required.** Aaron: *"To be
honest I have no idea, do some research and try to do
whatever is best practice."* Research summary below.

**Windows timeline — once mac+linux stable.** Aaron:
*"Let's just do it once we are in a stable spot with mac
and linux no need to wait."* Trigger: one week of green
runs on ubuntu-22.04 + macos-14. Then Windows joins the
matrix. Backlog entry captures the trigger.

**NuGet caching — adopt immediately.** Aaron: *"Agree,
that does not hurt parity right?"* Correct — the CI cache
is a GitHub Actions layer optimisation; local dev caches
the same packages in the same `~/.nuget/packages` via
normal dotnet restore. No parity impact.

Aaron bonus: *"If you want to get us to a point where we
can do incremental builds with a build cache too I would
love that, then we could only run the tests who were
affected, but that's a backlog item for sure."* Logged as
backlog: incremental build + affected-test selection.

**Third-party actions — parity is the constraint.** Aaron:
*"Anything you need to pull in for GitHub Actions is fine
as long as it's not causing asymmetry here for build
machine / dev machine setup."* GitHub-specific actions
(`actions/checkout`, `actions/cache`, `actions/upload-
artifact`) don't affect dev parity — they don't install
anything on a developer laptop. Pre-approved set:

- `actions/checkout` — source checkout, no dev parallel.
- `actions/cache` — CI cache layer, no dev parallel.
- `actions/upload-artifact` — CI artifact upload, no dev
  parallel.
- `actions/setup-dotnet` — **temporary**; parity-drift
  flag; swap to `tools/setup/install.sh` per backlog.

All pinned by full 40-char commit SHA.

**PR comment bot — defer.** Aaron: *"We don't need the
comparison yet, we can do that later, just put it in the
backlog."* `$GITHUB_STEP_SUMMARY` is the reporting surface
until a comparison flow exists.

**Failure triage — hard-fail everywhere.** Aaron: *"Yeah
lets error on the side of caution with hard failure we can
also reevaluate if something feels off."* Build, test,
lint, verifiers, mutation all hard-fail on red.

## Concurrency key — research (Aaron asked)

GitHub Actions concurrency best practice, as of 2026:

1. **Group key shape.** The industry convention that
   cancels stale PR runs while serialising main-branch
   runs:

   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
     cancel-in-progress: ${{ github.event_name == 'pull_request' }}
   ```

   - `github.workflow` prefix: different workflows don't
     cancel each other's runs; lint and build can queue
     independently.
   - `pull_request.number || ref`: PRs key by PR number
     so a force-push to the same PR cancels the stale run;
     non-PR events fall back to the branch ref.
   - `cancel-in-progress` gated on event type: PR pushes
     cancel stale work (new commits supersede old CI);
     main-branch pushes queue rather than cancel, because
     on main we want every commit to get a green or red
     record, not "superseded".

2. **Pitfalls the research flagged.**
   - Bare `cancel-in-progress: true` on main branch is
     the anti-pattern — a fast-merging stream of PRs can
     cancel the very commit that fixed a bug before the
     record lands.
   - `github.head_ref` alone misses forks and
     workflow_dispatch events; the fallback to
     `github.ref` covers both.
   - Running multiple workflow files with the same
     concurrency group is a classic footgun: they fight
     each other for the slot. Prefix with
     `github.workflow`.

3. **Choice for Zeta's first workflow.** Adopt the shape
   above verbatim. If we later add a second workflow
   (lint, verifiers, etc.), each gets its own group
   courtesy of the `github.workflow` prefix.

Citations for the research: GitHub's own Actions docs on
[concurrency](https://docs.github.com/en/actions/using-jobs/using-concurrency);
community patterns cited in: `../SQLSharp/.github/workflows/ci.yml`
(simpler key, main-branch cancellation); [actions-concurrency
cookbook](https://docs.github.com/en/actions/using-jobs/
using-concurrency) on gating `cancel-in-progress`.

## Proposed round-29 workflow — `gate.yml`

Single workflow, two jobs (one per OS). Name change:
`build-and-test.yml` → `gate.yml` to fit Zeta's lexicon.

- **Trigger:** `pull_request` (opened, reopened,
  synchronize, ready_for_review) + `push` on `main` +
  `workflow_dispatch`.
- **Permissions (workflow-level):** `contents: read`.
- **Concurrency:**
  ```
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
  ```
- **Matrix:** `os: [ubuntu-22.04, macos-14]`,
  `fail-fast: false`.
- **Timeout:** `timeout-minutes: 30`.
- **Steps:**
  1. `actions/checkout@<sha>` — source.
  2. `actions/setup-dotnet@<sha>` (**temporary; backlog
     swap to `tools/setup/install.sh`**) — .NET 10.x.
  3. `actions/cache@<sha>` — key on
     `hashFiles('**/packages.lock.json')`, path
     `~/.nuget/packages`, `~/.local/share/NuGet`,
     `~/.nuget/NuGet`.
  4. `dotnet build Zeta.sln -c Release` — the gate.
     Must end `0 Warning(s)` / `0 Error(s)`.
  5. `dotnet test Zeta.sln -c Release --no-build` — all
     tests green.

**Nothing else lands until the gate inventory
(`docs/research/ci-gate-inventory.md`) is signed off.**

## Third-party action SHA pin ledger

Tracked in this doc, not in YAML comments, so a reviewer
sees the version history in `git log`:

| Action | Version | Commit SHA |
|---|---|---|
| `actions/checkout` | v4.2.x | *filled when we pin* |
| `actions/setup-dotnet` | v4.x | *filled when we pin* |
| `actions/cache` | v4.x | *filled when we pin* |

SHAs added when YAML lands; each update is its own PR.

## Sequenced follow-ups (each its own Aaron gate)

- Gate inventory doc — next deliverable.
- `gate.yml` first workflow — after inventory sign-off.
- Lint workflow (Semgrep, fantomas if adopted) — after
  one week of clean `gate.yml` runs.
- Verifier workflows (Alloy, Lean, TLC) — each its own
  PR, each its own design-doc update.
- Mutation workflow (Stryker) — scheduled / manual only,
  never per-PR.
- Swap `actions/setup-dotnet` → `tools/setup/install.sh`
  — parity restoration; backlog item.
- Windows matrix — after mac+linux stable one week.
- Branch-protection required-check on `main` — after one
  week of clean `gate.yml` runs.

## Deferred to backlog (captured in `docs/BACKLOG.md`)

- Incremental build + affected-test selection (Aaron:
  *"I would love that"*) — substantial dependency-graph
  work; out of scope for round 29.
- Comparison PR-comment bot (coverage / benchmark diffs
  between head and base).
- Windows matrix.
- Swap to `tools/setup/install.sh` in CI for full parity.
- Open-source contribution tracking (log where we've
  PR'd upstream per GOVERNANCE.md §23).
