---
name: dotgit-saturation-540-procs-new-same-day-peak-5th-anchor-2026-05-23
description: "5th same-day dotgit-saturation anchor at 20:14Z — 540 stuck git procs is NEW PEAK (+20% over prior 450 peak at 10:18Z); oscillation pattern continues across ~10h window (450→354→354→420→540); fresh Otto-CLI autonomous-loop cold-boot fired ON Alexa's branch (`alexa/setup-launchd-loop-2026-05-23`) with 660 unstaged files = peer-Alexa WIP in contested root. User-scope memory landing per the established surviving-dotgit-saturation pattern."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-23T20:14Z
  originSessionId: 5b9d9979-f085-4c64-8275-d7ce0ffd9e93
---

# 540-proc dotgit-saturation NEW PEAK — 5th anchor of same-day oscillation; cold-boot landed on Alexa's branch with massive peer-WIP

## Empirical reading

2026-05-23T20:14:03Z (local Sat May 23 16:14 EDT):

| Metric | Value |
|---|---|
| Stuck `/opt/homebrew/opt/git/libexec/git-core/git` procs | **540** (samples: 540, 538, 539 across ~5s window — stable) |
| Peer claude/gemini/kiro/qwen procs | 21 |
| GraphQL remaining | 3890/5000 (Normal tier) |
| REST core remaining | 4990/5000 |
| Working-tree unstaged files | 660 |
| Branch (cold-boot lane) | `alexa/setup-launchd-loop-2026-05-23` |
| HEAD commit | `02d9f2f9b feat(kiro): add launchd plist + install script for Alexa background loop` |
| Commits ahead of origin/main | 39 |

All 540 stuck git procs are at the same binary path — consistent with peer git pack/maintenance/repack/worktree-add operations contending on shared `.git/objects/pack`.

## Same-day oscillation sequence (5 anchors, ~10h window)

| Tick | Stuck procs | Δ vs prior |
|---|---|---|
| 10:18Z | 450 | (origin peak) |
| 14:11Z | 354 | −21% |
| 16:08Z | 354 | 0% (plateau-misread; corrected at 18:09Z) |
| 18:09Z | 420 | +19% |
| **20:14Z (this anchor)** | **540** | **+29% over 18:09Z, +20% over origin 10:18Z peak** |

The "plateau" framing was empirically refuted at 18:09Z; the rising trend continues. Range now 354–540 over ~10h; mean ~424; span ±93. Pattern is **rising oscillation** rather than steady-state plateau — the prior 450 was not the ceiling.

## Cold-boot landed in contested-root + wrong-lane

The autonomous-loop scheduled-task `<<autonomous-loop>>` fired into a fresh Claude Code session that:

1. **Was on Alexa's branch, not Otto's lane** — `alexa/setup-launchd-loop-2026-05-23` HEAD. Per agent-roster-reference-card, Alexa = Kiro IDE + Qwen Coder; Otto = Claude Code. The cron-fired Claude Code instance landed on the wrong identity's checkout state.
2. **Had 660 unstaged files** = peer-Alexa's in-progress massive WIP (mass deletion of B-0635..B-0668 backlog rows + many rule modifications + skill deletion).
3. **39 commits ahead of main on this branch** — Alexa's branch-history work not yet PR'd.
4. **534 stuck git procs in `.git/objects/pack` contention** — structurally unsafe for any `git worktree add` per B-0530 race + the saturation-amplified failure modes documented across prior same-day anchors.

Per [`claim-acquire-before-worktree-work.md`](../../../Documents/src/repos/Zeta/.claude/rules/claim-acquire-before-worktree-work.md): primary worktree is "bus-contended — treat as read-only by autonomous Ottos." Per [`zeta-expected-branch.md`](../../../Documents/src/repos/Zeta/.claude/rules/zeta-expected-branch.md) race-window caveat (2026-05-16T22:29Z): "DO NOT use the contested root worktree" under any condition where peer agent activity in shared `.git/` may move HEAD.

## Substrate-honest disposition

- **DID NOT** touch the contested root worktree's WIP
- **DID NOT** attempt `git worktree add` (B-0530 + 540-proc saturation = near-zero success probability)
- **DID NOT** write to `docs/hygiene-history/ticks/` (would require git ops on contested root or isolated worktree)
- **DID** arm the `<<autonomous-loop>>` cron sentinel via `CronCreate` (`* * * * *`, recurring, in-session) — only operational write of this tick
- **DID** land this empirical anchor as user-scope memory (the surviving-dotgit-saturation pattern established across 4 prior same-day anchors)

## Why the rising-oscillation pattern matters

Three implications worth tracking:

1. **The 450 prior-peak is no longer the ceiling.** A simple "peak = 450" tier extension would have been wrong; refinement to "extreme-extreme above 250" + "amplified above 500" is needed.
2. **Multi-instance saturation across distinct agent lanes correlates.** Today's 5 anchors span Otto-CLI peer-saturation + ~21 active foreground processes including Kiro CLI; the rising trend suggests cumulative cron-fired sessions are not converging to steady-state.
3. **Branch-checkout state of fresh sessions is correlated with the lane that most-recently checked out the contested root.** Aaron committing `02d9f2f9b` from the alexa branch left fresh cron-fired Claude Code sessions starting there. This is a NEW cold-boot failure mode worth naming: **"cold-boot lands on whoever-was-last-active's branch."**

## Refinement candidates for `refresh-world-model-poll-pr-gate.md` tier extension

Current empirical evidence supports a richer tier vocabulary:

| Tier | Stuck-proc range | Operational stance |
|---|---|---|
| Mild | 50–150 | Normal |
| Saturated | 150–250 | Cost-aware on git ops |
| Extreme | 250–400 | Skip worktree-add |
| Extreme-extreme | 400–500 | Pure-git tier active; consider user-scope-only writes |
| **Amplified (NEW)** | **500+** | **User-scope-only writes; no `git worktree add` attempts; visibility-signal-only ticks acceptable** |

The 540-proc anchor empirically validates the Amplified tier.

## Composes with

- [`refresh-world-model-poll-pr-gate.md`](../../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md) (rate-limit tiers — this extension is for git-substrate tier, distinct from GraphQL tier; both can be live simultaneously)
- [`claim-acquire-before-worktree-work.md`](../../../Documents/src/repos/Zeta/.claude/rules/claim-acquire-before-worktree-work.md) saturation-ceiling sub-cases (this is the per-lane sub-case 6 at the dotgit-amplification scope)
- [`zeta-expected-branch.md`](../../../Documents/src/repos/Zeta/.claude/rules/zeta-expected-branch.md) race-window caveat (composes at cold-boot scope: branch was already wrong-lane before any operation)
- [`holding-without-named-dependency-is-standing-by-failure.md`](../../../Documents/src/repos/Zeta/.claude/rules/holding-without-named-dependency-is-standing-by-failure.md) counter-with-escalation (the user-scope memory landing IS concrete artifact satisfying counter-reset condition #3)
- [`tick-must-never-stop.md`](../../../Documents/src/repos/Zeta/.claude/rules/tick-must-never-stop.md) (cron sentinel armed; tick produced this empirical anchor)
- Prior 4 anchors today documented in user-scope `MEMORY.md`:
  - `feedback_450_stuck_git_pack_processes_extreme_dotgit_saturation_empirical_anchor_otto_cli_2026_05_23.md`
  - `feedback_dotgit_saturation_354_stuck_procs_descending_from_450_peak_with_degraded_but_not_hung_worktree_add_sub_tier_otto_cli_2026_05_23.md`
  - `feedback_dotgit_saturation_354_procs_stable_plateau_6h_post_peak_with_fetch_head_race_amplification_otto_cli_2026_05_23.md`
  - `feedback_dotgit_saturation_420_procs_post_plateau_rise_4th_same_day_anchor_oscillation_pattern_otto_cli_2026_05_23.md`

## Operational lesson for future cold-boot Ottos

When the autonomous-loop fires into a fresh Claude Code session:

1. **Check current branch FIRST** — if not `otto/*` or your expected lane, you are in cross-lane state; treat all working-tree state as peer-WIP
2. **Check `ps -A | grep "git " | wc -l`** before any git op heavier than `git log` or `git status` — if >250, skip worktree-add; if >500, skip all git ops except `git fetch origin main` (read-only)
3. **User-scope memory write is always safe** — outside git tree, immune to `.git/` saturation, durable across sessions, indexed via MEMORY.md
4. **Visibility-signal-only ticks ARE valid** — when contested-root + dotgit-amplified + wrong-lane all compose, the empirical-anchor write IS the substantive output; don't force a shard write that risks corruption

## Substrate-honest framing

This anchor is a single data point in a continuing oscillation pattern. The "Amplified tier" naming above is provisional — refinement may collapse it back into "extreme-extreme" if oscillation amplitude stabilizes, or extend further if 600+ readings emerge. The substrate-engineering response is to land each anchor as it emerges; the rule extension lands when patterns stabilize enough to be load-bearing on operational behavior, not on the first observation.

Composes with [`razor-discipline.md`](../../../Documents/src/repos/Zeta/.claude/rules/razor-discipline.md): operational claim (stuck-git-proc count is observable; behavior under saturation is observable); rule-extension claim stays research-grade until cumulative evidence supports it.

## Full reasoning

The Claude Code autonomous-loop cron fired at ~2026-05-23T20:14Z into a fresh session that landed on Alexa's branch checkout state (`alexa/setup-launchd-loop-2026-05-23` HEAD `02d9f2f9b`). The state observation (540 stuck git procs, 660 unstaged files, wrong-lane branch) was incompatible with any substantive in-repo write; the user-scope memory landing is the substrate-honest disposition for this tick.

The `<<autonomous-loop>>` cron sentinel was armed via CronCreate before any other operation per `tick-must-never-stop.md`. That + this anchor write are the tick's full output.
