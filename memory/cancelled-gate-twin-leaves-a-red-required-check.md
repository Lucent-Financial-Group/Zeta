---
name: cancelled-gate-twin-leaves-a-red-required-check
description: "gate.yml spawns twin runs per PR event; concurrency cancels one twin; the cancelled twin's summary job turns `cancelled` into `failure`, leaving a red required check that deadlocks merge"
metadata:
  type: project
---

Observed 2026-08-25 on #15422, which sat `BLOCKED` with zero unresolved threads and
a green gate.

**The chain:**

1. `gate.yml` produced **two workflow runs with an identical `created_at`** for one
   PR event (`32899395716` and `32899395801`, both `2026-08-25T21:08:45Z`, both
   `event=pull_request`). Twin runs per push, not a rerun.
2. `concurrency.group` is per-PR with `cancel-in-progress: true` on
   `pull_request` — so one twin **cancels its own twin**.
3. The cancelled twin's `gate-required` job still runs, and its `Check all gate jobs`
   step does:
   ```bash
   if echo "$results" | grep -qE '"(failure|cancelled)"'; then exit 1; fi
   ```
   `cancelled` → `exit 1` → the check-run concludes **`failure`**, not `cancelled`.
4. Branch protection evaluates the **newest** run for the required context, which is
   the cancelled twin. Result: a permanently red `gate (required)` on a SHA whose
   other twin went green. `mergeStateStatus=BLOCKED`, forever, with no red visible in
   a naive rollup.

**Unblock (immediate):** `gh run rerun <cancelled-twin-id>` — re-running replaces the
red check-run. Not a widening; the check is re-run, not relaxed.

**Why the obvious fix is wrong:** making the summary exit 0 on `cancelled` would
manufacture a green for a run that never executed its floor — the vacuity class
exactly. The honest conclusion for a superseded run is *"did not run"*, which an exit
code cannot express. **Fix the duplication, not the verdict**: one run per event means
no cancellation and no red. Root cause of the twinning is still unidentified.

**Merge-blocker checklist when a PR is `BLOCKED` with `mergeable=MERGEABLE`:**
- classic branch protection still exists *under* the rulesets — `required_conversation_resolution: true` blocks on any unresolved thread (this is what held #15423)
- more than one check-run may share the required context name; list them all, don't `max_by` and stop
- `gh api repos/OWNER/REPO/branches/main/protection` and the rulesets are **two
  separate surfaces**; reading only one under-reports what blocks

Related: [[gh-pr-statuscheckrollup-under-reports-use-check-runs-api]] ·
[[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]] ·
[[zero-failures-is-not-green]]
