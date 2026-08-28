---
name: dotgit-saturation tier — 5h-stale .git/index.lock + git-status-hang under 5-Lior + 54-claude saturation; PR #4136 thread triage landed via non-git substrate (PR comment + bus envelope)
description: 2026-05-18T18:10Z Otto-CLI cold-boot tick — empirical anchor for 4th-tier dotgit-saturation proposed in refresh-world-model-poll-pr-gate.md; substrate-honest non-mutation path via PR comment + bus envelope; mirror/beacon framing applied to 10-thread triage on PR #4136
type: feedback
created: 2026-05-18T18:11Z
originSessionId: 42c5fa01-948c-4dc7-a2df-61ff4261afdb
---
# Dotgit-saturation tier empirical anchor — PR #4136 thread triage via non-git substrate

## Operational reading at 2026-05-18T18:10Z

Cold-boot tick on Otto-CLI ran the canonical AUTONOMOUS-LOOP-PER-TICK 7-step
discipline. Refresh surfaced:

- GraphQL rate: 4071/5000 remaining (Normal tier)
- Local branch `otto/b0613-zsh-portability-followup-1443z` carries PR #4136 (OPEN, 4/4 checks green, 10 unresolved threads, `nextAction: resolve-threads`)
- Peer-saturation indicators: 5 Lior + 54 claude processes detected via `ps -A`
- `.git/index.lock` is a 0-byte file dated `2026-05-18T13:19` — ~5 HOURS STALE
- `git status` HANGS at 8s timeout (no output)
- Last commit `f0abf3e docs(alignment): add HC-8 Non-Coercion Invariant` is local-only; 20 commits ahead of origin/main; 10 commits behind on different work
- Last tick shard 1757Z (13 min prior) noted Aaron's mirror/beacon framing: mirror-tier logging continues, beacon-tier governance docs (AGORA-CONSTITUTION.md V7, Genesis Seed, NCI governance doc) deferred

## Confirmation of dotgit-saturation 4th tier

This tick empirically confirms the 4th tier proposed in
`refresh-world-model-poll-pr-gate.md` (Pure-git tier collapse mode):

| Tier | Read-only `.git/` ops | Branch creation | Push | Available substrate path |
|---|---|---|---|---|
| Normal | OK | OK | OK | All paths |
| Cost-aware | OK | OK | OK | All but batch-poll |
| Extreme cost-aware | OK | OK | OK | PR per tick |
| Pure-git | OK | OK | OK (rate-limited) | Pure git; defer PR creation |
| **Dotgit-saturation (THIS TIER)** | **HANGS** | **HANGS** | **HANGS** | **NON-GIT ONLY** (PR comment via gh API + bus envelope + user-scope memo + Write tool to filesystem outside .git/) |

The 5h-stale `.git/index.lock` indicates a peer process crashed mid-operation
hours ago. Per `claim-acquire-before-worktree-work.md` saturation-ceiling:
do NOT force-remove the lock — could contaminate peer's WIP. The substrate-
honest response is non-git-mutating substrate path only.

## What landed this tick

Three substrate surfaces, all non-git-mutating:

1. **Bus envelope** `/tmp/zeta-bus/e6088110-4225-4525-9ee4-2ac5961b9b73.json`
   topic `work-assignment`, from `otto-cli` to `*`, TTL 2h — advertising
   PR #4136's 6 mirror-tier actionable threads to peer with cleaner saturation

2. **PR comment** `#4136 comment-4480598146` — published thread triage:
   6 mirror-tier actionable + 4 beacon-tier deferred per Aaron's 1757Z framing

3. **This user-scope memo** — empirical anchor for dotgit-saturation tier

## Mirror/beacon thread classification

Following Aaron's 1757Z framing:

**Mirror-tier (6 — surface-level edits; safe to land):**
- B-0613 row L75: `last_updated` not bumped
- B-0617 row L20: typo `huamn` → `human`
- Two memory files (git-index-lock + forced-#6) L15: frontmatter extra keys (`caused_by`, `composes_with`) per Copilot finding — should move to body sections
- Two research docs (B-0471 + B-0472) L5: filename `2026-05-14` vs header `2026-05-18` date mismatch

**Beacon-tier (4 — deferred per Aaron):**
- 2× `.gemini/bin/lior-loop-tick.ts` Agora V5/V6 prompt mismatch
- 2× `docs/governance/AGORA-CONSTITUTION.md` Otto-signature + PR-scope

Aaron's framing rationale: beacon-tier doc V7 rework (Genesis Seed + Knights
Guild ratification + NON-COERCION-INVARIANT.md governance doc) is the right
locus to resolve the V5/V6 inconsistency + the signature issue. Touching
V5/V6 prompt now would be premature work that gets superseded at V7.

## Counter discipline

Brief-ack #1 of session (cold-boot tick). Counter reset condition #3
satisfied: concrete artifact = PR comment + bus envelope + this memo.

## Composes with

- `.claude/rules/refresh-world-model-poll-pr-gate.md` — proposes 4th tier dotgit-saturation; this anchor empirically confirms it
- `.claude/rules/claim-acquire-before-worktree-work.md` — saturation-ceiling forbids force-removing peer locks
- `.claude/rules/blocked-green-ci-investigate-threads.md` — 10-thread investigation that surfaced the triage
- `.claude/rules/substrate-or-it-didnt-happen.md` — PR comments + user-scope memos + bus envelopes are valid host-durable substrate surfaces when git-mutation is blocked
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` — counter reset condition #3 (concrete artifact via non-git substrate)
- Prior empirical anchors: `bc5a428 memory(session-final): 42 push attempts; receive-pack persistent block; agent-action ceiling` (related saturation evidence)
- B-0615 (Bash-tool orphans git fetch subprocesses under multi-agent saturation)

## Substrate-honest framing

This memo captures one tick's evidence. It does NOT propose a rule change yet;
it provides one more data point for whether dotgit-saturation deserves
permanent landing in [`refresh-world-model-poll-pr-gate.md`](.claude/rules/refresh-world-model-poll-pr-gate.md).
After multiple ticks confirming the pattern (or N-instance threshold per
existing rule extension discipline), a rule edit may follow.

The 5h-old lock is unusual — natural-clear window per
`git_index_lock_wait_then_retry_*` memory is ~15s. This suggests a different
failure mode than transient peer-Otto contention: probably a crashed peer
process that never released the lock. Crash-resilience question for future
tools authoring (e.g., wrap lock-creation in trap handlers).
