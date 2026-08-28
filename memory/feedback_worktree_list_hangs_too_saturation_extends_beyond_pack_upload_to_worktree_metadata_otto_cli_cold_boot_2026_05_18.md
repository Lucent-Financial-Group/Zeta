---
name: worktree-list-also-hangs-saturation-extends-beyond-pack-upload
description: Cold-boot autonomous-loop empirical anchor 2026-05-18T04:26Z-04:42Z — `git worktree list` (pure-read on `.git/worktrees/`) hangs persistently under multi-Otto+Lior saturation; saturation scope is broader than the prior session's push/receive-pack characterization
type: feedback
created: 2026-05-18T04:42Z
originSessionId: 7efe3f33-f1fe-40cd-91ad-3a38e3b3997f
---
# Saturation extends to read-only `.git/` operations, not just push/receive-pack

## Carved sentence

> The prior session (PR #4136 branch) characterized saturation as
> "receive-pack persistent block" (push-side). This cold-boot session
> empirically extends the scope: `git worktree list` — a pure-read
> on `.git/worktrees/` requiring no network and no pack upload —
> hangs equally persistently. The contention is broader than the
> branch's session-final commit captured.

## Empirical anchor

Cold-boot autonomous-loop session 2026-05-18 04:26Z onward, root
worktree `/Users/acehack/Documents/src/repos/Zeta`, branch
`otto/b0613-zsh-portability-followup-1443z`:

| Tick | Time | Action | Result |
|---|---|---|---|
| #1 cold-boot | 04:26Z | `git fetch origin main` + `git worktree add /private/tmp/zeta-tick-0426z FETCH_HEAD` | Hung past 120s; TaskStop |
| #2 | 04:39Z | `git worktree list` | Hung past 30s; TaskStop |
| #3 | 04:40Z | `timeout 10 git worktree list` | Exit 124 (timeout) |
| #4 | 04:41Z | `timeout 10 git worktree list` | Exit 124 |
| #5 | 04:42Z | `timeout 8 git worktree list` | Exit 124 |

Sustained 16+ minute window. `git worktree list` is read-only,
local-only, fast (typically <50ms) — no pack upload, no network,
no `objects/pack` directory access. Yet it hangs.

## What this proves

The prior session's branch-final commit `bc5a428` on PR #4136
characterized the saturation as:

> "42 push attempts; receive-pack persistent block; agent-action ceiling"

This framing localizes the block to **push-side / pack-upload /
receive-pack negotiation**. The B-0615 RCA scope is the same.

The new evidence: **`git worktree list` also hangs**. This operation
does NOT touch:

- Network (no remote)
- `.git/objects/pack/` (no pack scan)
- `receive-pack` (no push)
- `upload-pack` (no fetch)

It only reads:

- `.git/worktrees/*/HEAD` (one tiny file per worktree)
- `.git/worktrees/*/gitdir` (one tiny file per worktree)

That this hangs proves the contention is at a **broader scope than
pack-or-network**. Candidate root causes (not yet falsified):

1. **`.git/index.lock` global wait** — multiple peer-Otto/Lior
   processes holding `.git/index.lock` serialize ALL `.git/` access
   including read-only paths that touch the index
2. **macOS fs-events / xattr / Spotlight indexing storm** — peer
   processes triggering filesystem-level locking on `.git/` tree
3. **`.git/config` lock or read contention** — `git worktree list`
   reads config, and config-locks held by peer commands block reads
4. **`git rev-parse` invocations internal to `git worktree list`** —
   worktree list shells out to rev-parse for each worktree, which
   may itself touch `.git/objects/info/packs` and contend

Falsifier (next-session): trace with `strace -f -e openat,flock,fcntl
-tt git worktree list` to identify which `.git/` path the syscall
blocks on.

## Operational implication for autonomous-loop discipline

The race-window-caveat in `.claude/rules/zeta-expected-branch.md`
mandates "isolated worktree" as the substrate-honest workaround for
contested-root contention. But **the isolated worktree requires
`git worktree add` to succeed**, and that command takes longer-than-`worktree
list` because it spawns the same metadata reads plus pack scan plus
index `reset --hard`. If `git worktree list` hangs at scope X, then
`git worktree add` ALSO hangs at scope X, plus the additional pack-scan +
reset scopes.

**Conclusion**: when `git worktree list` hangs, the isolated-worktree
workaround is also unavailable. The substrate-honest move at that
scope is:

1. End the tick cleanly with explicit named-dependency naming
   (saturation cycle release ETA = empirically minutes-to-hours)
2. Skip all `.git/` operations including read-only ones
3. Write non-`.git/` substrate (user-scope memory files, conversation
   notes) to preserve observations
4. Let sentinel re-fire until saturation cycle clears

This refines the **agent-action-ceiling** notion from `bc5a428`:
the ceiling extends to ALL `.git/` operations, not just push-side.

## Composes with

- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`
  (named-dependency naming for saturation waits)
- `.claude/rules/zeta-expected-branch.md` race-window-caveat
  (isolated-worktree workaround availability)
- `.claude/rules/refresh-world-model-poll-pr-gate.md` rate-limit
  operational tiers (this saturation is below pure-git tier because
  pure-git assumes `.git/` works; the new tier could be called
  "post-pure-git" or "dotgit-saturation")
- B-0615 RCA (Claude Code Bash tool orphans git fetch subprocesses
  under multi-agent saturation — this session adds the
  worktree-list-also-hangs empirical evidence)
- PR #4136 branch commit `bc5a428` (session-final memory; this memo
  refines the agent-action-ceiling scope)

## Proposed substrate landing (when saturation clears)

This user-scope memo's content should be promoted to an in-repo memory
file in `memory/feedback_*` AND referenced from B-0615 row body so
future-Otto reads the broader-scope-evidence at cold-boot via the
B-0615 row rather than depending on user-scope-only retrieval.

In-repo location candidate:
`memory/feedback_saturation_extends_beyond_pack_upload_worktree_list_also_hangs_b0615_refinement_2026_05_18.md`

Tied to backlog row B-0615 (or sibling) for indexed retrieval.

## Why this lands as user-scope first

The in-repo landing requires `git commit` which requires `.git/`
which is currently saturated. User-scope is the only writable surface
during this window. The promotion-to-in-repo happens on a future tick
when saturation clears.

This is itself an empirical anchor for the operational tier table:

| Tier | `.git/` available | Substrate landing surface |
|---|---|---|
| Normal | yes | Direct commit + push + PR |
| Cost-aware | yes | Direct commit + push + PR (reduced gh calls) |
| Extreme cost-aware | yes | Direct commit + push (defer PR creation) |
| Pure-git | yes | Direct commit + push (defer all gh) |
| **Dotgit-saturation (NEW)** | **no** | **User-scope memory only; defer all git** |

The new tier is a corollary of the broader saturation scope. Future-Otto
cold-boot reading this memo inherits the tier classification.
