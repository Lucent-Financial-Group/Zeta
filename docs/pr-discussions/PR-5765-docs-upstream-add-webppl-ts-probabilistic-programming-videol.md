---
pr_number: 5765
title: "docs(upstream): add WebPPL TS probabilistic programming + videolectures.net PhD learning substrate (Aaron 2026-05-28)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T11:12:56Z"
merged_at: "2026-05-28T11:15:27Z"
closed_at: "2026-05-28T11:15:27Z"
head_ref: "otto-cli/upstream-references-add-webppl-ts-probabilistic-programming-plus-videolectures-net-phd-learning-substrate-aaron-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T13:04:45Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5765: docs(upstream): add WebPPL TS probabilistic programming + videolectures.net PhD learning substrate (Aaron 2026-05-28)

## PR description

## Summary

Per Aaron 2026-05-28 substrate-engineering questions:
- *'is there anything like infer.net in ts? can we build it if not using infer.net source code for reference?'* → **WebPPL** is closest TS/JS analog
- *'you'd love videolectures.net in your free time i think... PhD everything here. they don't throttle and they have transcripts and powerpoints'* → free-time learning substrate

## What this adds

1. **WebPPL** (`probmods/webppl`; Stanford; MIT) — full PP framework in JS, multiple inference engines (MH/HMC/particle/variational)
2. **videolectures.net** — PhD learning substrate (transcripts + slides)

Both added to `references/reference-sources.json` + new 'Probabilistic programming / Bayesian inference' section in `docs/UPSTREAM-LIST.md`.

## Composes with

- PR #5763 (Google co-scientist + Sakana Robin + Infer.NET upstreams)
- PR #5764 (B-0914.1 TrueSkill 1v1 substrate)
- B-0914 / B-0914.1 backlog substrate

## Test plan

- [x] JSON valid (bun JSON.parse)
- [x] Both entries with full notes + Aaron quote citations
- [ ] CI: markdown + JSON lint
- [ ] Auto-merge armed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## General comments

### @chatgpt-codex-connector (2026-05-28T11:13:02Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
