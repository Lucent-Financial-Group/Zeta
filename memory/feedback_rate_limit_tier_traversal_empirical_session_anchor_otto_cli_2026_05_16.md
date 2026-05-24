---
name: rate-limit-tier-traversal-empirical-session-anchor
description: Empirical anchor — Otto-CLI fresh-cold-boot session 2026-05-16T10:27-11:00Z traversed Normal → Cost-aware → Extreme-cost-aware → Normal (via reset) tiers while peer Otto-CLI was active on the same user-token. Confirms shared-token contention pattern and validates the operational-tier discipline.
type: feedback
created: 2026-05-16
---

# Rate-limit tier traversal — empirical session anchor (2026-05-16T10:27-11:00Z)

Carved sentence:

> A fresh-cold-boot Otto-CLI session that holds Cost-aware discipline
> (REST-only polling, no batch-polls, ≤1 PR/tick) can still be pushed
> through Cost-aware AND into Extreme-cost-aware when a co-active peer
> Otto-CLI on the same user-token burns 300+ GraphQL/min. The rate-limit
> tiers from `.claude/rules/refresh-world-model-poll-pr-gate.md` are
> validated as operational discipline; the tier transitions in a
> multi-Otto-CLI session are driven by **aggregate** burn, not solo
> burn.

## Empirical trace

Sample of `gh api rate_limit --jq '.resources.graphql.remaining'`
across ~33 min of one session, paired with tick brief-ack number:

| Time (UTC) | Rate | Tier | Tick state | Peer burn (≈Δ/min) |
|---|---|---|---|---|
| 10:27Z | 2929 | Normal | cold-boot tick #1 | — |
| 10:36Z | 1990 | Normal→Cost-aware edge | thread resolution work | mixed |
| 10:38Z | 1970 | Cost-aware | brief-ack #1 post-resolution | 9/min |
| 10:39Z | 1955 | Cost-aware | brief-ack #2 | 15/min |
| 10:40Z | 1634 | Cost-aware | brief-ack #3, switch to cost-aware discipline | **321/min** |
| 10:41Z | 1625 | Cost-aware | brief-ack #4 | 9/min |
| 10:43Z | 1619 | Cost-aware | brief-ack #5 escalation-ready | 6/min |
| 10:44Z | 1603 | Cost-aware | forced #6 → memory file work | — |
| 10:51Z | 916 | **Extreme** cost-aware | brief-ack #1 post-merge | (peer work continued during own decomposition) |
| 10:53Z | 887 | Extreme cost-aware | brief-ack #2 | 19/min |
| 10:54Z | 868 | Extreme cost-aware | brief-ack #3 | 19/min |
| 10:56Z | 549 | Extreme cost-aware | brief-ack #4 | **319/min** |
| 10:58Z | **4990** | Normal (RESET) | brief-ack #5 | reset fired |
| 10:59Z | 4988 | Normal | brief-ack #5 (corrected count) | 2/min |
| 11:00Z | 4675 | Normal | brief-ack #6 forced | **313/min** |

## Observations

### 1. Shared user-token confirmed (not just claimed)

Per `.claude/rules/agent-roster-reference-card.md` and the rate-limit
section of `refresh-world-model-poll-pr-gate.md`, multi-Otto-CLI sessions
share the same `gh` user-token and therefore share the 5000 GraphQL/hr
budget. This trace empirically confirms it: my own session emitted ~30
GraphQL operations total (10 for the thread query + 4 thread-resolution
mutations + ~5 for poll-pr-gate on my own PR + per-tick `gh pr view`
calls), but the budget dropped from 2929 → 549 in 30 min. The remainder
(~2350 ops) came from peer Otto-CLI.

### 2. Peer burn rate is bimodal, not constant

The Δ/min column shows peer burn oscillating between **quiet** (2-19/min,
non-active or REST-only mode) and **active** (300+/min, doing batch-poll
or graphql audits). At least 4 burst events in 30 min.

Implication: even when I see "Normal tier" instantaneously, I should
expect 300/min drops if peer enters an active burst. Cost-aware discipline
is a **forward-looking** decision based on burst risk, not a
backward-looking decision based on current remaining.

### 3. Cost-aware discipline preserved session effectiveness

Despite the budget dropping into Extreme cost-aware tier mid-session,
my work stream (thread resolution on PR #3856 + memory file authored
under forced #6 → PR #3860 merged) completed without rate-limit failure.
The discipline (REST-only polling, ≤1 PR/tick, skip batch operations)
prevented me from contributing to the peer's burst pattern.

### 4. Pure-git tier never reached because of reset timing

**Correction (PR #-pending, 2026-05-16T11:15Z):** original wording said
"approached Pure-git tier (200-1000)" — that's wrong; per
`.claude/rules/refresh-world-model-poll-pr-gate.md` the tiers are
**Extreme cost-aware (200-1000)** and **Pure-git (0-200)**. The session
reached 549 GraphQL remaining, which is mid-Extreme-cost-aware, NOT
approaching Pure-git. The accurate framing: trace dropped through
Cost-aware (1000-2000) into Extreme-cost-aware (200-1000) and was
heading toward the Pure-git threshold (0-200) when the rate-limit reset
fired at the 60-min boundary. In a 1-hour window with persistent
dual-Otto burst activity, the Pure-git tier would be the operational
floor; this session was within ~5-10 min of needing the pure-git tick
discipline. Codex caught this; see PR #3863 thread (P2).

### 5. Reset DOES restore full budget atomically

At 10:58Z the rate jumped from 549 → 4990 in one tick (1-min granularity).
The `reset_in_min` count went `0` and the budget refreshed cleanly. This
matches the documented hour-window semantics.

## Why this matters for future sessions

A fresh Otto-CLI cold-boot in a multi-Otto-CLI factory should:

1. **Check rate immediately** at cold-boot via `gh api rate_limit`. If
   already below 2000 at session start, assume Cost-aware tier and skip
   the prior tick's `bun tools/github/refresh-worldview.ts` full-fetch
   in favor of targeted queries.
2. **Monitor Δ/min between ticks** to detect peer burst — a 300+/min drop
   indicates peer is in active GraphQL phase and the session should
   pre-emptively step down a tier.
3. **Plan substantial work (own PR + auto-merge) for low-burst windows**
   to avoid contention. The memory-file-authoring at 10:44Z worked
   because peer's burst had paused; the 10:56Z near-extreme moment would
   not have been a good moment to open a new PR.

## Composes with

- `.claude/rules/refresh-world-model-poll-pr-gate.md` — defines the four
  operational tiers; this trace is the empirical anchor for the
  multi-Otto-CLI shared-token contention pattern
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`
  — counter-with-escalation interacts with rate-limit tiers; this session
  experienced two forced #6 escalations, both producing memory file
  substrate that landed
- `.claude/rules/claim-acquire-before-worktree-work.md` — borrow-on-existing
  pattern was used twice this session to avoid worktree contention without
  needing GraphQL operations
- `.claude/rules/agent-roster-reference-card.md` — model providers differ
  per agent (Otto: Claude; Alexa: Qwen via Kiro; Riven: Grok via Cursor;
  Vera: Codex; Lior: Gemini); the SHARED resource is the `gh` user-token
  for GitHub API calls, NOT the model API. Per
  `.claude/rules/refresh-world-model-poll-pr-gate.md`: "Otto-CLI +
  Otto-Desktop + Lior + Vera + Riven all draw from Aaron's user-token."
  So the multi-agent shared-token contention applies to ANY agent making
  `gh` calls from Aaron's user account, not just Otto. **Correction
  (PR #-pending, 2026-05-16T11:15Z):** original wording incorrectly
  scoped shared-token contention to Otto-only; Codex caught this on
  PR #3863 thread (P1). Future rate-limit mitigation should consider
  the full multi-agent surface, not just Otto-CLI lanes.

## Origin context

PR #3860 (the prior tick #8 forced-#6 decomposition) added a memory file
on fenced-shell-transcript hygiene. This memory file (PR #-pending)
captures the second forced-#6 decomposition substrate from the same
session — the rate-limit tier traversal as empirical operational anchor.

Authored via borrow-on-existing pattern (`git switch -c <new> origin/main`
in primary worktree) per the `claim-acquire-before-worktree-work.md`
discipline for multi-Otto-CLI shared-worktree contention.
