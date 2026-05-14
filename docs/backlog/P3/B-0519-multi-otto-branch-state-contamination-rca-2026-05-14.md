---
id: B-0519
priority: P3
status: open
title: "Multi-Otto branch-state contamination — RCA + mechanization candidate"
tier: factory-infrastructure
effort: M
created: 2026-05-14
last_updated: 2026-05-14
depends_on: []
composes_with: [B-0400, B-0444, B-0506]
tags: [multi-foreground-surface, git-worktree, branch-state, friction, factory-hygiene]
type: chore
---

# Multi-Otto branch-state contamination — RCA + mechanization candidate

## Origin

Otto-CLI 2026-05-14 session encountered repeated branch-state drift across ~6 ticks. Each instance cost 30s-2min of recovery time. Pattern: after running `git checkout origin/main` or `git checkout -B <new-branch> origin/main`, the working tree silently ended up on a DIFFERENT parallel-Otto local branch — typically `claim/fix-3183-markdownlint-copilot-...`, `chore/b-0367-...`, `chore/b-0516-gates-ecc-...`, or `chore/b-0518-sharpen-holding-...`. Commits intended for the new shard branch landed on the wrong local branch, requiring untangle procedures.

Documented in shards:

- `1813Z.md` — first instance (force-removed stale `/private/tmp/zeta-otto-id-alloc` worktree)
- `1834Z.md` — branch-name collision on `shard/tick-1834Z-...`
- `1851Z.md` — local branch confusion at commit time
- `1856Z.md` — multi-Otto branch-state untangle procedure documented
- `1905Z.md` — parallel-Otto carried over `B-0515` file
- `1908Z.md` — `git checkout -f origin/main` workaround
- `1927Z.md` — B-0516 → B-0517 renumber due to parallel-Otto ID collision

## RCA hypotheses

1. **Shared local-branch namespace**: multiple Otto processes operating on the same `~/Documents/src/repos/Zeta` worktree create + check out local branches that other processes don't expect. `git checkout -B <name>` overwrites without warning.

2. **Stash auto-pop hazard**: long-lived prior-session stashes occasionally auto-popped during routine `git stash push <untracked>` workflows, introducing conflict markers in unrelated files (caught in 1817Z shard).

3. **Worktree directory mismatch**: stale `/private/tmp/zeta-*` worktree directories deleted from disk but their `.git/worktrees/<name>/` admin entries persist; `git checkout <branch>` fails with "branch already used by worktree at <missing-path>." B-0506 captured the prune-cadence mechanization.

4. **Implicit branch switching**: `git reset --hard origin/<remote>` doesn't switch to a local branch of the same name; it resets the CURRENT branch to the remote's commit. Commits go to whichever local branch HEAD points at.

## Workaround procedure (observed working)

The recovery pattern that consistently worked:

```bash
git fetch origin <target-branch> --quiet
git checkout -f -B <local-name> origin/<target-branch>
# or for a fresh branch from main:
git checkout -f origin/main
git checkout -B <new-branch-name> origin/main
```

The `-f` flag forces checkout even with conflicting working tree state; the `-B` flag forces local branch to track the specified remote.

## Additional contamination patterns (2026-05-14T20:10Z + 20:26Z)

Field-test of the workaround procedure surfaced two more contamination
mechanisms not in the original RCA above:

### Pattern 5 — HEAD detached at origin/main between operations

After `git push origin <my-branch>` and before `gh pr create`, another Otto
process executed `git checkout origin/main` in the same physical checkout.
`gh pr create` then failed with "could not determine the current branch: not
on any branch". The local branch ref still existed; only HEAD was detached.

Recovery: `git checkout <my-branch>` to reattach HEAD before retrying
`gh pr create`.

### Pattern 6 — `gh pr create` poisoned by implicit current-branch

Even after re-checkout, a third Otto-process check-out moved HEAD to
`fix/b-0518-sharpen-...` between the recovery `checkout` and the next
`gh pr create`. The retry then attempted to open a PR from that wrong
branch.

Recovery: `gh pr create --head <my-branch>` with an EXPLICIT head ref,
so the call doesn't depend on the (poisoned) current-branch state.

## Mechanization candidates

### Cheap

Pre-commit hook that checks `git symbolic-ref HEAD` against `$ZETA_EXPECTED_BRANCH` (the existing harness hook at `.claude/hooks/verify-branch-pretooluse.ts` already does this when the env var is set). The catch: agents don't reliably export `ZETA_EXPECTED_BRANCH` before every `git checkout -b`. Could augment with a session-start hook that auto-exports the expected branch name from the most-recent `git checkout -b` command.

**Secondary catch surfaced 2026-05-14**: the env-var hook also doesn't
reliably fire because `ZETA_EXPECTED_BRANCH` set in one Bash-tool call
doesn't always persist to the call that runs `git commit` — each invocation
may spawn a fresh shell. The substrate-honest primary catch is
`git branch --show-current` immediately before `git commit`. The env-var
hook stays as defense-in-depth.

### Cheap (new — for Pattern 5/6)

Two-line discipline that survived field-test:

1. **Always run `git branch --show-current` immediately before `git commit`.**
   Primary catch for wrong-branch commits. Survived ticks 2010Z + 2026Z
   first-try after being adopted.
2. **Always use `gh pr create --head <my-branch>` with explicit head ref.**
   Removes implicit dependency on current-branch state, which can be
   poisoned by parallel-Otto checkouts between `git push` and `gh pr create`.

These two are zero-code substrate (operator discipline), but they're
specifically the kind of thing that needs to be in cold-boot substrate
because a fresh-session Otto won't remember them otherwise. Carried in
`.claude/rules/` would be the right home if/when this is promoted from
P3 to actively-mechanized.

### Substantial

Per-Otto-process git worktree isolation. Each Otto session gets a dedicated `/private/tmp/zeta-<session-id>/` worktree that's never touched by other processes. Already partially-implemented in some shards (the `--worktree` field on bus claim envelopes per B-0444) but not consistently used by Otto-CLI sessions.

### Out-of-scope here

Full multi-Otto orchestrator that allocates work + worktrees + branch names without collision. That's a much larger design effort.

## Composes with

- B-0400 (bus protocol — coordination substrate)
- B-0444 (bus claim envelope worktree field — sibling discipline)
- B-0506 (worktree prune cadence — clears stale entries)
- `.claude/rules/claim-acquire-before-worktree-work.md` (the discipline this RCA supports)
- `.claude/hooks/verify-branch-pretooluse.ts` (existing pre-commit branch verifier)

## Substrate-honest framing

This row captures a pattern, not a specific fix. The full mechanization (substantial option) is more design effort than this row encodes. Filed as P3 because the workaround procedure is straightforward when the agent is paying attention; the cost is per-tick friction, not per-session blockers. Future ticks can pick this up if the pattern continues at scale.

## Origin tick

`docs/hygiene-history/ticks/2026/05/14/1954Z.md` — this tick's shard documents the RCA + filing.

## Field-test ticks (Patterns 5 + 6)

- `docs/hygiene-history/ticks/2026/05/14/2010Z.md` — first untangle field-test
  + secondary failure (env-var-based hook didn't catch wrong-branch commit).
- `docs/hygiene-history/ticks/2026/05/14/2026Z.md` — Pattern 5 + Pattern 6
  surfaced; `git branch --show-current` + `gh pr create --head` defenses
  validated.
