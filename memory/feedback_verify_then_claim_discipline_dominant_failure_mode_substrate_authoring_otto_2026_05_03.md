---
name: Verify-then-claim discipline — verify every substrate claim empirically BEFORE publishing (Otto 2026-05-03 self-grading; dominant failure mode caught across 7+ PRs this session)
description: 2026-05-03; Otto self-grading after Copilot caught 9 distinct claim-vs-reality drift instances across 7 PRs (#1245 #1247 #1248 #1250 #1252 #1253 #1254). The dominant failure mode for substrate authoring this session is claim-vs-reality drift — Otto wrote "X exists" / "command returns Y" / "table has N rows" without verifying empirically. The corrective is the verify-then-claim discipline: before stating ANY fact in substrate (file exists, command returns X, row count is N, tool ships, ADR matches, persona dir present), verify by running the actual command / `ls` / `grep` BEFORE writing the claim. Same class as Otto-247 version-currency-always-search-first + Otto-363 substrate-or-it-didn't-happen + verify-before-deferring — but at the more general layer of any-substrate-claim. Mechanization: `tools/substrate-claim-checker/` (proposed, not yet built) that reads a memo / doc / commit message and runs the cited commands to verify; pre-commit hook integration is a future Phase. Until that ships: discipline is manual but the pattern is now named.
type: feedback
---

# Verify-then-claim discipline — dominant failure mode for substrate authoring

## Empirical evidence (this session, 7 PRs, 9 distinct drift instances)

| Drift instance | PR | Wrong claim | Actual reality |
|---|---|---|---|
| 1 | #1248 (post-merge to #1249) | future-domain memo had `feedback_at_pickup_time_*` ref after rename | line 35 still pointed at old filename |
| 2 | #1245 (post-merge) | "12-row surface→specialist table" in MEMORY.md index | actually 13 rows |
| 3 | #1248 (post-merge) | "5 procedure skills + 5 tools" in canonical-starting-set | actually 6 + 7 (after refinements) |
| 4 | #1250 (post-merge) | Layer-6 shards are `1610Z.md`, `1612Z.md`, `1619Z.md` | fictional names; actual: `0112Z.md`, `1456Z.md`, `1520Z.md`, `1522Z.md`, `1523Z.md` |
| 5 | #1250 (post-merge) | Layer-7 ADR search ("ls docs/DECISIONS/ piped through grep") returns nothing | returns `2026-04-26-sync-drain-plan-acehack-lfg-roundtrip-option-c.md` |
| 6 | #1250 (post-merge) | Layer-9 `memory/persona/amara/` exists | doesn't exist (Aaron does, 21 others, no Amara) |
| 7 | #1250 (post-merge) | Layer-10 docs/research grep returns no specific double-hop artifact | adjacent-substrate artifacts ARE there (5+) |
| 8 | #1252 (post-merge) | future-domain memo references `docs/courier-ferry-protocol.md` | doesn't exist |
| 9 | #1253 (post-merge) | skill-design memo references `tools/backlog/expand-from-closure.ts` as the mechanizing tool | doesn't exist; only proposed |

**9 drift instances across 7 PRs in one session.** Each one a Copilot catch; each one a real claim Otto wrote without verifying. The pattern is consistent enough that "verify-then-claim" needs to be a named discipline.

## The carved rule

**Before stating ANY fact in substrate (memo / doc / commit message / PR description / shard), verify the fact empirically.**

Specifically: before writing claims of form...

- *"file `<path>` exists"* → `ls <path>` / `test -e <path>`
- *"command `<cmd>` returns `<X>`"* → run `<cmd>`, pipe output, compare to claimed result
- *"table has `<N>` rows"* → grep / awk count actual rows
- *"tool `<tool>` ships / is built"* → check the path; mark "shipped" / "proposed" / "Phase-1b" explicitly
- *"ADR `<name>` exists / does not exist in `docs/DECISIONS/`"* → run the actual `ls docs/DECISIONS/` query
- *"directory `<path>` is present / absent"* → `ls -d <path>` / `find <parent> -maxdepth 1 -name <name>`
- *"row count is `<N>`"* → re-run the count command before committing the claim

...verify the corresponding command empirically FIRST, then commit the claim.

## Composition with existing disciplines

The verify-then-claim discipline composes with several named rules at the more-general layer:

- **Otto-247** (`feedback_version_currency_always_search_first_training_data_is_stale_otto_247_2026_04_24.md`) — "always search first" specifically for version numbers; verify-then-claim generalizes to any claim
- **Otto-364** (`feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md`) — "search-first authority" for evolving-field assertions; verify-then-claim generalizes to project-state assertions too
- **Otto-363** (`feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`) — substrate-or-it-didn't-happen guards against the *fact* not being durably preserved; verify-then-claim guards against the *fact being wrong* in the first place
- **`feedback_verify_target_exists_before_deferring.md`** (CLAUDE.md-load) — verify the deferral target exists before committing; verify-then-claim is the broader rule
- **`feedback_assumed_state_vs_actual_state_audit_horizon_check_aaron_2026_05_01.md`** — audit horizon defaults to actual-state; verify-then-claim ensures the actual-state fact stated is true
- **Aarav's BP-14 review on B-0169** — worked examples ARE the dry-run-eval-set; their claims need empirical grounding to serve as eval-data
- **The bugs-per-PR-as-immune-system-health metric** — this discipline would substantially reduce bugs-per-PR (closer to single-digit per PR), keeping the metric in productive zone via fewer drift findings rather than via finding/fixing-them-cheaply

## What's NOT in scope (to avoid over-applying)

The discipline applies to **substantive claims about repo state, command output, file existence, count totals**. It does NOT apply to:

- **Verbatim quote preservation** — quotes are preserved as-Aaron-wrote-them including typos; verifying the typo "is correct" is the wrong frame
- **Conjectures + speculative claims explicitly marked as such** — "this MIGHT exist" / "I think this is" / "if X then Y" claims aren't false-when-wrong; they're hedged
- **Future-state predictions** — "this will be useful when N+1 examples land" can't be verified in the present
- **Procedural recommendations** — "skills should be carved-sentence hubs" is a normative claim; not a fact-claim subject to empirical verification (testable through application but not pre-write)

The rule fires on **fact-claims about current repo state**, not normative or speculative claims.

## Mechanization path (proposed, not yet built)

The full mechanization would be `tools/substrate-claim-checker/` — a TS tool (per Aaron's no-dynamic-commands rule) that:

1. **Parses a memo / doc / PR description** for fact-claim patterns (path mentions, command-result claims, count claims, existence assertions)
2. **Runs the corresponding verification commands** (`ls <path>`, `<cmd>` and parse output, count rows, etc.)
3. **Reports drift** between claim and reality
4. **Two-hook integration** — `pre-commit` hook validates staged-file content (memos, docs); `commit-msg` hook validates the commit message itself (which doesn't exist yet at pre-commit time per git's hook ordering). Both hooks call the same tool with different inputs. PR descriptions get a separate CI check (post-PR-creation) since they're authored on the host, not pre-commit.

The tool's outputs (per-commit drift reports) are satellite-shaped per Aaron 2026-05-03 hub-satellite rule; the tool itself is hub-shaped. Filing as a separate backlog row is the right path for actually building it.

Until the tool ships: **the discipline is manual** but the pattern is now named, the failure modes are catalogued (9 drift instances above), and future-Otto can pre-flight-check substrate claims before publishing.

## Worked example: how this would have caught #1250's Layer-7 drift

Before publishing the worked example, the discipline says:

```bash
# Layer 7 claim: "ls docs/DECISIONS/ | grep -iE 'double.hop|acehack|mirror' returns nothing"
# Verify before claiming:
ls docs/DECISIONS/ | grep -iE "double.hop|acehack|mirror"
# Returns: 2026-04-26-sync-drain-plan-acehack-lfg-roundtrip-option-c.md
```

Empirical reality contradicts the claim. The discipline's output: rewrite the claim to match reality (the ADR exists; needs supersession marker), don't publish as-is.

If `tools/substrate-claim-checker/` had existed during PR #1250 authoring, it would have caught this pre-commit. Without the tool, the discipline is "manual run before write" — slower but achievable.

## Carved sentence

**"Before stating any fact in substrate, verify it empirically. The dominant failure mode for substrate authoring is claim-vs-reality drift — 9 instances caught across 7 PRs in one session is empirical evidence the discipline matters. The rule applies to fact-claims about current repo state (file existence, command output, count totals, tool shipped); NOT to verbatim quotes, hedged speculation, future predictions, or normative recommendations. Generalizes Otto-247 + Otto-364 + verify-before-deferring at the broader any-substrate-claim layer. Manual until `tools/substrate-claim-checker/` ships."**

## Composes with

- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
- `memory/feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md`
- `memory/feedback_version_currency_always_search_first_training_data_is_stale_otto_247_2026_04_24.md`
- `memory/feedback_verify_target_exists_before_deferring.md` (CLAUDE.md-load — narrower predecessor)
- `memory/feedback_assumed_state_vs_actual_state_audit_horizon_check_aaron_2026_05_01.md`
- `memory/feedback_skills_as_carved_sentences_knowledge_in_docs_datavault_2_0_pattern_aaron_2026_05_03.md` — Rule 2 (no dynamic commands; use TS) implies the verifier itself becomes a TS tool
- `memory/feedback_bugs_per_pr_rate_as_immune_system_health_metric_independent_framing_production_otto_aaron_2026_05_02.md` — verify-then-claim moves bugs-per-PR closer to single-digit (productive zone) by catching drift pre-publish rather than post-merge
- Aarav's B-0169 review (in chat substrate; pending durable preservation) — predicted this pattern with the "worked-examples-need-empirical-grounding" framing
