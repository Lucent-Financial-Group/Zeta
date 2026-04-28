---
title: AceHack/LFG 0/0/0 Reconciliation — file-level classification
status: in-progress (calibration batch)
created: 2026-04-28
last_updated: 2026-04-28
---

# 0/0/0 Reconciliation — file-level classification

## Purpose

The terminal goal is **AceHack main = LFG main** (0 commits ahead, 0 commits behind), per
the topology invariant in `CLAUDE.md`.

Current state (2026-04-28T21:50Z):

```text
AceHack main vs LFG main:
  145 commits ahead (AceHack-only work)
  530 commits behind (LFG-only work)
  diverged
```

When folded to tree-level, the AceHack-only side reduces to **397 net new lines
across 23 files** (most divergence is on the LFG side; AceHack's commits mostly
overlap or get superseded by LFG's parallel work).

This document classifies each of the 23 files for 0/0/0 readiness.

## Primary-metric reframe (Amara 2026-04-28T22:08Z)

Initial framing: "classify 145 AceHack-only commits."

Calibration revealed: commit-count was the wrong primary metric. The
topology invariant for 0/0/0 is **tree-level equivalence**, not
commit-count parity. Tree-level diff revealed only 23 differing files;
calibration on 5 sampled files showed 5/5 ALREADY-COVERED.

**Updated operational frame**:

```text
Commit-count divergence is a warning signal (diagnostic only).
Tree-level diff is the working surface.
File-level substrate comparison is the reconciliation method.
Commit history is supporting evidence only when file-level comparison is ambiguous.
```

This is a Goodhart-relevant correction: do not optimize for reducing
scary commit-count divergence if the topology invariant is tree-level
equivalence.

## Classification rubric (Amara 2026-04-28T21:48Z + Claude.ai 22:05Z 5th bucket)

For each differing file's content:

| Status | Meaning | Action |
|---|---|---|
| `ALREADY-COVERED` | Semantic equivalent already on LFG main (same/different file) | Hard-reset works |
| `NEEDS-FORWARD-SYNC` | Substantive AceHack-only content; still valid | Forward-sync to LFG before hard-reset |
| `OBSOLETE` | Superseded by parallel LFG work; no longer applicable | Drop on hard-reset |
| `CONFLICTS-WITH-CURRENT-MAIN` | Actively contradicts current LFG main; reconciliation decision needed | Surface to Aaron |
| `NEEDS-HUMAN-REVIEW` | Evidence insufficient or ambiguous; do not force a category | Surface to Aaron |

`CONFLICTS-WITH-CURRENT-MAIN` is distinct from `NEEDS-HUMAN-REVIEW`: the
first means "I know the conflict exists and need a decision"; the
second means "I can't classify with confidence."

**Evidence requirements per classification**:

- File path
- Diff direction (+/-/mixed line counts)
- LFG equivalent commit/path/section if `ALREADY-COVERED`
- Reason for classification
- Confidence level / ambiguity notes
- Source AceHack commit SHA(s) only when needed for provenance,
  supersession-proof, or conflict-evidence

## Method (file-level primary, commit history supporting)

```text
1. Use `git diff origin/main..acehack/main --numstat` as the work queue.
2. For each differing file, run `git diff origin/main..acehack/main -- <file>`.
3. Compare AceHack-only `+` content against LFG main substrate (same file
   first, then nearby files / cross-references if not in same file).
4. Classify per rubric using actual git state, not commit summaries.
5. If file-level comparison is ambiguous, inspect bounded AceHack commit
   history (last 3-5 commits touching the file) for provenance.
6. If still ambiguous after bounded provenance lookup, classify as
   NEEDS-HUMAN-REVIEW (do not walk further history).
7. Record evidence in this document.
8. Long-tail control: random 10% spot-check after the run; every Nth file
   (TBD when scale becomes clear) gets deeper review.
```

### Evidence shape (Claude.ai 2026-04-28T22:35Z upgrade)

LFG-equivalent evidence may be:

- A single path + commit, OR
- A list of paths/commits if the AceHack content was absorbed across
  multiple LFG files or refactored differently (e.g., comment moved
  from file A to file B; rule extracted to a separate memory).

Allowing a list rather than a single path prevents force-fitting
ALREADY-COVERED into a single-equivalent shape when the content was
genuinely split across LFG.

### Hard-defect response (Claude.ai 2026-04-28T22:35Z upgrade)

If a hard defect appears during classification:

1. **Pause classification** at the affected file.
2. **Surface to Aaron** with the specific defect + affected file.
3. **Decide**: amend the protocol to handle the case, OR mark the
   affected file(s) as `NEEDS-HUMAN-REVIEW` and continue.
4. Resume classification only after the defect is resolved.

A hard defect is one of:

- Test failure (rubric produces inconsistent classifications on the
  same evidence).
- Formal-verification failure (classification violates a documented
  invariant).
- Property-test counterexample (a file that's classified
  ALREADY-COVERED but where re-running the diff shows divergence).
- Incorrect classification rule that would mislead reconciliation.
- Missing evidence that makes a classification unverifiable.

Soft defects (wording polish, naming improvements, "while we're in
here" refactors) are deferred per `Class-Count Validity Drift`
and `Goodhart Risk` disciplines.

## Calibration completion criteria (Claude.ai 2026-04-28T22:05Z)

The calibration phase is complete when:

1. Every sampled file has a classification without forcing a category.
2. The rubric handles encountered cases cleanly (no patterns
   surfaced that require a 6th bucket).
3. Time-per-file is roughly stable by the end of the batch.
4. Aaron has signed off on the rubric/output shape.

For this round, criteria 1-3 are satisfied (5/5 cleanly classified;
rubric handled all 5; time stable). Criterion 4 (Aaron sign-off) is
the gate before scaling to remaining 18 files.

## Carrier-exposed multi-harness convergence note

Amara, Gemini, Grok, Claude.ai, and Otto have all converged on the pivot to
classification work. **This convergence is signal, not proof.** The
classification must be proven commit-by-commit and file-by-file against git
state, not against agreement.

## Scope summary

```text
Total files in tree-diff:                  59
Pure-LFG-newer (AceHack just behind):      36   → hard-reset suffices, no work
Pure-AceHack-newer:                         1   → needs decision
Bidirectional (mixed):                     22   → per-file examination
Files needing classification this doc:     23
```

## Classification table

### Calibration batch (first 5) — completed 2026-04-28T21:55Z

| File | Diff +/- | Status | Evidence |
|---|---|---|---|
| `memory/feedback_doc_class_mirror_beacon_distinction_claudemd_beacon_memory_mirror_2026_04_27.md` | +1/-1 | **ALREADY-COVERED** | AceHack has prose attribution ("Otto-279 + follow-on maintainer clarification"); LFG has tighter `BP-24` cite — LFG version is canonical refinement |
| `memory/feedback_codeql_umbrella_neutral_vs_per_language_detection_pattern_aaron_2026_04_28.md` | +12/-51 | **ALREADY-COVERED** | AceHack has "Open question (deferred)" section; LFG has same question RESOLVED 2026-04-28T14:32Z with EVIDENCE-BASED primary-source detail. LFG strictly more advanced. |
| `memory/MEMORY.md` | +10/-29 | **ALREADY-COVERED** | AceHack-only additions are old index entries; LFG main has substantially advanced (29 LFG-only entries this arc). LFG version is canonical newer state. |
| `memory/CURRENT-aaron.md` | +2/-267 | **ALREADY-COVERED** | AceHack-only: stale refresh marker ("sections 23-25"); LFG has §§26-30 + threading lineage + TypeScript default + speculation discipline. AceHack badly out of date. |
| `memory/CURRENT-amara.md` | +2/-98 | **ALREADY-COVERED** | AceHack-only: stale refresh markers ("2026-04-25"); LFG has §12 three Amara class-namings. |

**Calibration result: 5 of 5 files ALREADY-COVERED.** Hard-reset suffices for all 5; no forward-sync needed.

### Emerging rubric heuristic

The calibration revealed a strong pattern: **when LFG-newer (-) line count >> AceHack-newer (+) line count, the AceHack content is almost always older drafts of content LFG has since advanced**. This pattern matches because most of AceHack's commits this arc were tick-history / memory updates that LFG subsequently superseded with substantively newer versions.

**Heuristic for the remaining 18 files**:

- Files where LFG-newer dominates (`-` >> `+`): probable ALREADY-COVERED; spot-check the AceHack `+` content for any unique semantic addition before classifying
- Files where AceHack-newer dominates or balanced (`+` >= `-`): higher chance of NEEDS-FORWARD-SYNC; full diff inspection required
- The 1 pure-AceHack-newer file (`tools/hygiene/github-settings.expected.json`): NEEDS-DECISION (could be obsolete settings snapshot or genuine drift)

Files where this heuristic suggests probable ALREADY-COVERED (deferred for spot-check):

```text
.github/workflows/codeql.yml                 (+18 -156)  ← strong LFG-newer
memory/project_laptop_only_*                 (+8 -27)    ← strong LFG-newer
.github/workflows/budget-snapshot-cadence.yml (+38 -75)  ← strong LFG-newer
.mise.toml                                   (+2 -21)    ← strong LFG-newer
SECURITY.md                                  (+4 -8)     ← LFG-newer
tools/setup/common/curl-fetch.sh             (+14 -44)   ← strong LFG-newer
tools/setup/common/elan.sh                   (+13 -25)   ← strong LFG-newer
tools/setup/linux.sh                         (+14 -44)   ← strong LFG-newer
tools/setup/macos.sh                         (+11 -16)   ← LFG-newer
tools/hygiene/audit-memory-index-duplicates.sh (+8 -7)   ← balanced; spot-check
tools/hygiene/validate-agencysignature-pr-body.sh (+5 -9)  ← LFG-newer
.github/workflows/memory-index-duplicate-lint.yml (+8 -5) ← balanced; spot-check
.github/workflows/resume-diff.yml            (+7 -14)    ← LFG-newer
.github/codeql/codeql-config.yml             (+17 -12)   ← balanced; spot-check
src/Core/Shard.fs                            (+9 -12)    ← balanced; spot-check
docs/hygiene-history/loop-tick-history.md    (+14 -6)    ← AceHack-newer; spot-check
.github/workflows/gate.yml                   (+179 -110) ← LARGE; full inspection
tools/hygiene/github-settings.expected.json  (pure-AceHack-newer) ← NEEDS-DECISION
```

Most likely outcome based on the heuristic: 14-16 of the remaining 18 ALREADY-COVERED, 2-4 NEEDS-FORWARD-SYNC or NEEDS-DECISION.

### Calibration insight for Aaron

**Calibration evidence suggests the remaining work is much smaller than the commit-count divergence implied** (Amara tiny-blade 22:08Z — "close to ready" overclaims; "smaller than implied" stays grounded). The bulk of "AceHack-only work" in the calibration sample turned out to be **older drafts of files LFG has since advanced** — not unique work needing forward-sync. The heuristic projects 14-16 of remaining 18 ALREADY-COVERED + 2-4 NEEDS-FORWARD-SYNC/DECISION, but **5/5 ALREADY-COVERED is calibration signal, not proof for the remaining 18** — each file must be proven against substrate before classification.

## Success state (Amara 2026-04-28T22:08Z)

```text
All differing AceHack/LFG files are classified with evidence.

The factory has a clean reconciliation map:
  ALREADY-COVERED
  NEEDS-FORWARD-SYNC
  OBSOLETE
  CONFLICTS-WITH-CURRENT-MAIN
  NEEDS-HUMAN-REVIEW

Only after that map exists should the hard-reset / sync-readiness
decision proceed.
```

This is the "AceHack/LFG reconciliation map" deliverable, not "in
sync by SHA." Exact SHA-sync comes later; the decision map is the
immediate target.

### Full classification — all 23 files (completed 2026-04-28T22:25Z, post-Aaron-sign-off)

#### ALREADY-COVERED (19 files; hard-reset works)

| File | Diff +/- | LFG advancement |
|---|---|---|
| `memory/feedback_doc_class_mirror_beacon_distinction...` | +1/-1 | LFG has tighter `BP-24` cite |
| `memory/feedback_codeql_umbrella_neutral_vs_per_language...` | +12/-51 | LFG resolved AceHack's "Open question" with EVIDENCE-BASED detail |
| `memory/MEMORY.md` | +10/-29 | LFG has substantively newer index entries |
| `memory/CURRENT-aaron.md` | +2/-267 | LFG has §§26-30 incl. TypeScript default + threading lineage |
| `memory/CURRENT-amara.md` | +2/-98 | LFG has §12 three Amara class-namings |
| `tools/hygiene/audit-memory-index-duplicates.sh` | +8/-7 | LFG drops redundant Amara-attribution |
| `.github/workflows/memory-index-duplicate-lint.yml` | +8/-5 | LFG canonical refinement |
| `tools/hygiene/validate-agencysignature-pr-body.sh` | +5/-9 | LFG has awk + RFC-822 hardening |
| `SECURITY.md` | +4/-8 | LFG has private-vulnerability-reporting path |
| `.mise.toml` | +2/-21 | LFG has `uv = "0.11.8"` (current) vs AceHack `0.9` |
| `memory/project_laptop_only_source...` | +8/-27 | LFG has counts-drift caveat |
| `.github/codeql/codeql-config.yml` | +17/-12 | LFG canonical refinement |
| `src/Core/Shard.fs` | +9/-12 | LFG has non-boxing hash path (perf fix per Copilot LFG #649) |
| `tools/setup/macos.sh` | +11/-16 | LFG explains technical reason for shellcheck-disable |
| `tools/setup/common/elan.sh` | +13/-25 | LFG has SHA256-pinned + bumping procedure (Scorecard) |
| `tools/setup/linux.sh` | +14/-44 | LFG has Scorecard PinnedDependenciesID #16 fix |
| `.github/workflows/codeql.yml` | +18/-156 | LFG has `java-kotlin` matrix kept (corrects AceHack's wrong assumption) |
| `.github/workflows/budget-snapshot-cadence.yml` | +38/-75 | LFG has auto-merge limitation acknowledged |
| `tools/setup/common/curl-fetch.sh` | +14/-44 | LFG canonical text |

#### NEEDS-FORWARD-SYNC (4 files; clustered into 3 themes)

**Theme A — Aaron's 2026-04-28 ubuntu-24.04 bump** (2 files):

| File | Evidence |
|---|---|
| `.github/workflows/gate.yml` (+179/-110) | AceHack: `runs-on: ubuntu-24.04` per Aaron 2026-04-28 *"we better not be using that old version of ubuntu"* + Otto-247 version-currency. LFG: still `ubuntu-22.04`. |
| `.github/workflows/resume-diff.yml` (+7/-14) | Same bump applied AceHack-side, not LFG. |

**Theme B — Tick-history continuity** (1 file):

| File | Evidence |
|---|---|
| `docs/hygiene-history/loop-tick-history.md` (+14/-6) | AceHack-only rows: 2026-04-21T17:28Z (round-44 post-compaction), 2026-04-28T02:52Z (queue audit), 2026-04-28T04:01Z (PR #74 merge). Append-only history; union is correct state. |

**Theme C — Branch-protection expected snapshot** (1 file):

| File | Evidence |
|---|---|
| `tools/hygiene/github-settings.expected.json` (+1/-0) | AceHack adds `"build-and-test (macos-26)"` to required_status_checks. Verified: macos-26 IS in actual LFG branch protection. LFG's expected.json is the drift. |

### Final tally

```text
ALREADY-COVERED:           19  (hard-reset works)
NEEDS-FORWARD-SYNC:         4  (3 focused themes)
OBSOLETE:                   0
CONFLICTS-WITH-CURRENT-MAIN: 0
NEEDS-HUMAN-REVIEW:         0

Calibration heuristic: 14-16/18 ALREADY-COVERED, 2-4 NEEDS-FORWARD-SYNC.
Actual:                14/18 + 5/5 calibration = 19/23 + 4/23.
Heuristic verified within stated range — Prediction-Bearing Class Reuse +1 bead.
```

## Path to 0/0/0 (concrete plan)

```text
Step 1 — Forward-sync 3 themes to LFG (3 new PRs):
  Theme A: gate.yml + resume-diff.yml (ubuntu-24.04)        — 1 PR
  Theme B: loop-tick-history.md (3 AceHack-only rows)       — 1 PR
  Theme C: github-settings.expected.json (macos-26 entry)   — 1 PR

Step 2 — Verify (after step 1 merges):
  git diff origin/main..acehack/main --numstat
  expect: 0 files differ on AceHack-newer side

Step 3 — Hard-reset AceHack main (NEEDS AARON SIGN-OFF):
  shared-prod state mutation per visibility-constraint
  acehack force-push acehack/main:main = origin/main

Step 4 — Verify 0/0/0:
  expect: AceHack main = LFG main exactly
  expect: 0 commits ahead AND 0 commits behind
```

## Calibration-heuristic bead audit (Prediction-Bearing Class Reuse +1)

Per `feedback_prediction_bearing_class_reuse_amara_2026_04_28.md` bead-audit rule (validation requires falsifier-passing observation, not just mechanism activity):

- **Prediction**: heuristic projected 14-16/18 ALREADY-COVERED + 2-4 NEEDS-FORWARD-SYNC.
- **Falsifier**: would have failed if remaining 18 came in outside that range.
- **Observation**: 14/18 ALREADY-COVERED + 4/18 NEEDS-FORWARD-SYNC. Within range.
- **Bead earned**: +1 via prediction-bearing example.

This is the kind of validation event the bead system was designed to catch: a named class made a concrete time-exposed prediction, time passed, prediction held. Genuine signal; not yet pattern (would need a second independent prediction to validate). The class itself remains at 1 bead.

## Round-close measurable-alignment note (Claude.ai 2026-04-28T22:35Z)

Log this arc as measurable-alignment data per `docs/ALIGNMENT.md`'s framework:

```text
Goodhart catch #2 of this session:
  145-commit primary metric corrected mid-arc to 23-file tree-diff primary metric.

Mechanism:
  Tree-level numstat exposed that the commit count overstated the
  practical work surface ~6x. Substrate comparison on 5 calibration
  files revealed the pattern (AceHack stale; LFG advanced); the
  full 23-file pass confirmed the heuristic.

Visibility:
  This is the kind of mid-stream proxy-metric correction the factory
  was designed to make visible. The diff between message N (claiming
  drift) and message N+1 (correcting to amortized-precision-paying-
  out) is now in git history at PR #695.

Cadence:
  Goodhart catch #1 of this session was substrate-iteration-vs-
  classification (PR #694 freeze). Catch #2 is this metric
  correction. Two visible mid-stream Goodhart catches in one
  session is a measurable-alignment data point worth flagging
  at round-close.
```

## What this document is NOT

- **NOT a forward-sync execution plan.** This classifies; execution is a
  separate step (3 PRs naming the 3 themes).
- **NOT a commit-level audit.** Tree-level diff is the ground truth for 0/0/0
  topology. Per-commit narrative is preserved in git history but not
  re-walked here unless a file requires it.
- **NOT proof of 0/0/0 readiness.** The map exists; the forward-sync work
  + hard-reset are still pending. "Reconciliation map exists" ≠ "0/0/0
  achieved."

## Composes with

- `CLAUDE.md` — AceHack/LFG topology invariant (0 ahead, 0 behind at round
  close)
- `memory/feedback_lfg_master_acehack_zero_divergence_fork_double_hop_aaron_2026_04_27.md`
- `memory/feedback_zero_diff_is_start_line_until_then_hobbling_aaron_2026_04_27.md`
- `memory/feedback_destructive_git_op_5_pre_flight_disciplines_codex_gemini_2026_04_28.md`
  — applies during forward-sync + hard-reset
- The bead-validation discipline triple
  (`feedback_prediction_bearing_class_reuse_amara_2026_04_28.md`) — the
  classification work itself is the kind of terminal-progress amortized-precision
  is meant to enable

## Pickup notes for future-Otto

When resuming classification on the deferred 18 files:

1. Read this file first; verify the rubric still applies.
2. For each file:
   - Run `git diff origin/main..acehack/main -- <file>` to see current
     AceHack-only content
   - Check if equivalent content exists on LFG main (could be same file,
     different file, or different framing)
   - Apply the rubric; record evidence
3. Do not classify in batch without evidence per file.
4. Surface NEEDS-HUMAN-REVIEW cases to Aaron in the tick close.
5. Once all 23 files classified, pivot to the action phase (forward-sync
   the NEEDS-FORWARD-SYNC subset, then hard-reset).
