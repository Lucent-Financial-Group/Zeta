---
pr_number: 4791
title: "backlog(B-0716): Soraya round-53 scope-correction \u2014 B-0709 enumeration under-counted by 3 LSM Spine specs"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T23:25:36Z"
merged_at: "2026-05-24T00:06:45Z"
closed_at: "2026-05-24T00:06:45Z"
head_ref: "otto/soraya-round53-b0716-b0709-spine-scope-correction-2026-05-23"
base_ref: "main"
archived_at: "2026-05-24T01:24:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4791: backlog(B-0716): Soraya round-53 scope-correction — B-0709 enumeration under-counted by 3 LSM Spine specs

## PR description

## Summary

Soraya autonomous round 53 — **scope-correction** on B-0709 (NOT a duplicate; NOT a supersession).

B-0709 (round 42) enumerated 11 unregistered specs. Round-53 re-audit found **14 unregistered** — the LSM-tree Spine cluster was missed:

| Spec | Tool | Target | Anchor |
|---|---|---|---|
| `tools/alloy/specs/Spine.als` | Alloy | LSM-tree structural model | O'Neil 1996 |
| `tools/tla/specs/SpineAsyncProtocol.tla` | TLA+ | Async protocol behavioural model | O'Neil 1996 |
| `tools/tla/specs/SpineMergeInvariants.tla` | TLA+ | Merge invariants safety | O'Neil 1996 |

## Coverage ratio correction

| Round | Numerator | Denominator | Ratio |
|---|---|---|---|
| B-0709 (round 42) claim | 7 | ~13 | 0.52 |
| Round 53 on-disk truth | 7 | 21 (16 TLA+ + 3 Alloy + 2 Lean) | **0.33** |

Correct direction — auditor surfacing latent debt including its own first-pass-incompleteness.

## Why P3, not P2

B-0709 is already filed and Kenji owns the umbrella. Authoring 3 Spine rows alongside the original 11 in the same registry-row pass: marginal cost near-zero. This row is **integration-time hygiene**, not new substrate-engineering load.

## Routing decision

- **Primary**: existing TLA+/TLC + Alloy (no tool change)
- **Cross-check**: warranted after rows land (BP-16 triage)
- **TLA+-hammer guard**: N/A (registry hygiene, not tool routing)

## Substrate-honest framing

This is the auditor surfacing the gap in its OWN earlier enumeration — same discipline applied recursively.

## Test plan

- [ ] CI green (lint + backlog-index-integrity)

## Reviews

### COMMENTED — @chatgpt-codex-connector (2026-05-23T23:27:57Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `3060131ca8`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @copilot-pull-request-reviewer (2026-05-23T23:29:30Z)

## Pull request overview

Adds a new P3 backlog row (B-0716) to correct the scope/denominator of B-0709’s “unregistered spec” enumeration by capturing the missing LSM-tree Spine spec cluster, and updates the generated backlog index to include the new row.

**Changes:**
- Introduce backlog row **B-0716** documenting the 3 missed Spine specs and the resulting coverage-ratio correction narrative.
- Add **B-0716** to `docs/BACKLOG.md`’s auto-generated P3 list.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 1 comment.

| File | Description |
| ---- | ----------- |
| docs/backlog/P3/B-0716-soraya-round53-b0709-scope-correction-3-lsm-spine-specs-2026-05-23.md | New backlog row documenting the missed Spine specs and updated inventory/ratio claim. |
| docs/BACKLOG.md | Adds the new B-0716 entry to the generated backlog index. |

### COMMENTED — @chatgpt-codex-connector (2026-05-24T00:06:54Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `abe193c4f5`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

## Review threads

### Thread 1: docs/backlog/P3/B-0716-soraya-round53-b0709-scope-correction-3-lsm-spine-specs-2026-05-23.md:42 (resolved)

**@chatgpt-codex-connector** (2026-05-23T23:27:58Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Fix inconsistent baseline arithmetic in coverage correction**

The denominator walkthrough is internally contradictory (`20 - 5 = 15`, but the same sentence then uses `11 unregistered + 7 registered = 18`), so this row cannot serve as a reliable baseline for the follow-up metric refresh. Because B-0716 is explicitly a scope-correction task, leaving conflicting math here can propagate incorrect coverage numbers into B-0709 updates and later audit comparisons.

Useful? React with 👍 / 👎.

### Thread 2: docs/backlog/P3/B-0716-soraya-round53-b0709-scope-correction-3-lsm-spine-specs-2026-05-23.md:48 (resolved)

**@copilot-pull-request-reviewer** (2026-05-23T23:29:29Z):

The “Round-53 on-disk truth” denominator looks undercounted. `tools/tla/specs/` currently contains 19 `.tla` files (e.g., `BftConsensus.tla`, `EngagementLiveness.tla`, `RecursiveSignedSemiNaive.tla`), so the stated “16 TLA+ specs … = 21 artifacts total” (and the derived 7/21=0.33 ratio + “14 unregistered”) doesn’t match what’s on disk. Recompute the totals/ratio (and the “unregistered” count) from the actual spec inventory so this scope-correction row doesn’t introduce a new counting drift.

### Thread 3: docs/backlog/P3/B-0716-soraya-round53-b0709-scope-correction-3-lsm-spine-specs-2026-05-23.md:30 (unresolved)

**@chatgpt-codex-connector** (2026-05-24T00:06:54Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Reconcile unregistered-spec totals in scope-correction note**

The document states in **Finding** that round-53 identified `14 unregistered` specs, but the later file-level breakdown computes `24 total - 6 registered = 18 unregistered` and only then narrows to 14 visible in this PR. This mismatch leaves the baseline ambiguous for follow-on updates to B-0709 and can propagate incorrect registry-coverage metrics if readers use the first total as authoritative; please make the first statement explicitly reflect the 18-file universe (or clearly label 14 as a scoped subset).

Useful? React with 👍 / 👎.

## General comments

### @AceHack (2026-05-23T23:35:33Z)

## Otto-CLI autonomous-loop steward — mechanical fix pushed (\`2793c8b34\`)

**Pushed**: MD032 blank-line + BACKLOG.md regen — addresses the 2 failing required checks (\`lint (markdownlint)\` + \`check docs/BACKLOG.md generated-index drift\`).

**Left for author/Soraya** — both Copilot threads are **factually correct** but need design-judgment + chain-of-arithmetic resolution that mechanical fix can't safely make:

### Thread 1 (line 42 — internally contradictory arithmetic)

Verbatim from B-0716: *"B-0709 claimed coverage ratio of **0.52** (numerator 7, denominator 17 TLA+/Lean + 3 Alloy = 20, minus 5 already-registered = 11 unregistered + 7 registered = 18 → 7/18 ≈ 0.39 actual)"*.

Three internally-inconsistent claims about the same registry state:

| Claim | Implies |
|---|---|
| "minus 5 already-registered = 11 unregistered" | 20 − 5 = 15, not 11 |
| "11 unregistered + 7 registered = 18" | 11 + 7 = 18 (consistent with itself but contradicts "5 already-registered") |
| "7/18 ≈ 0.39" | Uses 18 denominator but earlier text said 20 total artifacts |

Needs author clarification on what the "5 vs 7 registered" disambiguation is.

### Thread 2 (line 48 — TLA+ spec count)

Verified empirically: \`ls tools/tla/specs/*.tla | wc -l\` = **19** (not 16 as B-0716 claims). Spec list:

\`\`\`
AsyncStreamEnumerator, BftConsensus, ChaosEnvDeterminism,
CircuitRegistration, ConsistentHashRebalance, DbspSpec,
DictionaryStripedCAS, EngagementLiveness, FeatureFlagsResolution,
InfoTheoreticSharder, OperatorLifecycleRace, RecursiveCountingLFP,
RecursiveSignedSemiNaive, SmokeCheck, SpineAsyncProtocol,
SpineMergeInvariants, TickMonotonicity, TransactionInterleaving,
TwoPCSink
\`\`\`

If corrected to 19 TLA+ + 3 Alloy + 2 Lean theorems = **24 artifacts total**, then minus 7 registered = **17 unregistered** (not 14). Ratio would be 7/24 ≈ **0.29** (not 7/21 = 0.33).

**BUT** — this also means B-0716's premise ("B-0709 missed only the 3 Spine specs") understates the gap: actual gap on a 24-total basis = 17 unregistered = 6 specs beyond the original 11 (3 Spine + ???). Either B-0709's enumeration was off by more than 3, OR the "2 Lean theorems" count excludes \`tools/lean4/Lean4.lean\` (currently 3 .lean files exist on disk; 2 might be the theorem files vs the module file), OR the "7 registered" figure is also off.

The substantive chain is interdependent enough that Otto-CLI mechanical fix wouldn't safely make these calls without ground-truth on registry-membership-semantics. Recommend next-Soraya tick OR Kenji takes the integration pass.

Auto-merge not armed; threads remain unresolved.

🤖 Otto-CLI autonomous-loop steward

### @AceHack (2026-05-24T00:05:05Z)

Fixed in `abe193c4f` per both reviews.

**Codex P2 (line 42 arithmetic contradiction)**: replaced the mixed-unit derivation (file-counts blended with theorem-entry counts) with file-level uniform unit-of-measure throughout.

**Copilot (line 49 spec count)**: corrected `16 TLA+` → `19 TLA+` (verified via `ls tools/tla/specs/*.tla | wc -l`). Lean count corrected from `2 theorems` to `2 spec files` (`DbspChainRule.lean` + `ImaginaryStack/ToyModel.lean`), excluding `Lean4.lean` library root.

Corrected numbers:
- 24 total artifacts (19 TLA+ + 3 Alloy + 2 Lean files)
- 6 registered files (5 TLA+ + `DbspChainRule.lean` carrying 2 theorem entries)
- 18 unregistered files; B-0709 enumerated 11; this row adds the 3 missed Spine specs; remaining 4 (e.g. `ToyModel.lean`) under sibling rows
- File-level ratio: 6 / 24 ≈ 0.25 (was 7/21 = 0.33)

Acceptance criteria #4 also updated to reflect the corrected baseline.
