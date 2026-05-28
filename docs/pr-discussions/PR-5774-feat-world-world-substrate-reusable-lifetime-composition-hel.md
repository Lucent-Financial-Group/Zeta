---
pr_number: 5774
title: "feat(world): world substrate + reusable lifetime-composition helpers (Aaron 2026-05-28 naming substrate + 'do you have to write custom code everytime' answer); 14 tests pass"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T11:29:38Z"
merged_at: "2026-05-28T12:43:01Z"
closed_at: "2026-05-28T12:43:01Z"
head_ref: "otto-cli/world-and-reusable-lifetime-composition-helpers-naming-substrate-aaron-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T13:04:41Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5774: feat(world): world substrate + reusable lifetime-composition helpers (Aaron 2026-05-28 naming substrate + 'do you have to write custom code everytime' answer); 14 tests pass

## PR description

## Summary

Per Aaron 2026-05-28 two substantive substrate-engineering substrate questions:

1. *'do you have to write custom code everytime you compose two lifetimes'* → **NO**; dispatch substrate is reusable; helpers factor recurring patterns
2. *'(do we still call the shared git flow a lifetime or world or shared space?)'* → **WORLD** (Aaron-naming-canonical for shared substrate)

## Naming canon

- **LIFETIME** = editable per-substrate-entity DU (Aaron's prior framing)
- **WORLD** = shared substrate where multiple lifetimes interact
- **GIT FLOW** = operational form of the world

## Reusability helpers (answers Q1)

- `defaultAdvanceMatrix` — every-cell defaults to advance; overrides per-cell
- `terminalMatrix` — single-cell complete; other terminal-A cells block
- `predicateMatrix` — most general; caller predicate per cell
- `StandardVerdict` — recurring verdict vocabulary (advance/block/complete/no-op/escalate-to-operator)

## Composes with

- composed-lifetime.ts PR #5771 (base dispatch)
- B-0832 civ-sim (game-world)
- B-0867 workflow engine
- 13th-ferry §33.7 multi-AI cascade

**14 tests pass / 0 fail.**

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @github-code-quality (2026-05-28T11:31:15Z)

_(no body)_

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T11:34:12Z)

## Pull request overview

This PR adds a `world` substrate layer over the existing composed-lifetime dispatch helpers, providing reusable matrix builders and a registry-based dispatch entrypoint for lifetime-pair compositions.

**Changes:**
- Adds `World`, `StandardVerdict`, registration/lookup, and `dispatchInWorld`.
- Adds reusable matrix helpers for default-advance, terminal-cell, and predicate-driven compositions.
- Adds Bun tests covering registry behavior, helper matrix generation, and world dispatch.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 3 comments.

| File | Description |
| ---- | ----------- |
| `tools/workflow-engine/world.ts` | Introduces the world registry abstraction and reusable lifetime-composition helpers. |
| `tools/workflow-engine/world.test.ts` | Adds 14 tests for world registration, lookup, matrix helpers, verdicts, and multi-pair dispatch. |

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T12:00:05Z)

## Pull request overview

Copilot reviewed 2 out of 2 changed files in this pull request and generated 4 comments.

## Review threads

### Thread 1: tools/workflow-engine/world.test.ts:22 (resolved)

**@github-code-quality** (2026-05-28T11:31:14Z):

## Unused variable, import, function or class

Unused import composeKey.

---

To fix this kind of issue, remove any import specifier that is not referenced in the file. This keeps the module surface minimal and avoids static-analysis noise.</p>
<p>For this file (<code>tools/workflow-engine/world.test.ts</code>), the single best non-functional change is:</p>
<ul>
<li>Edit the grouped import from <code>./world</code>.</li>
<li>Remove <code>composeKey</code> from the named imports.</li>
<li>Keep all other imports unchanged.</li>
</ul>
<p>No new methods, definitions, or external dependencies are required.

### Thread 2: tools/workflow-engine/world.ts:12 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:34:11Z):

P1 codebase convention: this is a current-state code surface under `tools/`, but the header introduces direct human-name attribution. The repo's no-name-attribution rule requires code/docs/skills outside allowlisted history surfaces to use role references instead (see `docs/AGENT-BEST-PRACTICES.md:671-685`). Please rewrite these mentions to role refs such as "the human maintainer" while keeping the naming rationale intact.

### Thread 3: tools/workflow-engine/world.ts:24 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:34:12Z):

P1 xref integrity: `B-0832` is not the civ-sim/game-world backlog item; the current backlog row `docs/backlog/P2/B-0832-...` is for installer nmtui WiFi rescan, while the civ-sim Pauli-exclusion pointer is documented as PR #2832 in `docs/backlog/P1/B-0465-product-repo-per-product-substrate-inventory-2026-05-14.md:98-103`. Please correct this reference so future readers don't follow the wrong backlog trail.

### Thread 4: tools/workflow-engine/world.ts:111 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:34:12Z):

P1 API design: `World.registry` erases every registered matrix to `unknown`, and `lookupLifetimePair`/`dispatchInWorld` let callers choose arbitrary `<A, B, T>` for a `pairName`. That makes it easy to register one verdict type and later dispatch the same pair as an incompatible `T`, with TypeScript accepting the call and runtime consumers seeing the wrong shape. Consider preserving the registration's type through a typed pair handle or a generic world mapping keyed by pair name, rather than requiring callers to reassert the types at lookup time.

### Thread 5: tools/workflow-engine/world.ts:13 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:00:03Z):

P1: This code file introduces direct human name attribution in the reusable module header. Outside the closed history/research surfaces, repository convention is to use role references (for example, "the human maintainer" or the relevant role) rather than personal names, so the header should be de-named or moved to an allowed provenance surface.

### Thread 6: tools/workflow-engine/world.ts:24 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:00:04Z):

P1: This cross-reference is inaccurate: B-0832 is the installer/nmtui WiFi rescan backlog row, not the civ-sim/game-world Pauli-exclusion work. Please replace this with the correct civ-sim anchor (for example the relevant PR/research reference) or remove the backlog ID so future readers are not routed to the wrong work item.

### Thread 7: tools/workflow-engine/world.ts:176 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:00:04Z):

P1: `lookupLifetimePair` returns the registry entry as whatever `A`, `B`, and `T` the caller requests, even though the registry stores `unknown` by string key. A wrong pair name or wrong generic arguments will be accepted and typed as a valid matrix, so consumers lose the exhaustiveness/type-safety this substrate is meant to provide. Consider using a typed pair token/descriptor or storing runtime metadata with each registered pair so lookup can validate the requested shape instead of relying on this cast.

### Thread 8: tools/workflow-engine/world.ts:250 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:00:04Z):

P1: The unregistered-pair failure is added as an inline return-type extension instead of being part of an exported feedback union. Callers that already handle `TransitionResult<T>`/`TransitionFeedback` now need ad-hoc narrowing for this one function, and downstream exhaustive switches cannot name the complete world-dispatch feedback type. Please export a named `WorldTransitionFeedback`/`WorldTransitionResult<T>` (or extend the shared feedback DU deliberately) so the feedback surface stays exhaustively typed.

## General comments

### @chatgpt-codex-connector (2026-05-28T11:29:44Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).

### @AceHack (2026-05-28T12:24:24Z)

Lior review: This PR effectively establishes the 'world' substrate and provides helpful, reusable matrix builders. The changes are atomic, well-tested, and clearly documented. This is a good step forward for substrate reusability. No drift detected.
