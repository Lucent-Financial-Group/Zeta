---
name: Stale root worktree branch causes stale CLAUDE.md auto-load (rules pre-#4365)
description: When the root worktree (`/Users/acehack/Documents/src/repos/Zeta`) is on a stale feature branch, Claude Code's session-start auto-load of `.claude/rules/*.md` reads the stale content; new rules merged to origin/main are NOT in cold-boot context.
type: feedback
created: 2026-05-19T10:25:00Z
originSessionId: e7084281-5418-4f2d-83aa-3f7bda72ecd7
---
# Stale root worktree branch causes stale `.claude/rules/` auto-load

## Empirical anchor

2026-05-19T10:24Z — Otto-CLI cold-boot session at 10:04Z. Root worktree
on branch `otto/2012z-land-nci-tonal-momentum-rules-cross-substrate-triangulator-skill-2026-05-18`,
top commit `f0abf3ed` (~14h behind `origin/main` top `28234344`).

Rule #4365 (`auto-merge-race-with-follow-up-commit anti-pattern`) landed
to origin/main at 08:46Z as a SECTION added to
`.claude/rules/blocked-green-ci-investigate-threads.md`. My session started
at 10:04Z (1h 18min AFTER the rule landed).

**Failure mode observed**:

- Claude Code's session-start auto-load reads `.claude/rules/*.md` from the
  CWD (root worktree at `/Users/acehack/Documents/src/repos/Zeta`).
- Root worktree is on stale `otto/2012z-...-2026-05-18` branch which predates
  #4365.
- Local `grep "auto-merge-race" .claude/rules/blocked-green-ci-investigate-threads.md`
  → **0 matches**.
- The auto-merge-race rule content was NOT in my session's auto-loaded CLAUDE.md context.
- I correctly applied the rule this tick ONLY by reading `git show 8f9d04ad`
  directly to inspect the commit body of the merged PR.

## Why this matters

Future Otto-CLI cold-boots from the same stale-branch root worktree will
silently lack newly-merged rule content. The failure is silent because:

1. Auto-load happens once at session start.
2. `.claude/rules/*.md` content is treated as canonical context.
3. Otto-CLI typically does not re-validate auto-loaded content against origin/main.
4. The failure mode shows up only when a behavior depends on a rule that
   landed AFTER the last time the root worktree was rebased onto origin/main.

## Mitigations (in priority order)

1. **Rotate root worktree at session-end**: when a session closes,
   `git -C ~/Documents/src/repos/Zeta switch main && git pull origin main`
   so the next session's auto-load reads main-current content.
2. **Operator discipline**: at cold-boot, perform a `git fetch origin main`
   + `git log origin/main -- .claude/rules/ --since="<last-session>"`
   sanity-check to see what rules landed since the worktree's branch was created.
3. **Sentinel sanity-check at cold-boot**: any rule whose body references
   a recent PR number can be cross-checked against `git log --grep="<PR#>"`
   to confirm the file content matches.
4. **Structural fix** (substrate-engineering candidate): a Claude Code
   hook that runs at session-start to compare `.claude/rules/*.md` SHAs
   against `git rev-parse origin/main:.claude/rules/<file>.md` and warn
   on divergence.

## Composes with

- [`tick-must-never-stop.md`](../../../.claude/rules/tick-must-never-stop.md) — sentinel re-arm IS exactly the same shape (auto-load at cold-boot does not auto-detect missing-or-stale state)
- [`refresh-before-decide.md`](../../../.claude/rules/refresh-before-decide.md) — "refresh-before-decide" extends to "refresh-rules-before-decide"
- [`encoding-rules-without-mechanizing.md`](../../../.claude/rules/encoding-rules-without-mechanizing.md) — the discipline-without-mechanization failure mode; this observation IS evidence that even rule auto-load needs mechanization
- [`skill-router-as-substrate-inventory.md`](../../../.claude/rules/skill-router-as-substrate-inventory.md) — same shape applies to skills
- `auto-merge-race-with-follow-up-commit` section added to [`blocked-green-ci-investigate-threads.md`](../../../.claude/rules/blocked-green-ci-investigate-threads.md) via PR #4365 — the specific rule that exposed this failure mode

## Future-Otto cold-boot disposition

When cold-booting from `/Users/acehack/Documents/src/repos/Zeta`:

1. **Check root worktree branch** via `git branch --show-current` — if NOT `main`,
   the auto-loaded `.claude/rules/*.md` content is from that stale branch.
2. **Compare to origin/main rules** via `git log origin/main -- .claude/rules/ --since="2 days ago"` — surfaces newly-landed rule content.
3. **Re-read newly-landed rule bodies** via `git show <sha>` before applying
   any discipline that might depend on them.

This memo is user-scope only (preserved at `~/.claude/projects/.../memory/`)
because it's a single-observation anchor; promotion to in-repo rule warrants
2+ recurrences across distinct sessions.

## Substrate-honest framing

This is NOT a bug in Claude Code — auto-load reading CWD is the documented
behavior. It IS a workflow friction at Zeta-scale where:

- Multiple parallel Otto-CLI sessions share the same root worktree.
- The root worktree is frequently on a feature branch (post-session).
- Rules land to origin/main multiple times per hour during cascade activity.

The mitigation discipline shifts the responsibility from "harness auto-detects
stale rules" to "operator rotates worktree to main at session-end" or
"cold-boot includes a `.claude/rules/` freshness check".

Empirical evidence so far: 1 observation. This memo IS the observation.
