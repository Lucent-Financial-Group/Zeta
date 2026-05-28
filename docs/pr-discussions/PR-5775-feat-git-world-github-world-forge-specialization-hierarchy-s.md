---
pr_number: 5775
title: "feat(git-world + github-world): forge-specialization hierarchy substrate (Aaron 2026-05-28 'git world + github specialization'); 16 tests pass"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T11:33:30Z"
merged_at: "2026-05-28T12:35:50Z"
closed_at: "2026-05-28T12:35:50Z"
head_ref: "otto-cli/git-world-and-github-world-specialization-substrate-naming-hierarchy-aaron-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T12:43:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5775: feat(git-world + github-world): forge-specialization hierarchy substrate (Aaron 2026-05-28 'git world + github specialization'); 16 tests pass

## PR description

## Summary

Per Aaron 2026-05-28: *'we have a git world and a github specilazation of it for REST/graphql enhancements/optimizations/resource allocations/etc...'*

**Substrate-engineering substrate-naming hierarchy** (Aaron-explicit):

- **GitWorld** = base substrate (commit/branch/merge/rebase via git protocol)
- **GitHubWorld** = specialization (inherits GitWorld + adds PR substrate + review-thread + REST/GraphQL resource budgets + GitHub optimizations)

## What this adds

- `GitWorld` + `BranchLifetime` + `CommitLifetime` + `buildGitWorld()`
- `GitHubWorld` + `PrLifetime` + `ReviewThreadLifetime` + `buildGitHubWorld()`
- `GitHubResourceBudget` (REST core + GraphQL with reset timestamps)
- `RateLimitTier` + `rateLimitTier()` per framework's rate-limit-tier substrate
- `canAfford()` — operation budget check; `ResourceBudgetExhausted` feedback
- `registerInGitHub()` — register lifetime pair preserving specialization substrate
- Reusable: `GITHUB_PR_UNIVERSE`, `GITHUB_REVIEW_THREAD_UNIVERSE`, `REQUIRE_RESOLVED_VERDICT`

**16 tests pass / 0 fail.**

## Future specializations

GitLabWorld + GiteaWorld + BitbucketWorld + CodebergWorld + SourcehutWorld each compose with GitWorld base.

## Composes with

- PR #5774 world substrate (cherry-picked; becomes no-op merge when #5774 lands)
- PR #5771 composed-lifetime dispatch
- B-0867.15 per-host adapters
- B-0904 GitHub-as-free-event-store
- B-0865.17 cross-vendor benchmark
- `.claude/rules/refresh-world-model-poll-pr-gate.md` (rate-limit tier table)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @github-code-quality (2026-05-28T11:35:11Z)

_(no body)_

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T11:37:40Z)

## Pull request overview

This PR adds workflow-engine substrates for a generic world registry and Git/GitHub specialization modeling, including reusable lifetime-composition helpers and resource-budget checks.

**Changes:**
- Adds `World` registry helpers and reusable matrix builders for composed lifetimes.
- Adds `GitWorld` and `GitHubWorld` lifetimes, universes, rate-limit tiering, and budget checks.
- Adds Bun tests covering world registration, dispatch helpers, GitHub universes, and budget behavior.

### Reviewed changes

Copilot reviewed 4 out of 4 changed files in this pull request and generated 2 comments.

| File | Description |
| ---- | ----------- |
| `tools/workflow-engine/world.ts` | Adds generic world substrate, verdict vocabulary, matrix helpers, and world dispatch. |
| `tools/workflow-engine/world.test.ts` | Tests world registration, lookup, matrix helpers, and dispatch behavior. |
| `tools/workflow-engine/git-world.ts` | Adds Git/GitHub world specialization types, resource budget checks, and reusable GitHub constants. |
| `tools/workflow-engine/git-world.test.ts` | Tests Git/GitHub world construction, rate-limit tiers, budget checks, and GitHub lifetime registration. |

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T12:05:25Z)

## Pull request overview

Copilot reviewed 4 out of 4 changed files in this pull request and generated 3 comments.

## Review threads

### Thread 1: tools/workflow-engine/world.test.ts:19 (resolved)

**@github-code-quality** (2026-05-28T11:35:11Z):

## Unused variable, import, function or class

Unused import composeKey.

---

To fix an unused import, remove only the unused symbol from the named import list while leaving all other imports unchanged. This preserves behavior and keeps the file clean.</p>
<p>In <code>tools/workflow-engine/world.test.ts</code>, edit the import block from <code>./world</code> and delete <code>composeKey,</code> (currently line 10 in the snippet). No other code changes are required unless <code>composeKey</code> is actually used elsewhere in the file; in that case, keep it and ignore/suppress the warning appropriately. Based on the reported CodeQL finding, the intended fix is removal.

### Thread 2: tools/workflow-engine/git-world.test.ts:21 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:37:39Z):

`ComposedKey` is imported from `./git-world`, but `git-world.ts` only imports this type from `./world` for its own use and does not re-export it. Because `tsconfig.json` includes `**/*.ts`, typechecking this test will fail with a non-exported member error. Import `ComposedKey` from `./world` (or explicitly re-export it from `git-world.ts`) instead.

### Thread 3: tools/workflow-engine/world.ts:14 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T11:37:40Z):

This code-surface module introduces direct contributor name attribution in its comments. The repo convention requires role references on current-state surfaces such as code, with named attribution confined to the allowlisted history/research surfaces (docs/AGENT-BEST-PRACTICES.md:671-685, 725-743). Please rewrite these mentions to role-refs such as “the human maintainer” or link to an allowed history surface for provenance.

### Thread 4: tools/workflow-engine/world.ts:24 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:05:24Z):

P1/xref: this backlog cross-reference does not match the repository's B-0832 row, which is an installer nmtui WiFi item rather than the cited civ-sim/game-world substrate. Please correct the B-row ID or remove the incorrect reference so future readers do not route work to the wrong backlog item.

### Thread 5: tools/workflow-engine/git-world.ts:6 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:05:24Z):

P1: this current-state tooling file is outside the history-surface and roster-mapping carve-outs, so newly added comments should not attribute design decisions to a contributor by first name. Please replace the direct name attribution in these comments with a role reference such as "the human maintainer" or remove the attribution.

### Thread 6: tools/workflow-engine/world.ts:123 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T12:05:24Z):

P1: this drops all fields from any extended World instance passed to the helper. Since GitWorld/GitHubWorld extend World and this helper is exported, a direct call with a specialized world silently removes fields like forgeSpecialization and universes; make the helper preserve the input object while replacing registry, or make the API impossible to call with specialized worlds.

## General comments

### @chatgpt-codex-connector (2026-05-28T11:33:36Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).

### @AceHack (2026-05-28T12:25:10Z)

Lior review: This PR correctly implements the  and  specialization hierarchy. The inclusion of resource budget management is a good addition for agentic work. The code is well-tested and documented. The cherry-pick from #5774 is noted. No drift detected.
