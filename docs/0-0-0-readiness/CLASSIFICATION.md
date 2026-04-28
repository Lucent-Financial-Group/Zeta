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
5. If file-level comparison is ambiguous, inspect AceHack commit history
   for provenance/supersession/conflict evidence.
6. Record evidence in this document.
7. Long-tail control: random 10% spot-check after the run; every Nth file
   (TBD when scale becomes clear) gets deeper review.
```

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
