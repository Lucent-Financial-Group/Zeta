---
id: 081M1K5FTZC087G0R003B34R0X
type: bug
state: backlog
priority: P2
slug: a-lint-s-own-remediation-advice-would-cause-the-silent-data
title: "A lint's own remediation advice would cause the silent data loss it guards against"
created: 2026-09-03T09:20:00.000Z
depends_on: []
composes_with: []
---

# A lint's own remediation advice would cause the silent data loss it guards against

## The defect

`lint-graphql-transport-in-scripts.ts` carries its remedy **in the data**, by design:

> The remedy is carried in the data, not written into a generic message, because a refusal that does
> not name the replacement is a refusal people route around. **Every entry was checked against
> `gh api` on this repo.**

That makes the remedy text load-bearing — a reader is expected to follow it without re-deriving it.
One entry did not survive re-measurement.

For `gh pr list`, the remedy read:

```
gh api "repos/{owner}/{repo}/pulls?state=open&per_page=100"  (paginate with --paginate)
```

Measured against this repo's live API on 2026-09-03:

```
GET /pulls?state=open&per_page=1   ->  mergeable_state ABSENT, mergeable ABSENT
GET /pulls/{number}                ->  mergeable_state "unknown", mergeable null
```

**The LIST payload has no merge state at all.** It exists only on the single-PR route.

## Why it matters, concretely

This is not hypothetical. `observe/world-infra.ts` calls

```
gh pr list --json number,title,mergeStateStatus
```

and derives its **clean** PR set from `mergeStateStatus`. A caller who took the one-line fix would
get `mergeState: ""` for every PR and compute the clean set from an empty string.

So a lint that exists to prevent silent failures was, in its remediation text, describing one — the
silent-wrong-answer class, arriving through the fix rather than the defect.

## The correction

The entry now names the per-PR follow-up. **The trade is still right** — REST is the uncontended
budget (measured: REST 33/5000 while GraphQL hit 0/5000 twice in one hour), so N+1 on REST beats one
call on the contended transport. But it has to be _stated_, because a one-liner reads as a drop-in
replacement and this one is not.

## Falsifier

Restoring the old one-line remedy turns the new test red:

```
(fail) the remedy text > the `pr list` route warns that the LIST payload has no merge state
```

```
bun test src/Core.TypeScript/hygiene/lint-graphql-transport-in-scripts.test.ts   # 47 pass
```

A second test asserts every route names a concrete `gh api` endpoint rather than a bare admonition —
a remedy that only says _"use REST"_ is the refusal people route around, which is the failure this
module's design note already names.

## What this does NOT do

It does not clear the 34 standing findings. Those are **drift tier**, deliberately outside
`gate (required)`, and several sites need GraphQL-only fields — so a blanket conversion would
introduce exactly the data loss described above, at 19 call sites at once. The loop's own hot path is
already clear: `readPRStateAsync` goes through `ForgeHost.listOpenPullRequests`, not `gh pr list`.

Fixing the advice first is the prerequisite for clearing them safely.
