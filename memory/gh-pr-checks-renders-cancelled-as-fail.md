---
name: gh-pr-checks-renders-cancelled-as-fail
description: `gh pr checks` reports conclusion=cancelled as "fail"; a cancelled check never ran and says nothing about the subject.
metadata:
  type: reference
---

`gh pr checks <N>` renders a check-run whose `conclusion` is **`cancelled`** in the
`fail` column. The check-runs API tells the truth: `conclusion=cancelled`, not
`failure`.

Measured 2026-08-26 on #15305: `gh pr checks` showed 2 `fail`; the API showed
**zero** failing check-runs on the same head SHA. Both "failures" were
`cancelled`.

**Why it bites here:** this repo cancels ~48% of gate runs (concurrency-group
cancellation under merge traffic), so the over-report is large, not marginal.

**Two failure modes it causes — I hit both in one session:**

1. **Reading `$2=="fail"` from `gh pr checks`** counts cancellations as defects.
   Diagnosing them wastes time on a check that never ran.
2. **Filtering runs by `select(.conclusion=="failure")` before calling
   `rerun-failed-jobs` silently skips cancelled runs** — exactly the ones that
   most need re-enqueueing. My rerun sweep missed one this way.

**How to apply:** never take the failure set from `gh pr checks`. Read
`/commits/<sha>/check-runs` and branch on `conclusion` explicitly, treating
`cancelled` as *did not run* — re-enqueue it, don't diagnose it. When rerunning,
select `conclusion == "failure" or conclusion == "cancelled"`.

Same family as [[zero-failures-is-not-green-a-required-check-that-never-ran-shows-as-zero]]
and [[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]] — a check that
did not run must never look like one that did, in EITHER direction.
Related: [[gh-pr-statuscheckrollup-under-reports-use-the-check-runs-api]].
