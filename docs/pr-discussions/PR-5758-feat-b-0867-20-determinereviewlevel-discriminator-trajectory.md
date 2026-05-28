---
pr_number: 5758
title: "feat(B-0867.20): determineReviewLevel discriminator \u2014 trajectory-push vs PR-review lifecycle DU split (Kestrel substrate + Aaron 3-lane substrate-check substantive lane work)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T10:51:23Z"
merged_at: "2026-05-28T10:54:02Z"
closed_at: "2026-05-28T10:54:02Z"
head_ref: "otto-cli/b-0867-20-determine-review-level-discriminator-trajectory-push-vs-pr-review-lifecycle-du-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T13:04:51Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5758: feat(B-0867.20): determineReviewLevel discriminator — trajectory-push vs PR-review lifecycle DU split (Kestrel substrate + Aaron 3-lane substrate-check substantive lane work)

## PR description

## Summary

Adds `determineReviewLevel` lifecycle DU discriminator to workflow-engine PoC (shipped via PR #5728). Substantive workflow-engine lane work per Aaron's 3-lane substrate-check ('so you finished the 3 lanes?' Amara ferry §33.2 PR #5757) + standing PoC permission.

## What this adds

- `ReviewLevel` discriminated union (4 variants)
- `determineReviewLevel(action: Action): ReviewLevel` function with exhaustive switch
- Discriminator policy preserves multi-tier review distinction per Kestrel substrate
- 8 new tests + exhaustiveness check + framework-distinction-preservation test
- **22 tests pass / 0 fail**

## Discriminator policy

| Action class | Action gate | Review level |
|---|---|---|
| escape-hatch | any | pr-review-light |
| grammar-extension | any | pr-review-full |
| operator-decision | any | operator-required |
| transition | append-only | trajectory-push |
| transition | pr-gated | pr-review-full |
| menu-contribution | append-only | trajectory-push |
| menu-contribution | pr-gated | pr-review-light |
| agent-decision | append-only | trajectory-push |
| agent-decision | pr-gated | pr-review-light |

## Composes with substrate

- B-0867.20 backlog row (lifecycle-DU-split discriminator target)
- B-0867 + B-0867.5 (workflow engine substrate)
- B-0865 + B-0865.17 (benchmark substrate; auto-review pipeline = training data)
- PR #5728 (workflow-engine PoC scaffold)
- PR #5757 (Amara ferry substrate-check)
- Kestrel 13th + 14th ferry substrate-engineering substrate

## Test plan

- [x] 22 tests pass
- [x] Exhaustiveness via TS strict-mode switch on ReviewLevel union
- [x] Framework auto-review pipeline distinction preserved structurally
- [ ] CI: lint(tsc tools) gate
- [ ] Auto-merge armed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## General comments

### @chatgpt-codex-connector (2026-05-28T10:51:29Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
