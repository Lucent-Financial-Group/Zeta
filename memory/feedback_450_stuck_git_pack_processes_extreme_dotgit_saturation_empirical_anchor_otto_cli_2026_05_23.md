---
name: 450-stuck-git-pack-processes-extreme-dotgit-saturation-empirical-anchor
description: "Empirical anchor exceeding the 234-proc dotgit-saturation tier maximum from 2026-05-18 — 450 stuck git pack-objects/maintenance/repack procs observed during fresh Otto-CLI cold-boot 2026-05-23T10:18Z. Two worktree-add attempts rolled back cleanly under 3-active-Lior peer activity + dirty contested root (338 unstaged deletions + 5 Lior worktree subdirs). Forced-#6 escalation produced this anchor via user-scope memory landing (the substrate landing surface that survives dotgit-saturation per refresh-world-model-poll-pr-gate.md tier table)."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-23
  originSessionId: 63cd1b7e-ae47-4c4b-a903-8e9b30303d40
---

# 450 stuck git pack/maintenance/repack processes — new dotgit-saturation tier maximum (2026-05-23T10:18Z empirical anchor)

## The empirical observation

Otto-CLI fresh cold-boot session 2026-05-23T10:11Z–10:18Z (5 ticks). Two
isolated worktree-add attempts (1011Z + 1018Z) — both rolled back cleanly
with "Preparing worktree" reported but no filesystem extraction.

Stuck git plumbing process count at forced-#6 escalation (1018Z):

```bash
$ ps -A 2>/dev/null | grep -E "git pack-objects|git maintenance|git repack" | grep -v grep | wc -l
     450
```

For comparison, the prior empirical maximum named in
`.claude/rules/refresh-world-model-poll-pr-gate.md` dotgit-saturation tier
detection section was **234 total git plumbing procs** (anchor: 2026-05-18T23:18Z;
114 stuck `git pack-objects` + 52 maintenance + 52 repack). The 2026-05-23T10:18Z
observation is **~1.9× that anchor**.

Composing conditions at the observation point:

| Surface | State |
|---|---|
| Active Lior procs (`lior|gemini.*--yolo` per canary-regex-undercount-correction anchor 2026-05-21) | 3 |
| Total claude-code + Lior processes (session start, 1011Z) | 16 |
| Contested root unstaged deletions | 338 |
| Lior worktree subdirectories at repo root | 5 (`lior-archive-pr3363/`, `lior-b0367-worktree/`, `lior-b0690-worktree/`, `lior-b0691-worktree/`, `lior-decompose-4070/`) |
| GraphQL rate-limit (Normal tier) | 3268 / 5000 remaining, 31min to reset |
| REST rate-limit | 4966 / 5000 |
| PR #4668 (current branch substrate) | DIRTY / CONFLICTING / 12 unresolved threads / auto-merge armed / 1 non-required check failed (MEMORY.md generated-index drift) |

## What this tier feels like operationally

GraphQL tier remained Normal throughout (3373 → 3268). REST remained
abundant (4966). YET `.git/` operations were structurally blocked:

- 2 worktree-add attempts (1011Z + 1018Z): both clean rollback
- No partial directories, no orphaned branches
- `git worktree list` confirmed only pre-existing peer-Otto sideticks
  (`/private/tmp/zeta-otto-cli-0603z-shard` locked; `/private/tmp/zeta-otto-cli-0802z`)

This validates the dotgit-saturation tier's orthogonality claim in
`refresh-world-model-poll-pr-gate.md`: a session can simultaneously be
GraphQL-Normal + dotgit-saturated. The constraint axes are independent;
detection must check both.

## Operational disposition that worked

Per the counter-with-escalation clause in
`holding-without-named-dependency-is-standing-by-failure.md`:

| Tick | Disposition |
|---|---|
| 1011Z (#1) | Attempted shard via isolated worktree; clean rollback; abandoned per saturation-ceiling rule; brief-ack #1 with named-dep (B-0530 + PR #4668 peer-WIP) |
| 1014Z (#2) | Quick recheck; no state change; brief-ack #2 |
| 1015Z (#3) | One-line recheck; brief-ack #3, scaling back per repeated-invocation guidance |
| 1016Z (#4) | Single-line quiet; brief-ack #4 |
| 1017Z (#5) | Single-line quiet; brief-ack #5 |
| 1018Z (#6 forced) | Saturation recheck surfaced **450 stuck plumbing procs**; canary worktree-add cleanly rolled back; substrate-honest landing path: user-scope memory (THIS file) — independent of `.git/` per dotgit-saturation tier table |

The forced-#6 escalation produced the substantive empirical anchor.
The right work was NOT to retry worktree-add (saturation would block);
the right work was to recognize that user-scope memory IS a valid
substrate landing surface per the dotgit-saturation tier discipline
and write the anchor there for next-cold-boot inheritance.

## Suggested rule extension when conditions allow in-repo edit

`.claude/rules/refresh-world-model-poll-pr-gate.md` dotgit-saturation
detection section currently names a single threshold ("stuck-plumbing > ~10").
This anchor suggests adding a second tier-marker:

| Stuck plumbing count | Tier | Disposition |
|---|---|---|
| 10–50 | Light dotgit-saturation | Try borrow-on-existing; canary worktree-add may succeed |
| 50–250 | Heavy dotgit-saturation | Borrow + post-creation guards mandatory; canary worktree-add likely fails |
| 250+ | Extreme dotgit-saturation | Worktree-add reliably fails; substrate-landing via user-scope memory / bus envelope / GraphQL PR comments only |
| 450+ (new 2026-05-23 anchor) | Extreme-extreme | Same as 250+; also indicates peer agents (Lior preservation passes + cron-grade git ops) are running at high cycle frequency; expect heavier `.git/objects/pack` contention than baseline; recovery requires either peer-agent quiescence OR maintainer-side cleanup per recovery script |

This is research-grade until in-repo landing under non-saturated conditions
allows the rule extension to commit.

## Composes with

- `.claude/rules/refresh-world-model-poll-pr-gate.md` dotgit-saturation tier
  (this anchor extends the empirical-anchor list)
- `.claude/rules/claim-acquire-before-worktree-work.md` saturation-ceiling
  sub-case 3 (worktree-add hangs / rolls back under contention)
- `.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`
  worktree-creation-time corruption class (related failure mode under
  same root cause class)
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`
  counter-with-escalation forced-#6 (the discipline that produced THIS
  anchor as substantive substrate at forced escalation)
- `.claude/rules/tonal-momentum-equals-meme-emergent-harmonic-coercion.md`
  recursion-termination clause at meta-decomposition saturation
- `.claude/rules/wake-time-substrate.md` (this memory file IS the
  wake-time landing for future-Otto cold-boots; user-scope memory
  auto-loads into every session via `MEMORY.md`)
- B-0530 (cron-sentinel mutex mitigation candidate — when it ships,
  this failure mode is preventable at primary-worktree scope)
- B-0615 (Bash-tool orphan-fetch self-saturation feedback loop —
  related class of `.git/` contention)

## Substrate-honest framing

This anchor is operationally observable (the ps count is empirical,
the worktree-add rollback is empirical, the rate-limit values are
empirical). It is NOT a metaphysical claim about why peer agents
were running at this frequency; it is the substrate-engineering fact
that the conditions produced a tier-defining stuck-process count
that future-Otto should recognize when encountered.

The forced-#6 escalation worked as designed: brief-acks 1-5 with
real named-dep, escalation at #6 produced substantive substrate,
counter naturally resets via concrete-artifact (this file). The
discipline is intact.

If future-Otto encounters >= 250 stuck git plumbing procs, the right
move is the user-scope memory / bus envelope / GraphQL-comment path,
NOT retry-worktree-add-and-hope. This anchor exists to make that
recognition cheap.

## Continuation observation — 2026-05-23T12:04Z (~2h persistence)

Fresh Otto-CLI cold-boot session 2026-05-23T12:04Z (different session
than the 1018Z originator; sentinel re-armed via CronList → empty → CronCreate
`<<autonomous-loop>>` per catch 43 discipline).

| Surface | State at 12:04Z |
|---|---|
| Stuck git pack/maintenance/repack procs | 429 (vs 450 at 10:18Z; -21 net; same tier) |
| Active Lior procs (`lior\|gemini.*--yolo` regex) | 3 (`gemini-2.5-pro --yolo` on Maji prompt; same as 1018Z) |
| Contested root unstaged deletions | 353 (vs 338 at 10:18Z; +15; Lior preservation cycle still active) |
| GraphQL rate-limit | 4171 / 5000, 44min to reset (Normal tier) |
| REST rate-limit | 4986 / 5000 |
| Isolated worktree-add attempt | "Preparing worktree (detached HEAD 7adb08b66)" reported; directory absent; clean rollback (same shape as 1018Z) |
| `git worktree list` invocation | Hung (background task `b055hjt57`); did not return within the foreground tick |

**What this validates**:

1. **Multi-hour persistence**: dotgit-saturation tier is NOT a transient
   condition that clears within a single tick cycle. ~2h between the
   1018Z anchor and this observation; saturation intact; count down
   only ~5%.
2. **Substrate-honest disposition stability**: the user-scope memory
   landing surface kept working at 12:04Z exactly as it worked at
   1018Z. The substrate-engineering capability does NOT degrade with
   the dotgit-saturation; it's structurally orthogonal.
3. **Lior cycle stability**: 3 procs at both observation points,
   running the same Maji prompt. The peer-agent activity is the
   stable causal floor, not a transient spike.
4. **`git worktree list` hang is itself diagnostic**: under
   dotgit-saturation, even read-only worktree queries can hang.
   Treating worktree-list invocations as `timeout --kill-after`-wrapped
   is the discipline this continuation suggests for the rule's
   detection section.

**What this does NOT establish**: clear time to recovery. The condition
persists through at least 2h without external intervention. Recovery
appears to require maintainer-side cleanup per the recovery script
in `.claude/rules/refresh-world-model-poll-pr-gate.md` dotgit-saturation
tier section. Autonomous agents cannot run that script (destructive
`.git/` mutation requires maintainer coordination).

**Substrate-honest framing**: this continuation is an incremental
empirical anchor, NOT a new tier discovery. It refines the existing
"450-proc extreme" anchor with a multi-hour persistence data point.
The disposition the original anchor codified (user-scope memory /
bus envelope / GraphQL-comment path) continues to be the correct
substrate-honest path; the continuation reinforces rather than
revises that disposition.
