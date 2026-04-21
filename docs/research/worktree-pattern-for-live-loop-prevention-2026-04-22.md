# Worktree pattern for live-loop prevention — research

**Date:** 2026-04-22
**Context:** Live-loop averted tick (2026-04-22). Aaron's
 *"You could use worktrees if that helps IDK, I know there is a
command line switch for it so maybe yo ushould resrch you might
not be able to do it right with that switch."*
**Author:** opus-4-7 / session round-44
**Status:** research only; no worktree exercised this tick
 (tool-gate discipline).

## The problem (one sentence)

Autonomous-loop speculative-tick work landed on the same git
branch as an open PR's head, so any `git push` on that branch
would have re-triggered the PR's CI with unrelated commits
piggy-backing on the PR — a live-loop in waiting.

## Three worktree surfaces in Claude Code

### 1. `git worktree add` — the raw CLI

Standard git primitive. `git worktree add <path> <branch>`
creates a second working directory rooted in `<path>`, sharing
`.git/` with the main repo. Each worktree can be on a different
branch. Commits made in a worktree affect only that worktree's
branch; `git push` from a worktree pushes that worktree's branch
only.

**Pros:**

- Zero tooling dependency; any git user understands it.
- Multiple worktrees can coexist; you can have one on
  `round-42-speculative` (scoped to PR #32) and one on
  `round-44-speculative` (scoped to tick work) simultaneously.
- Shared `.git/` means no duplicate history storage — each
  worktree is cheap.

**Cons:**

- Shell-level switching only. A single Claude Code session's
  working directory still points at *one* worktree at a time;
  you'd have to `cd` between them, and CWD-dependent caches
  (system prompt sections, memory files, plans directory) don't
  automatically reflect the new location.
- No hook into Claude Code's session model — the harness doesn't
  know you've changed worktrees; it just sees unexpected files.

### 2. `Agent` tool's `isolation: "worktree"` — subagent scope

The `Agent` tool accepts an `isolation: "worktree"` parameter.
When set, the tool creates a temporary git worktree so the
subagent works on an isolated copy of the repo. Cleanup is
automatic if the agent makes no changes; otherwise the path and
branch are returned in the result.

**Scope:** subagent-only. The main agent is not in the worktree.
Good for: dispatching a reviewer subagent to read/audit without
risk of polluting the main working tree; running an experimental
implementation in isolation before merging findings back.

**Not a fit for:** preventing the autonomous-loop live-loop
pattern, because the autonomous loop runs on the *main* agent,
not a subagent.

### 3. `EnterWorktree` / `ExitWorktree` — main-agent scope

First-class Claude Code tools:

- `EnterWorktree` creates a git worktree inside
  `.claude/worktrees/<name>/` with a new branch from HEAD, and
  **switches the current session's working directory into it**.
  Alternative: pass `path` to enter an existing worktree (must
  appear in `git worktree list`).
- `ExitWorktree` returns the session to its original directory.
  `action: "keep"` leaves the worktree intact on disk;
  `action: "remove"` deletes it (requires `discard_changes: true`
  if there are uncommitted files or unmerged commits).

**This is the tool that matches our need.** A tick that wants
to do speculative factory hygiene can `EnterWorktree` at the
start, commit freely inside it, and `ExitWorktree` at the end
— the main repo stays on whatever branch it was on (including
an open PR's head), and no pollution can occur because the
speculative commits live in a different worktree on a different
branch.

**Strong usage gate (intentional):** the tool's description
reads:
> Use this tool ONLY when explicitly instructed to work in a
> worktree — either by the user directly, or by project
> instructions (CLAUDE.md / memory).
>
> ...
>
> Never use this tool unless "worktree" is explicitly mentioned
> by the user or in CLAUDE.md / memory instructions

This is deliberately conservative: worktree-switching changes
the session's CWD, which affects many downstream tools. The
factory-level fix is therefore to **add CLAUDE.md / memory
instructions that authorize worktree use for the specific
pattern we want**, so the tool's gate is cleared by policy, not
by ad-hoc user prompts each tick.

## Factory-level fix — CLAUDE.md addition (draft)

Add to `CLAUDE.md` under the "Ground rules Claude Code honours
here" section:

```markdown
- **Speculative work on an open-PR branch uses a worktree.**
  When an `<<autonomous-loop>>` tick wakes and the current
  branch is the head of an open pull request (`gh pr list
  --head "$(git branch --show-current)"` returns non-empty),
  the tick MUST `EnterWorktree` before making any commits.
  Rationale: committing speculative factory hygiene on the
  same branch as an open PR creates a live-loop where every
  push re-triggers the PR's CI with unrelated scope. The
  worktree lets speculative work accumulate on a different
  branch (`round-NN-speculative` where NN is the current
  round) without polluting the PR. ExitWorktree with
  `action: "keep"` at tick close — the worktree outlives
  the tick and accumulates across ticks. Full reasoning:
  `memory/feedback_live_loop_detector_speculative_on_pr_branch.md`.
```

The addition must land via Aaron's review of CLAUDE.md (it's
load-bearing); this research doc is the draft.

## Alternatives considered (Rodney-style essential-vs-accidental cut)

- **Just rename the branch per round.** Simple; no worktree
  needed. But requires ticks to be disciplined about branching
  before their first commit, and the same live-loop shape
  recurs if a tick forgets. Worktree is structural — the
  precondition is impossible to violate.
- **Detector-only (no structural fix).** Ships a pre-push hook
  that refuses a push whose branch is an open PR's head if
  commits look speculative. Catches the push attempt but does
  nothing about the "I already committed to the wrong branch"
  state. Good companion to worktree, not a substitute.
- **Separate repository clone for speculative work.** Works
  but duplicates `.git/` (wasteful) and loses the shared-history
  fast access that worktrees give.
- **One-shot `git worktree add` from the main agent.** Works
  mechanically but loses Claude Code session-model coherence;
  CWD-dependent caches and tooling don't track the new
  location. Strictly worse than `EnterWorktree`.

**Recommendation:** `EnterWorktree` + CLAUDE.md rule **AND**
pre-push heuristic detector — not one or the other. Both are
permanent factory surface. Aaron 2026-04-22: *"even with the
fix does not mean we could not regress"* + *"a discovered
class is a discovered class even if you fix the issue."* The
structural fix prevents a disciplined tick from violating the
invariant; the detector catches regressions when the discipline
decays (a future tick that didn't re-read CLAUDE.md, a
refactor that removes the rule, an environment that lacks
`EnterWorktree`). The two surfaces are complements, not
alternatives.

## Halting-problem acknowledgement + discovered-class durability

Total live-loop detection is undecidable (halting problem, per
Turing 1936 via Gödel 1931; Rice's theorem extends to any
non-trivial semantic property). Heuristic detectors suffice for
the shapes we actually encounter. The worktree pattern is a
*structural* prevention — it makes the specific live-loop shape
impossible to construct **for disciplined ticks**.

But structural prevention does not eliminate the class; it
eliminates one instance of the class's violation. The class
itself ("speculative work committed to an open PR's head
branch") is a discovered phenomenon and remains part of the
factory's permanent knowledge whether or not a current fix is
in place. Anti-regression belongs to the class; the detector
is the class's owner. This is the general principle codified
in `memory/feedback_discovered_class_outlives_fix_anti_regression_detector_pair.md`.

## Next steps (queued — not done this tick)

1. Draft the CLAUDE.md addition (this doc's §"Factory-level fix")
   into a PR for Aaron's review.
2. Pilot `EnterWorktree` on the next speculative tick that
   wakes on an open-PR branch — verify the ergonomics: does
   `MEMORY.md` track across the worktree switch? Does the cron
   survive? Does the tick-history file update correctly from
   inside the worktree?
3. Ship the pre-push heuristic detector (`tools/hygiene/pre-push-live-loop-check.sh`)
   as the belt-to-suspenders backup. ~20 lines of bash:
   `gh pr list --head "$(git branch --show-current)"` + grep on
   commit messages / paths.
4. Research the interaction with the existing cron-driven
   autonomous loop: if a tick `EnterWorktree`s and the next
   `<<autonomous-loop>>` fire arrives before `ExitWorktree`,
   does the cron resume in the worktree or the original dir?
   (Probably original; needs verification.)

## Related memories

- `memory/feedback_live_loop_detector_speculative_on_pr_branch.md`
  — the memory this research answers.
- `memory/feedback_never_idle_speculative_work_over_waiting.md`
  — the rule that drove the tick-cadence accumulation.
- `memory/feedback_fix_factory_when_blocked_post_hoc_notify.md`
  — "additive not destructive" — worktree is additive by
  design.

## Related docs

- `docs/AUTONOMOUS-LOOP.md` — the discipline this pattern
  extends.
- `CLAUDE.md` — where the factory-level rule would land.
- `docs/BACKLOG.md` P1 "Live-loop heuristic detector + structural worktree pattern" — the row this doc feeds.
