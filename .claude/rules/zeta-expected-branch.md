# ZETA_EXPECTED_BRANCH — set before committing, enforced by the harness hook

Carved sentence:

> oh-my-zsh shows the branch in every human shell prompt; this env var +
> the harness hook is the AI-substrate equivalent: the branch expectation
> is stated once at session start, then mechanically enforced before every
> `git commit`.

## Operational content

Before starting any task that involves `git commit` on a specific branch:

```bash
export ZETA_EXPECTED_BRANCH=feat/my-task-2026-05-09
git checkout -b "$ZETA_EXPECTED_BRANCH"
```

The `PreToolUse` hook (`.claude/hooks/verify-branch-pretooluse.ts`, wired in
`.claude/settings.json`) fires before every Bash `git commit` call and blocks
it when the current branch doesn't match `ZETA_EXPECTED_BRANCH`.

When `ZETA_EXPECTED_BRANCH` is **unset**, the hook is a no-op — no commit is
blocked. The convention is opt-in, not mandatory for every session.

## Why this matters

The orchestrator-CWD-bleed-over hazard (documented in
`memory/feedback_parallel_subagent_concurrency_lessons_cluster_aaron_2026_05_04.md`)
causes `git checkout -b new-branch` to appear successful while HEAD silently
remains on a subagent's branch. The symptom: the commit lands on the wrong
branch. Empirically observed twice on 2026-05-04 in a single session.

The multi-Otto-one-checkout topology (see B-0519 RCA) exposes the same
failure mode at a higher rate: parallel-Otto processes execute
`git checkout <branch>` in the same physical worktree, silently moving
HEAD between any two Bash-tool calls.

Encoding the expected branch once at session start, then having the harness
check it mechanically, was intended to remove the discipline-memory burden.

## Field-test caveat (2026-05-14) — env-var hook is defense-in-depth, not primary

`ZETA_EXPECTED_BRANCH` set in one Bash-tool call does NOT reliably persist
to the call that runs `git commit`. Each Bash-tool invocation may spawn a
fresh shell, so `export FOO=bar; do_thing` works within one call but
`FOO` is unset for the next call's environment. The `PreToolUse` hook
reads `process.env.ZETA_EXPECTED_BRANCH` of the spawned bash process —
when that's unset, the hook is a no-op and the wrong-branch commit goes
through.

This is the failure mode observed on tick 2010Z (2026-05-14): the
env-var-based hook did NOT catch a wrong-branch commit because the
env var didn't survive across separate Bash-tool calls.

**The substrate-honest primary catch is `git branch --show-current`
immediately before `git commit`** — survives any harness-level
shell-environment quirk because it's a direct query of git state, not
a query of the agent's belief about git state.

Field-tested on ticks 2010Z + 2026Z + 2030Z (2026-05-14); survived
first-try after being adopted.

## Companion defense — `gh pr create --head <my-branch>`

The same parallel-Otto checkout that moves HEAD between `git push` and
`gh pr create` can poison the PR-create call. Symptom:
`gh pr create` opens a PR from a different Otto's branch, or fails with
"could not determine the current branch: not on any branch."

**Always use `gh pr create --head <my-branch> --base main`** with an
EXPLICIT head ref. Removes implicit dependency on current-branch state.

Field-tested on tick 2026Z (2026-05-14) after Pattern 6 was observed.

## Composite operator-discipline at commit + PR time

```bash
# Before each git commit:
test "$(git branch --show-current)" = "<expected>" || exit 1
git commit -m "..."

# Before each gh pr create:
gh pr create --head <my-branch> --base main --title "..." --body "..."
```

Both are zero-code substrate (operator discipline) but they're the
primary catches in this harness. The env-var hook stays as
defense-in-depth.

## Hook wiring summary

| Component | Path |
|-----------|------|
| Core check script | `tools/orchestrator-checks/verify-branch.ts` |
| Harness hook wrapper | `.claude/hooks/verify-branch-pretooluse.ts` |
| Wiring | `.claude/settings.json` `hooks.PreToolUse[matcher=Bash]` |
| Hook README | `.claude/hooks/README.md` |
| Tests | `tools/orchestrator-checks/verify-branch.test.ts` |

To unset for sessions that legitimately commit on multiple branches:

```bash
unset ZETA_EXPECTED_BRANCH
```

## Full reasoning

`docs/backlog/P1/B-0191-orchestrator-branch-verify-mechanization-design-aaron-2026-05-04.md`

`memory/feedback_orchestrator_pre_commit_verify_branch_rule_aaron_2026_05_04.md`

`memory/feedback_dst_justifies_ts_quality_over_bash_and_harness_hooks_suffice_no_git_hooks_aaron_2026_05_03.md`

`docs/backlog/P3/B-0519-multi-otto-branch-state-contamination-rca-2026-05-14.md`
(RCA capturing the multi-Otto contamination patterns + the primary defenses
this rule operationalizes; field-test tick shards 2010Z/2026Z/2030Z)
