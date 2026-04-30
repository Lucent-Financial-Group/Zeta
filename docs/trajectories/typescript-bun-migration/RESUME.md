# Trajectory — TypeScript / Bun migration

**Status**: Active (Lane B first artifact)
**Milestone**: First two non-AI/ML Python hygiene scripts ported to TypeScript on Bun (PR #849, commit `40344c9`).
**Current blocker**: None. CodeQL host-ownership noise diagnosed in `docs/trajectories/ci-codeql-host-ownership/INVESTIGATION.md` (linked-from-here as the #849 blocker record, not the trajectory itself).
**Next concrete action**: Pick a coherent next slice from the "should become TypeScript" classification below and open a single PR.
**Last updated**: 2026-04-29

## Why this trajectory exists

Per B-0086 + maintainer-channel input 2026-04-29: TypeScript on Bun is the factory's default scripting language going forward. The migration is incremental — one coherent slice at a time, each PR a measurable increment.

Per the maintainer-channel correction via the multi-AI review surface (2026-04-29): this is the trajectory the maintainer cares about. The CodeQL host-ownership investigation was the *blocker*, not the trajectory.

> *Carved: CodeQL was the blocker. TypeScript/Bun is the trajectory.*

## Landed slices

| PR | Date | Files | Status |
|---|---|---|---|
| [#849](https://github.com/Lucent-Financial-Group/Zeta/pull/849) | 2026-04-29 (commit `40344c9`) | `tools/hygiene/sort-tick-history-canonical.{py→ts}`, `tools/hygiene/fix-markdown-md032-md026.{py→ts}` | Merged |
| Lane B slice 1 | 2026-04-29 | `tools/hygiene/audit-md032-plus-linestart.{sh→ts}`, `tools/hygiene/audit-memory-index-duplicates.{sh→ts}`, `tools/hygiene/audit-memory-references.{sh→ts}` | In flight |

## Inventory — Python (tools/, Zeta-authored)

**Status: 0 remaining.**

After PR #849, Zeta has zero Python files in `tools/` (Zeta-authored — the 22 `.py` files under `tools/lean4/.lake/packages/mathlib/scripts/` are mathlib upstream, not in scope). Python→TS in `tools/` is **100% complete**.

## Inventory — Bash (tools/, Zeta-authored, 56 files)

Three buckets per the multi-AI review surface's classification ask. Count is repo-derived and stable: `git ls-files tools/ | grep '\.sh$' | wc -l` returns 56.

### Bucket A — Should stay Bash (14 files)

These run **before** Bun is installed (post-install scripts can use Bun; pre-install scripts cannot). Per Otto-235 4-shell portability target (macOS bash 3.2 / Ubuntu / git-bash / WSL), these are the bootstrap layer.

```text
tools/setup/install.sh
tools/setup/doctor.sh
tools/setup/linux.sh
tools/setup/macos.sh
tools/setup/common/curl-fetch.sh
tools/setup/common/dotnet-tools.sh
tools/setup/common/elan.sh
tools/setup/common/mise.sh
tools/setup/common/profile-edit.sh
tools/setup/common/python-tools.sh
tools/setup/common/shellenv.sh
tools/setup/common/sync-upstreams.sh
tools/setup/common/verifiers.sh
tools/profile.sh
```

Rationale: TS/Bun is itself one of the things `install.sh` installs. These scripts cannot depend on Bun.

### Bucket B — Should become TypeScript (39 files)

Post-install scripts that operate on the repo (lints, audits, hygiene checks, peer-call wrappers, budget reports, git ops). Same shape as the two scripts ported in #849.

```text
tools/alignment/audit_archive_headers.sh
tools/alignment/audit_commit.sh
tools/alignment/audit_personas.sh
tools/alignment/audit_skills.sh
tools/alignment/citations.sh
tools/audit-packages.sh
tools/audit/live-lock-audit.sh
tools/backlog/generate-index.sh
tools/budget/daily-cost-report.sh
tools/budget/project-runway.sh
tools/budget/snapshot-burn.sh
tools/git/batch-resolve-pr-threads.sh
tools/git/push-with-retry.sh
tools/hygiene/append-tick-history-row.sh
tools/hygiene/audit-agencysignature-main-tip.sh
tools/hygiene/audit-cross-platform-parity.sh
tools/hygiene/audit-git-hotspots.sh
tools/hygiene/audit-machine-specific-content.sh
tools/hygiene/audit-md032-plus-linestart.sh
tools/hygiene/audit-memory-index-duplicates.sh
tools/hygiene/audit-memory-references.sh
tools/hygiene/audit-missing-prevention-layers.sh
tools/hygiene/audit-post-setup-script-stack.sh
tools/hygiene/audit-tick-history-bounded-growth.sh
tools/hygiene/capture-tick-snapshot.sh
tools/hygiene/check-archive-header-section33.sh
tools/hygiene/check-no-conflict-markers.sh
tools/hygiene/check-tick-history-order.sh
tools/hygiene/counterweight-audit.sh
tools/hygiene/validate-agencysignature-pr-body.sh
tools/lint/doc-comment-history-audit.sh
tools/lint/no-directives-otto-prose.sh
tools/lint/no-empty-dirs.sh
tools/lint/runner-version-freshness.sh
tools/peer-call/codex.sh
tools/peer-call/gemini.sh
tools/peer-call/grok.sh
tools/pr-preservation/archive-pr.sh
tools/skill-catalog/backfill_dv2_frontmatter.sh
```

Rationale: type safety, structured error handling, easier testing, jq/awk/grep replaced by JS object operations, gh CLI shell-out replaced by Octokit when valuable.

### Bucket C — Needs human decision (3 files)

```text
tools/hygiene/check-github-settings-drift.sh
tools/hygiene/snapshot-github-settings.sh
```

Rationale: these scripts use `gh api` heavily. Going TS could mean either (a) stay shell-out wrappers (TS shells to gh), or (b) switch to Octokit / @octokit/rest with proper typed responses. Each direction has tradeoffs (debug-ability vs type-safety). Maintainer call.

```text
tools/lint/safety-clause-audit.sh
```

Rationale: borderline — depends on whether the lint can be expressed as cleanly in TS as it currently is in shell. Worth a small comparison before committing the port.

## Recommended next slice

**Slice candidate (3 files, coherent unit)**: same-shape ports as #849 — markdown / memory hygiene auditors that walk the repo and emit findings.

```text
tools/hygiene/audit-md032-plus-linestart.sh
tools/hygiene/audit-memory-index-duplicates.sh
tools/hygiene/audit-memory-references.sh
```

Estimated complexity: **Small (S)** — under a day. Each is a self-contained file walker emitting structured findings. The ports follow the established pattern from #849 (Bun runtime, TS strict mode, lint-clean, equivalence-verified against the bash original via golden-file fixtures).

Why this slice:

- Same shape as #849 (audit + emit findings; no host mutation, no auth)
- Coherent cluster: all three are under `tools/hygiene/` and audit memory + markdown
- Three is small enough to PR-merge in one round; not so small that it's churn
- Demonstrates the pattern can scale beyond the first two ports
- Each has a checked-in shell version that can serve as a reference for equivalence testing

Alternative slice (skipping ahead to a different cluster):

```text
tools/budget/daily-cost-report.sh
tools/budget/project-runway.sh
tools/budget/snapshot-burn.sh
```

Coherent budget-report cluster; would advance task #287 (cost monitoring) in addition to the migration.

## Bun / tooling requirements

- `package.json` already declares `"packageManager": "bun@1.3.13"` and `"engines": { "bun": ">=1.3.13" }` (per PR #849)
- `bun.lock` is committed (per PR #849)
- `.mise.toml` pins `bun 1.3` for CI parity
- ESLint + markdownlint already configured for TS files
- `jiti` 2.6.1 was added in PR #849 as devDep; reused for future ports

## Per-slice audits (canonical sub-artifact)

Each slice produces a per-slice audit before merge: upstream-docs check + sibling-repo comparison + per-file code-pattern verification + explicit gap recording. The audits accumulate in:

- [`slice-audits.md`](slice-audits.md) — append per slice, never overwrite

The first slice (PR #866) sets the canonical pattern. Future slices follow the slice template at the bottom of `slice-audits.md`. **Audit happens before merge**, not after — once a slice merges, its pattern is set as canonical and subsequent slices pattern-match on it.

## Expert skill still needed (deferred to Lane C)

This audit is a one-off; it doesn't replace the per-tool/language expert + teaching skill (task #351). The skill would self-update on each TS/Bun release and teach the agent at port-time, not just serve as a static reference. The audit lineage above seeds that skill's knowledge base.

**Required**:

- A TS + Bun expert skill (`.claude/skills/`-shape) anchored to current upstream docs (per Otto-364 search-first authority)
- Best-practices map for the latest TS + Bun versions (live-search, not training-data)
- **Teaching role**: the skill transfers the best-practices into agent prose at port-time, not just serves as a static reference
- Composes with task #323 (per-tool/language expert skills — evidence-based + human-lineage-cited + ongoing-trajectory)

**Status**: deferred from this PR (no-fan-out during live lane). After #866 lands, the TS+Bun expert skill becomes a Lane C+ artifact or a sibling trajectory.

**Why this matters for the migration**: each future slice (~36 ports remaining in Bucket B) benefits from a current-docs anchor. Without it, ports drift toward whatever convention the most-recently-read TS file used; with it, ports converge on contemporary best practice.

## Operating notes (lane-discipline addendum)

These rules apply to this trajectory's execution and are recorded here per the locked discipline that minor lane-discipline additions land in the active lane artifact rather than as standalone doctrine packets.

**Assume stale until refreshed** (positive-frame upgrade landed mid-#866). Freshness is the ignition step, not a lane — not a question — not a permission gate. Before any mutating action on this trajectory, refresh the lane facts. Then act.

Seven-step scaffold:

1. **Assume stale.** Last-known state is presumed stale.
2. **Refresh.** Pull the freshness-check facts (per `Freshness check` section below).
3. **Validate scope.** Confirm RESUME's next slice still matches reality.
4. **Classify boundary.** Apply the four-item authority-boundary checklist below.
5. **Act.** Port / commit / push under standing authority.
6. **Verify.** Run targeted validation (lint, equivalence, narrow tests).
7. **Record.** Update RESUME's `Landed slices` table; surface deferred notes inside this artifact.

**Authority-boundary checklist** (step 4):

- no host mutation
- no destructive git operation
- no permission change
- no merge before CI / review / branch-protection requirements are satisfied

If all four are clean, proceed. The maintainer is not the lane-transition protocol.

### Freshness check (per-trajectory, run before mutation)

```text
git fetch origin main                           # main SHA current
gh pr list --state open                         # active PRs visible
gh pr view <self> --json statusCheckRollup      # in-flight CI state
gh api graphql {reviewThreads}                  # unresolved threads (self)
read RESUME.md                                  # next-slice line current
ls tools/hygiene/audit-*.{sh,ts}                # target files exist
```

If any source is unavailable or known-stale, surface that as a freshness gap rather than completing the pass silently.

**Tick-level vs pre-mutation refresh**: tick-level (per heartbeat) reads main SHA + active PR states + RESUME next-action — fast, low cost. Pre-mutation (before edit/commit/push) reads the full freshness check above. The split bounds upstream API load.

### Drift response (when refresh reveals divergence)

- **Halt-class drift** (pause for input): authority boundary crossed, target files unexpectedly removed/renamed, scope drifted from RESUME, branch protection changed.
- **Reconcile-class drift** (work in-place): CI failure on own PR, new review thread, CI flake, mergeable-state UNSTABLE on non-required check.

### Carved

- *Assume stale until refreshed.*
- *Freshness before mutation.*
- *Scope before action.*
- *Boundaries before escalation.*
- *Observation is how autonomy stays attached to reality.*

**Discipline bounds autonomous work; it does not replace autonomous work.** Trajectory-scoped standing authority is the safety. The trajectory exists to enable autonomous scoped work, not to create waiting gates. (Earlier "first action must be read-only" wording was self-defeating — it became a wait gate for trajectory-scoped code work it was supposed to enable. "Assume stale until refreshed" inverts the framing from permission-shaped to obligation-shaped: freshness precedes mutation rather than gating it.)

**Counts before percentages.** Track concrete counts and buckets before claiming progress as a percentage. Every percentage requires a defined denominator that is itself mechanically derivable. The Python inventory's "100% complete" is well-defined (denominator = 2 ports, both landed); future progress claims need the same standard.

**Closure summaries are factual, not meta-evaluative.** When closing a slice or lane, record what landed and what's next. Do not include review-surface health observations or self-evaluation paragraphs. The data is in the diff.

## Composes with

- `docs/trajectories/ci-codeql-host-ownership/INVESTIGATION.md` — #849 blocker record (linked here per the trajectory-naming correction)
- B-0086 backlog (TS+Bun default scripting language)
- Otto-235 (4-shell portability target — applies to Bucket A only)
- Task #341 (TS port + future git scripts: enforce 3-tier multi-remote design)
- Task #350 (Otto-357 mechanized auditor — when `tools/lint/no-directives-otto-prose.sh` ports to TS, scope expansion ships in same PR)

## Do not do next

- Do **not** port `tools/setup/*` to TS (Bucket A — would break bootstrap)
- Do **not** mass-port multiple clusters in one PR (small slices, each measurable)
- Do **not** open a new investigation lane during a port slice (lane discipline)
- Do **not** treat this RESUME as authoritative for the trajectory direction without maintainer review — it's a starter inventory, refinement expected
