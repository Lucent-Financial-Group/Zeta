---
name: gh-pr-statuscheckrollup-under-reports-use-check-runs-api
description: gh pr view --json statusCheckRollup silently omits check-runs; measure gate presence via the commit check-runs API instead
metadata:
  type: feedback
---

`gh pr view <n> --json statusCheckRollup` does **not** reliably list every check on a
PR's head commit. Measured 2026-08-24 on #15018: the rollup returned **6** entries and
no `gate (required)`, while
`gh api repos/<R>/commits/<SHA>/check-runs?per_page=100` returned **43** check-runs
*including* `gate (required)` = completed/success.

**Why it matters here:** my autonomous tick counted a `NO-GATE-settled` class off the
rollup, so it was reporting PRs as missing their required gate when the gate was green
on the head SHA. That is the vacuity class pointed back at my own instrument — a check
that did not see is indistinguishable from a check that saw nothing.

**The fix, now in use:**

```bash
SHA=$(gh pr view "$n" --json headRefOid --jq .headRefOid)
gh api "repos/$R/commits/$SHA/check-runs?per_page=100" \
  --jq '[.check_runs[]|select(.name=="gate (required)")]|length'
```

Re-measured that way, gate absence is **real but rarer** than the rollup implied — 6 of
18 open PRs genuinely carried no `gate (required)` check-run.

**Independent evidence still stands** for genuine gate absence: `gh run list --branch
<branch>` showing zero `gate` runs is a separate instrument and agreed with the
check-runs API. When two instruments disagree, prefer the one closest to the object —
here, check-runs on the SHA that branch protection actually evaluates.

Related: [[feedback_verify_the_tree_not_just_the_command_stale_tree_is_a_check_that_did_not_run]]
(same failure family — a confident, clean, wrong reading with no signal anything is off).
