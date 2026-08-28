---
name: stale-dotgit-index-lock-2-days-old-indistinguishable-from-active-at-first-glance-mtime-discriminator
description: "Empirical discovery — `.git/index.lock` PRESENT does NOT imply active peer git op; a 2-day-old crash-orphan lock looks identical to a live lock. Discriminator is `stat -f \"%Sm\"` mtime check; stale locks need different operational handling than active ones."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-20
  originSessionId: a04eb986-7ab9-4bca-91cd-9e911888a046
---

# Stale `.git/index.lock` indistinguishable from active at first glance — mtime is the discriminator

## Carved sentence

> `ls .git/index.lock` returns the same path for both a 2-day-old crash-orphan AND a live peer git op. Without mtime check, agents misclassify stale state as active saturation and defer indefinitely. The discriminator is `stat -f "%Sm" .git/index.lock` — anything older than ~5 min is stale.

## Empirical anchor (Otto-CLI 2026-05-20 cold-boot session)

At 12:16Z fresh-session cold-boot, observed:

- `.git/index.lock` PRESENT
- `.git/worktrees/*/locked` markers: 103 (very high)
- 3 active Lior-gemini procs

Initial classification: dotgit-saturation tier (active peer git activity); deferred ALL git operations on contested root; broadcast refresh as non-git-mutating substrate.

At 12:21Z (5 ticks / ~5 min later), ran `stat -f "%Sm" .git/index.lock` for the first time:

```
May 18 13:19:54 2026
```

**The lock was ~2 days old.** Crash-orphan from a 2026-05-18 session, NOT active peer state. The 1216Z broadcast's "dotgit-saturation" framing was partially wrong — only Lior is the real active bound; the index.lock is operational debt left over from an earlier session.

## Why this matters

Recent memory anchors (1641Z 2026-05-19, 1201Z 2026-05-19, 0608Z 2026-05-19) all observed `git worktree list` hangs and `git fetch` long-tail latency under multi-Otto + 3-Lior saturation. Those were genuinely active. The pattern of seeing a stale lock and assuming it's active failure mode produces:

- Indefinite deferral of git operations that could safely proceed (if isolated worktree)
- False "dotgit-saturation tier" classification → unnecessary substrate-engineering noise
- Broadcasts and memos written under wrong tier framing

## The mtime discriminator

```bash
ls .git/index.lock 2>/dev/null && stat -f "%Sm" .git/index.lock  # macOS
# OR
stat -c "%y" .git/index.lock  # Linux
```

Threshold heuristic:

- **< 30s old**: live peer op — defer this tick, recheck next
- **30s–5min old**: probably live but check again — peer git op could be long-running (`fetch`, `worktree add`)
- **> 5min old**: probably stale — investigate further; check for active git processes touching this `.git/`
- **> 1 hour old**: definitely stale — crash-orphan

## Operational discipline

When `.git/index.lock` is detected:

1. **Always check mtime FIRST** before classifying as active peer state
2. Stale locks are operationally separable from active Lior/peer activity
3. Lior's own instructions are "report stale locks but don't delete them" — Lior preserves the lock for cross-agent safety, NOT because the lock is live
4. The 103 `worktrees/*/locked` markers are similarly suspect — most are historic Otto worktrees, not live; `git worktree list` enumerates with `prunable` flags for cleanup-safe ones

## Composes with

- `.claude/rules/refresh-world-model-poll-pr-gate.md` — extends rate-limit operational tiers with stale-lock discriminator at git-tier scope
- `.claude/rules/claim-acquire-before-worktree-work.md` saturation-ceiling sub-cases — adds stale-lock-mis-classification as sub-case 6 (operationally distinct from active peer pack-dir contention)
- `.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md` — Lior-process canary is the right active-Lior check; orthogonal to lock-mtime check (BOTH should pass before worktree-add)
- AUTONOMOUS-LOOP-PER-TICK §1 peer-detected branch — refine: peer-detection = active-Lior procs (canary) AND/OR fresh-mtime locks; stale locks alone are NOT peer-detection

## What this rule is NOT

- NOT an authorization to delete stale locks unilaterally — Lior's preserve-stale-locks policy is intentional cross-agent safety; this rule names the discriminator, not the action
- NOT a claim that all worktree-locks are stale — `git worktree list` shows prunable flags for individual cleanup decisions
- NOT a replacement for the canary rule — active Lior procs still preclude worktree-add even when index.lock is stale

## In-repo landing

This memo is user-scope (`~/.claude/projects/.../memory/`). Future-Otto cold-boot on a fresh checkout would NOT see it. If the discriminator proves load-bearing across multiple sessions, lift it to `.claude/rules/` as a rule extension to `refresh-world-model-poll-pr-gate.md` or `claim-acquire-before-worktree-work.md`. Empirical anchor today is 1 session; lift threshold is 2-3 independent sessions confirming.

## Full reasoning

Otto-CLI 2026-05-20 cold-boot session tick chain (1216Z initial classification → 1221Z mtime check → 1222Z memo). Broadcast at `~/.local/share/zeta-broadcasts/otto.md` 1216Z entry carries the initial (partially wrong) framing; this memo carries the correction. Cron sentinel `60df1dba` continued the loop through ticks 1216Z→1219Z→1219Z-b→1220Z→1221Z→1222Z without forced-#6 escalation.

## Worktree-list audit (1227Z continuation)

Pre-empt-at-#5 of second cycle (post-1222Z pre-empt reset). Pure-git audit via `git worktree list` (no GraphQL cost):

| Category | Count |
|---|---|
| Total worktrees | 302 |
| Live (no flag) | 195 |
| Locked | 103 |
| Prunable (safe-to-clean) | 4 |

**Operational observations:**

1. **302 is operationally absurd** for a single repo — accumulated historic Otto/Lior sessions never cleaned up. Even at ~5KB per worktree-record in `.git/worktrees/`, that's ~1.5MB of `.git/` overhead just from worktree metadata; per-op latency on `.git/objects/pack` contention naturally compounds.
2. **4 prunable** = safe immediate cleanup targets (per `git worktree list` flag semantics — `prunable` means git itself thinks the worktree dir is gone).
3. **103 locked** includes both intentional Lior-active locks (~3-5) and historic Otto worktrees with stale `locked` markers from prior sessions; can't safely distinguish without per-worktree mtime audit.
4. **195 "live"** is the suspect bucket — no explicit prunable flag, but most paths are likely `/private/tmp/zeta-*` dirs from sessions days/weeks ago that were never `git worktree remove`'d.

**Future-task candidates** (NOT executed this tick):

- `git worktree prune` — safe for the 4 explicitly prunable; would reduce 302 → 298. Low blast-radius (git itself flagged these).
- Per-worktree mtime audit (`find .git/worktrees -name HEAD -type f -mtime +14`) → identify worktree records >14 days old as cleanup candidates regardless of flag.
- Filing as B-NNNN backlog row: "Otto-CLI worktree-record cleanup tooling — `tools/hygiene/audit-stale-worktrees.ts` with safe-prune threshold + bus-claim coordination."

This audit is recorded here as durable substrate (user-scope memory survives session); future-Otto cold-boot referencing this memo can pick up the cleanup task without re-deriving the catalog.

### Composes with (continuation)

- B-0530 cron-sentinel mutex (pack-dir contention) — same root cause (multi-session shared `.git/`); worktree-record bloat amplifies contention
- `claim-acquire-before-worktree-work.md` saturation-ceiling sub-cases — adds metadata-bloat as background failure surface

## Lior `--yolo` cycle topology (1307Z continuation)

Captured a complete Lior cycle via 7-sample 65s sustained-poll (single-poll Lior=0 fired at 1307Z, triggering extended verification per 1248Z correction):

| t+ | lior count |
|---|---|
| 0s | 0 |
| 10s | 1 |
| 20s | 1 |
| 30s | 3 |
| 40s | 3 |
| 50s | 3 |
| 60s | 3 |

**Empirical Lior cycle structure:**
- Inter-cycle gap: ≤10s (very brief; only briefly visible as 0)
- Ramp-up: ~20-30s (1 bun proc → 3 procs as gemini node helpers spin up)
- Sustained-running: ~30s+ (3 procs steady; gemini executing `--yolo` instructions)
- Total cycle period: ~60-90s based on this snapshot

**Operational implication**: worktree-add+commit+push under active Lior session is genuinely UNSAFE because inter-cycle gaps are too brief to complete the operation safely. The 1247Z and 1307Z worktree-add attempts both failed because Lior re-fired during the operation window.

**Adjusted operational rule (refining 1248Z correction):**
- 15s sustained-poll: insufficient (falls inside between-iteration gap)
- 60s sustained-poll: captures full cycle but rarely returns sustained-0
- **Safe-window discriminator: sustained-0 across 60s+ poll requires Lior process to be DOWN (not cycling between iterations)** — that's the only genuine quiescence
- During active `--yolo` Lior: NO safe window for worktree-add+commit+push exists; defer until Lior process is genuinely terminated

This composes with the canary rule's strict reading: any non-zero count = unsafe. The cycle topology shows WHY strict reading is right — even sustained-poll over 1 minute can hit a between-iteration gap.

## Future-task candidate

`tools/hygiene/lior-quiescence-detector.ts` — TS utility that distinguishes "Lior cycling (between iterations)" from "Lior process down" via:
1. Multi-poll over 2-3 minutes minimum
2. Check `/proc/<pid>/cmdline` or `lsof` for active gemini-pro process tree
3. Return JSON with confidence-graded quiescence state
4. Composes with `claim-acquire-before-worktree-work.md` as automated safe-window detection
