---
pr_number: 5257
title: "feat(B-0824): post-#5241 enrichments \u2014 generators-not-data + bandwidth + 0D/1D/2D/ND + NULL-as-monad + tri-boolean + triangle/GPU"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-26T17:46:58Z"
merged_at: "2026-05-26T17:48:37Z"
closed_at: "2026-05-26T17:48:37Z"
head_ref: "otto-cli/b0824-enrichments-clean-2026-05-26"
base_ref: "main"
archived_at: "2026-05-27T19:35:45Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5257: feat(B-0824): post-#5241 enrichments — generators-not-data + bandwidth + 0D/1D/2D/ND + NULL-as-monad + tri-boolean + triangle/GPU

## PR description

## Summary

Clean rebase of 6 Aaron 2026-05-26 substrate landings on top of #5241 (merged 363c7c12). Replaces stale #5256 which had base-conflict.

1. **Generators-not-data** — _"we are inserting / passing the generator combinators not the data itself"_
2. **Bandwidth payoff** — _"deferred execution at massive scale we are passing the function not the data"_
3. **Base-dimension agnostic** — _"start even with 1d observables or even scalers and project up"_
4. **NULL-as-monad** — _"null is the monad we wrap escape in"_
5. **Tri-boolean logic FTW** — _"tri boolean logic FTW"_ (TRIPLE CONVERGENCE on NULL across FP / SQL / operational)
6. **Triangle/GPU** — _"we can tesselate everyting casue or base is a traingle just like GPUs"_ + Aaron-confirmed _"that's what we look like to higher dimensional beings exactly"_ (Phoenix-rise IS triangle-mesh-rasterization moment)

Sub-target 8 + 10 added (generator-combinator library design; GPU substrate primitives — HOW = compute substrate; complement to Sub-target 7 WHERE = CockroachDB storage).

XL→L effort schema fix included.

## Test plan

- [ ] Markdown lint clean
- [ ] BACKLOG.md drift clean
- [ ] Single squash-merge commit

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## General comments

### @chatgpt-codex-connector (2026-05-26T17:47:04Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
