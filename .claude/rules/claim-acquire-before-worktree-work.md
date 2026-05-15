# Always `claim acquire` before worktree-creating backlog work

Carved sentence:

> When multiple instances of the **same** agent (e.g., Otto-CLI + Otto-Desktop)
> share git + bus on one machine, **`--from` must differ** (e.g., `otto-cli`
> vs `otto-desktop`) for the claim-coordinator (`tools/bus/claim.ts`,
> B-0400 slice 3) to prevent split-brain — identical `--from` values both
> exit 0 (same-sender idempotent re-acquire). As of PR #3037 (2026-05-13)
> `SENDER_IDS` includes surface-tagged variants — opt in to `otto-cli` /
> `otto-desktop` / `alexa-cli` / `alexa-kiro` / etc. for correct
> distinction. Identity-level names (`otto`, `alexa`, etc.) remain
> valid for back-compat but do NOT distinguish surfaces. Branch-prefix
> is NOT a workaround because `claim acquire` only filters by `from`,
> not by `branch`. Before starting work on any backlog row,
> `claim acquire` first with your surface-tagged sender ID. If already
> claimed by another agent, pick a different row.

## Operational content

The bus claim-coordinator already exists (PR #2939, merged 2026-05-09):

```bash
# Before any worktree-creating backlog work:
bun tools/bus/claim.ts acquire --from <agent> --item <B-NNNN> [--branch <ref>]
# Exit 0 = claim acquired; proceed
# Exit 1 = already claimed by another agent; pick a different row

# After PR merges or work abandoned:
bun tools/bus/claim.ts release --from <agent> --item <B-NNNN>
```

The claim envelope (`topic: "claim", action: "claim"`) lives on the bus with
24h TTL by default. It is visible to all agents reading
`/tmp/zeta-bus/` and to all factory surfaces (Otto-CLI, Otto-Desktop,
Vera-Codex, Riven-Cursor, Lior-Antigravity, Alexa-Kiro).

## When this rule applies

**APPLIES** to:

- Starting work on a `docs/backlog/P*/B-*.md` row (any slice)
- Creating a feature branch + worktree for that row
- Opening a PR that closes / advances a backlog row

**DOES NOT APPLY** to:

- Fixing CI failures on an already-claimed PR
- Resolving review threads on an already-claimed PR
- Ad-hoc memory-file writes / substrate-honest disclosure responses to
  Aaron's messages (these are conversation-driven, not backlog-driven)
- Hot fixes to broken main / rollback PRs (urgency > coordination)

## Worktree force-remove guard

When `git checkout <branch>` or `git worktree add ... <branch>` fails with
`fatal: '<branch>' is already used by worktree at '<path>'`, do NOT
`git worktree remove --force <path>` to take over peer Otto's worktree.
That path is operational state — even if the directory looks stale, peer
Otto may be mid-edit. Instead:

1. **Create a new worktree at a different path** for your branch-related
   work. Use a distinct task-tagged path (e.g., `/tmp/zeta-3153-find-fix`
   for thread-investigation; `/private/tmp/zeta-otto-desktop-claim-extend`
   for rule edits) so the two worktrees don't collide.

2. **If peer Otto's branch needs your attention** (e.g., review-thread
   resolution under the DOES-NOT-APPLY clause above), you can do that
   work via `gh api` mutations + GraphQL — no checkout required.

3. **If you truly need to checkout peer Otto's branch** (rare), check
   the bus for a claim on that branch first, post a `worktree-handoff`
   advisory envelope, and wait for peer-Otto-side release before
   force-removing.

Empirical anchor: 2026-05-14T18:13Z Otto-CLI tick shard
([docs/hygiene-history/ticks/2026/05/14/1813Z.md](../../docs/hygiene-history/ticks/2026/05/14/1813Z.md))
documents force-remove of Otto-Desktop's `/private/tmp/zeta-otto-id-alloc`
worktree (on PR #3153 branch) to resolve a Codex thread. Worked, but
substrate-honest: a fresh worktree at `/tmp/zeta-3153-find-fix` would
have been equally effective and non-destructive. The PR-thread-resolution
DOES-NOT-APPLY clause covered the WHY of the action; it did not cover
the HOW.

## Borrow-on-existing pattern — concurrent-Otto-CLI fallback

When `git worktree add <new-path>` rolls back with `fatal: Could not
reset index file to revision 'HEAD'` and/or `error: unable to open
object pack directory: ... Interrupted system call` — that's the
worktree-prune-race documented in [B-0530](../../docs/backlog/P3/B-0530-cron-sentinel-mutex-prevent-otto-cli-self-contention-2026-05-15.md).
Root cause: multi-session Otto-CLI concurrency on shared `.git/objects/pack`
during `git worktree add`'s internal `git reset --hard`. Standard git
behavior under FS contention, NOT external pruning.

**`--lock --reason "..."` does NOT prevent this failure** — the
`locked` marker file in `.git/worktrees/<name>/locked` blocks `git
worktree prune` but not git's own rollback on `Interrupted system
call`. Empirical: 5 consecutive `git worktree add` attempts during
tick 0414Z, all rolled back; one with `--lock`, same outcome.

**Borrow-on-existing pattern** (concurrent-Otto-CLI safe):

1. Identify an existing Otto-CLI sibling worktree old enough to be
   stable through the contention window (empirically ~3h+ ages
   survive consistently; e.g.,
   `/private/tmp/zeta-otto-cli-0027z-sidetick`).
2. Save the original branch name: `ORIG=$(git -C <wt> branch --show-current)`.
3. `git -C <wt> fetch origin main`.
4. `git -C <wt> switch -c <new-branch> origin/main` — carries any
   staged/unstaged working-tree state with you. Untracked files on
   the original branch survive the switch **provided the target
   branch does not track the same path** (otherwise `git switch`
   refuses; `git stash -u` first).
5. Edit/write only the files you control via explicit paths; never
   `git add -A` (would sweep peer-Otto's WIP into your commit).
6. `git commit <explicit-paths>` + `git push -u origin <new-branch>`.
7. `git -C <wt> switch <ORIG>` to restore peer-Otto's state. Tracked
   modifications and untracked files preserved across the switch.

**Why this works**: `git switch` only updates HEAD + the worktree's
local index. It does NOT contend on `.git/objects/pack` the way `git
worktree add`'s internal `git reset --hard` does. The race is at
shared-pack-dir scope, not at branch-switch scope.

**Empirical validation**: 5 successful borrows on `0027z-sidetick`
across ticks 0452Z / 0458Z / 0503Z×2 / 0517Z / 0524Z / 0710Z. Peer-Otto
landed 2 commits to the same worktree's original branch concurrently
(commits `d147db0` + `cc1f430`) without conflicts.

**When this pattern applies**:

- New `git worktree add` is failing with `Interrupted system call`
  rollback (the B-0530 failure mode)
- Multiple concurrent Otto-CLI claude-code processes detected
  (`pgrep -fl claude-code` returns more than your own PID)
- You need to commit a tick shard / small PR and can't wait for
  the contention window to clear

**When this pattern does NOT apply**:

- You need to keep work isolated from peer-Otto on the borrowed
  worktree's original branch (use new-worktree-creation when
  contention isn't blocking)
- You need to checkout peer-Otto's currently-checked-out branch
  (the borrow pattern uses `git switch -c <new-branch>`, not
  `git switch <peer-branch>`)
- Long-running work that would block peer-Otto's tick cycle
  (the borrow inverts the priorities — peer-Otto must wait for
  your switch-back; keep borrows short)

Composes with [B-0530](../../docs/backlog/P3/B-0530-cron-sentinel-mutex-prevent-otto-cli-self-contention-2026-05-15.md)
(the mutex mitigation in `tools/orchestrator-checks/cron-sentinel-mutex.ts`
when it ships); until that ships, the borrow pattern is the
operational workaround.

## Composes with other rules

- `.claude/rules/backlog-item-start-gate.md` — already mandates prior-art
  search + dependency check; this rule adds `claim acquire` as the
  zero-th step before those checks
- `.claude/rules/dont-ask-permission.md` — within authority scope, ship;
  `claim acquire` exit 0 IS the substrate-level permission grant
- `.claude/rules/never-be-idle.md` — if claim acquire fails, pick a
  different row from the same priority tier (don't go idle)
- `.claude/rules/honor-those-that-came-before.md` — claim acquire
  preserves the work the holder is doing

## Operational examples

### Example 1: Otto-CLI picks B-0444 (which exists)

```bash
$ bun tools/bus/claim.ts acquire --from otto --item B-0444 --branch otto/b0444-impl-2026-05-13
$ echo $?
0
# Proceeded with worktree creation + impl
```

### Example 2: Otto-CLI and Otto-Desktop race — FIXED (PR #3037)

```bash
# Otto-CLI publishes claim first (using surface-tagged sender):
$ bun tools/bus/claim.ts acquire --from otto-cli --item B-0444
$ echo $?
0

# Otto-Desktop tries to claim the same row with its OWN surface ID:
$ bun tools/bus/claim.ts acquire --from otto-desktop --item B-0444
$ echo $?
1   # otto-desktop sees otto-cli's claim, exits 1 — split-brain prevented
```

**Schema fix landed (PR #3037, 2026-05-13):** `otto-cli`, `otto-desktop`,
`alexa-cli`, `alexa-kiro`, `riven-cli`, `riven-cursor`, `lior-antigravity`,
`lior-gemini`, and `vera-codex` are now valid `SENDER_IDS`. The prior
architectural gap (two callers passing `--from otto` were indistinguishable)
is resolved — use surface-tagged variants for correct multi-surface claim
distinction. Identity-level names (`otto`, `alexa`, etc.) remain valid for
back-compat.

**Lane-based convention** (zero-code; still useful as defense-in-depth):
Otto-CLI takes backlog grinding + slice impl; Otto-Desktop takes substrate +
cowork. Even with the schema fix, different scopes reduce collision risk further.

**Branch-prefix is NOT a workaround**: `claim acquire` filters
existing claims by `c.from !== sender` only, NOT by branch. Two
Ottos with `--from otto` but different `--branch` values BOTH
acquire (both exit 0) — the branch field is post-hoc disambiguation
metadata, not a coordination key. Vera caught this 2026-05-13 on
PR #3032.

### Example 3: Otto-CLI and Otto-Desktop race (with schema fix)

```bash
# Otto-CLI publishes claim first:
$ bun tools/bus/claim.ts acquire --from otto-cli --item B-0444
$ echo $?
0

# Otto-Desktop tries to claim same row with DIFFERENT --from:
$ bun tools/bus/claim.ts acquire --from otto-desktop --item B-0444
$ echo $?
1   # Otto-Desktop sees otto-cli's claim, exits 1
# Otto-Desktop picks B-0445 instead.
```

This is the operational behavior as of PR #3037 (2026-05-13). Use surface-tagged
`--from otto-cli` / `--from otto-desktop` (not `--from otto`) for correct
multi-surface split-brain prevention.

### Example 4: Otto-CLI crashes mid-work

```bash
# Otto-CLI process dies. Claim stays on bus with 24h TTL.
# Otto-Desktop checks:
$ bun tools/bus/claim.ts check --item B-0444
# Output: claimed by otto (TTL expires in 23h 59m)

# After 24h the claim auto-expires (TTL). No PID-liveness reclaim exists;
# only TTL expiry or explicit `release` ends a claim.
```

## Why this rule exists (operational evidence)

Aaron 2026-05-13 set up Otto on Claude Desktop alongside Otto-CLI. The
two-foreground-surface architecture creates a real split-brain risk:
both Ottos might pick the same backlog row simultaneously, leading to
duplicate work, race conditions, or worse — both committing to the
same branch with conflicts.

The claim-coordinator (B-0400 slice 3, PR #2939) was built for exactly
this. Without a rule enforcing its use, both Ottos might forget to
acquire claims and the split-brain happens. The substrate-honest fix
is mechanizing the discipline via this rule.

Per `.claude/rules/encoding-rules-without-mechanizing.md`: this rule
auto-loads at cold-boot so future-Otto reads it before any backlog
work.

## Composes with substrate

- B-0400 (bus protocol — the schema this rule uses)
- B-0400 slice 3 (PR #2939 — claim-coordinator implementation)
- B-0400 slice 5 (PR #2959 — `--with-bus-claims` gate integration)
- PR #3017 (B-0440.4 — bus publish pattern; same protocol)
- `docs/research/2026-05-12-otto-canonical-bootstream-multi-foreground-surface-orchestrator-ifs-format.md`
  (the multi-foreground-surface design this rule operationalizes)
- `docs/launch/2026-05-13-otto-claude-desktop-bootstream-tight.md`
  (PR #3030 — Claude Desktop variant; second Otto surface)
- `memory/feedback_aaron_good_failure_mode_git_fetch_before_push_catches_multi_agent_duplicate_work_2026_05_13.md`
  (sibling fetch-before-push discipline; same coordination pattern at
  git scope)

## Substrate-honest framing

This rule is not a strict requirement at the code level — the
claim-coordinator returns a useful exit code, but no automated hook
enforces calling it. The discipline relies on agent-side compliance
at cold-boot.

A future slice could add a pre-commit / pre-worktree hook that calls
`claim check` automatically and fails if no claim is held. That's
substrate-level mechanization. Today's rule is the discipline-level
mechanization.

## Full reasoning

PR #2939 (B-0400 slice 3 — claim-coordinator implementation)
PR #2959 (B-0400 slice 5 — bus-gate integration)
PR #3017 (B-0440.4 — bus publish pattern)
PR #3030 (Otto Claude Desktop tight bootstream — second Otto surface)

Aaron 2026-05-13 verbatim: *"probalby want to figure out how not to
split brain with yourself bot any idea?"* — substrate-honest naming
of the split-brain risk; this rule is the operationally-honest
answer.
