---
name: Query PR head_repo before pushing fork-PR fixes (wrong-remote-push silent-failure mode)
description: When pushing fixes to a PR, query `gh api .../pulls/N --jq '.head.repo.full_name'` first to confirm push target. In this clone `origin = LFG/Zeta` (project-trunk) and `acehack = AceHack/Zeta` (dev-mirror fork). Fork-PR fixes must push to acehack, not origin — wrong-remote pushes succeed silently and the PR head_sha stays stale, causing the "PR sync delay" symptom that's actually a wrong-branch-on-different-fork failure. 2026-04-28 incident: 4 successive `git push origin docs/trajectories-pattern-2026-04-28` lost because PR #659's head_repo was AceHack/Zeta the whole time.
type: feedback
---

# Query PR head_repo before pushing fork-PR fixes

**Rule:** when fixing review threads on a PR, run
`gh api repos/<owner>/<repo>/pulls/<N> --jq '.head.repo.full_name'`
**before** `git push`. Push to **that** remote. In this clone:

- `origin` = `Lucent-Financial-Group/Zeta` (project-trunk)
- `acehack` = `AceHack/Zeta` (dev-mirror fork; where most
  in-flight feature branches live)

Fork-PRs (head_repo = `AceHack/Zeta`) require `git push acehack
<branch>`. `git push origin <branch>` succeeds, advances LFG's
own branch, but does **not** update the PR. The PR head_sha
stays stale and the symptom looks like "GitHub PR sync delay."

**Why:** the dev-mirror / project-trunk fork topology
(documented in CLAUDE.md and
`memory/feedback_lfg_master_acehack_zero_divergence_fork_double_hop_aaron_2026_04_27.md`)
means the same branch name can exist on **two different
remotes**. Fork-PRs from `AceHack:branch` to `LFG:main` are
keyed off the head_repo, not the branch name. `git push` is
silently wrong-target-tolerant — it advances whichever remote
you named, no error, no warning, no PR update.

The earlier
`memory/feedback_fork_based_pr_workflow_for_personal_copilot_usage.md`
proposed `origin = fork, upstream = LFG` as the convention,
but **this clone has the inverted layout** (`origin = LFG,
acehack = fork`). The proposal in the older memory was never
adopted in-clone, so muscle-memory `git push origin` lands on
the wrong remote.

**How to apply:**

1. Before any `git push` to fix a PR, run:

   ```bash
   gh api repos/<owner>/<repo>/pulls/<N> --jq '.head.repo.full_name,.head.ref'
   ```

   Cross-reference `head.repo.full_name` against
   `git remote -v` to find the matching local remote name.

2. Push to that remote:

   ```bash
   git push <matching-remote> <branch>
   ```

3. Verify the PR head updated:

   ```bash
   gh api repos/<base-owner>/<base-repo>/pulls/<N> --jq '.head.sha'
   ```

   should equal `git rev-parse HEAD` within ~30s. If not,
   the push went to the wrong remote.

**Diagnostic tell:** if `git ls-remote <remote> refs/heads/<branch>`
returns the SHA you just pushed but the PR's `head_sha` is a
different (older) SHA, **the PR is on a different fork**. Re-query
`head.repo.full_name` and push to the correct remote.

**Branch-tracking safeguard:** after pushing to the right
remote, set upstream tracking explicitly:

```bash
git branch --set-upstream-to=<correct-remote>/<branch> <branch>
```

so plain `git push` and `git pull` route correctly going
forward.

**Cleanup obligation:** if wrong-remote pushes accidentally
created a parallel branch on the wrong remote (e.g. an
`origin/<branch>` that shouldn't exist), delete it:

```bash
git push origin :<branch>
```

Reversible (the SHA is in the reflog of the original push) and
keeps the shared-state surface clean per visibility-constraint
discipline.

## Cross-references

- `memory/feedback_fork_based_pr_workflow_for_personal_copilot_usage.md`
  — the original fork-flow proposal (with the inverted
  `origin=fork, upstream=LFG` convention that didn't land
  in this clone)
- `memory/feedback_lfg_master_acehack_zero_divergence_fork_double_hop_aaron_2026_04_27.md`
  — the dev-mirror / project-trunk topology that creates
  the dual-fork ambiguity
- `memory/feedback_aaron_visibility_constraint_no_changes_he_cant_see_2026_04_28.md`
  — the visibility-first principle that informs the orphan-
  branch cleanup obligation
- `docs/hygiene-history/loop-tick-history.md` row
  `2026-04-28T01:52:30Z` — the original incident
