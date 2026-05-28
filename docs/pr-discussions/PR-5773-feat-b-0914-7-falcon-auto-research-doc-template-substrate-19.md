---
pr_number: 5773
title: "feat(B-0914.7): Falcon auto-research-doc template substrate; 19 tests pass \u2014 completes 7-of-7 B-0914 candidate substrate-engineering gap substrate"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T11:27:53Z"
merged_at: "2026-05-28T12:22:14Z"
closed_at: "2026-05-28T12:22:14Z"
head_ref: "otto-cli/b-0914-7-falcon-auto-research-doc-template-generator-substrate-engineering-substrate-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T12:33:11Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5773: feat(B-0914.7): Falcon auto-research-doc template substrate; 19 tests pass — completes 7-of-7 B-0914 candidate substrate-engineering gap substrate

## PR description

## Summary

Sakana Robin Falcon agent pattern: 8-section research-doc template scaffold + Markdown renderer. Downstream LLM substrate-engineering populates pending sections.

**19 tests pass / 0 fail.**

## Completes 7-of-7 B-0914 candidate substrate-engineering gap substrate

| Gap | PR |
|---|---|
| B-0914.1 TrueSkill | #5764 |
| B-0914.2 Closed-loop | #5769 (L) |
| B-0914.3 N-parallel + consensus | #5770 |
| B-0914.4 Gen-reflect pairing | #5768 (M) |
| B-0914.5 Evolution mash-refine | #5767 (S) |
| B-0914.6 Proximity-dedup | #5772 |
| **B-0914.7 Falcon auto-research-doc** | **THIS PR** |

## Test plan

- [x] 19 tests pass; all 9 section kinds rendered
- [x] EmptyProposalId / NoSectionsRendered validation
- [x] Pending markers preserved (substrate-honest)
- [x] ResearchDocSection exhaustive switch
- [ ] CI: lint(tsc tools)
- [ ] Auto-merge armed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T11:30:57Z)

## Pull request overview

Adds a new TypeScript-side “research doc” scaffold/renderer under `tools/workflow-engine/` (B-0914.7), intended to generate a structured Markdown template (Falcon-style) from a proposal/hypothesis, with accompanying Bun tests to lock in the section shapes and rendering invariants.

**Changes:**
- Introduces `ResearchDocSection` / `ResearchDoc` types plus `buildSkeleton`, `renderSection`, `renderResearchDoc`, and `buildAndRender` helpers.
- Implements Markdown rendering for all section kinds, including placeholder “PENDING …” markers.
- Adds a comprehensive Bun test suite covering validation, rendering behavior, and union exhaustiveness.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 2 comments.

| File | Description |
| ---- | ----------- |
| tools/workflow-engine/research-doc.ts | New research-doc template generator + Markdown renderer APIs. |
| tools/workflow-engine/research-doc.test.ts | Bun tests for skeleton construction, rendering, placeholders, and exhaustiveness checks. |

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T12:22:24Z)

## Pull request overview

Copilot reviewed 2 out of 2 changed files in this pull request and generated 4 comments.

## Review threads

### Thread 1: tools/workflow-engine/research-doc.ts:31 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:30:56Z):

The rule-path references in this header comment don’t match the actual rule filenames under `.claude/rules/` (e.g., `asymmetric-authorship` and `monad-propagation-pattern` aren’t present as such). Please update these references to the correct rule IDs/filenames (consistent with `tools/workflow-engine/README.md`), so cross-references stay greppable and don’t drift.

### Thread 2: tools/workflow-engine/research-doc.ts:67 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:30:57Z):

`ResearchDocFeedback` includes `InvalidOperationalStatus`, but `operationalStatus` is already a string-literal union and there’s no code path that can produce this feedback. Either remove this feedback variant, or change/parse `operationalStatus` from an untrusted string and validate it so this variant is reachable.

### Thread 3: tools/workflow-engine/research-doc.ts:23 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:22:23Z):

P1 (codebase_conventions): This header comment introduces named attributions (e.g., “Sakana Robin”, “Amara”). Per `docs/AGENT-BEST-PRACTICES.md` Operational standing rule “No name attribution in code, docs, or skills” (docs/AGENT-BEST-PRACTICES.md:671-736), current-state code under `tools/` should use role-refs / neutral citations rather than proper-name attribution. Please rewrite these references to be name-free (e.g., cite the paper/venue/year or a stable identifier) and keep named provenance on allowlisted history surfaces if needed.

### Thread 4: tools/workflow-engine/research-doc.ts:215 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:22:24Z):

P1 (maintainability): `buildSkeleton` seeds structured fields like `supporting`, `risks`, and `substrates` with placeholder sentinel strings (e.g., "[PENDING …]"). Because these arrays are otherwise meant to contain real evidence/risk/substrate identifiers, downstream code can’t reliably distinguish “pending” from “real value” without string parsing. Prefer representing pending-ness structurally (e.g., empty arrays plus separate pending markers/notes fields, or put placeholders only in `content`/`raw` sections).

### Thread 5: tools/workflow-engine/research-doc.ts:225 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:22:24Z):

P1 (bug): `id` is described as a canonical filename-safe identifier, but it’s derived from the raw `proposalId` without trimming/collapsing and can become non-informative (e.g., proposalId="!!!" → id="___"), increasing collision risk and making it hard to use as a stable filename. Consider normalizing more strongly (trim, collapse runs of `_`, strip leading/trailing `_`, and ensure a non-empty fallback) so `id` is genuinely canonical.

### Thread 6: tools/workflow-engine/research-doc.ts:10 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:22:24Z):

P2 (documentation): The header comment says the scaffold “takes a Hypothesis + produces a research-doc template”, but the exported API (`buildSkeleton`/`buildAndRender`) currently takes `ResearchDocSkeletonContext` (proposalId/title/scope/attribution) rather than a `Hypothesis<T>`. Consider rewording the comment to match the actual API shape so readers don’t go looking for a Hypothesis dependency here.

## General comments

### @chatgpt-codex-connector (2026-05-28T11:27:57Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
