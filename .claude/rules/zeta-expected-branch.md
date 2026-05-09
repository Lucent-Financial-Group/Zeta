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

Encoding the expected branch once at session start, then having the harness
check it mechanically, removes the discipline-memory burden entirely.

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
