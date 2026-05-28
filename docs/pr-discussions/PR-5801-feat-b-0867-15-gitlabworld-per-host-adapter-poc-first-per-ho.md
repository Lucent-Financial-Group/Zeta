---
pr_number: 5801
title: "feat(B-0867.15): GitLabWorld per-host adapter PoC \u2014 first per-host extension of PR #5775 GitWorld \u2192 GitHubWorld pattern; 19 tests pass"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T12:56:01Z"
merged_at: "2026-05-28T12:59:10Z"
closed_at: "2026-05-28T12:59:10Z"
head_ref: "otto-cli/b-0867-15-gitlab-world-per-host-adapter-poc-extends-gitworld-githubworld-pattern-aaron-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T13:37:14Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5801: feat(B-0867.15): GitLabWorld per-host adapter PoC — first per-host extension of PR #5775 GitWorld → GitHubWorld pattern; 19 tests pass

## PR description

Per Aaron 2026-05-28 lane-status framing (Lane 2): B-0867.15 per-host adapters target.

Ships **GitLabWorld** as the first concrete per-host adapter beyond GitHubWorld. Demonstrates the pattern future adapters follow.

## What this adds

- **GitLabWorld** interface extending GitWorld base
- **MrLifetime** (6 variants; GitLab MR analog of GitHub PR)
- **DiscussionLifetime** (resolvable/unresolvable; GitLab analog)
- **PipelineLifetime** (8 variants; GitLab-native CI/CD first-class)
- **GitLabResourceBudget** (REST + GraphQL per-MINUTE rolling-window; vs GitHub's per-hour 5000)
- **gitLabRateLimitTier** (tiers scaled to 2000/min default: normal > 800 / cost-aware > 400 / extreme-cost-aware > 80 / pure-git ≤ 80)
- **canAffordGitLab** + **registerInGitLab** + reusable universe exports + verdicts

## Per-host adapter pattern this demonstrates

```
GitWorld (base)
   ↓ specialized by forge
GitHubWorld (PR #5775; first specialization)
GitLabWorld (this PR; second specialization)
GiteaWorld / BitbucketWorld / CodebergWorld / SourcehutWorld (future; same pattern)
```

Each specialization adds forge-specific lifetimes + budget + verdicts while inheriting base GitWorld substrate.

**19 tests pass / 0 fail.**

## Composes with

- PR #5775 (GitWorld + GitHubWorld pattern being extended)
- PR #5776 (world-hierarchy substrate-naming)
- B-0867.15 backlog row (extension target)
- B-0904 (GitHub-as-free-event-store; sibling at GitHub scope)
- Rules: asymmetric-authorship + monad-propagation + substrate-smoothness + default-to-both + honor-those-that-came-before

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T12:57:30Z)

## Pull request overview

Adds GitLabWorld as the first per-host adapter extending the GitWorld → GitHubWorld specialization pattern from PR #5775. Introduces GitLab-specific lifetime types (merge request, discussion, pipeline), a per-minute resource budget model, rate-limit tier function, budget-check helper, registration helper, and reusable universe/verdict exports — all covered by 19 invariant tests.

**Changes:**
- New `gitlab-world.ts` with `GitLabWorld` extending `GitWorld`, plus `MrLifetime` (6), `DiscussionLifetime` (2), `PipelineLifetime` (8) DUs.
- GitLab resource-allocation substrate: `GitLabResourceBudget`, `gitLabRateLimitTier` (per-minute thresholds at 800/400/80), `canAffordGitLab`, `GitLabFeedback`/`GitLabResult` Result-shape.
- Reusable universe + verdict exports (`GITLAB_MR_UNIVERSE`, `GITLAB_DISCUSSION_UNIVERSE`, `GITLAB_PIPELINE_UNIVERSE`, `GITLAB_REQUIRE_RESOLVED_VERDICT`, `GITLAB_APPROVAL_NOT_MET_VERDICT`) plus comprehensive test suite.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| tools/workflow-engine/gitlab-world.ts | New GitLabWorld adapter mirroring the GitHubWorld shape with GitLab-specific lifetimes/budget/verdicts. |
| tools/workflow-engine/gitlab-world.test.ts | Bun test suite covering inheritance, tier boundaries, budget enforcement, reusable exports, and end-to-end composition. |

## General comments

### @chatgpt-codex-connector (2026-05-28T12:56:07Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
