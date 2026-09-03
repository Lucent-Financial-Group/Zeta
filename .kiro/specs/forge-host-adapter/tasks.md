# Implementation Plan:

## Overview

Implement the ForgeHost abstraction layer that separates forge-host-specific code from git-native operations. The implementation proceeds bottom-up: types/interface first, then registry/detection, then GitHub adapter, then migration of existing code behind the new interface.

## Tasks

- [ ] 1. Create ForgeHost types and interface (Requirement 1)
  - [ ] 1.1 Create `src/Core.TypeScript/forge-host/types.ts` with all host-agnostic data types: `Result<T, E>`, `ForgeError`, `ForgeErrorKind`, `PullRequest`, `PrState`, `MergeStateStatus`, `ReviewDecision`, `PrGateState`, `CheckSummary`, `NextAction`, `ThreadResolution`, `BatchResult`, `Issue`, `CheckRollup`, `CiCheck`, `CiConclusion`, `CiRun`, `RepoInfo`, `BranchProtection`, `TreeEntry`, `CreateCommitOpts`, `CommentRef`, and all option types
  - [ ] 1.2 Create `src/Core.TypeScript/forge-host/forge-host.ts` with the `ForgeHost` interface defining all methods (PR state, PR actions, issues, CI state, repo info, git data API)
  - [ ] 1.3 Create `src/Core.TypeScript/forge-host/result.ts` with `ok()`, `err()`, and `forgeError()` helper constructors
  - [ ] 1.4 Create `src/Core.TypeScript/forge-host/index.ts` barrel export for all public types, interfaces, and helpers
  - [ ] 1.5 Verify clean compilation with `tsc --noEmit` under strict settings
- [ ] 2. Create ForgeHost registry and remote URL detection (Requirement 3)
  - [ ] 2.1 Create `src/Core.TypeScript/forge-host/detect.ts` implementing `detectForgeFromRemote(repoRoot)` and `classifyHost(host)` — parse SSH and HTTPS remote URLs, classify into known forge types
  - [ ] 2.2 Create `src/Core.TypeScript/forge-host/registry.ts` implementing `ForgeHostRegistry` — `resolveHost(repoRoot)`, `resolveHostFromRemote(remoteUrl)`, `registerAdapter(pattern, factory)`
  - [ ] 2.3 Export convenience function `resolveForgeHost(repoRoot)` from registry (single entry point for consumers)
  - [ ] 2.4 Add unit tests in `src/Core.TypeScript/forge-host/detect.test.ts` covering: SSH URLs, HTTPS URLs, custom domains, missing remote, unparseable URLs, `.git` suffix handling
  - [ ] 2.5 Add unit tests in `src/Core.TypeScript/forge-host/registry.test.ts` covering: GitHub resolution, custom adapter registration, unknown host fallback
- [ ] 3. Implement GitHub adapter (Requirement 2, depends on Task 1)
  - [ ] 3.1 Create `src/Core.TypeScript/forge-host/github/github-adapter.ts` implementing `ForgeHost` with `forgeName = "github"`
  - [ ] 3.2 Implement error classification in `src/Core.TypeScript/forge-host/github/classify-error.ts` — map `gh` CLI exit codes and stderr patterns to `ForgeErrorKind`
  - [ ] 3.3 Implement PR state methods: `listOpenPullRequests`, `getPullRequest`, `getPrGateState`, `listMergedPullRequests` using `gh api graphql` with pagination
  - [ ] 3.4 Implement PR action methods: `resolveThread`, `resolveThreadsBatch`, `createPullRequest`, `enableAutoMerge`, `addPrComment`
  - [ ] 3.5 Implement CI/repo/issue methods: `getCheckStatus`, `listPendingRuns`, `getRepoInfo`, `getBranchProtection`, `listOpenIssues`, `createIssue`
  - [ ] 3.6 Implement git data API methods: `createBlob`, `createTree`, `createCommit`, `updateRef`
  - [ ] 3.7 Add AI attribution support for posted comments (compose with existing `github/ai-attribution.ts` pattern)
  - [ ] 3.8 Register GitHub adapter in the registry (`registerAdapter(/github\\.com/, factory)`)
  - [ ] 3.9 Add unit tests in `src/Core.TypeScript/forge-host/github/github-adapter.test.ts` using fixture JSON for GraphQL responses
  - [ ] 3.10 Add unit tests in `src/Core.TypeScript/forge-host/github/classify-error.test.ts` covering all error categories
- [ ] 4. Move batch-resolve-pr-threads.ts to forge-host/github/ (Requirement 4, depends on Task 3)
  - [ ] 4.1 Move `batch-resolve-pr-threads.ts` from `git/` (or current location) to `src/Core.TypeScript/forge-host/github/batch-resolve-pr-threads.ts`
  - [ ] 4.2 Refactor the moved file to call `ForgeHost.resolveThreadsBatch()` instead of invoking `gh` CLI directly
  - [ ] 4.3 Update all imports across the codebase that reference the old path
  - [ ] 4.4 Verify the batch arithmetic invariant holds: `resolved + failed.length === input.length`
  - [ ] 4.5 Run existing tests to confirm no regression
- [ ] 5. Extract observe/world-infra.ts readPRState() behind ForgeHost (Requirement 5, depends on Task 3)
  - [ ] 5.1 Identify the `readPRState()` function in `observe/world-infra.ts` and document its current `gh` CLI calls and return shape
  - [ ] 5.2 Refactor `readPRState()` to accept a `ForgeHost` instance (or resolve one via the registry) and delegate to `getPrGateState` / `listOpenPullRequests`
  - [ ] 5.3 Preserve the existing return type and caller contracts — no changes to call sites
  - [ ] 5.4 Preserve existing timeout behavior (30s default) by composing with adapter timeouts
  - [ ] 5.5 Update error handling to use `Result<T, ForgeError>` pattern, mapping to the existing error surface where callers expect it
  - [ ] 5.6 Add or update tests confirming the refactored function behaves identically
- [ ] 6. Consolidate scattered GitHub directories under forge-host/github/ (Requirement 6, depends on Tasks 3, 4, 5)
  - [ ] 6.1 Audit `github/`, `archive/`, `pr-preservation/`, `refresh-github-worldview/`, `github-accelerator-measurement/` to identify which files are GitHub-specific vs git-native
  - [ ] 6.2 Move GitHub-specific files from `github/` into `src/Core.TypeScript/forge-host/github/`
  - [ ] 6.3 Move GitHub-specific files from `pr-preservation/` into `src/Core.TypeScript/forge-host/github/pr-preservation/`
  - [ ] 6.4 Move GitHub-specific files from `refresh-github-worldview/` into `src/Core.TypeScript/forge-host/github/refresh/`
  - [ ] 6.5 Move GitHub-specific files from `github-accelerator-measurement/` into `src/Core.TypeScript/forge-host/github/accelerator-measurement/`
  - [ ] 6.6 Move GitHub-specific archive operations from `archive/` into `src/Core.TypeScript/forge-host/github/archive/`
  - [ ] 6.7 Update all imports across the codebase to reference new paths
  - [ ] 6.8 Ensure git-native operations remain in their original locations (not moved)
  - [ ] 6.9 Run full test suite to confirm no regressions
- [ ] 7. Wire poll-pr-gate-batch.ts through ForgeHost adapter (Requirements 1, 2, depends on Task 3)
  - [ ] 7.1 Identify `poll-pr-gate-batch.ts` and document its current direct `gh` CLI usage
  - [ ] 7.2 Refactor to resolve a `ForgeHost` instance via the registry and call `getPrGateState` for each PR
  - [ ] 7.3 Preserve existing batch semantics and return shape
  - [ ] 7.4 Update error handling to leverage `ForgeError.retryable` for retry decisions
  - [ ] 7.5 Update or add tests confirming identical behavior through the adapter layer

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": [1, 2],
      "description": "Foundation — types, interface, registry, and detection (no dependencies)"
    },
    {
      "wave": 2,
      "tasks": [3],
      "description": "GitHub adapter implementation (depends on Task 1)"
    },
    {
      "wave": 3,
      "tasks": [4, 5, 7],
      "description": "Migration tasks — move/refactor existing code behind ForgeHost (depends on Task 3)"
    },
    {
      "wave": 4,
      "tasks": [6],
      "description": "Consolidation — gather all GitHub-specific dirs under forge-host/github/ (depends on Tasks 3, 4, 5)"
    }
  ]
}
```

## Notes

- Task 1 and Task 2 have no dependencies and can be implemented in parallel.
- Task 3 depends on Task 1 (needs the interface definition to implement).
- Tasks 4, 5, and 7 all depend on Task 3 (need the GitHub adapter to wire through).
- Task 6 depends on Tasks 3, 4, and 5 (consolidation happens after the individual moves are proven safe).
- The GitHub adapter (Task 3) is the critical path — it unlocks all migration tasks.
- Property-based tests (fast-check) for URL detection, error classification, and batch arithmetic should be added alongside their respective tasks.
