---
pr_number: 5772
title: "feat(B-0914.6): proximity-agent substrate-engineering substrate de-duplication (canonical-form + Jaccard clustering); 19 tests pass"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T11:26:37Z"
merged_at: "2026-05-28T12:16:24Z"
closed_at: "2026-05-28T12:16:24Z"
head_ref: "otto-cli/b-0914-6-proximity-agent-substrate-engineering-substrate-deduplication-canonical-form-normalization-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T13:46:10Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5772: feat(B-0914.6): proximity-agent substrate-engineering substrate de-duplication (canonical-form + Jaccard clustering); 19 tests pass

## PR description

## Summary

Google co-scientist proximity agent pattern generalized to TS-side substrate. Two de-dup mechanisms: canonical-form normalization (deterministic) + Jaccard-similarity clustering (lightweight; no embedding model).

**19 tests pass / 0 fail.**

## Composes with

- B-0914.5 PR #5767 evolution (de-dup Survivor list before mash)
- B-0914.2 PR #5769 closed-loop (de-dup pre-CI-dispatch)
- verify-existing-substrate-before-authoring (proximity IS substrate-inventory at runtime scope)
- additive-not-zero-sum + monad-propagation + asymmetric-authorship

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T11:30:46Z)

## Pull request overview

Adds a TypeScript proximity de-duplication substrate for workflow-engine experiments, supporting deterministic canonical-form clustering and lightweight Jaccard/token similarity clustering for near-duplicate hypotheses before ranking/evolution/CI dispatch.

**Changes:**
- Adds `proximity.ts` with Result-shaped clustering APIs, tokenization, Jaccard similarity, and representative extraction.
- Adds `proximity.test.ts` with 19 Bun tests covering canonical clustering, similarity clustering, tokenizer behavior, errors, and evolution-substrate composition.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 2 comments.

| File | Description |
| ---- | ----------- |
| `tools/workflow-engine/proximity.ts` | Implements proximity de-duplication primitives and public API types. |
| `tools/workflow-engine/proximity.test.ts` | Adds invariant and behavior coverage for the new proximity substrate. |

## Review threads

### Thread 1: tools/workflow-engine/proximity.ts:23 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:30:45Z):

P1 xref: this docblock references a “B-0914.6 backlog row”, but `docs/backlog/` has no `B-0914.6` row in this checkout. Either add the row in this PR or remove/adjust this cross-reference so the new substrate does not point readers at a non-existent backlog artifact.

### Thread 2: tools/workflow-engine/proximity.ts:63 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:30:46Z):

`Cluster` is returned by both canonical and similarity clustering, but this field is documented as the canonical-form key even though `clusterBySimilarity` fills it with a synthesized similarity label derived from representative tokens. Rename/generalize the field or adjust the contract so callers do not treat similarity results as canonical-form keys.

## General comments

### @chatgpt-codex-connector (2026-05-28T11:26:41Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
