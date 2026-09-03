---
id: 081M1JPP9VH087G0R002Z4T0EE
type: bug
state: backlog
priority: P1
slug: a-missing-gh-cli-let-the-loop-merge-around-the-pull-request
title: "A missing gh CLI let the loop merge around the pull request entirely"
created: 2026-09-03T04:40:00.000Z
depends_on: []
composes_with: []
---

# A missing gh CLI let the loop merge around the pull request entirely

`codegen-executor.ts` merged a `merge-pr-N` item with
`gh pr merge --squash --auto --delete-branch` — the safe path, because `gh` goes through the forge,
so branch protection, required checks and required reviews all apply.

When `gh` was **absent from PATH** (`errCode === "ENOENT"`) it fell back to `mergeViaGit`:

```
git fetch origin pull/N/head:pr-N
git checkout main && git pull --ff-only
git merge --no-ff pr-N -m "..."
git push origin main
```

That bypasses the pull request entirely — no required checks, no required reviews, no
unresolved-thread check, no merge queue. **Its trigger was the tool being missing**, so the loop
merged precisely when it had lost the ability to ask whether merging was allowed.

That is the exact inverse of the discipline the control-plane halt and the promotion gate are built
on: *"could not tell" is not permission*. Server-side branch protection would very likely have
rejected the push — but that is a constraint enforced somewhere else that this code does not check,
which is the shape this repo names as the main obstacle to human–AI trust. And `gh` is not on the
Bash PATH on the machine this was found on, so the trigger is not exotic.

## Two dead capabilities this also connects

- **`ForgeHost.getPrGateState(n)` had zero callers outside `forge-host/`.** It is the forge's own
  answer about a PR: gate, checks, required checks, unresolved review threads. The loop's merge
  condition instead came from `listOpenPullRequests`' `mergeStateStatus === "clean"`, which speaks
  to MERGEABILITY and says nothing about whether reviewers' threads were ever answered. A PR can be
  perfectly clean with an unanswered review thread.
- **`applyTransition` had exactly three callers** — its own unit test, the transcript generator and
  the treaty test. The `Backlog → … → Approved → Merged` machine is verified against
  `src/Core/WorkflowEngine.fs` by a 264-vector treaty, and **the running loop never consulted it.**
  This gives it its first production caller.

## The fix

`observe/merge-receipt.ts`:

- `lifecycleFromGateState` **walks the real machine** — `PrOpen` →`RequestReview`→ `InReview`, then
  either `ReceiveRevisionRequest` (threads outstanding) or `ResolveAllThreads` (→ `Approved`). It
  does not encode "you may merge when X"; the rule stays where the F# oracle checks it.
- `mergePermitted` asks `applyTransition` whether `Merge` is legal, rather than testing
  `state.tag === "Approved"` locally.
- `authorizeMerge` — **no reader is a REFUSAL**, and a reader that fails is a refusal. The receipt is
  taken before the dry-run report too, so a dry run says whether the merge would be *authorised*,
  not merely attempted.

`codegen-executor.ts`: the `ENOENT` branch now refuses with the reason. `mergeViaGit` is **deleted,
not merely disconnected** — leaving a working gate-bypass unreachable is one edit away from being
re-wired, which is the dead-control shape this repo keeps finding. An offline merge path can be
rebuilt if wanted, with a receipt like every other merge.

`run-loop-real.ts` builds the reader from the `ForgeHost` it already resolved, and leaves it
**undefined when no forge resolved** — which `authorizeMerge` treats as a refusal.

## Falsifiers

```
bun test src/Core.TypeScript/observe/merge-receipt.test.ts                  # 14 pass
bun test src/Core.TypeScript/observe/ src/Core.TypeScript/workflow-engine/  # 1906 pass
bun src/Core.TypeScript/lint/lint-typescript.ts                            # exit 0
```

Mutation matrix: **10/10 killed** — including the removed fallback restored (a missing reader
treated as permission), a failed receipt treated as permission, unresolved threads no longer
blocking, and `mergePermitted` deciding locally instead of asking the machine.

The 7 failures in the suite are the pre-existing Windows-only ones (POSIX path assertions,
`core.symlinks=false`).
