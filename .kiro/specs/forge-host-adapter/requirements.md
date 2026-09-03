# Requirements Document

## Introduction

This feature introduces a ForgeHost abstraction layer that separates forge-host-specific code (GitHub, GitLab, Gitea, etc.) from git-native operations in the TypeScript layer. The current codebase mixes `gh` CLI calls with `git` operations across multiple directories (`git/`, `observe/`, `archive/`, `pr-preservation/`, `refresh-github-worldview/`, `github-accelerator-measurement/`). This design establishes a 3-layer architecture: git-native (pure `git` ops), ForgeHost abstraction (host-agnostic interface + types), and host adapters (concrete implementations per forge). The abstraction enables future multi-forge support without touching the core observe loop.

## Glossary

- **ForgeHost**: The host-agnostic interface that all forge adapters implement. The core loop and tools depend only on this interface.
- **Forge Adapter**: A concrete implementation of `ForgeHost` for a specific platform (e.g., GitHub, GitLab, Gitea).
- **ForgeHost Registry**: The component that detects the forge from git remote URLs and instantiates the correct adapter.
- **Result Type**: The project-standard `Result<T, E>` discriminated union — errors flow as values, never exceptions.
- **ForgeError**: Typed error with classification (`ForgeErrorKind`), message, and retryable flag.
- **PrGateState**: A composite view of a PR's merge readiness: checks, threads, auto-merge status, and recommended next action.
- **DetectedForge**: The parsed result of inspecting a git remote URL — forge type, owner, repo, and host.

## Requirements

### Requirement 1: ForgeHost Interface and Types

**User Story:** As a developer working on the observe loop or tools layer, I want a single host-agnostic interface for forge operations, so that code never names a specific forge directly and adding new forges requires no changes to consumers.

#### Acceptance Criteria

1. THE ForgeHost interface SHALL define methods for PR state queries (`listOpenPullRequests`, `getPullRequest`, `getPrGateState`, `listMergedPullRequests`), PR actions (`resolveThread`, `resolveThreadsBatch`, `createPullRequest`, `enableAutoMerge`, `addPrComment`), issues (`listOpenIssues`, `createIssue`), CI state (`getCheckStatus`, `listPendingRuns`), repository info (`getRepoInfo`, `getBranchProtection`), and git data API (`createBlob`, `createTree`, `createCommit`, `updateRef`).
2. ALL ForgeHost methods SHALL return `Result<T, ForgeError>` — never throw exceptions.
3. THE ForgeHost types SHALL be host-agnostic: no GitHub-specific, GitLab-specific, or other host-specific fields leak through the interface boundary.
4. THE ForgeError type SHALL classify errors into kinds (`not-supported`, `auth-failure`, `rate-limited`, `not-found`, `network`, `parse-failure`, `permission-denied`, `internal`) with a `retryable` boolean and optional `raw` payload.
5. ADAPTERS that have not implemented a method SHALL return `ForgeError` with kind `"not-supported"` — never throw.
6. FOR any `ForgeError`, IF `kind` is `"rate-limited"` or `"network"` THEN `retryable` SHALL be `true`; IF `kind` is `"auth-failure"`, `"not-supported"`, or `"permission-denied"` THEN `retryable` SHALL be `false`.

### Requirement 2: GitHub Adapter

**User Story:** As the primary forge user (GitHub), I want a concrete `ForgeHost` implementation that wraps the `gh` CLI and GitHub GraphQL/REST APIs, so that all existing GitHub-specific functionality is accessible through the unified interface.

#### Acceptance Criteria

1. THE GitHub adapter SHALL implement all ForgeHost methods using the `gh` CLI and GitHub GraphQL/REST APIs.
2. THE GitHub adapter SHALL classify `gh` CLI errors (exit codes, stderr patterns) into the appropriate `ForgeErrorKind` — authentication failures, rate limits, not-found, network errors, permission denied.
3. THE GitHub adapter SHALL handle GraphQL pagination transparently for list operations.
4. THE GitHub adapter SHALL pass command arguments as arrays to `spawnSync` — never shell-interpolated (injection-safe).
5. THE GitHub adapter SHALL append AI attribution to all posted comments, preserving the existing `github/ai-attribution.ts` pattern.
6. FOR any successful result from `listOpenPullRequests`, EVERY element in the returned array SHALL have `state === "open"`.

### Requirement 3: Forge Detection and Registry

**User Story:** As the app initialization layer, I want to automatically detect which forge hosts a repository by inspecting its git remote URL, so that no manual configuration is needed and the correct adapter is instantiated transparently.

#### Acceptance Criteria

1. THE ForgeHost Registry SHALL parse git remote URLs in both SSH (`git@host:owner/repo.git`) and HTTPS (`https://host/owner/repo.git`) formats.
2. THE ForgeHost Registry SHALL classify known hosts: `github.com` → GitHub, `gitlab.com` → GitLab, `codeberg.org` → Gitea, and pattern-matching for self-hosted instances.
3. THE ForgeHost Registry SHALL return `ForgeError` with kind `"parse-failure"` when the remote URL is unparseable and kind `"not-found"` when no git remote named `origin` exists.
4. THE ForgeHost Registry SHALL support custom adapter registrations for self-hosted forge instances via `registerAdapter(pattern, factory)`.
5. FOR any valid git remote URL containing host, owner, and repo, `detectForgeFromRemote` SHALL produce a `DetectedForge` with non-empty `owner` and `repo` strings.
6. THE detection operation SHALL have no side effects (read-only).

### Requirement 4: Move batch-resolve-pr-threads.ts

**User Story:** As a codebase maintainer, I want `batch-resolve-pr-threads.ts` relocated from `git/` to `forge-host/github/`, so that forge-specific code lives under the forge adapter directory rather than mixed with git-native operations.

#### Acceptance Criteria

1. THE file `batch-resolve-pr-threads.ts` SHALL be moved from its current location in `git/` to `forge-host/github/`.
2. ALL imports referencing the old path SHALL be updated to the new path.
3. THE moved file SHALL be refactored to call through the `ForgeHost` interface (specifically `resolveThreadsBatch`) rather than invoking `gh` CLI directly.
4. THE batch result SHALL maintain the arithmetic invariant: `resolved + failed.length === input.length`.

### Requirement 5: Extract readPRState() Behind ForgeHost

**User Story:** As the observe loop maintainer, I want `readPRState()` in `observe/world-infra.ts` to call through the `ForgeHost` interface instead of directly invoking `gh` CLI commands, so that the observe loop is forge-agnostic.

#### Acceptance Criteria

1. THE `readPRState()` function in `observe/world-infra.ts` SHALL be refactored to obtain its data via the ForgeHost interface (`getPrGateState` or `listOpenPullRequests`).
2. THE refactored function SHALL preserve its existing return type and semantics — callers remain unchanged.
3. THE refactored function SHALL delegate error handling to ForgeHost's `Result<T, ForgeError>` pattern rather than catching `gh` CLI errors inline.
4. THE refactored function SHALL preserve existing timeout behavior (30s default).

### Requirement 6: Consolidate Scattered GitHub Directories

**User Story:** As a codebase maintainer, I want all GitHub-specific code consolidated under `forge-host/github/`, so that the directory structure reflects the architectural boundary between git-native and forge-specific operations.

#### Acceptance Criteria

1. THE following directories SHALL be consolidated under `forge-host/github/`: `github/`, `archive/` (GitHub-specific portions), `pr-preservation/`, `refresh-github-worldview/`, `github-accelerator-measurement/`.
2. ALL imports referencing old paths SHALL be updated to the new consolidated paths.
3. THE consolidation SHALL NOT change runtime behavior — all existing functionality continues working identically.
4. GIT-NATIVE operations (pure `git` commands with no forge dependency) SHALL remain in the `git/` directory, not moved to `forge-host/`.
