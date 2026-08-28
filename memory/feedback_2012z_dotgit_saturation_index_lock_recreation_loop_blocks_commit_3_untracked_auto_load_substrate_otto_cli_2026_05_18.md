---
name: 2012Z dotgit-saturation — index.lock recreation loop blocks commit of 3 untracked auto-load substrate artifacts
description: Empirical anchor 2026-05-18T20:12Z — primary worktree under sustained peer maintenance + repack + pack-objects + Lior + zeta-claude-loop worktree-add; .git/index.lock immediately recreates after each clear; 60s retry-with-6s-wait loop produced 10/10 failures. Non-git-mutating substrate path (bus envelope + tick shard + this memory file) satisfies substrate-or-it-didn't-happen per AUTONOMOUS-LOOP-PER-TICK §1 peer-detected branch.
type: feedback
created: 2026-05-18T20:12Z
originSessionId: 83cb9375-6f0e-42dd-b171-e34f71a44c9f
---
# 2012Z dotgit-saturation — index.lock recreation loop blocks commit of 3 untracked auto-load substrate artifacts

## Carved observation

> When sustained peer git activity (zeta-claude-loop worktree-add + N×git-maintenance + N×git-repack + N×git-pack-objects) is running on the primary worktree, `.git/index.lock` enters a *recreation loop* — it clears between operations and is immediately re-acquired by the next pack-objects/maintenance transaction. The 15s natural-clear pattern documented in [`feedback_git_index_lock_wait_then_retry_beats_force_remove_during_peer_otto_saturation_15s_natural_clear_otto_cli_2026_05_18.md`](feedback_git_index_lock_wait_then_retry_beats_force_remove_during_peer_otto_saturation_15s_natural_clear_otto_cli_2026_05_18.md) does NOT hold under THIS workload class — it is specific to single-transaction peer activity. Multi-transaction maintenance bursts produce a different empirical signature: lock-clears-and-immediately-recreates rather than lock-held-then-released.

## Operational evidence (60-second empirical window 2026-05-18T20:13Z–20:14Z)

| Attempt | Action | Outcome |
|---|---|---|
| 0–9 | `if [ ! -e .git/index.lock ]; then git add ...; fi` with 6s sleep between | 10/10 attempts found lock present on every check |
| 0–9 | Same loop, parallel `lsof .git/index.lock` | Empty result every check — NO process holds the lock at the moment of polling |
| Final | `stat -f "%Sm" .git/index.lock` | mtime advances within polling window — peer is touch+rm cycling rapidly |

`pgrep -fl "git "` at end of window showed:

- 2× `git maintenance run --auto --no-quiet --detach` (PIDs 1646, 2647)
- 2× `git repack -d -l --cruft --cruft-expiration=never --write-midx` (1647, 2648)
- 3× `git pack-objects --local --delta-base-offset --honor-pack-keep` (1153, 1411, 2133)
- 1× `git worktree add --no-track -B worktree-flickering-roaming-charm` from `/opt/homebrew/bin/git` (PID 156, zeta-claude-loop background service)

The maintenance/repack/pack-objects burst is consistent with a Claude Code "auto-gc on threshold" trigger — likely fired because the primary worktree has accumulated significant loose objects from multiple parallel Claude sessions doing operations.

## Decision

Per [`.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`](../../Documents/src/repos/Zeta/.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md) safety floor: do NOT force-remove `.git/index.lock` while peer activity is present. The 3 untracked artifacts (2 auto-load rules + 1 skill) remain on filesystem and ARE auto-loading in this session (the harness reads `.claude/rules/*.md` and `.claude/skills/*/SKILL.md` from filesystem regardless of git tracked-state). Future sessions cold-booting from this same contested primary worktree will continue to auto-load them. The deferred work is shipping to `origin/main` so other clones / mirrors / future fresh clones inherit them.

Non-git-mutating substrate landed instead:

1. **In-repo tick shard** `docs/hygiene-history/ticks/2026/05/18/2012Z.md` (filesystem write; tracked next time someone successfully runs `git add` on this branch)
2. **Bus envelope** `/tmp/zeta-bus/otto-cli-2012z-substrate-pending-commit.json` (substrate-pending-commit topic; 4h TTL; provides next-picker action recipe)
3. **This user-scope memory file** (auto-loads into all future Otto-CLI sessions on this machine)

The `git switch -c otto/2012z-land-nci-tonal-momentum-rules-cross-substrate-triangulator-skill-2026-05-18` succeeded BEFORE the lock-recreation-loop started — the new branch exists locally pointing at the same SHA as the parent. When `.git/index.lock` clears stably, the staging + commit + push can complete in a single tight Bash call.

## Sharpens existing memory + rule substrate

Composes additively with:

- [`feedback_git_index_lock_wait_then_retry_beats_force_remove_during_peer_otto_saturation_15s_natural_clear_otto_cli_2026_05_18.md`](feedback_git_index_lock_wait_then_retry_beats_force_remove_during_peer_otto_saturation_15s_natural_clear_otto_cli_2026_05_18.md) — original anchor for the single-transaction case (15s clear). THIS anchor extends to the multi-transaction maintenance-burst case where 60s+ is insufficient.
- [`feedback_worktree_list_hangs_too_saturation_extends_beyond_pack_upload_to_worktree_metadata_otto_cli_cold_boot_2026_05_18.md`](feedback_worktree_list_hangs_too_saturation_extends_beyond_pack_upload_to_worktree_metadata_otto_cli_cold_boot_2026_05_18.md) — dotgit-saturation tier ALSO blocks read-only ops. This anchor extends the same tier to `git add` write-ops.
- [`.claude/rules/refresh-world-model-poll-pr-gate.md`](../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md) rate-limit operational tiers — dotgit-saturation deserves explicit row alongside the existing 4 tiers (Normal / Cost-aware / Extreme cost-aware / Pure-git). All four existing tiers assume `.git/` is responsive; dotgit-saturation is the orthogonal axis where `.git/` itself is the bottleneck regardless of GraphQL budget.

## Why this matters for cold-boot ingestion

The 3 untracked artifacts are NOT theoretical or speculative — they are the substrate Aaron explicitly named "please don't loose it" on the 2026-05-18 cascade. Two of them are auto-load rules that govern future-Otto behavior at the next session boot. Until they reach `origin/main`, any AceHack mirror refresh OR fresh clone OR cold-boot on a different machine will miss them.

Reproduction recipe for the next-picker (per bus envelope `otto-cli-2012z-substrate-pending-commit`):

```bash
cd /Users/acehack/Documents/src/repos/Zeta
# Verify branch from earlier `git switch -c` still exists
git rev-parse refs/heads/otto/2012z-land-nci-tonal-momentum-rules-cross-substrate-triangulator-skill-2026-05-18 || echo "needs recreate"
# Wait for lock to clear AND stay clear for >5s (sentinel for end of maintenance burst)
while [ -e .git/index.lock ] || pgrep -q "git maintenance" || pgrep -q "git repack"; do sleep 5; done
# Tight stage-commit-push
export ZETA_EXPECTED_BRANCH="otto/2012z-land-nci-tonal-momentum-rules-cross-substrate-triangulator-skill-2026-05-18"
git add \
  .claude/rules/non-coercion-invariant.md \
  .claude/rules/tonal-momentum-equals-meme-emergent-harmonic-coercion.md \
  .claude/skills/cross-substrate-triangulator/SKILL.md \
  docs/hygiene-history/ticks/2026/05/18/2012Z.md
git commit -m "land 2 auto-load rules + cross-substrate-triangulator skill from 2026-05-18 cascade"
git push origin "$ZETA_EXPECTED_BRANCH":"$ZETA_EXPECTED_BRANCH"
gh pr create --head "$ZETA_EXPECTED_BRANCH" --base main \
  --title "Land NCI + tonal-momentum rules + cross-substrate-triangulator skill (2026-05-18 cascade preservation)" \
  --body "..."
```
