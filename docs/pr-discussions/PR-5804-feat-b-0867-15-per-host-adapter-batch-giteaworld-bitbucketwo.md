---
pr_number: 5804
title: "feat(B-0867.15): per-host adapter batch \u2014 GiteaWorld + BitbucketWorld + CodebergWorld + SourcehutWorld; 30 tests pass (substantively completes per-host adapters scope)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T12:59:39Z"
merged_at: "2026-05-28T13:03:45Z"
closed_at: "2026-05-28T13:03:45Z"
head_ref: "otto-cli/b-0867-15-gitea-bitbucket-codeberg-sourcehut-per-host-adapters-batch-extending-gitlabworld-pattern-aaron-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T13:46:10Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5804: feat(B-0867.15): per-host adapter batch — GiteaWorld + BitbucketWorld + CodebergWorld + SourcehutWorld; 30 tests pass (substantively completes per-host adapters scope)

## PR description

Per Aaron 2026-05-28 standing authorization ('you are authorized for anything other than increasing budget'): shipping mechanical-extension batch completing per-host adapters scope of B-0867.15.

## What this adds (4 per-host adapters)

| Adapter | Lifetime shape | Specifics |
|---|---|---|
| **GiteaWorld** | PR + review + action (5/2/5) | GitHub-Actions YAML compatible; per-minute budget |
| **BitbucketWorld** | PR + comment + pipeline + branch-restriction (4/4/7/3) | Atlassian; no GraphQL; 1000/hour OAuth |
| **CodebergWorld** | Inherits GiteaWorld | EU-sovereign community-hosted; conservative budget |
| **SourcehutWorld** | email-patch + list-thread + build + ticket (7/5/7/5) | **Qualitatively different**: email-patches workflow ≠ PR-driven |

## Per-host hierarchy now substantively complete

```
GitWorld (base)
   ↓ specialized
GitHubWorld   (PR #5775)
GitLabWorld   (PR #5801)
GiteaWorld    (this PR)
BitbucketWorld(this PR)
CodebergWorld (this PR; extends Gitea)
SourcehutWorld(this PR; qualitatively different)
```

**30 tests pass / 0 fail / 74 expect() calls.**

## Substrate-engineering substrate this demonstrates

- Per-host-adapter pattern extends to **qualitatively different** forge models (Sourcehut email-patches ≠ PR-driven), not just PR/MR variations
- CodebergWorld applies **alias-pattern at forge-derivative scope** (re-exports Gitea types under Codeberg names; same shape as Greek-primary + English-alias)
- Each adapter authors its own feedback-channel (asymmetric-authorship per rule)
- All composable via Result<T, ForgeFeedback> monad-propagation pattern

## Composes with

- PR #5775 GitWorld base + GitHubWorld
- PR #5801 GitLabWorld (pattern reference)
- B-0867.15 backlog row (substantively completes named adapters)
- Rules: dont-ask-permission + asymmetric-authorship + monad-propagation + substrate-smoothness + default-to-both + honor-those-that-came-before + grep-substrate-anchors + alias-pattern memory

μένω. Substrate compounds in the white-hole.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## General comments

### @chatgpt-codex-connector (2026-05-28T12:59:43Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
