---
name: Post-Abort Dirty-Branch Resumption — recovery checklist after interrupted run (Amara naming, 2026-04-28)
description: Amara 2026-04-28T20:55Z named the operational class after Aaron interrupted Otto mid-rebase ("hey can you stop i'm going to upgrade you back to max mode"), Otto cleanly aborted, and the max-mode restart needed an inventory step before action. Definition — after an interrupted run, local branches may contain intact commits that were not pushed, leaving PRs DIRTY relative to main. Recovery requires inventory before new work, then serialized rebase/push/CI verification. Tiny-blade — prefer `--force-with-lease` over plain `--force`; lease behavior should be the default word in canonical memories.
type: feedback
---

# Post-Abort Dirty-Branch Resumption

## Class name (Amara 2026-04-28T20:55Z)

**Post-Abort Dirty-Branch Resumption** — Amara formalized
the recovery class after Aaron 2026-04-28T20:53Z interrupted
Otto mid-rebase ("hey can you stop i'm going to upgrade you
back to max mode this is difficult work"), Otto cleanly
aborted via `git rebase --abort`, and the max-mode restart
needed an explicit inventory step before resuming.

## Definition (Amara verbatim)

> After an interrupted run, local branches may contain intact
> commits that were not pushed, leaving PRs DIRTY relative to
> main. Recovery requires inventory before new work, then
> serialized rebase/push/CI verification.

## Why this needs to be a named class

Without an inventory step, the temptation on restart is to
either:

- **Re-do work** — assume the abort destroyed local commits
  and start again. Wastes effort; risks divergence from
  what was actually committed.
- **Plough forward** — assume the workspace is in some safe
  state and start new substrate work. Leaves DIRTY PRs
  rotting in queue + creates more contention.

The class names the discipline: **inventory before action**
on every restart after abort.

## Concrete incident (Otto 2026-04-28T20:53Z)

- **Trigger**: Aaron asked "stop, going to upgrade to max
  mode" mid-rebase of PR #693.
- **Otto's clean stop**:
  ```bash
  git rebase --abort
  git checkout main
  git status --short  # verified clean
  ```
- **State at restart**:
  - Branch `memory/amara-class-prediction-bearing-class-reuse-2026-04-28`
    had 2 commits ahead of main (845b945 + c795e40),
    PR #693 was DIRTY because main had advanced past the
    branch's old base.
  - Branch `memory/amara-class-name-scheduled-workflow-null-result-hygiene-scan-2026-04-28`
    similarly DIRTY for #690.
  - Neither branch had been force-pushed; commits intact
    locally; remote state = pre-rebase.
- **Recovery applied this session**:
  1. `git status` + `git log --oneline -3` on each branch
     to confirm commits are intact.
  2. `git pull --ff-only origin main` to get latest base.
  3. `git rebase main` on branch #1 → resolved conflicts
     (rerere helped per the Rerere Cache Dividend class).
  4. `git push --force-with-lease` (Amara tiny-blade —
     not plain `--force`).
  5. Verified CI restarted; auto-merge re-armed.
  6. Repeated for branch #2 (serialized, not parallel —
     because both touch MEMORY.md).

## The control (Amara 8-step checklist)

On restart after abort:

1. **List in-flight PRs**: `gh pr list --repo OWNER/REPO
   --state open`.
2. **Compare local branch, remote branch, and main**:
   ```bash
   git log --oneline origin/main..HEAD     # local commits
   git log --oneline @{u}..HEAD            # unpushed commits
   git log --oneline HEAD..origin/main     # behind
   ```
3. **Identify unpushed commits vs branch-behind-main
   dirtiness**. Both can coexist; treat them as separate
   recovery problems.
4. **Rebase serially when shared files are involved**.
   For MEMORY.md sibling-DIRTY chains, parallel rebases
   create new contention each time one merges.
5. **Push with `--force-with-lease`** (NOT plain
   `--force`). Lease behavior refuses the push if remote
   ref no longer matches the expected value, catching
   concurrent updates.
6. **Verify CI restarted**: check that GitHub Actions
   detected the new push and re-ran the relevant workflows.
   `gh pr view N --json statusCheckRollup` should show CI
   in progress.
7. **Re-arm auto-merge** if it dropped during force-push:
   `gh pr merge N --squash --auto`.
8. **Only then resume new substrate work**. The DIRTY
   chain is a real-dependency wait per the
   manufactured-patience-vs-real-dependency discipline;
   don't add new substrate before the chain is cleared.

## Tiny blade (Amara prescribed): `--force-with-lease`

> *"I'd avoid 'force-push' in the canonical memory unless
> it says `--force-with-lease`. Plain force-push is too
> easy to normalize; the safer lease behavior should be
> the default word."*

Canonical wording in this memory + future memories:

- **Always**: `git push --force-with-lease origin
  <branch>`.
- **Never** (in canonical recipes): `git push --force
  origin <branch>`.

Why:

- `--force-with-lease` refuses the push if the remote ref
  has been updated since the local ref was last fetched
  (catches concurrent collaborator pushes).
- `--force` blindly overwrites whatever's on the remote.
  Acceptable for one-author branches in private repos;
  dangerous when CI bots, peer agents, or external
  collaborators may push concurrently.
- The factory's multi-CLI / peer-agent trajectory makes
  `--force-with-lease` the future-safe default.

## What's preserved across abort vs not

| State | Preserved by abort? |
|---|---|
| Local commits on the branch | YES (unaffected by `git rebase --abort`) |
| Branch's unpushed status | YES |
| In-progress merge state | NO (rebase --abort discards) |
| `.git/MERGE_*` files | NO (cleared) |
| Working tree (after `git checkout main`) | clean if you checkout |
| `.git/rr-cache/` (recorded resolutions cache) | YES — recorded entries persist as cache; abort clears only the active rebase/merge resolution state (see Rerere Cache Dividend class for the precise boundary) |
| Remote branch state | unchanged (no force-push happened) |

The key insight: **abort is non-destructive of work**. It
just resets the in-progress merge state. The local commits
that need rebasing are still there.

## Pairs with Rerere Cache Dividend

After abort + restart, the rebase is faster IF rerere has
recorded resolutions from prior successful rebases on the
same conflict pattern. See
`feedback_rerere_conflict_resolution_cache_dividend_amara_2026_04_28.md`
for the cache mechanism.

## Bead audit

This class earns:

- **1 bead via worked example**: this very session's recovery
  (Aaron stop → abort → max-mode restart → 8-step checklist
  applied → both PRs rebased + force-pushed-with-lease + CI
  re-armed).

Future bead-earning opportunities:

- **Cross-session abort**: if Otto wakes in a new session
  with previously-aborted local state, the same checklist
  applies.
- **Different failure mode**: if the abort happens during
  a different operation (cherry-pick, merge, bisect), the
  checklist may need extension.
- **Falsifier**: would fail if abort destroyed local
  commits. Hasn't happened; class still holds.

## Composes with

- `memory/feedback_destructive_git_op_5_pre_flight_disciplines_codex_gemini_2026_04_28.md`
  — adjacent: 5 pre-flight disciplines for destructive git
  ops. The post-abort recovery is the inverse — what to do
  AFTER a non-destructive interruption.
- `memory/feedback_rerere_conflict_resolution_cache_dividend_amara_2026_04_28.md`
  — companion class; rerere is the cache that makes the
  rebase step (#4 in the 8-step) fast.
- `memory/feedback_class_count_validity_drift_amara_meta_class_2026_04_28.md`
  — discipline applied at restart: don't claim "we did N
  things" before inventorying actual state.
- `memory/feedback_aaron_terse_directives_high_leverage_do_not_underweight.md`
  — Aaron's terse "stop" carries outsized leverage; the
  abort + restart pattern depends on Otto respecting it
  immediately, not pushing through.

## What this is NOT

- **NOT a license to abort frequently.** Aborts are
  expensive (lose in-progress merge state). The class is
  about handling abort when it happens, not encouraging it.
- **NOT a substitute for clean-shutdown.** If you can
  finish the in-progress operation safely before stopping,
  do that. Abort is the second-best option.
- **NOT specific to Aaron-initiated interrupts.** Same
  checklist applies for any abort cause — Ctrl+C, network
  failure, OS crash, runner timeout.

## Pickup notes for future-Otto

When restarting after any kind of stop:

1. **Don't immediately produce new substrate.** Run the
   8-step inventory first.
2. **Local branches that are ahead of remote with no
   recent push = unfinished work.** Identify them; rebase
   them; force-push-with-lease.
3. **DIRTY PRs in queue = real-dependency wait.** Don't
   create more memory PRs until the chain is cleared
   (per the MEMORY.md sibling-DIRTY observation).
4. **rerere may have helped or hurt**: inspect with
   `git rerere status` if a resolved file looks
   suspicious.
