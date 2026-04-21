# `round-44-speculative` landing plan — 2026-04-22

**Purpose.** The `round-44-speculative` branch carries 201
commits beyond `main`: 96 file deltas (36 new + 60 modified)
representing real speculative work accumulated during the
wait-on-build + never-idle pattern. This doc is the landing
plan — a way to drain the speculative branch into `main`
as a sequence of small, independent PRs rather than one
megamerge.

`★ Insight ─────────────────────────────────────`
Cherry-pick-empty is the authoritative signal for "already
landed via squash-merge upstream": a speculative commit whose
changes are already reflected in `main`'s current state
cherry-picks to an empty diff. Confirmed by attempting to
cherry-pick `54aec4f` (Viktor P0-3) to a fresh branch off main
— the cherry-pick came back empty, matching the on-main state.
Landing plan uses `git diff main..round-44-speculative`
directly (file-level) rather than walking commits one by one,
because the question is "what final state changes" rather
than "what commit history survives".
`─────────────────────────────────────────────────`

## Why not one mega-PR

- **Review cost.** A 96-file PR drowns Aaron / advisory
  reviewers; findings can't be tracked per-concern.
- **Rollback granularity.** If one CI regression shows up,
  bisecting across 96 files takes longer than landing six
  6-to-16-file PRs in sequence would have taken in the first
  place.
- **Merge-conflict surface.** A long-running branch of 96
  files is a rebase-bomb; keeping changes small and frequent
  honours the merge-queue-as-structural-fix insight
  (`feedback_merge_queue_structural_fix_for_parallel_pr_rebase_cost.md`).
- **Auditability.** Each batch lands with a commit message
  that pairs cause (which memory / Aaron directive) to
  effect (what changed).

## Blocker — HB-001

Opening multiple PRs serially against `main` today triggers
exactly the rebase-tax Aaron's merge-queue insight was
designed to eliminate. **Don't open new PRs until either (a)
HB-001 resolves (merge queue on), or (b) the previous PR
auto-merges cleanly.** Batch 1 can ship immediately once PR
\#42 merges; subsequent batches ship serially until the queue
is on, then in parallel after that.

## Total delta summary

```
git diff --stat main..round-44-speculative
  98 files changed, 9782 insertions(+), 862 deletions(-)
```

- **36 net-new files** — additive-only, lowest risk.
- **60 modified files** — highest coordination cost.
- Known-landed-upstream: `.github/workflows/gate.yml` +
  `.github/workflows/codeql.yml` (merge_group trigger)
  already shipped via PR #41.

## Landing batches (6 PRs)

### Batch 1 — Research-doc backfill (S, 11 new + 9 modified)

**Scope:** pure research documents under `docs/research/`.
No CI surface, no build impact, no public-API effect.
Fastest to ship; establishes the landing pattern.

**New files (11):**

- `docs/research/attracting-ai-contributors-2026-04-22.md`
- `docs/research/cadence-history-audit-2026-04-22.md`
- `docs/research/cluster-algebra-absorb-2026-04-22.md`
- `docs/research/crystallization-ledger.md`
- `docs/research/crystallization-loop.md`
- `docs/research/github-models-factory-integration.md`
- `docs/research/imperfect-enforcement-hygiene-audit.md`
- `docs/research/missing-hygiene-class-scan-2026-04-22.md`
- `docs/research/residual-gap-scan-2026-04-22.md`
- `docs/research/vuln-and-dep-scanner-landscape-2026-04-22.md`
- `docs/research/worktree-pattern-for-live-loop-prevention-2026-04-22.md`

**Modified files (9):**

- `docs/research/ai-trust-gaps-in-human-custodied-data.md`
- `docs/research/dao-factory-org-design-spike.md`
- `docs/research/dbt-integration-for-zeta.md`
- `docs/research/event-storming-evaluation.md`
- `docs/research/memory-role-restructure-plan-2026-04-21.md`
- `docs/research/meta-wins-log.md`
- `docs/research/openspec-coverage-audit-2026-04-21.md`
- `docs/research/parallel-worktree-safety-2026-04-22.md`
  (already has Round-44 content; PR-42 is another edit to it)
- `docs/research/skill-edit-gating-tiers.md`

**Cherry-pick strategy:** `git checkout main && git
checkout -b land-research-backfill && git checkout
round-44-speculative -- docs/research/`. Single commit
with per-file rationale.

**Expected conflict:** `parallel-worktree-safety-2026-04-22.md`
may collide with PR #42 which also edits it. Resolve by
taking PR-42's §10.3 correction + speculative's other
sections.

**CI risk:** markdownlint + semgrep only. Neither has
historical false positives on research-doc commits.

---

### Batch 2 — Security / CI safe-patterns (M, 5 new + 3 modified)

**Scope:** GitHub Actions safe-patterns + supply-chain
documentation + the two workflows that implement them
(`resume-diff` + `scorecard`). Medium-risk because workflow
files are CI surface.

**New files (5):**

- `.github/workflows/resume-diff.yml` (166 lines)
- `.github/workflows/scorecard.yml`
- `docs/security/GITHUB-ACTIONS-SAFE-PATTERNS.md`
- `docs/security/SUPPLY-CHAIN-SAFE-PATTERNS.md`

**Modified files (3):**

- `docs/security/INCIDENT-PLAYBOOK.md`
- `.semgrep.yml` (GHA inline-untrusted-in-run rule per
  commit `1748934`)
- `.github/dependabot.yml`

**Cherry-pick strategy:** `git checkout main && git
checkout -b land-security-safe-patterns`; cherry-pick
`c82030d` (resume-diff + GHA safe-patterns) first, then
`1748934` (Semgrep rule), then apply remaining
dependabot/scorecard changes as a squash commit.

**Expected conflict:** none — `.semgrep.yml` is append-only
per the project convention.

**CI risk:** `actionlint` + `shellcheck` gates will exercise
the new workflow files. Per `c82030d` commit message:
*"actionlint clean"* was verified at authoring time; re-run
locally before push.

---

### Batch 3 — Hygiene audit automation (M, 10 new + 2 modified)

**Scope:** four new audit scripts + six hygiene-history
files + `FACTORY-HYGIENE.md` rows 40-49. Paired with
`POST-SETUP-SCRIPT-STACK.md` as the decision document.

**New files (10):**

- `tools/hygiene/audit-cross-platform-parity.sh`
- `tools/hygiene/audit-missing-prevention-layers.sh`
- `tools/hygiene/audit-post-setup-script-stack.sh`
- `tools/hygiene/audit-tick-history-bounded-growth.sh`
- `docs/POST-SETUP-SCRIPT-STACK.md`
- `docs/hygiene-history/cross-platform-parity-history.md`
- `docs/hygiene-history/issue-triage-history.md`
- `docs/hygiene-history/loop-tick-history.md`
- `docs/hygiene-history/pr-triage-history.md`
- `docs/hygiene-history/prevention-layer-classification.md`
- `docs/hygiene-history/tick-history-bounded-growth-history.md`

**Modified files (2):**

- `docs/FACTORY-HYGIENE.md` (rows 40-49)
- `docs/FACTORY-METHODOLOGIES.md`

**Cherry-pick strategy:** cherry-pick the eight relevant
"Round 44: tick-history …" + "Round 44: FACTORY-HYGIENE
\#…" commits sequentially; squash on PR.

**Expected conflict:** `FACTORY-HYGIENE.md` row numbers may
skew if upstream added rows in the meantime; renumber
during the squash.

**CI risk:** `shellcheck` on the four new bash scripts.
Shellcheck failures are fixable in-place.

---

### Batch 4 — GitHub surfaces + issue workflow (S, 6 new + 1 modified)

**Scope:** the full "GitHub surfaces" absorb —
`github-surface-triage` skill, issue templates, agent issue
workflow docs. Independent story.

**New files (6):**

- `.claude/skills/github-surface-triage/SKILL.md`
- `.github/ISSUE_TEMPLATE/backlog_item.md`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/human_ask.md`
- `docs/AGENT-GITHUB-SURFACES.md`
- `docs/AGENT-ISSUE-WORKFLOW.md`

**Modified files (1):**

- `.github/ISSUE_TEMPLATE/bug_report.md`

**Cherry-pick strategy:** identify the GitHub-surfaces
commit(s) and cherry-pick as a single-author batch; if the
skill file was authored through `skill-creator`, preserve
the authoring metadata.

**Expected conflict:** none.

**CI risk:** markdownlint on the three issue templates.

---

### Batch 5 — BACKLOG-per-row-file ADR draft (S, 1 new)

**Scope:** solo landing of the per-row-file ADR draft so
Aaron can review + decide on the four open questions out-of-
band. Treats the ADR as **Proposed** per ADR lifecycle.

**New files (1):**

- `docs/DECISIONS/2026-04-22-backlog-per-row-file-restructure.md`

**Cherry-pick strategy:** `git cherry-pick 9f31cb6`. File
HB-002 simultaneously for Aaron's decision on the four open
questions (ID scheme / script home / sort order /
concurrent-migration trade).

**Expected conflict:** none.

**CI risk:** markdownlint only.

**Follow-up:** HB-002 resolution → migration-implementation
PR (P0 per the ADR, scheduled for post-R45).

---

### Batch 6 — Core repo surfaces (L, 0 new + ~30 modified)

**Scope:** the "everything else" bucket —
`AGENTS.md` / `CLAUDE.md` / `docs/BACKLOG.md` /
`docs/ROUND-HISTORY.md` / `docs/VISION.md` / `docs/WONT-DO.md`
/ `docs/CONFLICT-RESOLUTION.md` + the TECH-DEBT /
FACTORY-RESUME / HARNESS-SURFACES tier. These are the
highest coordination-cost edits; hold until last.

**Modified files (≈30):**

- All `docs/*.md` files in the modified list not covered
  above.
- `AGENTS.md`, `CLAUDE.md` (be very careful —
  `CLAUDE.md` is 100%-loaded per wake).
- `docs/BACKLOG.md`, `docs/ROUND-HISTORY.md` (largest,
  will need patience reviewing).
- All `.claude/skills/*/SKILL.md` modifications (≈12 files).

**Cherry-pick strategy:** split this batch further into
three sub-PRs once the earlier batches land and we see how
`main`'s state has drifted:

- **6a.** Skill tune-ups (`.claude/skills/*/SKILL.md` ×12)
  as a single "Round 44 skill tune-up absorb" PR. Each
  edit must show `skill-creator` discipline (GOVERNANCE.md
  §4).
- **6b.** Factory-level docs (`FACTORY-*.md`, `TECH-DEBT.md`,
  `INTENTIONAL-DEBT.md`, `VISION.md`, `WONT-DO.md`,
  `CONFLICT-RESOLUTION.md`).
- **6c.** Anchor docs (`AGENTS.md`, `CLAUDE.md`,
  `docs/ROUND-HISTORY.md`) — last and most carefully.

**Expected conflict:** high — every doc has had edits on
`main` in the round; resolve in favour of `main`'s
current state + apply speculative delta as new additions.

**CI risk:** `markdownlint` gate, possibly CLAUDE.md lint
hooks.

## Sequence + blockers

```
HB-001 resolves (merge queue on)
      │
      ▼
Batch 1 (research-doc backfill) ───────────┐
                                            │
Batch 2 (CI safe-patterns)    ─── serial ───┤   once merge
Batch 3 (hygiene automation)  ─── serial ───┤  queue is on,
Batch 4 (GitHub surfaces)     ─── serial ───┤  these can run
Batch 5 (BACKLOG ADR draft)   ─── serial ───┤  in parallel
Batch 6 (core repo)           ─── serial ───┘
```

Sub-batches 6a/6b/6c must land in order even after merge
queue is on, because they touch overlapping files.

## Per-batch sizing

| Batch | Effort | Files | LoC (est.) | Risk |
|---|---|---|---|---|
| 1 | S | 20 | 2000-3000 | low |
| 2 | M | 8 | 500-800 | med |
| 3 | M | 12 | 1500-2000 | med |
| 4 | S | 7 | 400-600 | low |
| 5 | S | 1 | 288 | low |
| 6a | M | 12 | 1000-2000 | med |
| 6b | L | 10 | 1500-3000 | high |
| 6c | L | 3 | 500-1000 | high |

Totals match the 9782 insertions + 862 deletions observed
in the full diff, modulo overlaps with already-landed
content.

## What this plan does NOT do

- **Does not rebase or rewrite history on
  `round-44-speculative`.** The branch stays as the audit
  artifact; landing happens via fresh branches off main.
- **Does not speculate on which commits are genuine vs.
  duplicate.** Cherry-pick-empty is the per-commit
  authority; operate on file-level state instead.
- **Does not commit-squash unrelated work.** Each batch
  has a single story.
- **Does not touch merge-queue state.** HB-001 is Aaron's;
  landing plan works with or without the queue.

## Meta-win

This landing plan is itself a meta-win pattern:
*speculative work accumulated during wait-on-build, the
landing plan drains it into main when builds clear*. The
plan doc lives under `docs/research/` so it survives the
speculative branch being pruned after all batches land.
Parallel to `meta-wins-log.md` but for landable-work-items
rather than factory-improvement insights.

## References

- `feedback_merge_queue_structural_fix_for_parallel_pr_rebase_cost.md`
  — why not to open multiple PRs serially before HB-001
- `feedback_never_idle_speculative_work_over_waiting.md`
  — CLAUDE.md-load rule the speculative work followed
- `feedback_live_loop_detector_speculative_on_pr_branch.md`
  — why speculative work lives on its own branch
- `HB-001` in `docs/HUMAN-BACKLOG.md` — the blocker
- PR #42 — the PR whose auto-merge unblocks Batch 1
