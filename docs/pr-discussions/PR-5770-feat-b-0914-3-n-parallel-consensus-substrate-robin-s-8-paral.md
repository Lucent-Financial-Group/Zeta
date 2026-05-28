---
pr_number: 5770
title: "feat(B-0914.3): n-parallel + consensus substrate (Robin's 8-parallel-Finch pattern); 18 tests pass"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T11:23:47Z"
merged_at: "2026-05-28T11:26:56Z"
closed_at: "2026-05-28T11:26:56Z"
head_ref: "otto-cli/b-0914-3-n-parallel-analyzer-consensus-substrate-per-data-analysis-task-scope-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T12:34:56Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5770: feat(B-0914.3): n-parallel + consensus substrate (Robin's 8-parallel-Finch pattern); 18 tests pass

## PR description

## Summary

Sakana Robin's 8-parallel-Finch consensus pattern generalized to N parallel analyzers + configurable consensus mechanism (majority / supermajority / unanimous / first-n-agree).

**18 tests pass / 0 fail.**

## Composes with substrate

- PR #5769 B-0914.2 closed-loop (dispatchCi can wrap N parallel + consensus)
- PR #5768 B-0914.4 pairing (verifier-side consensus)
- B-0703 multi-oracle BFT
- monad-propagation + asymmetric-authorship + m-acc-multi-oracle

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T11:27:32Z)

## Pull request overview

Adds a pure-TypeScript N-parallel-analyzer + consensus substrate to `tools/workflow-engine/` (B-0914.3), generalizing Sakana Robin's 8-parallel-Finch pattern to configurable consensus mechanisms (majority / supermajority / unanimous / first-n-agree). The substrate is callback-based so it composes with the B-0914.2 closed-loop orchestrator (dispatchCi) and B-0914.4 pairing tracker (verifier-side). Result/feedback shape follows the existing `ok: true | ok: false` convention used by `trueskill.ts` and `evolution.ts`.

**Changes:**
- New `consensus.ts` exposing `ConsensusMechanism`, `ConsensusResult`, `AgreementMetrics`, `runConsensus`, and `nIdenticalAnalyzers`; runs analyzers concurrently via `Promise.all`, converts thrown errors into failed analyzer outputs, groups by `verdictKey ?? JSON.stringify`, and reports a winner-and-distribution metrics record.
- New `consensus.test.ts` with 18 Bun tests covering all four mechanisms, threshold validation, mixed success/failure, throwing analyzers, custom `verdictKey`, `nIdenticalAnalyzers`, the 8-parallel pattern, and an exhaustive-switch compile-time check matching the convention in `types.test.ts` / `evolution.test.ts`.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 4 comments.

| File | Description |
| ---- | ----------- |
| tools/workflow-engine/consensus.ts | New N-parallel runner + consensus reducer with discriminated-union result/feedback. |
| tools/workflow-engine/consensus.test.ts | 18 Bun tests covering mechanisms, validation, error conversion, and metrics. |

## Review threads

### Thread 1: tools/workflow-engine/consensus.ts:242 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:27:30Z):

The `required` value reported in `NoConsensus` feedback is off-by-one for the `supermajority` mechanism. The consensus check uses strict `>` (`winnerFraction > threshold`, i.e., `winnerCount > successfulCount * threshold`), so the smallest integer `winnerCount` that would satisfy consensus is `Math.floor(successfulCount * threshold) + 1`. Using `Math.ceil(successfulCount * mechanism.threshold) + 1` overstates the requirement by 1 whenever the product is non-integer (e.g., 9 successful × 0.6 = 5.4 reports required=7 when only 6 was actually needed) and by 1 in the integer case as well (e.g., 10 × 0.6 = 6 reports required=7, while winnerCount=7 would have satisfied `7 > 6`, making 7 correct only by coincidence — but 6 successful × 0.5-equivalent edges also misreport). Use `Math.floor(successfulCount * mechanism.threshold) + 1` to match the actual check.

### Thread 2: tools/workflow-engine/consensus.ts:168 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:27:31Z):

Grouping verdicts via `JSON.stringify` as the default `verdictKey` is order-sensitive for object verdicts: two analyzers returning semantically identical objects with keys serialized in different orders (e.g., `{a:1,b:2}` vs `{b:2,a:1}`) will be counted as different verdicts and may silently prevent consensus from being reached. Consider documenting this caveat on the `verdictKey` field (recommending callers supply a canonical key for object verdicts) or using a canonical/sorted-key serialization as the default.

### Thread 3: tools/workflow-engine/consensus.test.ts:75 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:27:31Z):

The test description and inline comment claim "supermajority 2/3" but the mechanism uses `threshold: 0.6` (60%), not 2/3 (~0.667). This is misleading — 6 of 9 = 0.667 only happens to exceed 0.6; with a true 2/3 threshold the check would be `0.667 > 0.667 = false` and the test would fail. Either update the threshold to test the actual 2/3 boundary intent, or rename the test/comment to reflect the 60% threshold actually used.

### Thread 4: tools/workflow-engine/consensus.test.ts:254 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:27:31Z):

The test name "agreement metrics expose distribution (substrate-honest dashboard)" does not match what the test actually asserts. The body sets up 3/2/1 votes among 6 analyzers and only asserts that the result is `NoConsensus` (because 3 is not strictly greater than 3) — it never inspects `agreement.verdictCounts`, `winnerCount`, `successfulAnalyzers`, or any other distribution metric. Either add assertions on the agreement metrics (which would require this to be a successful-consensus case), or rename the test to reflect that it verifies the strict-majority boundary (3-of-6 → NoConsensus).

## General comments

### @chatgpt-codex-connector (2026-05-28T11:23:53Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
