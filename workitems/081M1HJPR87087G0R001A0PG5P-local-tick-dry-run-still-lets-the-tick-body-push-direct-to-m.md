---
id: 081M1HJPR87087G0R001A0PG5P
type: bug
state: backlog
priority: P2
slug: local-tick-dry-run-still-lets-the-tick-body-push-direct-to-m
title: "local-tick --dry-run still lets the tick body push direct-to-main"
created: 2026-09-02T17:29:42.407Z
depends_on: []
composes_with: []
---

# local-tick --dry-run still lets the tick body push direct-to-main

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1HJPR87087G0R001A0PG5P-*.md` glob. -->

## What is broken

`tools/tick-source/README.md` documents the flag as: *"`--dry-run` still prepares the lane, runs
the tick body and commits locally; it only declines to move the remote ref."*

The second clause is false. `runTick`'s `config.dryRun` branch sits at **STEP 4**, the lane push.
The tick body it spawns at STEP 2 is `defaultTickCommand(...)` → `run-loop-real.ts`, built with no
`--dry-run`, and that body's event sink is **folder-direct-to-main**: it commits the event and
pushes `origin/main` itself. By the time STEP 4 decides not to push, a remote ref has already
moved — from the child process, which the parent's flag never reached.

## Evidence

Observed 2026-09-02 on a fresh clone. `run-loop-real.ts` without `--dry-run` ran
`git push` at `origin/main` three times with rebase-retry, and was stopped only by the
repository's own branch-protection ruleset:

```text
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Required status check "gate (required)" is expected.
 ! [remote rejected]     HEAD -> main (push declined due to repository rule violations)
[execute] FAILED: append-failed — push failed after 3 rebase-retry attempts; local commit undone
```

Nothing landed, and the tool correctly undid its local commit. But the thing that stopped it was a
**server-side setting the flag knows nothing about**. On a fork, a mirror, or any clone whose
default branch is unprotected, the push succeeds. A dry run whose safety depends on a ruleset
elsewhere is not a dry run.

## Fix

Forward the flag: `defaultTickCommand(agent, model, eventDir, dryRun = false)` appends
`--dry-run`, and `local-tick.ts`'s `toConfig` passes `args.dryRun` through.

Note where the defect actually was — **`toConfig`**, not `defaultTickCommand`. A test exercising
`defaultTickCommand` alone would have stayed green through the whole bug, so the regression test
asserts on `toConfig(...).tickCommand`. Verified by mutation: reverting the one-line `toConfig`
change turns that test red and leaves the other 24 in the file green.

The Actions lane never passes `dryRun`, so the "same body as the Actions lane" invariant pinned by
`tick-source.test.ts` is unchanged.
