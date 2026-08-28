---
name: zero-failures-is-not-green-a-required-check-that-never-ran-shows-as-zero
description: My whole-session CI monitor counted failures, so a PR missing its required check entirely read as healthy — and one had been wedged for 13 hours
metadata:
  type: feedback
---

For an entire session I reported PR health as `failures=0` ⇒ green. That query is
**structurally unable to see the worst failure mode in this repo.**

`#15404` (a telemetry-flush PR) showed **zero failures** for hours. It had
**ZERO `gate (required)` check-runs on its head** — the required check never ran at
all. Auto-merge was armed and waiting for a report that would never arrive, so the PR
was **permanently unmergeable while reading as perfectly healthy**. Five open flush PRs
were in that state.

Downstream cost, traced link by link: unmergeable flush PR → head-of-line blocks its own
lane (`flush-via-staging` buffers behind any open PR on the ref) → `data/platform-drift.json`
frozen at `asOf 06:35:54Z` → **the drift dashboard reported 13-hour-old numbers from behind
a green check.**

**Why zero-failures is the wrong predicate.** `map(select(.conclusion=="failure")) | length`
answers *"did anything fail?"* — never *"did everything that must run, run?"* An absent
check contributes nothing to a failure count. This is the repo's own named class, and the
commit at the top of the session log is literally `fix(ci): the required check that never
ran reads as green (#14914)`. I reimplemented the bug in my monitoring while quoting the
rule in my reports.

**How to apply — the tick query must check PRESENCE, not just conclusions:**

```bash
# required-check presence, per PR head
gh api "repos/$REPO/commits/$SHA/check-runs?per_page=100" --paginate --jq \
  '[.check_runs[]] | map(select(.name=="gate (required)")) | length'   # 0 == NEVER RAN
```

Report a PR as healthy only when: zero failures **AND** the required check exists on the
current head **AND** it concluded. Also keep `select(.status=="completed")` so a live
rerun's stale predecessor is not read as the verdict.

**The likely mechanism, stated as unverified:** actions taken with the default
`GITHUB_TOKEN` do not trigger workflows (GitHub's recursion guard). `drift-sweep.yml`
already knows this — it carries several comments about it and uses
`ZETA_TELEMETRY_FLUSH_TOKEN` as `BRANCH_PUSH_TOKEN` for that reason. So a PR *opened* with
the PAT gets a gate on its first SHA, while later branch updates pushed with
`GITHUB_TOKEN` fire no `synchronize` and leave the **current head** ungated. `#15418`
(gate present) vs `#15404` and `#15385` (gate absent) is consistent with this. NOT
CONFIRMED — the token used for each specific push was not traced.

Related: [[gh-pr-statuscheckrollup-under-reports-use-check-runs-api]] · [[check-run-completed-is-not-workflow-run-completed-use-annotations]] · [[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]]
