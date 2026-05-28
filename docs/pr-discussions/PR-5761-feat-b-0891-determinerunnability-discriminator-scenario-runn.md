---
pr_number: 5761
title: "feat(B-0891): determineRunnability discriminator \u2014 Scenario \u2192 RunnabilityVerdict (zflash lane substantive work; completes 3-lane parallel discriminator pattern with PR #5758 + PR #5760)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T10:56:17Z"
merged_at: "2026-05-28T10:58:53Z"
closed_at: "2026-05-28T10:58:53Z"
head_ref: "otto-cli/b-0891-determine-runnability-discriminator-completes-3-lane-parallel-pattern-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T13:04:48Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5761: feat(B-0891): determineRunnability discriminator — Scenario → RunnabilityVerdict (zflash lane substantive work; completes 3-lane parallel discriminator pattern with PR #5758 + PR #5760)

## PR description

## Summary

Adds `determineRunnability` discriminator to zflash test-harness. **Completes the 3-lane parallel substrate-engineering pattern**:

| Lane | Discriminator | PR |
|---|---|---|
| Workflow engine | `determineReviewLevel` | #5758 (merged) |
| Encryption | `determineEncryptionPath` | #5760 (wait-ci) |
| **zflash** | **`determineRunnability`** | **this PR** |

Same substrate-engineering substrate (Result-shaped discriminator that maps substrate-context → typed verdict) operating at 3 different substrate scopes. The 3-lane work isn't 3 independent implementations; it's the same substrate-engineering substrate from monad-propagation + asymmetric-authorship rules operating across lanes producing parallel substrate.

## What this adds

- `RunnabilityVerdict` discriminated union (6 variants)
- `determineRunnability(scenario, runnableUpstream): RunnabilityVerdict` function
- `computeRunnableSet()` convenience

## Policy

| Scenario id | Status | Verdict |
|---|---|---|
| initial-format | composes-with-existing | can-run-now (qemu-boot-test) |
| boot-cluster-up | composes-with-existing | can-run-now (qemu-full-install-test) |
| reformat-with-retention | scaffolded | blocked-on-state-preservation (persisted-kv) |
| reformat-from-scratch | scaffolded | blocked-on-test-harness-path-fork |
| cluster-joining | scaffolded | blocked-on-multi-vm-orchestration |

**20 tests pass / 0 fail**

## Composes with substrate

- B-0891 row (zflash test-harness)
- B-0867.20 PR #5758 (workflow-engine parallel discriminator)
- B-0883 PR #5760 (encryption parallel discriminator)
- PR #5757 (Amara ferry substrate-check)
- PR #5516 asymmetric-authorship + PR #5511 monad-propagation

## Test plan

- [x] 8 new tests + 20 total pass
- [x] Exhaustiveness via TS strict-mode switch on RunnabilityVerdict
- [x] computeRunnableSet matches composes-with-existing count
- [ ] CI: lint(tsc tools)
- [ ] Auto-merge armed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T10:59:14Z)

## Pull request overview

Adds a new TypeScript discriminator in the zflash test harness to classify each zflash scenario’s current “runnability” as a typed verdict, alongside helper logic to compute the runnable set and accompanying tests. This follows the same “context → typed verdict” discriminator pattern used in the workflow-engine and encryption lanes.

**Changes:**
- Introduces `RunnabilityVerdict` and `determineRunnability(scenario, runnableUpstream)` in `tools/zflash/test-harness/scenarios.ts`.
- Adds `computeRunnableSet()` convenience helper for identifying scenarios that can run now.
- Expands `scenarios.test.ts` with discriminator tests and a compile-time exhaustiveness “acknowledger” switch.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 2 comments.

| File | Description |
| ---- | ----------- |
| tools/zflash/test-harness/scenarios.ts | Adds `RunnabilityVerdict`, `determineRunnability`, and `computeRunnableSet` for scenario runnability classification. |
| tools/zflash/test-harness/scenarios.test.ts | Adds tests covering the new discriminator behavior and runnable-set computation. |

## Review threads

### Thread 1: tools/zflash/test-harness/scenarios.ts:174 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-28T10:59:13Z):

The comment block uses named attribution (e.g., "Aaron", "Amara") in a code file under tools/. Repo guidance is to avoid name attribution outside the documented history surfaces and use role-refs instead (see .github/copilot-instructions.md:317-378). Consider rewriting this header to role-based wording (e.g., "the human maintainer", "ferry archive") while keeping the technical cross-references.

### Thread 2: tools/zflash/test-harness/scenarios.ts:246 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-28T10:59:14Z):

`determineRunnability` computes `missingGates` from `scenario.gates` but intentionally does not act on it (comment says gates are downstream). This means `runnableUpstream` never affects the verdict, and the `blocked-on-upstream-gate` variant is currently unreachable despite being part of `RunnabilityVerdict`/the policy comment. Please either implement upstream-blocking via the reverse-gating relation (like run.ts using `g.gates.includes(scenario.id)`), or remove/rename the upstream-gate variant and adjust docs/parameter naming to match downstream-gating semantics.

## General comments

### @chatgpt-codex-connector (2026-05-28T10:56:22Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
