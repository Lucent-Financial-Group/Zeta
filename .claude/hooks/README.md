# `.claude/hooks/` -- harness pre-tool-use hooks

Claude Code reads project-level hooks from `.claude/settings.json`. Hook scripts live here. Wiring a hook into the harness requires editing `.claude/settings.json`; the script existing on disk does NOT make it active by itself (opt-in is explicit).

Canonical Anthropic reference: <https://code.claude.com/docs/en/hooks>.

## Available hooks

### `verify-branch-pretooluse.ts`

Wraps `tools/orchestrator-checks/verify-branch.ts` (PR #1585) into the Claude Code PreToolUse JSON contract. Mechanizes the orchestrator branch-verify rule (per B-0191) -- when `ZETA_EXPECTED_BRANCH` is set in the session env and `git branch --show-current` doesn't match, the hook blocks the `git commit` Bash invocation with `permissionDecision: "deny"` and the script's stderr as the reason.

If `ZETA_EXPECTED_BRANCH` is unset, the hook is a no-op (exits 0, allow). The default-off behavior means wiring this hook does not change any commit flow unless an agent (or maintainer) explicitly sets the env var for a task.

#### Opt-in configuration

Add this block to the top-level object in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(git commit*)",
            "command": "bun \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/verify-branch-pretooluse.ts"
          }
        ]
      }
    ]
  }
}
```

The `if` clause restricts the hook to `git commit` subcommands so other Bash invocations (build, test, file ops, etc.) are unaffected.

#### How to use after wiring

1. Before starting a task on a specific branch, set the env var:
   ```bash
   export ZETA_EXPECTED_BRANCH=feature/my-task-2026-05-05
   git checkout -b "$ZETA_EXPECTED_BRANCH"
   ```
2. Subsequent `git commit` invocations verify the branch matches before proceeding.
3. If the branch silently shifts (e.g. the orchestrator-CWD-bleed-over hazard documented in `memory/feedback_parallel_subagent_concurrency_lessons_cluster_aaron_2026_05_04.md`), the next commit attempt is blocked with a clear error rather than landing on the wrong branch.
4. To unset for a session that needs to operate on multiple branches, just `unset ZETA_EXPECTED_BRANCH`.

#### Composes with

- `tools/orchestrator-checks/verify-branch.ts` (PR #1585) -- the underlying check.
- `memory/feedback_orchestrator_pre_commit_verify_branch_rule_aaron_2026_05_04.md` (PR #1568) -- the manual discipline this mechanizes.
- `memory/feedback_dst_justifies_ts_quality_over_bash_and_harness_hooks_suffice_no_git_hooks_aaron_2026_05_03.md` -- the harness-hooks-suffice rule.
- `docs/backlog/P1/B-0191-orchestrator-branch-verify-mechanization-design-aaron-2026-05-04.md` (PR #1571) -- the design.
