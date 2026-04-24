# Nightly Cross-Platform Workflow — Design Proposal

**Status:** research-grade proposal (pre-v1). Origin: Aaron
Otto-161 macOS-enablement directive; Otto-164 pricing
verification; Otto-165 follow-up question + Otto's "inverts
the cost risk" suggestion. Author: architect review. Scope:
design-only — no workflow file lands with this doc; the
shape exists on paper so Aaron (or next-tick sign-off) can
approve before anything touches `.github/workflows/`.

## 1. Why this doc

The factory needs cross-platform build confidence (Linux +
Windows + macOS + WSL) per FACTORY-HYGIENE row #51. Current
CI runs only `ubuntu-22.04` on pull_request; the macOS
matrix leg is gated to contributor forks via the
`github.repository ==` conditional in `gate.yml` line 77.

Two competing pressures:

1. Aaron's 2026-04-21 directive (still cited in the
   workflow comment block): *"Mac is very very expensive
   to run."*
2. Aaron's Otto-161 directive: *"we can enable mac
   everywhere now, since its no cost for open source
   projects if you are absoutly sure."*

Otto-164 verification attempted to resolve the
contradiction but found genuine doc ambiguity (macOS-14
classified as a standard runner per
`about-github-hosted-runners`, but the billing page lists
macOS at $0.062/min in the same table as Linux/Windows
without marking that rate public-repo-private-only). So
Otto-164 declined the "everywhere" enablement and
preserved fork-only gating.

This proposal offers a **third path**: keep PR gate
Linux-only (unambiguously free), add a **nightly
cross-platform sweep** workflow that exercises macOS +
Windows on a cron schedule. This inverts the cost risk —
even in the worst case where docs are wrong and macOS is
billed on public repos, nightly cadence caps exposure at
~$30/month/repo instead of scaling with PR activity.

## 2. Cost model (transparent)

Four billing scenarios, capped worst-case assumed:

| Runner        | Public-repo (best case) | Public-repo (worst case) | Private-repo rate |
|---------------|-------------------------|--------------------------|-------------------|
| `ubuntu-22.04` | Free                    | Free                     | $0.002–0.006/min (1× multiplier) |
| `windows-latest` | Free (standard runner) | Free                    | $0.010/min (2× multiplier) |
| `macos-14`    | **Free (if standard)**  | **$0.062/min (if billed)** | $0.062/min (10× multiplier) |

Under the "worst case" interpretation (macOS billed on
public):

- PR-gate matrix (every PR × macOS leg): ~10-15 min ×
  $0.062 × N-PRs-per-day — unbounded cost scaling. **Bad.**
- Nightly matrix (once per 24h × macOS leg): ~10-15 min ×
  $0.062 = ~$0.93/day = **~$28/month/repo**. Predictable.

Under best case (macOS standard-runner-free-for-public):
both scenarios cost $0. Nightly still preferable because
fewer total CI minutes consumed overall.

**Asymmetric conclusion:** nightly cadence wins either way.
The workflow ships the "expensive interpretation is
possible" hedge without paying for it in the "free
interpretation is correct" universe.

## 3. Workflow design

```text
.github/workflows/nightly-cross-platform.yml
```

```yaml
name: nightly-cross-platform

# Cross-platform build confidence on a daily cadence.
# PR-gate workflow (gate.yml) stays Linux-only — unambiguously
# free on public repos. This workflow adds Windows + macOS
# coverage at controlled cost.
#
# Cost model (Otto-166 design):
#   - windows-latest: standard runner, free on public repos
#   - macos-14: ambiguous per docs (standard by type;
#     billed per pricing table). Worst-case ~$28/month per
#     repo under this cadence (15 min * $0.062 * 30 days).
#     Best-case $0. Either way, cadence caps exposure.
#
# Rollback path: delete macos-14 from the matrix, leave
# windows-latest. One-line revert.
#
# Safe-pattern compliance (FACTORY-HYGIENE row #43):
#   - SHA-pinned action versions.
#   - Explicit minimal permissions.
#   - concurrency group + cancel-in-progress: true (nightly
#     only; cancelling in-progress run on re-trigger is safe).
#   - runs-on pinned per matrix leg, not -latest aliases, so
#     behavior is stable across GitHub runner rotations.

on:
  schedule:
    - cron: '0 9 * * *'  # 09:00 UTC daily (off the hour)
  workflow_dispatch:      # manual trigger for on-demand runs
  pull_request:
    paths:
      - '.github/workflows/nightly-cross-platform.yml'
    # ^ only run on PR when this workflow itself changes;
    #   prevents arbitrary PRs from burning the cross-
    #   platform budget.

permissions:
  contents: read

concurrency:
  group: nightly-cross-platform-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-and-test:
    name: build-and-test (${{ matrix.os }})
    timeout-minutes: 60
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-22.04, windows-2022, macos-14]
    runs-on: ${{ matrix.os }}
    steps:
      - name: Checkout
        uses: actions/checkout@<SHA-pin>  # resolve to 11bd71901bbe... at landing time
        with:
          fetch-depth: 1

      - name: Setup .NET
        uses: actions/setup-dotnet@<SHA-pin>
        with:
          dotnet-version: '10.0.x'

      - name: Build
        run: dotnet build -c Release /warnaserror

      - name: Test
        run: dotnet test Zeta.sln -c Release --no-build --logger "trx;LogFileName=test-results-${{ matrix.os }}.trx"

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@<SHA-pin>
        with:
          name: test-results-${{ matrix.os }}
          path: '**/test-results-*.trx'
          retention-days: 7
```

Notable design choices:

- **`cron: '0 9 * * *'`** — 09:00 UTC daily. Deliberately
  not midnight (`0 0 * * *`) because GitHub's scheduler
  sees a stampede of jobs at round-hour times; 09:00 UTC
  also aligns with early-morning US-East times for
  investigation-friendly alert timing.
- **`workflow_dispatch`** — manual trigger for on-demand
  verification without waiting for the nightly tick.
- **`pull_request` path filter** — workflow only runs on
  PRs that touch the workflow file itself. Prevents
  arbitrary PRs from triggering the cross-platform matrix
  and burning the budget.
- **`concurrency: cancel-in-progress: true`** — if two
  scheduled runs queue up (e.g. nightly + manual dispatch
  within minutes), the older one is cancelled. Opposite
  of PR-gate's `cancel-in-progress: false` because PR
  runs must complete for merge decisions; nightly runs
  can safely be superseded.
- **`timeout-minutes: 60`** — macOS is ~2× slower than
  Linux for .NET builds; 60 min headroom.
- **Test results as artifacts** — 7-day retention.
  Consumed by follow-up workflows (e.g. a weekly
  digest emitter) or manually fetched for triage.
- **No auto-alerting** — first cut is observation-only.
  If a cross-platform regression lands, the nightly run
  fails quietly and the next PR-author / weekly-triage
  sweeper notices. Alerting can be added later (a
  workflow that opens an issue on red).

## 4. Not included (deliberately)

- **No `issues: write` permission.** First version is
  observation-only; issue-opening on red is a later
  enhancement.
- **No CodeQL / Semgrep legs.** The `gate.yml` PR-gate
  runs those on Linux; cross-platform coverage for
  static analysis is unnecessary (the tools run on
  one host and analyse source-independent-of-target-
  platform).
- **No submit-nuget / markdown-lint legs.** Those are
  PR-gate concerns, not cross-platform concerns.
- **No matrix branch for `windows-2019` or
  `macos-13`.** Older-OS support can be added when
  someone requests it; first cut is current-supported-
  OS-only.
- **No Linux-arm64 leg.** Additive later if we need
  arm64 validation; first cut is x64-only to keep the
  matrix small.

## 5. Rollback paths

- **Pure cost rollback:** delete `macos-14` from the
  matrix, leaving `ubuntu-22.04` + `windows-2022`. One-
  line diff, zero-risk.
- **Full disable rollback:** delete or rename the
  workflow file (GitHub stops scheduling it).
  Scheduled-trigger history is preserved in the Actions
  tab.
- **Permanent disable via deletion:** factory-hygiene
  row #51's detect-only cross-platform audit continues
  functioning as before; removal of this workflow does
  not leave the factory in a worse state than Otto-166.

## 6. Interaction with `gate.yml`

No change to `gate.yml`. PR gate stays
`ubuntu-22.04`-only. The nightly workflow is **additive**,
not replacement.

`gate.yml` line 77 conditional matrix expression (the
`github.repository ==` gating) remains correct under
this proposal:

- On canonical repo: PR-gate matrix = `[ubuntu-22.04]`
  (free); nightly matrix = `[ubuntu-22.04, windows-2022,
  macos-14]` (free + free + uncertain).
- On contributor forks: PR-gate matrix already includes
  `macos-14` per the existing fallthrough; nightly
  workflow runs on the fork too, which may result in
  billing against the fork owner's personal plan minutes.
  **Consideration:** consider adding
  `if: github.repository == 'Lucent-Financial-Group/Zeta'`
  to the nightly job to prevent the cron from firing on
  every fork. See §7.

## 7. Fork scoping

Scheduled workflows fire on every fork of the repo by
default. For contributor forks, that's not desirable —
the fork owner's personal account would burn minutes on
our nightly cadence without consent. Mitigation:

```yaml
jobs:
  build-and-test:
    if: github.repository == 'Lucent-Financial-Group/Zeta' || github.event_name == 'workflow_dispatch' || github.event_name == 'pull_request'
    ...
```

This evaluates true on:

- Canonical repo (any trigger)
- Any repo under manual dispatch (forks can opt in)
- Any repo under PR trigger to the workflow file
  (changes to the workflow itself get tested)

And false on:

- Scheduled trigger when run in a fork (skipped)

One line; keeps the same workflow file byte-identical
everywhere; runtime gates the scheduled firing.

## 8. Apply to `lucent-ksk` too

Aaron Otto-140 rewrite authority + Otto-161 / Otto-165
same-policy-applies directives: when this lands on Zeta,
a parallel PR lands on `Lucent-Financial-Group/lucent-ksk`
with the identical workflow. Cross-repo coordination
expectations:

- Same workflow file shape (byte-identical if possible;
  repo-name substitution on the `if:` gate).
- Same cron time (`0 9 * * *`) so both repos' nightly
  runs land in the same operational window.
- Max attribution preserved per Otto-77 / Otto-140 in
  commit message.

## 9. Phased rollout

- **Phase 0 (now):** this design doc, no workflow file.
- **Phase 1:** Aaron signs off (or explicitly declines)
  on the cost tradeoff + fork-scoping choice.
- **Phase 2 (on sign-off):** land the workflow on Zeta
  with macOS in the matrix. First nightly run fires next
  day.
- **Phase 3:** observe first 7 nightly runs. If macOS
  leg reveals real cross-platform bugs, the ~$28/month
  worst-case cost is paid-for. If no divergence, consider
  dropping `macos-14` from the matrix at Phase 4.
- **Phase 4 (decision point after 30 days):**
  - If useful signal: land same workflow on
    `lucent-ksk`.
  - If low signal + worst-case billing holding: drop
    macOS from matrix; keep Windows.
  - If best-case billing confirmed (no bill seen): expand
    matrix to include more permutations (macos-13,
    windows-2019).

## 10. Cross-references

- `docs/FACTORY-HYGIENE.md` row #51 — cross-platform
  parity audit. This workflow is what unblocks the
  "Enforcement deferred" language toward `--enforce`
  mode.
- `docs/BACKLOG.md` row (line ~2471) — Otto-161 macOS
  enablement row, struck through after Otto-164
  verification. This workflow is the alternative path
  that doesn't require the directive resolution.
- `docs/research/test-classification.md` (PR #339) —
  category-3 statistical smoke tests also live on
  nightly; this workflow could be the home for those
  when they graduate.
- `.github/workflows/gate.yml` — PR-gate workflow;
  untouched by this proposal.
- `memory/feedback_ksk_naming_unblocked_aaron_directed_
  rewrite_authority_max_initial_starting_point_2026_04_24
  .md` (Otto-140) — the rewrite authority that makes
  the parallel `lucent-ksk` landing tractable without
  Max pre-coord.
- Otto-164 memory trace — the verification round that
  motivated this third-path design.

## 11. What this doc does NOT do

- Does **not** ship the workflow file. Pure design; Phase
  2 lands the YAML after sign-off.
- Does **not** touch `gate.yml`. PR-gate stays
  unambiguous.
- Does **not** enable macOS enforcement in the FACTORY-
  HYGIENE audit. Enforcement mode switch is a separate
  follow-up once green across the matrix for N
  consecutive runs.
- Does **not** resolve the docs ambiguity about macOS
  billing. If the ambiguity resolves either way later,
  this design still holds (nightly cadence works best-
  case and worst-case alike).
- Does **not** obligate landing on `lucent-ksk`
  simultaneously. Phase 4 gates that on observed signal
  from Zeta first.
- Does **not** adopt a specific monthly-cost cap as a
  binding factory rule. The ~$28/month/repo worst case
  is a planning number, not a committed spend; Aaron's
  direction on budget discipline remains authoritative.
