---
id: 081M1JR4J9B087G0R003PR6X2J
type: task
state: backlog
priority: P2
slug: pin-the-loop-s-gate-wiring-so-a-control-cannot-be-silently-r
title: "Pin the loop's gate wiring so a control cannot be silently removed"
created: 2026-09-03T05:20:00.000Z
depends_on: []
composes_with: []
---

# Pin the loop's gate wiring so a control cannot be silently removed

Every guard `run-loop-real.ts` consults is unit-tested in isolation — the control-plane halt, the
promotion gate, the merge receipt, the bounded room. `main()` is not exported, so **nothing checked
that `main()` still routes through them.**

That is this repo's own named failure mode: *"codified rules without a gate aren't a control."*
Passing `executor` instead of `gatedExecutor` is a one-token edit that removes the promotion gate
while every unit test stays green.

## What is pinned

| control | assertion |
|---|---|
| promotion gate | `execute()` receives `gatedExecutor`, never the raw one |
| " | the gated executor follows `gate.mode` |
| " | a dry run reports the gate |
| control-plane halt | the flags are read and can halt |
| " | the halt blocks **acting**, not observing (`halt.halted && !args.dryRun`) |
| merge receipt | the loop builds a PR-gate reader and leaves it **undefined** when no forge resolved |
| " | no local `git merge` to main survives in the merge executor |
| " | authorization is demanded **before** the dry-run report |
| " | a missing `gh` CLI refuses |
| bounded room | the tick goes through `createLoopRoom` / `tickRooms` |

## What this buys, and what it does not

These assert on the **source**, the way `ci/manifest-symmetry.test.ts` already does. Stated in the
module header so nobody mistakes it for a behavioural test:

- it **cannot** tell whether the wiring is correct, only that it is present;
- it **can** tell when someone removes it, which is the failure that actually happens.

The stronger version needs `main()` restructured into injectable pieces. That is worth doing and is
not this.

## Two defects in these tests, both found by the mutation matrix

- `not.toContain("mergeViaGit")` failed on the **comment explaining why the bypass was removed**.
  Forbidding the name also forbids the explanation, which is the part a future reader needs most —
  so it asserts on the CALL instead.
- `EXECUTOR.indexOf('errCode === "ENOENT"')` found the **first** `ENOENT` in the file, which belongs
  to the codegen path (the Claude CLI), not the merge path. A mutant flipping the merge branch to
  `ok: true` **SURVIVED**. Now scoped to `mergePullRequest`, and asserting the *absence* of
  `ok: true` rather than merely the presence of `ok: false`.

## Falsifiers

```
bun test src/Core.TypeScript/observe/run-loop-gate-wiring.test.ts   # 10 pass
```

Mutation matrix on the **wiring itself**: **6/6 killed** — the gate unwired from `execute`, the gated
executor ignoring the gate, a dry run going silent, the halt starting to block dry runs, the merge
authorization dropped, and `ENOENT` routing around the forge again.
