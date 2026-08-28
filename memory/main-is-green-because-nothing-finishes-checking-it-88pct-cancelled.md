---
name: main-is-green-because-nothing-finishes-checking-it-88pct-cancelled
description: 22 of 25 gate runs on main were CANCELLED; 8 of 10 recent main commits have no gate run at all — so "main fail: none" mostly means nothing completed
metadata:
  type: feedback
---

Measured 2026-08-25:

- `gate.yml` runs on `main`, last 25: **cancelled 22, success 2, failure 1.**
- Ten most recent main commits: **eight have NO `gate (required)` run at all**; one
  success, one failure.
- `test (TS hermetic)` has a completed verdict on **one of eight** recent main commits.

**Mechanism:** merge velocity exceeds gate duration. Main moves, concurrency cancels the
in-flight run, the next merge starts another, that one is cancelled too. Consistent with
the 63.3%-cancellation figure measured earlier the same day; now 88%.

**This invalidated my own reporting.** All session I reported *"main clean — fail: none"*
from a query counting failures. On most main commits **nothing completed**, so nothing
could fail. I reproduced the vacuity class in my own monitoring for the third time in one
day — after building AH006 to refuse exactly this, and after recording
[[zero-failures-is-not-green-a-required-check-that-never-ran-shows-as-zero]].

**The precise reading — do NOT overstate this.** Main is not unprotected. PRs must pass
`gate (required)` BEFORE merging and that pre-merge gate does real work. What almost never
completes is the **post-merge re-verification**, and that run exists to catch one thing the
pre-merge gate structurally cannot:

> **semantic conflicts between two PRs that were each independently green.** Both pass
> alone; neither is tested against the other's merged state; only the post-merge run on
> main would notice.

Live instance the same day: a lane-allocator test passed on its own branch, broke `main`
on squash, and was discovered via a *different PR inheriting the failure* — never by main's
own verification, which had been cancelled.

**How to apply.** When reporting main health, report the DENOMINATOR: *"no completed
failures, N of M checks completed."* `fail: none` over an empty set is not a green main. And
when a control against main is unavailable, say **unavailable** — not *pre-existing* and
not *clean*; on this repo the control is usually genuinely absent rather than merely slow.

Related: [[the-check-run-id-is-the-job-id-use-the-jobs-api-for-per-step-conclusions]] · [[check-run-completed-is-not-workflow-run-completed-use-annotations]] · [[verify-the-tree-not-just-the-command]]
