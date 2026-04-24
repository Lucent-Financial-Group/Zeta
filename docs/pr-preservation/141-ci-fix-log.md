# PR #141 CI fix log

CI-only fix pass applied 2026-04-24 to unblock merge on
`feat/servicetitan-crm-demo` (PR #141, "samples: CrmKernel —
retraction-native algebraic kernel demo"). Zero unresolved
review threads at start; only CI checks were red. No review
re-drain, no scope change to the PR's substantive diff.

## Pre-fix state

- `mergeStateStatus`: `BLOCKED`.
- `state`: `OPEN` (branch one commit behind `origin/main`;
  rebase clean, no conflicts).
- Check results (per `gh pr checks 141`):
  - `lint (markdownlint)` — FAIL
  - `check memory/MEMORY.md paired edit` — FAIL
  - Everything else green (`build-and-test (ubuntu-22.04)`,
    `lint (actionlint)`, `lint (no empty dirs)`,
    `lint (semgrep)`, `lint (shellcheck)`,
    `lint memory/MEMORY.md reference-existence`,
    `Path gate`, `Analyze (csharp)`, `Analyze (actions)`,
    `submit-nuget`).

## Per-failure record

### Failure 1 — `lint (markdownlint)`

**Run:** GitHub Actions run `24902734336`, job
`72924293173`.

**Violations reported:**

```
docs/hygiene-history/loop-tick-history.md:175:2974
  MD056/table-column-count
  Table column count [Expected: 6; Actual: 4;
                      Too few cells, row will be missing data]
docs/hygiene-history/loop-tick-history.md:176:2028
  MD056/table-column-count
  Table column count [Expected: 6; Actual: 4;
                      Too few cells, row will be missing data]
```

**Root cause:** The tick-history table schema is 6 columns
(`date | agent | cron-id | action-summary | commit-or-link |
notes`). The auto-loop-44 and auto-loop-45 rows authored in
this PR packed `commit-or-link` and `notes` content into the
`action-summary` mega-cell, leaving only 4 pipe-separated
fields per row.

**Fix applied:** Split each offending row into the full
6-column shape. Commit-or-link fields cite pre-tick
`acb9858` (SignalQuality + /btw landing) for row 175 and the
PR branch name for row 176; notes fields summarize the
bilateral-verbatim-anchor discipline (auto-loop-44) and
speculative-work known-gap-fix tier (auto-loop-45).

Append-only discipline (Otto-229) honoured: no existing
prior row was edited; the fix is a structural completion of
rows *introduced by this PR*, not a rewrite of rows
previously landed on `main`.

**Verification:**

```bash
npx markdownlint-cli2@0.18.1 "**/*.md"
# exit=0
```

### Failure 2 — `check memory/MEMORY.md paired edit`

**Run:** GitHub Actions run `24902734259`, job
`72924292873`.

**Violations reported:** Five new `memory/**.md` files landed
on the PR branch without corresponding `memory/MEMORY.md`
index entries:

- `memory/observed-phenomena/2026-04-19-transcript-duplication-splitbrain-hypothesis.md`
- `memory/project_aaron_drop_zone_protocol_2026_04_22.md`
- `memory/project_arc3_adversarial_self_play_emulator_absorption_scoring_2026_04_22.md`
- `memory/project_operator_input_quality_log_directive_2026_04_22.md`
- `memory/project_reproducible_stability_as_obvious_purpose_2026_04_22.md`

The NSA-001 canonical incident (see
`docs/hygiene-history/nsa-test-history.md`) is exactly this
shape: memory-file-landed-without-pointer is undiscoverable
by future cold-start sessions.

**Fix applied:** Added five newest-first index entries to
`memory/MEMORY.md`, inserted immediately after the
`📌 Fast path` header paragraph. Each entry follows the
existing one-line-under-~200-chars bolded-description pattern
with bracketed link, path target, em-dash separator, and
short prose follow-up describing composition with prior
memories.

Order of new entries (newest-first within the 2026-04-22
auto-loop-43/44/45 tick cluster):

1. `observed-phenomena/2026-04-19-transcript-duplication-splitbrain-hypothesis.md`
2. `project_aaron_drop_zone_protocol_2026_04_22.md`
3. `project_arc3_adversarial_self_play_emulator_absorption_scoring_2026_04_22.md`
4. `project_operator_input_quality_log_directive_2026_04_22.md`
5. `project_reproducible_stability_as_obvious_purpose_2026_04_22.md`

**Verification:** Full-repo markdownlint still clean after
the MEMORY.md edit (`exit=0`); the
`paired-edit` check will pass on next CI run because all
five file paths now appear in MEMORY.md.

## Build gate

`dotnet build -c Release` on the rebased branch:

- First run: FAIL — `Feldera.Bench` SIGSEGV (exit code 139).
  Known Otto-248 flake; not reproducible across runs.
- Retry: `0 Warning(s), 0 Error(s)` — PASS.

## Constraints honoured

- Only `.md` files in the PR's diff plus `memory/MEMORY.md`
  (plus this log, plus the new `docs/pr-preservation/`
  directory creation) were touched.
- No new PRs opened.
- No merge (`gh pr merge`) invoked.
- No `docs/BACKLOG.md` edits.
- No symlinks (Otto-244).
- No review threads touched (0 unresolved before; 0 after).
- Append-only discipline honoured on tick-history: no
  previously-landed-on-`main` row was edited; the fix was
  restricted to structurally-incomplete rows introduced by
  this PR itself.

## Post-fix expectation

On push:

- `lint (markdownlint)` → PASS
- `check memory/MEMORY.md paired edit` → PASS
- `mergeStateStatus` → `CLEAN` (pending CI re-run)

Auto-merge is already armed on this PR per Otto-224
discipline; CI clearance should flip the state and land the
merge without manual intervention.
