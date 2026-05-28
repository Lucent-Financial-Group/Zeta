---
pr_number: 5779
title: "fix(workflow-engine): tsc lint errors \u2014 unused vars + type-narrowing (autonomous-loop unblocks #5774-#5778)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T11:48:41Z"
merged_at: "2026-05-28T11:51:45Z"
closed_at: "2026-05-28T11:51:45Z"
head_ref: "otto-cli/tsc-fixes-workflow-engine-unused-vars-and-type-narrowing-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T13:04:38Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5779: fix(workflow-engine): tsc lint errors — unused vars + type-narrowing (autonomous-loop unblocks #5774-#5778)

## PR description

Autonomous-loop tick caught BLOCKED gate on in-flight PRs (#5774-#5778). 6 tsc errors across 4 files in workflow-engine/. Fixed; tsc clean; 45 tests pass.

## Fixes
- `composed-lifetime.test.ts` (TS6133 ×2): added expect() on type-check bindings
- `consensus.test.ts` (TS18046 ×2): explicit <Hypothesis> type-param + typed callback
- `consensus.ts` (TS6133 ×1): AgreementMetrics<T> _typeHint type-anchor field
- `closed-loop.test.ts` (TS2339/TS2345 ×5): direct LoopFeedback import (Awaited<ReturnType<>> evaluated to never)

## Verification
```
bunx tsc --noEmit -p tsconfig.json  # clean
bun test (3 affected files)         # 45 pass / 0 fail
```

B-0913 dup-ID lint failure is SEPARATE (pre-existing on origin/main).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## General comments

### @chatgpt-codex-connector (2026-05-28T11:48:46Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
