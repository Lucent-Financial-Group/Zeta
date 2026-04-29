---
title: AceHack/LFG 0/0/0 Reconciliation — file-level classification
status: in-progress (batch 1 landed; ~139 lines / 11 files remain unclassified)
created: 2026-04-28
last_updated: 2026-04-29
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

## Classification rubric (Amara 2026-04-28T21:48Z)

For each file's AceHack-only content:

| Status | Meaning | Action |
|---|---|---|
| `ALREADY-COVERED` | Semantic equivalent already on LFG main (same/different file) | Hard-reset works |
| `NEEDS-FORWARD-SYNC` | Substantive AceHack-only content not on LFG | Forward-sync to LFG before hard-reset |
| `OBSOLETE` | Superseded by parallel LFG work; no longer applicable | Drop on hard-reset |
| `NEEDS-HUMAN-REVIEW` | Ambiguous; requires Aaron's call | Surface to Aaron |

**Evidence requirements per classification**:

- File path
- Diff direction (+/-/mixed line counts)
- LFG equivalent commit/path if `ALREADY-COVERED`
- Reason for classification
- Source commit SHA(s) on AceHack that produced the content

## Method (Amara 2026-04-28T21:48Z)

```text
1. Identify the AceHack-only content (`+` lines in `git diff origin/main..acehack/main -- <file>`)
2. Check whether LFG main contains equivalent/subsuming content
3. Classify per rubric above
4. Record evidence
5. Do not trust summaries alone; compare substrate
```

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

### Batch 1 (post-strict-bucket-reframe, 2026-04-29T11:32Z)

Per `docs/active-trajectory.md` strict bucket taxonomy: classification requires named AceHack content + named LFG equivalent + named reason. Each entry below promotes from HEURISTIC_LFG_DOMINATES to SAFE_TO_RESET_LFG_SUPERSEDES.

| File | Diff +/- | Status | Evidence |
|---|---|---|---|
| `SECURITY.md` | +4/-8 | **SAFE_TO_RESET_LFG_SUPERSEDES** | AceHack has basic disclosure prose ("open a regular GitHub issue with the security label; no separate disclosure inbox"). LFG has the same content PLUS GitHub private vulnerability reporting link, supported-versions section, security-posture section (trust boundaries / crypto choices / dependency audit / static analysis / formal verification details). LFG is strict superset. |
| `tools/hygiene/validate-agencysignature-pr-body.sh` | +5/-9 | **SAFE_TO_RESET_LFG_SUPERSEDES** | AceHack has older grep-based refactor + a truncated spec reference ("Section 9.2 (Task: none fallback per )"). LFG has cleaner refactored code with proper Section 9.2 reference ("Task: none fallback") + correct spec-doc lineage. LFG is the bug-fixed form. |

**Batch 1 result: 2 of 2 files SAFE_TO_RESET_LFG_SUPERSEDES.** No forward-sync needed.

### Calibration batch reclassification (older "ALREADY-COVERED" label)

The 5 calibration-batch entries above use the prior taxonomy's "ALREADY-COVERED" label, which under the strict bucket rules (named AceHack content + named LFG equivalent + named reason — see `docs/active-trajectory.md` Hard-reset-safety classification) corresponds to **SAFE_TO_RESET_LFG_SUPERSEDES** (4 entries with semantic supersession evidence) or **ALREADY_RESOLVED** (where AceHack-only content is zero). Re-tabulated for the strict-bucket ledger:

- `feedback_doc_class_mirror_beacon_*.md` (+1) → SAFE_TO_RESET_LFG_SUPERSEDES (LFG cites full rule + lineage)
- `feedback_codeql_umbrella_*.md` (+12) → SAFE_TO_RESET_LFG_SUPERSEDES (LFG resolved Open question with primary-source detail)
- `MEMORY.md` (+11) → SAFE_TO_RESET_LFG_SUPERSEDES (LFG has 29 newer entries)
- `CURRENT-aaron.md` (+2) → SAFE_TO_RESET_LFG_SUPERSEDES (LFG has §§26-30 + threading lineage)
- `CURRENT-amara.md` (+2) → SAFE_TO_RESET_LFG_SUPERSEDES (LFG has §12 three Amara class-namings)

Total: 28 AceHack-only lines properly accounted for under strict bucket as SAFE_TO_RESET_LFG_SUPERSEDES.

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

The 145-commit / 530-behind state may be much closer to 0/0/0-ready than the raw numbers suggest. The bulk of "AceHack-only work" turns out to be **older drafts of files LFG has since advanced** — not unique work needing forward-sync. If the heuristic holds for the remaining 18 files, hard-reset alone may resolve most of the divergence with at most 2-4 small forward-syncs.

### Remaining 18 files (deferred to follow-up ticks)

```text
.github/codeql/codeql-config.yml             (+17 -12)
.github/workflows/budget-snapshot-cadence.yml (+38 -75)
.github/workflows/codeql.yml                 (+18 -156)
.github/workflows/gate.yml                   (+179 -110)  ← largest AceHack-only delta
.github/workflows/memory-index-duplicate-lint.yml (+8 -5)
.github/workflows/resume-diff.yml            (+7 -14)
.mise.toml                                   (+2 -21)
SECURITY.md                                  (+4 -8)
docs/hygiene-history/loop-tick-history.md    (+14 -6)
memory/project_laptop_only_source_integration_scratch_sqlsharp_features_or_designs_high_priority_2026_04_27.md (+8 -27)
src/Core/Shard.fs                            (+9 -12)
tools/hygiene/audit-memory-index-duplicates.sh (+8 -7)
tools/hygiene/github-settings.expected.json  (pure-AceHack-newer; needs decision)
tools/hygiene/validate-agencysignature-pr-body.sh (+5 -9)
tools/setup/common/curl-fetch.sh             (+14 -44)
tools/setup/common/elan.sh                   (+13 -25)
tools/setup/linux.sh                         (+14 -44)
tools/setup/macos.sh                         (+11 -16)
```

## What this document is NOT

- **NOT a forward-sync execution plan.** This classifies; execution is a
  separate step.
- **NOT a commit-level audit.** Tree-level diff is the ground truth for 0/0/0
  topology. Per-commit narrative is preserved in git history but not
  re-walked here unless a file requires it.
- **NOT a single-tick deliverable.** The calibration batch is this tick;
  remaining 18 files are follow-up tick work.

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
