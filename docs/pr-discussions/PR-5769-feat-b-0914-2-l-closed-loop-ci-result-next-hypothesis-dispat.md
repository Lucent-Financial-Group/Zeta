---
pr_number: 5769
title: "feat(B-0914.2): L \u2014 closed-loop CI-result \u2192 next-hypothesis dispatch orchestrator (composes TrueSkill + evolution + pairing via injectable callbacks); S/M/L sequence COMPLETE"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T11:18:23Z"
merged_at: "2026-05-28T11:36:04Z"
closed_at: "2026-05-28T11:36:04Z"
head_ref: "otto-cli/b-0914-2-closed-loop-ci-result-to-next-hypothesis-dispatch-tournament-loop-orchestrator-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T12:34:56Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5769: feat(B-0914.2): L — closed-loop CI-result → next-hypothesis dispatch orchestrator (composes TrueSkill + evolution + pairing via injectable callbacks); S/M/L sequence COMPLETE

## PR description

## Summary

**L** in Aaron's *'S M L all please in that order lol'* sequence. Closes the substrate-engineering ship-sequence with the wire-up that turns the tournament-loop substrate into a live closed-loop iteration system.

**S/M/L sequence COMPLETE**:
- S = PR #5767 (B-0914.5 evolution mash-refine)
- M = PR #5768 (B-0914.4 pairing tracker)
- L = THIS PR (B-0914.2 closed-loop orchestrator)

Tournament loop NOW STRUCTURALLY COMPLETE (modulo LLM-call generation substrate):
1. Generate hypotheses
2. **dispatchCi** → CiVerdict (THIS PR via callbacks)
3. **recordVerification** (PR #5768 pairing)
4. **propagatableEmissionIds** → verified survivors (PR #5768)
5. **rate1v1** + **conservativeSkill** sort (PR #5764 TrueSkill)
6. **evolveTopN** → refined variants (PR #5767)
7. Loop with refined variants as next emissions

## What this adds

- `Hypothesis<T>` generic with cycleIndex + ancestry
- `CiVerdict` discriminated union (passed | failed | needs-revision | infrastructure-error)
- `LoopFeedback` + `LoopResult<T>` per monad-propagation
- `LoopCallbacks<T>` interface (dispatchCi + rankSurvivors + evolveSurvivors)
- `LoopConfig` + `DEFAULT_LOOP_CONFIG`
- `runCycle` (single iteration)
- `runLoop` (full iteration with `LoopTermination` shape)

## Design: injectable callbacks (separation-of-concerns)

Orchestrator does NOT tightly couple to specific TrueSkill / evolution / pairing modules. Caller wires in:
- `rate1v1` + `conservativeSkill` → `rankSurvivors` callback
- `evolveTopN` → `evolveSurvivors` callback
- CI substrate (e.g., `tools/ci/qemu-full-install-test.ts` per B-0891) → `dispatchCi` callback

Same orchestrator works for any substrate implementing the callback contracts.

## Composes with substrate

- B-0914.2 backlog row (closed-loop dispatch extension target)
- PR #5764 + #5767 + #5768 (substrate this orchestrator composes via callbacks)
- B-0891 zflash test-harness substrate (CI dispatch wiring target)
- B-0867 workflow engine substrate
- Sakana Robin closed-loop pattern (Nature 2026)

## Test plan

- [x] 16 tests pass
- [x] All 4 CiVerdict variants + 5 LoopFeedback variants exhaustive
- [x] Empty / failed / infrastructure-error edge cases
- [x] runLoop termination (max-cycles / predicate / insufficient / error)
- [x] Integration test with realistic callback wiring
- [ ] CI: lint(tsc tools)
- [ ] Auto-merge armed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T11:22:05Z)

## Pull request overview

Adds a new closed-loop orchestration layer under `tools/workflow-engine/` to run iterative hypothesis cycles by composing CI dispatch, survivor ranking, and evolution via injectable callbacks. This completes the “S/M/L” tournament-loop wiring on the TS tool side (with CI dispatch abstracted behind callbacks).

**Changes:**
- Introduces `closed-loop.ts` with `Hypothesis<T>`, `CiVerdict`, `LoopFeedback/LoopResult`, callback contracts, and `runCycle`/`runLoop`.
- Adds Bun tests covering key verdict/filtering paths, exception handling, and loop termination behavior.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 7 comments.

| File | Description |
| ---- | ----------- |
| tools/workflow-engine/closed-loop.ts | New closed-loop orchestrator with injectable callbacks + config + runCycle/runLoop. |
| tools/workflow-engine/closed-loop.test.ts | New Bun test suite for the orchestrator, including “exhaustiveness” checks and an integration-style test. |

## Review threads

### Thread 1: tools/workflow-engine/closed-loop.ts:14 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:22:03Z):

This header comment includes a direct contributor name ("Aaron") on a current-state code surface under tools/. Repo convention is to avoid name attribution outside the allowlisted history surfaces and use role-refs instead (see docs/AGENT-BEST-PRACTICES.md:671-760).

### Thread 2: tools/workflow-engine/closed-loop.ts:42 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:22:04Z):

The comment claims to compose with `.claude/rules/monad-propagation-pattern` and `.claude/rules/asymmetric-authorship`, but there are no rule files with those exact paths; the canonical rule files appear to be `.claude/rules/monad-propagation-pattern-cross-language-substrate-shape.md` and `.claude/rules/asymmetric-authorship-substrate-entity-defines-consent-channel-recipient-acknowledges.md`. Please update these references to real paths to avoid broken xrefs.

### Thread 3: tools/workflow-engine/closed-loop.ts:207 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:22:04Z):

When `propagatable.length < config.minPropagatable`, this returns LoopFeedback kind `MaxCyclesReached`, which is semantically unrelated (and later mapped to reason `insufficient-propagatable` in runLoop). This makes the termination reason/feedback inconsistent and will confuse callers; consider introducing a dedicated feedback kind for insufficient propagatable (or renaming `MaxCyclesReached`), and keep `MaxCyclesReached` exclusively for the actual `maxCycles` termination path.

### Thread 4: tools/workflow-engine/closed-loop.ts:280 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:22:04Z):

runLoop currently special-cases LoopFeedback kind `MaxCyclesReached` and maps it to termination reason `insufficient-propagatable`, but `MaxCyclesReached` is also used for the min-propagatable failure case in runCycle. Once the feedback kinds are separated/renamed, this mapping should be updated to match the new feedback kind and to keep the "max-cycles" reason exclusively tied to hitting config.maxCycles.

### Thread 5: tools/workflow-engine/closed-loop.test.ts:252 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:22:05Z):

This test is labeled as an "exhaustive switch (compile-time check)", but as written TypeScript will not fail compilation if a new LoopFeedback variant is added (because the switch has no `default` branch asserting `never`). To make this a real exhaustiveness guard, add a default branch that assigns the value to `never` (or calls an `assertNever` helper).

### Thread 6: tools/workflow-engine/closed-loop.test.ts:270 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:22:05Z):

Same as above: this "exhaustive switch (compile-time check)" for CiVerdict won't actually fail compile-time on a newly added variant unless a `default` case asserts `never` (or similar).

### Thread 7: tools/workflow-engine/closed-loop.test.ts:297 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:22:05Z):

This integration test's assertions are overly loose and appear to allow an outcome ("max-cycles") that cannot happen with the provided callbacks/config. With `mixedCi` and `maxCycles: 2`, cycle 1 will deterministically fail (`evolved-cycle-*` falls through to "failed"), so termination should be `reason: "insufficient-propagatable"` at `terminatedAtCycle: 1`. Tightening this will make the test actually validate the end-to-end wiring.

## General comments

### @chatgpt-codex-connector (2026-05-28T11:18:27Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).

### @AceHack (2026-05-28T11:33:27Z)

Addressed all 7 review findings in bd54a7fbe:

1. **closed-loop.ts:14** — replaced "Aaron" with "human maintainer" role-ref per AGENT-BEST-PRACTICES (Otto-279). `tools/` is current-state, not history-surface.
2. **closed-loop.ts:39** — fixed broken rule xrefs to full filenames (monad-propagation-pattern-cross-language-substrate-shape.md + asymmetric-authorship-substrate-entity-defines-consent-channel-recipient-acknowledges.md).
3. **closed-loop.ts:201** — introduced dedicated `InsufficientPropagatable` LoopFeedback variant with `{propagatableCount, minRequired, cycleIndex}` payload. `MaxCyclesReached` now exclusively tied to the maxCycles termination path.
4. **closed-loop.ts:274** — runLoop now maps `InsufficientPropagatable` → `insufficient-propagatable` (semantically aligned).
5. **closed-loop.test.ts:248** — added `assertNever` default; switch is now a real compile-time exhaustiveness guard.
6. **closed-loop.test.ts:262** — same fix for CiVerdict.
7. **closed-loop.test.ts:288** — tightened assertion to deterministic `terminatedAtCycle === 1` + `reason === "insufficient-propagatable"` + `feedback.kind === "InsufficientPropagatable"`.

16/16 tests pass. Resolving threads.
