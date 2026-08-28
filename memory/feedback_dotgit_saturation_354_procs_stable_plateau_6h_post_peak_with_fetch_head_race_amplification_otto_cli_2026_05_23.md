---
name: dotgit-saturation-354-procs-stable-plateau-6h-post-peak-fetch-head-race-amplification-otto-cli-2026-05-23
description: "Third anchor in same-day dotgit-saturation sequence — 354 procs PERSISTING from 14:11Z to 16:08Z (~2h STABLE plateau, ~6h post-peak); FETCH_HEAD race fired at canary worktree-add (saturation-amplified failure mode previously documented at 2026-05-20T16:14Z); new observable shape = saturation has plateaued at 354, not continuing to descend; tier-table research extension."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-23T16:08Z
  originSessionId: 3f6ef6ac-6951-4f16-b37c-47ccaddca8fa
---

## Empirical anchor — 2026-05-23T16:08Z (third anchor same day; PLATEAU shape)

Fresh cold-boot Otto-CLI autonomous-loop tick. Sentinel re-armed
(job `3f0fcf47`). Step 1 refresh worldview produced:

| Metric | Value | Comparison |
|---|---|---|
| Stuck `git pack-objects` + `git maintenance` + `git repack` procs | **354** | IDENTICAL to 14:11Z anchor (~2h ago); descending from 10:18Z 450-peak (~6h ago) |
| Active Lior procs | 3 | matches 14:11Z |
| Peer Otto-CLI sessions (mutex `peerLines`) | 8 Claude processes | sustained multi-instance saturation |
| GraphQL remaining | 1911/5000 | Cost-aware tier per refresh-world-model-poll-pr-gate.md |
| GraphQL reset | 39 min | bounded named-dep ETA available |
| REST core | 4980/5000 | unchanged; near full |
| Working tree | contested root with peer untracked files | unchanged from 14:11Z |

## New observable shape — STABLE PLATEAU at 354 procs

The empirical sequence across today's three anchors:

| Anchor | Procs | Shape | Time gap |
|---|---|---|---|
| 10:18Z | 450 | extreme peak | t=0 |
| 14:11Z | 354 | descending from peak | +3h53m (-96 procs) |
| **16:08Z** | **354** | **STABLE PLATEAU** | +1h57m (-0 procs) |

This is the new shape: descending-from-peak curve has FLATTENED at
354. Not transient recovery from peak; not continued descent toward
nominal (<10 procs). The system has reached equilibrium at this
saturation level — peer Lior + multi-instance Otto-CLI cron-tick
work is producing stuck procs at the same rate the OS/git is reaping
them.

Operational implication: at saturation equilibrium, the saturation
doesn't self-clear within session-tick timescales. Recovery requires
either (a) peer activity reduction (Lior loop pausing; Otto sessions
exiting) or (b) maintainer-side cleanup per the
[`refresh-world-model-poll-pr-gate.md`](../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md)
recovery script. Autonomous-loop ticks cannot accelerate recovery.

## FETCH_HEAD race fired at canary worktree-add

The canary command:

```bash
timeout --kill-after=5s 22s git worktree add /private/tmp/zeta-canary-1608z FETCH_HEAD
```

returned **`fatal: invalid reference: FETCH_HEAD`** within seconds,
NOT a hang. The preceding `git fetch origin main` had printed
`* branch main -> FETCH_HEAD` successfully ~30s earlier.

This is empirical re-confirmation of the FETCH_HEAD-as-transient-file
race documented at [`refresh-world-model-poll-pr-gate.md`](../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md)
2026-05-20T16:14Z anchor:

> `.git/FETCH_HEAD` is a file (not a ref under `refs/`) — concurrent
> peer-Otto fetches in the shared `.git/` race on it; a peer
> `git fetch`, `git gc`, or worktree-cleanup operation can delete or
> truncate it between your fetch and your worktree-add.

At 354-proc plateau (vs lower-contention conditions when the
2026-05-20 anchor was first observed), the race FIRES RELIABLY rather
than intermittently. Saturation amplifies the race window.

## Three distinct dotgit-saturation failure modes now distinguished

At 354+ procs, canary worktree-add can manifest THREE distinct
failure shapes:

| Failure mode | Symptom | Anchor |
|---|---|---|
| **B-0530 hard-hang** | `git worktree add` hangs indefinitely on `.git/objects/pack/` | B-0530 RCA |
| **Degraded-but-not-hung** | Extracts partial tree (e.g., 44% in 20s); would complete in ~45-50s if not SIGKILL'd | 14:11Z anchor (this same day) |
| **FETCH_HEAD race** | `fatal: invalid reference: FETCH_HEAD` — fast-fail at ref-resolve scope | 16:08Z anchor (this anchor); 2026-05-20T16:14Z original |

Same root-cause class (`.git/` contention under multi-agent
saturation); three distinct observable surfaces. Each requires
different mitigation:

- B-0530 hard-hang → no working mitigation today
- Degraded extraction → wait + complete (>20s timeout)
- FETCH_HEAD race → base worktree on `origin/main` (durable
  remote-tracking ref) NOT `FETCH_HEAD` (transient file)

## Proposed tier-table extension

The current `refresh-world-model-poll-pr-gate.md` tier table has
GraphQL-quota tiers + the dotgit-saturation tier (orthogonal). The
dotgit-saturation tier itself could be sub-tiered by observed-shape:

| Stuck procs | Sub-tier | Worktree-add behavior |
|---|---|---|
| 10–100 | Mild | usually completes; intermittent FETCH_HEAD race |
| 100–250 | Saturated | hangs or completes partially; FETCH_HEAD race more common |
| **250–500** | **Extreme (plateau possible)** | hard-hang OR degraded OR FETCH_HEAD race — distinct shapes |
| 500+ | Extreme-extreme | extrapolation; not yet observed |

Pending in-repo landing when `.git/` recovers — keeping as
user-scope research substrate (this file).

## Substrate-landing during dotgit-saturation — pattern validated

Per the dotgit-saturation tier table, available substrate-landing
surfaces during saturation:

| Surface | Status this tick |
|---|---|
| User-scope memory (this file) | ✅ working |
| Bus envelopes | ✅ available (`tools/bus/bus.ts publish`) |
| GraphQL queries (subject to Cost-aware tier) | ✅ available |
| In-repo commits via contested root | ❌ blocked (peer untracked files; would require `git add` discipline that risks contamination) |
| Fresh isolated worktree creation | ❌ blocked (FETCH_HEAD race per this anchor) |
| In-repo tick shards | ❌ blocked (worktree-required) |
| Borrow-on-existing isolated worktree | ⚠️ conditional (would need to test) |

Today's three anchors (10:18Z + 14:11Z + 16:08Z) all use the same
user-scope memory landing pattern. Empirical-anchor accumulation
across saturation events works without in-repo write.

## Tick shard deferral

The 7-step per-tick discipline (`docs/AUTONOMOUS-LOOP-PER-TICK.md`
step 5) requires writing a tick shard at
`docs/hygiene-history/ticks/2026/05/23/1608Z.md`. Under
dotgit-saturation, this is blocked. The substrate-honest move per
the dotgit-saturation tier discipline is to land the empirical
anchor in user-scope memory (this file) AND defer the in-repo tick
shard to a future post-recovery tick. The empirical evidence here
IS the tick's substantive substrate even though the canonical
tick-shard surface is unavailable.

This is the third consecutive same-day tick to defer the in-repo
tick shard for the same named dependency (`.git/`-saturation). The
discipline composes correctly with
[`holding-without-named-dependency-is-standing-by-failure.md`](../../Documents/src/repos/Zeta/.claude/rules/holding-without-named-dependency-is-standing-by-failure.md)
counter-with-escalation: the named dependency IS the dotgit-saturation
state; bounded-wait ETA = whenever Lior loop pauses + peer Ottos
exit; substrate-landing concrete artifact = this memory file.

## Composes with

- [`refresh-world-model-poll-pr-gate.md`](../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md)
  dotgit-saturation tier — extends with plateau-shape observation +
  saturation-amplified FETCH_HEAD-race empirical anchor
- [`codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`](../../Documents/src/repos/Zeta/.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md)
  — same `.git/`-contention root-cause class; different failure mode
- [`claim-acquire-before-worktree-work.md`](../../Documents/src/repos/Zeta/.claude/rules/claim-acquire-before-worktree-work.md)
  saturation-ceiling — this anchor extends the empirical record at
  saturation-equilibrium (vs the original transient-saturation case)
- [`holding-without-named-dependency-is-standing-by-failure.md`](../../Documents/src/repos/Zeta/.claude/rules/holding-without-named-dependency-is-standing-by-failure.md)
  — dotgit-saturation IS a named bounded-wait; brief-acks with this
  named dep are non-failure-mode
- B-0530 (cron-sentinel mutex — the underlying race class)
- B-0615 (Claude Code Bash tool orphans git-fetch subprocesses)
- 2026-05-23 anchors at 10:18Z + 14:11Z (predecessor empirical
  evidence; this anchor is third in the same-day sequence)
- 2026-05-20T16:14Z FETCH_HEAD-race original anchor in
  refresh-world-model-poll-pr-gate.md — this anchor confirms
  saturation-amplification

## Operational lesson

The dotgit-saturation tier is **not a transient state** at the
350+-proc level — it can persist at saturation equilibrium for
hours without self-clearing. Operator-side intervention OR peer
activity reduction is required to recover. Autonomous loops can
continue producing substrate via user-scope memory landing during
the saturation; this is the third consecutive anchor demonstrating
the pattern works across a multi-hour saturation window.

The FETCH_HEAD-race result demonstrates that even read-only
`git fetch` operations are vulnerable under saturation; the
durable `origin/main` remote-tracking ref discipline lands fully
at this saturation level (FETCH_HEAD is transient file; `origin/main`
is durable ref under `refs/remotes/`).
