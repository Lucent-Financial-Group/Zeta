---
pr_number: 4074
title: "fix(research): address PR #4071 V5 post-merge findings \u2014 archive path + persona link label"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-17T13:07:06Z"
merged_at: "2026-05-17T13:09:30Z"
closed_at: "2026-05-17T13:09:30Z"
head_ref: "otto/fix-pr-4071-v5-archive-path-and-table-and-link-label-2026-05-17"
base_ref: "main"
archived_at: "2026-05-17T13:14:46Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4074: fix(research): address PR #4071 V5 post-merge findings — archive path + persona link label

## PR description

## Summary

Addresses 3 of 4 valid post-merge review findings on PR #4071 (V5 Agora constitution, merged as `5a879e3`). Plus resolves the 4th as known-FP no-op.

## Fixes

1. **Codex P2 / Copilot P0 (docs/research line 361)** — Disposition section cited wrong archive path (`v5-full-constitution.md` instead of `v5-full-economic-operational-constitution.md`). Substrate-claim-checker would have flagged as broken reference. Fixed.

2. **Copilot P1 (persona line 239)** — Link label used `...` ellipsis while target was the full filename. Copy/paste / search confusion risk. Replaced label with descriptive `V5 public-substrate landing (docs/research/)` + noted rationale.

3. **Copilot P1 (docs/research line 207)** — flagged `||` double-pipe on table separator `|---|---|---|`. Direct `awk` inspection shows SINGLE pipes (3-column separator). **Known FP class per [`.claude/rules/blocked-green-ci-investigate-threads.md`](../blob/main/.claude/rules/blocked-green-ci-investigate-threads.md) suspect-by-default Copilot finding table**. Will resolve thread no-op with brief comment, no fix.

## Test plan

- [ ] markdownlint passes
- [ ] No edits outside the 2 changed files
- [ ] Substrate-claim-checker resolves the broken archive-path reference
- [ ] Link label in persona file no longer uses ellipsis

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-17T13:08:31Z)

## Pull request overview

This PR fixes post-merge documentation/reference issues from PR #4071 by correcting the V5 archive path and clarifying the related cross-link label.

**Changes:**
- Corrects the persona-scope archive path in the V5 research disposition.
- Replaces an ellipsis-truncated link label with a descriptive label in the persona conversation archive.
- Leaves the reported table separator issue as a documented no-op per the PR description.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| `memory/persona/ani/conversations/2026-05-17-aaron-ani-grok-agora-v5-full-economic-operational-constitution.md` | Clarifies the docs/research cross-link label and rationale. |
| `docs/research/2026-05-17-ani-grok-agora-v5-full-economic-operational-constitution-remember-when-pay-attention-internal-settlement-unit-4-revenue-streams-clifford-cayley-dickson-hkt-dbsp-aaron-forwarded.md` | Corrects the referenced persona archive filename. |
