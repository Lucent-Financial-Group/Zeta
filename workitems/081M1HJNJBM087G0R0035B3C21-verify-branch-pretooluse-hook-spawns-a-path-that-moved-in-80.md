---
id: 081M1HJNJBM087G0R0035B3C21
type: bug
state: backlog
priority: P2
slug: verify-branch-pretooluse-hook-spawns-a-path-that-moved-in-80
title: "verify-branch PreToolUse hook spawns a path that moved in #8048, so the branch gate is inert"
created: 2026-09-02T17:29:03.604Z
depends_on: []
composes_with: []
---

# verify-branch PreToolUse hook spawns a path that moved in #8048, so the branch gate is inert

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1HJNJBM087G0R0035B3C21-*.md` glob. -->

## What is broken

`.claude/hooks/verify-branch-pretooluse.ts` spawns
`${projectDir}/tools/orchestrator-checks/verify-branch.ts`. PR #8048 relocated that directory to
`src/Core.TypeScript/orchestrator-checks/`; the hook's literal was not updated. `.claude/hooks/README.md`
carries the same stale path in two places.

The hook is wired into `.claude/settings.json` as a `PreToolUse` matcher on `Bash`, so with
`ZETA_EXPECTED_BRANCH` set it fires on every `git commit` — and returns:

```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",
 "permissionDecisionReason":"error: Module not found \"...tools/orchestrator-checks/verify-branch.ts\""}}
```

A well-formed deny, for the wrong reason, on every commit.

## Why it survived

Two independent reasons, and the second is the one worth keeping:

1. The hook is **opt-in** — it exits 0 before reading stdin when `ZETA_EXPECTED_BRANCH` is unset,
   which is the normal case. A gate nobody armed cannot report its own absence.
2. It **fails closed**, so when it was armed it looked like it was working. Denying is what a
   working branch gate does; only the reason string said otherwise.

`tsc` cannot see it — the path is inside a string.

## Evidence

Reproduced 2026-09-02 by piping the hook contract to the script directly. Before: deny with
`Module not found`. After the path fix: deny with
`ERROR: Pre-commit branch mismatch. Expected: feature/x Current: main`, allow (exit 0, no output)
when the branch matches, and allow for non-`git commit` Bash calls.

## Fix

Correct the literal and the two README references, and add
`src/Core.TypeScript/hygiene/audit-hook-script-paths.ts` so the class cannot recur silently. That
audit found a **second** live instance on its first run: `check-md032-pretooluse.ts` →
`src/Core.TypeScript/hygiene/check-md032-blanks-around-lists.ts`, moved by the same refactor.
