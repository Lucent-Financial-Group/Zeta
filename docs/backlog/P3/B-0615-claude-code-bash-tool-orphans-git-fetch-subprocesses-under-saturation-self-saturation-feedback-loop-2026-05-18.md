---
id: B-0615
priority: P3
status: open
title: "Claude Code Bash tool orphans `git fetch` subprocesses under multi-agent saturation — self-saturation feedback loop; wrap in `timeout` or kill on tool-call expiry"
tier: bug
effort: S
created: 2026-05-18
last_updated: 2026-05-18
depends_on: []
composes_with: []
tags: [claude-code, bash-tool, git, multi-agent-saturation, self-saturation, subprocess-orphan]
type: bug
---

# B-0615 — Bash-tool orphans `git fetch` subprocesses; self-saturation feedback loop

## Problem

The Claude Code Bash tool's default-timeout subprocess lifecycle does
not reliably kill `git` subprocesses when the tool call expires.
Under multi-agent saturation (Lior + multi-Otto + concurrent fetches
contending on `.git/objects/pack/`), `git fetch` calls hang
indefinitely. The tool returns control to the agent on timeout,
but the underlying `git fetch` subprocess **remains running**.

Observed at session 2026-05-18T02:08Z–02:59Z:

| PID | ELAPSED | Command |
|---|---|---|
| 6117 | 06:46+ | `/bin/zsh -c ... eval 'git fetch origin main \| tail -2' ...` |
| 6122 | 06:46+ | `/Applications/Xcode.app/.../git fetch origin main` (child of 6117) |
| 6177 | 06:44+ | `/bin/zsh -c -l ... eval 'git fetch origin main \| tail -2' ...` |
| 6197 | 06:43+ | `git fetch origin main` (child of 6177) |
| 8527 | 00:27 | `git fetch --quiet origin` |
| 9419 | 00:01 | `git fetch origin` |

Each stuck `git fetch` holds a network connection to GitHub AND
contends on `.git/objects/pack/` reads. This produces a
**self-saturation feedback loop**:

1. Agent runs `git fetch` via Bash tool (no explicit `timeout`)
2. Under saturation, fetch hangs in pack-dir read phase
3. Bash tool's default timeout expires → returns control to agent
4. Subprocess is NOT killed → keeps holding pack-dir read locks + HTTPS connection
5. Agent's next git op fights the orphaned subprocess for the same resources
6. Saturation deepens; more retries create more orphans

## Sibling failure mode

The push-hang taxonomy in
[`memory/feedback_git_push_blocked_under_lior_saturation_9_consecutive_attempts_session_arc_empirical_taxonomy_otto_cli_2026_05_18.md`](../../../memory/feedback_git_push_blocked_under_lior_saturation_9_consecutive_attempts_session_arc_empirical_taxonomy_otto_cli_2026_05_18.md)
(commit `c7d2c25`) documented `git push` hangs at the local
object-enumeration phase. THIS row documents the upstream cause:
prior `git fetch` calls fired by the Bash tool itself accumulate
as orphans and create the pack-dir contention that subsequent
pushes hang on.

Self-correction to the c7d2c25 memo's 0252Z observation: the
stuck fetch processes are NOT external peer-Otto wrappers; they
trace to **Claude Code Bash-tool's own shell-snapshot wrappers**
at `/Users/acehack/.claude/shell-snapshots/` — fired by Otto's
prior tick refreshes, never reaped.

## Acceptance criteria

- [ ] All Otto-CLI Bash-tool calls to `git fetch` use explicit
      `timeout NNs` wrapper that propagates SIGKILL to the
      subprocess on expiry — pattern:
      ```bash
      timeout --kill-after=5s 30s git fetch origin main 2>&1 | tail -2
      ```
      The `--kill-after=5s` adds SIGKILL 5 seconds after SIGTERM
      if the subprocess refuses to die. Standard GNU `timeout`
      behavior; supported on macOS via coreutils.
- [ ] Documentation update at `.claude/rules/refresh-world-model-poll-pr-gate.md`
      (or sibling rule) recommends `timeout` wrapping for ALL
      git network operations (`fetch`, `push`, `clone`, `ls-remote`)
      when invoked from Bash tool under multi-agent conditions.
- [ ] Investigation note: does the Claude Code Bash tool have a
      mechanism to send SIGKILL to subprocess on tool-call
      timeout? If yes, document; if no, file upstream issue
      with Anthropic Claude Code maintainers.

## Operational discipline (interim, while substrate evolves)

When refreshing worldview in an autonomous loop tick:

```bash
# DO: explicit timeout with kill-after
timeout --kill-after=5s 30s git fetch origin main 2>&1 | tail -2

# DO NOT: bare fetch (will orphan under saturation)
git fetch origin main
```

Same pattern for `git ls-remote`, `git push`, etc.

The `tools/github/refresh-worldview.ts` script (mentioned in
`CLAUDE.md`) may already implement this; if not, audit candidate.

## Composes with

- [`memory/feedback_git_push_blocked_under_lior_saturation_9_consecutive_attempts_session_arc_empirical_taxonomy_otto_cli_2026_05_18.md`](../../../memory/feedback_git_push_blocked_under_lior_saturation_9_consecutive_attempts_session_arc_empirical_taxonomy_otto_cli_2026_05_18.md) — session-arc taxonomy of push-hang failures; THIS row is the upstream-cause mechanization candidate
- [`memory/feedback_git_push_dry_run_succeeds_real_push_hangs_under_saturation_localizes_hang_to_pack_upload_or_ref_update_phase_otto_cli_2026_05_18.md`](../../../memory/feedback_git_push_dry_run_succeeds_real_push_hangs_under_saturation_localizes_hang_to_pack_upload_or_ref_update_phase_otto_cli_2026_05_18.md) — diagnostic that localized the hang to pack-dir reads (which the orphaned fetches contend on)
- [`.claude/rules/refresh-world-model-poll-pr-gate.md`](../../../.claude/rules/refresh-world-model-poll-pr-gate.md) — the rule that recommends scripted commands over inline; this row extends the recommendation with explicit timeout wrapping
- [`.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`](../../../.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md) — sibling Lior-active contention class; commit-tree-corruption symptom vs push-hang symptom
- B-0530 (cron-sentinel-mutex; sibling multi-Otto coordination at worktree-creation scope; B-0615 is at fetch-subprocess scope)
- B-0613 (Lior loop lockfile-probe hardening; closed on main; sibling Lior-loop-correctness work at probe-bash scope)
