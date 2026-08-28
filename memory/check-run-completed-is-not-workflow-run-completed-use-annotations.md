---
name: check-run-completed-is-not-workflow-run-completed-use-annotations
description: A check-run can report completed+failure while its parent workflow run is still in progress, which makes gh run view --log-failed unavailable; annotations still work
metadata:
  type: reference
---

Hit three times in one session before it was written down.

`gh api .../check-runs` can report a job as `status: completed, conclusion: failure`
**while its parent workflow run is still `in_progress`** — because the check-run status
is per-job and the run status is per-run. In that window:

- `gh run view <run> --log-failed` → **"run … is still in progress; logs will be
  available when it is complete"** (no logs, at all)
- `gh run view --job <id> --log-failed` → same refusal; it resolves to the parent run
- `.output.summary` / `.output.title` on the check-run → usually `none`

**What DOES work in that window:**

```bash
gh api "repos/<owner>/<repo>/check-runs/<check_run_id>/annotations" \
  --jq '.[] | "\(.annotation_level): \(.message)"'
```

Live instance 2026-08-25: `cross-verify (trust-core oracles + ace suite)` flapped on
`main` three times and passed every local reproduction (all audits rc=0,
`cross-verify-all` 33/33, ace suite 724/724). The annotation gave the whole answer in one
line — **`Process completed with exit code 2`** — i.e. a *configuration* error, a check
that did not run, not a subject failure. That is consistent with passing locally and
failing in CI, and it is the opposite of what the red implied.

**How to apply:** when a check-run says failure and the log is unavailable, go to
annotations before assuming anything, and before reproducing locally. And remember
[[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]] — an exit-2 red is a
different investigation from an exit-1 red, and treating them the same wastes the run.

Also: filter check-run queries with `select(.status=="completed")`. Without it, the
latest-per-name dedup happily returns a **previous attempt's** conclusion while a rerun
is live — which read as a live failure twice in the same session.

Related: [[gh-pr-statuscheckrollup-under-reports-use-check-runs-api]] · [[verify-the-tree-not-just-the-command]]
