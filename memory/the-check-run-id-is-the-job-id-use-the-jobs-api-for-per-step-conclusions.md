---
name: the-check-run-id-is-the-job-id-use-the-jobs-api-for-per-step-conclusions
description: A check-run id IS an Actions job id, so one API call names the failing STEP — annotations only ever say "exit code N"
metadata:
  type: reference
---

The single most useful CI-diagnostic call in this repo, found 2026-08-25 after hours of
fetching logs the slow way:

```bash
gh api "repos/<owner>/<repo>/actions/jobs/<CHECK_RUN_ID>" \
  --jq '.steps[] | select(.conclusion=="failure") | "\(.number). \(.name)"'
```

**The check-run id and the Actions job id are the same number.** So a check-run id from
`commits/<sha>/check-runs` can be handed straight to the jobs API, which carries
**per-step conclusions**. Annotations carry only `Process completed with exit code N` —
never which step produced it. And it works **while the parent run is still in progress**,
unlike `gh run view --log-failed`, which refuses until the whole run settles.

`.run_id` from that same response is what `gh run rerun <run> --failed` needs.

## Why it mattered — the job name is the VICTIM, not the cause

Three failures reported as separate flakes across a whole session were **one failure**:

| red job | actual failing step |
|---|---|
| `build-and-test (ubuntu-24.04)` | Install toolchain via three-way-parity script |
| `Analyze (csharp)` | Install toolchain via three-way-parity script |
| `chart pins + helm template + kubeconform` | Install toolchain via three-way-parity script |

Every one died in the toolchain install — an apt-mirror stall on a 121 MB `agda-stdlib`
download, exit 124 (timeout) or 127 (binary missing afterwards) — **before its named work
began**. So `chart pins` had nothing to do with charts, and `Analyze (csharp)` failed on a
PR whose entire diff was one TypeScript file.

**The lesson generalises past CI:** a red job name describes *where the failure surfaced*,
not *what failed*. Grouping by job name manufactures unrelated-looking problems out of one
cause — and it inflated my own measurement, since I reported ~15% for one job when the real
blast radius is every ubuntu job that installs the toolchain.

Related: [[check-run-completed-is-not-workflow-run-completed-use-annotations]] · [[gh-pr-statuscheckrollup-under-reports-use-check-runs-api]] · [[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]] · [[zero-failures-is-not-green-a-required-check-that-never-ran-shows-as-zero]]

## EXCEPTION — the identity does NOT always hold, and the failure is loud but confusing

Hit 2026-08-25, after recording the technique above without qualification.

`gh api repos/<o>/<r>/actions/jobs/<CHECK_RUN_ID>` returned **404 Not Found** for a
`build-and-test (ubuntu-24.04)` check-run. The identity holds for **Actions-produced** check
runs, and **not universally** — check runs can be created by other apps, and a re-run can
produce a check-run whose id is not a job id.

**The failure mode is nasty in shell:** `RUN=$(gh api .../jobs/$ID --jq .run_id)` captures
the **404 JSON body** into `$RUN`, which is then interpolated into the next URL, and `gh`
reports `net/url: invalid control character in URL` — an error that names neither the 404
nor the real cause. It also silently poisoned a `[ "$RS" = "completed" ]` test and my `||`
branch printed a nonsense message (`"run still completed"`).

**The fallback that always works:** take `.details_url` from the check-run and extract the
run id from the URL path:

```bash
URL=$(gh api ".../commits/$SHA/check-runs?per_page=100" --paginate --jq '... | .details_url')
RUN=$(echo "$URL" | grep -oE "runs/[0-9]+" | head -1 | cut -d/ -f2)
```

**And guard the shell:** validate that the id is numeric before interpolating it into a URL
(`[[ "$RUN" =~ ^[0-9]+$ ]]`), or a JSON error body becomes a URL and the error message
points at the wrong thing entirely.

