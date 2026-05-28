---
pr_number: 5771
title: "feat(composed-lifetime): double-dispatch substrate for 2 editable-lifetime DUs (Aaron 2026-05-28 + lifetime-not-lifecycle naming sharpening); 11 tests pass"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T11:25:19Z"
merged_at: "2026-05-28T11:27:51Z"
closed_at: "2026-05-28T11:27:51Z"
head_ref: "otto-cli/double-dispatch-composed-lifetime-substrate-pattern-3-template-literal-type-composes-two-editable-lifetime-dus-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T12:34:56Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5771: feat(composed-lifetime): double-dispatch substrate for 2 editable-lifetime DUs (Aaron 2026-05-28 + lifetime-not-lifecycle naming sharpening); 11 tests pass

## PR description

## Summary

Per Aaron 2026-05-28: 'how can we do double dispatch in this system, when you compose two lifecycles you need it' + 'the only reason i'm confortable calling it a lifetime is becuase you can edit it FYI the DUs.'

**Pattern 3 (template-literal-type composed key)** + **Pattern 4 (matrix lookup)** for double-dispatch over 2 editable-lifetime DUs. TS strict-mode enforces exhaustiveness via `never`; each transition declares its own Result-shape verdict.

## Naming distinction (Aaron-sharpened)

- LIFECYCLE = fixed/final/locked at design time
- LIFETIME = editable substrate; DU variants evolve

## Composes with

- B-0867.20 PR #5758 (rename target: lifetime DU split)
- B-0914.2 PR #5769 closed-loop (composed-lifetime dispatch via callback)
- B-0914.4 PR #5768 pairing tracker
- Mod 2 grammar-extension + substrate-smoothness + asymmetric-authorship

## Test plan

- [x] 11 tests pass
- [x] All 3 TransitionFeedback variants
- [x] Editable-substrate test (matrix extension at runtime)
- [x] Full 9-transition workflow-review composition
- [ ] CI: lint(tsc tools)
- [ ] Auto-merge armed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T11:26:17Z)

## Pull request overview

Adds a new pure-TS double-dispatch substrate at `tools/workflow-engine/composed-lifetime.ts` for composing two editable-lifetime discriminated unions via a composed `${a.kind}:${b.kind}` key, plus a matrix-builder and a sparse cross-product helper. Returns Result-shape verdicts per the monad-propagation convention. Companion test file covers 11 cases including invalid-state, default verdict, runtime matrix extension, and a full 9-transition workflow-review composition.

**Changes:**
- New `composed-lifetime.ts` module with `composeKey`, `dispatchComposed`, `buildComposedMatrix`, `composeFromDispatcher`, plus `LifetimeState`, `ComposedKey`, `TransitionFeedback`, `TransitionResult` types.
- New test suite `composed-lifetime.test.ts` with 11 tests exercising all `TransitionFeedback` variants and runtime matrix editability.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| tools/workflow-engine/composed-lifetime.ts | Pure-TS double-dispatch substrate: composed-key compute, matrix-based dispatcher returning Result-shape verdict, matrix builders. |
| tools/workflow-engine/composed-lifetime.test.ts | 11 invariant tests covering known/unknown transitions, invalid states, defaultVerdict, runtime matrix extension, and full 9-transition composition. |

## General comments

### @chatgpt-codex-connector (2026-05-28T11:25:26Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
