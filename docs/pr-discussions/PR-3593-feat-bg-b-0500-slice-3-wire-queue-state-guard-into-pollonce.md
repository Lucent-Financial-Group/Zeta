---
pr_number: 3593
title: "feat(bg): B-0500 slice 3 \u2014 wire queue-state guard into pollOnce"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-15T21:35:52Z"
merged_at: "2026-05-15T21:39:06Z"
closed_at: "2026-05-15T21:39:06Z"
head_ref: "feat/b0500-backlog-notifier-queue-guard-retry"
base_ref: "main"
archived_at: "2026-05-15T22:12:20Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3593: feat(bg): B-0500 slice 3 — wire queue-state guard into pollOnce

## PR description

Implements backlog row **B-0500** (Slice 3 of the B-0441 notifier). We now properly guard work assignments using `isAgentQueueEmpty`, ensuring agents only receive new proactive tasks when their queues are fully cleared.

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-15T21:37:34Z)

## Pull request overview

This PR completes Slice 3 of the B-0441 backlog-ready notifier by wiring the `isAgentQueueEmpty` queue-state guard into `pollOnce`. When the target agent's queue is non-empty (recent commits or open PRs by that agent), the poll iteration returns early with `queueBusy: true` and publishes no work-assignment envelopes, preventing assignment pile-up on busy agents.

**Changes:**
- Add `targetAgent` field to `NotifierConfig` and a `queueBusy` field to `PollResult`; populate via `isAgentQueueEmpty(config.targetAgent, adapters)` at the top of `pollOnce`.
- Thread `adapters` through `runOnce`/`runDaemon` and add a `--target-agent <agent>` CLI flag.
- Add two new tests (queue-busy → no publish; queue-empty → publishes) and update backlog rows B-0500/B-0441 to closed/shipped.

### Reviewed changes

Copilot reviewed 4 out of 4 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| tools/bg/backlog-ready-notifier.ts | Wire queue-state guard into `pollOnce`; add `targetAgent` config + `queueBusy` result field; plumb adapters through `runOnce`/`runDaemon`; add `--target-agent` flag. |
| tools/bg/backlog-ready-notifier.test.ts | Add tests for queue-busy skip and queue-empty publish paths; update existing tests for new config field/flag. |
| docs/backlog/P1/B-0500-...md | Mark B-0500 status closed and acceptance checkboxes ticked. |
| docs/backlog/P1/B-0441-...md | Update slice-3 row of B-0441 table to ✅ shipped. |
