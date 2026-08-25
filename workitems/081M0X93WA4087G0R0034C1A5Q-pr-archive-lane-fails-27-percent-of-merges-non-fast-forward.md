---
id: 081M0X93WA4087G0R0034C1A5Q
type: bug
state: backlog
priority: P2
slug: pr-archive-lane-fails-27-percent-of-merges-non-fast-forward
title: "pr-archive lane fails ~27 percent of merges - non-fast-forward buffer fetch, silent under --quiet, retry defeated by set -e"
created: 2026-08-25T20:17:18.148Z
depends_on: []
composes_with: []
---

# pr-archive lane fails ~27 percent of merges - non-fast-forward buffer fetch, silent under --quiet, retry defeated by set -e

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0X93WA4087G0R0034C1A5Q-*.md` glob. -->

## Symptom

`pr-archive-on-merge` failed 8 of its last 30 runs (~27%), measured 2026-08-25.
Failures **interleave** with successes rather than clustering. Every failure is
the same two lines:

```
[archive] attempt 1/5 for PR #15394
flush-via-staging: fetch heartbeat/pr-archive-buffer failed:
##[error]Process completed with exit code 3.
```

Note what is missing: a reason after `failed:`, and attempts 2 through 5.

Each failure is a **silently undelivered archive record**. The workflow is
deliberately built so a failed publish goes RED rather than exiting 0 with a
stranded ref, so the loud failure was correct — but the cause was unreadable, so
across all 8 occurrences nobody could act on it.

## Root cause 1 — a missing `+` on the fetch refspec

`flush-via-staging.ts:prepare` fetched the lane buffer as:

```ts
git("fetch", "origin", `${candidate}:refs/remotes/origin/${candidate}`, "--quiet")
```

A lane buffer is a **disposable aggregate**: every flush does
`checkout -B staging-<lane> origin/main` and republishes, so the ref is
**rewritten**, not advanced. The calling workflows check out with
`fetch-depth: 0`, so `refs/remotes/origin/<candidate>` is already populated when
`prepare` runs. Without a leading `+`, git refuses the non-fast-forward update to
that remote-tracking ref and exits non-zero.

That makes the failure **conditional on another PR's archive flushing between
this job's checkout and its fetch** — which is exactly the interleaved,
~27%-of-the-time shape observed.

Reproduced standalone before any fix was written:

| form | exit | output |
|---|---|---|
| `buf:refs/remotes/origin/buf --quiet` (shipped) | **1** | *(completely empty)* |
| `+buf:refs/remotes/origin/buf --quiet` | 0 | — |

Forcing is **correct**, not a workaround: a remote-tracking ref exists to mirror
the remote, rewrites included. `CLAUDE.md` already documents the heartbeat fetch
in precisely this form (`+refs/heads/heartbeat/*:...`); this call was the one that
did not follow it.

## Root cause 2 — `--quiet` hid the reason

`--quiet` suppresses git's ref-update report, which is the **only** place the
`! [rejected] (non-fast-forward)` line appears. So `fetched.stderr || fetched.stdout`
were both empty and the message printed `failed: ` with nothing after it. Removed
here, and the error now also reports the exit status and says so explicitly when
git produced no output at all.

## Root cause 3 — the 5-attempt retry never retried

In `pr-archive-on-merge.yml` the step runs under `set -euo pipefail`. The `flush`
call was guarded with `set +e`/`rc=$?`/`set -e`; the `prepare` call was **not**.
So a non-zero `prepare` aborted the whole script on attempt 1 — the backoff, the
`::error` annotation and its operator guidance were all unreachable.

Verified behaviourally by running the workflow's own extracted script against a
stub that fails `prepare`:

| shape | observed |
|---|---|
| shipped | `attempt 1/5`, then nothing |
| patched | `attempt 1/5` … `5/5`, then the `::error` annotation |

This is the **only** lane with a retry loop. The other eleven call `prepare` as a
standalone step where a hard failure is the correct outcome, so they are untouched.

## Blast radius of the fix

Root causes 1 and 2 are in `prepare`, which **all twelve lanes** use
(tick-metrics, society, drift-sweep, red-state, budget-snapshot, search-index,
lockfile-healer, context-cost-trend, drift-dashboard, manifesto-citation-snapshot,
zetadb-scheduled-node, pr-archive). Any of them could hit the same rejection.

## Falsifiers

- `flush-via-staging.test.ts` §"prepare survives a REWRITTEN lane buffer
  (non-fast-forward)" — real git: full clone, buffer force-updated underneath,
  `prepare` must return 0 and adopt the new generation. Removing the `+` makes it
  fail with exactly `Expected: 0 / Received: 3`, the CI exit code.
- The test asserts the ref actually **moved** and the new content is present, not
  just that the exit code was 0 — asserting only the code would still pass if the
  fetch were deleted outright.

## Not fixed here

The generator call (`archive-pr-reviews.ts`) inside the loop is still unguarded.
It is not a contention failure and has never been observed failing; left
deliberately, and named in a comment so it reads as a choice rather than an
oversight.
