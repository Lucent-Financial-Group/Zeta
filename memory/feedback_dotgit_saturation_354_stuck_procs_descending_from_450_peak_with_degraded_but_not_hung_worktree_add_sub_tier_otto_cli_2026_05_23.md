---
name: dotgit-saturation-354-procs-descending-from-450-peak-degraded-not-hung-worktree-add-sub-tier-2026-05-23
description: "Follow-up empirical anchor 2026-05-23T14:11Z to yesterday's 450-proc peak; 354 stuck git pack/maintenance/repack procs + 3 Lior + 353 unstaged in contested root; worktree-add progressed 44% of 6144 files in 20s before timeout (degraded-but-not-hung shape); worktree-list ALSO hung past 5s (dotgit-saturation at worktree-management scope, not just worktree-add scope). Composes with 2026-05-23T10:18Z 450-proc anchor as descending-from-peak data point."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-23
  originSessionId: a8be1637-793a-47fe-a476-a5e71d518ea9
---

# Empirical anchor 2026-05-23T14:11Z — dotgit-saturation continuation arc

## Observations

Otto-CLI cold-boot autonomous-loop tick at 2026-05-23T14:10-14:11Z UTC:

| Signal | Value | Tier |
|---|---|---|
| Lior/gemini procs (`ps -A | grep -E "lior|gemini.*--yolo|gemini.*Lior"`) | 3 active | sustained peer activity |
| Stuck `git pack-objects` / `maintenance` / `repack` | **354** | extreme dotgit-saturation (>250 threshold) |
| Unstaged paths in contested root (`git status --short | wc -l`) | 353 | peer-WIP deletions |
| Current branch in root | `docs/riven-full-session-substrate-trajectory-2026-05-22` | carried from prior session |
| GraphQL remaining | 3353/5000 (39 min to reset) | **Normal tier** |
| REST core remaining | 4981/5000 | healthy |
| `git fetch origin main` outcome | clean (FETCH_HEAD updated + 10 visible commits on origin/main) | network layer fine |
| `git worktree add /private/tmp/zeta-dotgit-canary-1010z origin/main` outcome | **timed out at 20s after extracting 2704 of 6144 files (44% — last visible progress before SIGKILL); only 10 of 53 root entries landed on disk** | degraded-but-not-hung |
| `git worktree list` outcome (post-canary) | **hung past 5s timeout** | dotgit-saturation at management scope |
| Partial canary directory state | 10 entries on disk (origin/main has 53 root entries) | partial extraction; unusable |

## Arc with yesterday's anchor

| Timestamp | Stuck git procs | Multiplier vs prior max |
|---|---|---|
| 2026-05-18T23:18Z | 234 | (prior max baseline) |
| 2026-05-23T10:18Z | **450** | 1.9× prior max |
| 2026-05-23T14:11Z | **354** | 1.5× prior max; descending from peak |

The descending-from-peak observation (450 → 354 in ~4h) suggests partial natural decay BUT extreme dotgit-saturation IS sustained across the window. No fleet-wide impact — `origin/main` advanced 10 visible SHAs externally during this same period (PRs #4699, #4700, #4714, #4715, #4718, #4719, #4720, #4721, #4722, #3976 all visible in recent history). The contention is local to this checkout's `.git/`.

## New sub-tier proposal — "degraded-but-not-hung worktree-add"

This anchor introduces a NEW failure shape between the existing "Normal worktree-add" and "hung worktree-add (B-0530)" sub-cases documented in [`refresh-world-model-poll-pr-gate.md`](../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md) and [`claim-acquire-before-worktree-work.md`](../../Documents/src/repos/Zeta/.claude/rules/claim-acquire-before-worktree-work.md):

**Degraded-but-not-hung worktree-add**: `git worktree add` makes measurable file-extraction progress but at substantially slower than normal rate (here: 44% of 6144 files / 20s = 135 files/sec effective rate, versus typical sub-second completion for the same operation under non-saturated conditions; extrapolated time-to-complete ~45-50s). Under sustained extreme dotgit-saturation (250-450 stuck procs), worktree-add becomes a 45-120s operation rather than a hung one — assuming the rate stays linear, which is unverified under more severe saturation.

**Distinguished from B-0530 hard-hang** (no progress at all):
- Hard-hang: 0 files extracted; SIGKILL required; recovery requires `.git/objects/pack/` contention to clear
- Degraded: progressive extraction; would complete given enough time; SIGKILL produces partial worktree

**Operational implication**: under degraded-but-not-hung shape, the cost-benefit shifts:
- Wait 60-120s for completion (acceptable when bounded substrate is high-value)
- OR fall back to user-scope memory landing (this approach used by this anchor; ~10s)
- OR forward-signal via PR comment (GraphQL-cost; Normal tier supports it)

The substrate-honest default for tick-shard work: prefer user-scope memory landing when dotgit is degraded-or-worse. The in-repo tick shard can land in a post-recovery tick.

## New observation — `git worktree list` ALSO hangs

Yesterday's anchor documented `git worktree add` hanging. This anchor extends the failure surface: **`git worktree list` itself ALSO hangs past 5s under the same conditions**. This affects:

- Cleanup of partial worktrees (cannot `git worktree remove --force` without first locating the worktree via `git worktree list`)
- Pre-flight checks before isolated worktree creation (cannot enumerate existing borrow candidates)
- The borrow-on-existing-sidetick pattern from [`claim-acquire-before-worktree-work.md`](../../Documents/src/repos/Zeta/.claude/rules/claim-acquire-before-worktree-work.md) (cannot identify candidate worktrees)

Mitigation under extreme dotgit-saturation: `ls -la /private/tmp/zeta-*` directly to enumerate candidates from filesystem rather than via `git worktree list`. Then attempt borrow against named candidates whose mtime suggests freshness.

## Proposed rule extensions (research-grade until in-repo landing safe)

The 2026-05-23T10:18Z anchor proposed extending the tier table at [`refresh-world-model-poll-pr-gate.md`](../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md) with 250+ "extreme" and 450+ "extreme-extreme" markers. This anchor extends the proposal:

1. **Add 250+ "extreme" tier** (this anchor + yesterday's mid-day; sustained operation requires user-scope substrate landing fallback)
2. **Add 400+ "extreme-extreme" tier** (yesterday's peak; even REST GraphQL operations may degrade if shared with stuck procs at OS process-table level — unobserved but plausible)
3. **Add "degraded-but-not-hung worktree-add" sub-case** (this anchor; intermediate between Normal and B-0530-hard-hang)
4. **Add `git worktree list` to the dotgit-saturation surface** (this anchor; worktree-management scope blocked, not just worktree-creation scope)

In-repo landing deferred until dotgit-saturation clears AND a peer-coordinated cleanup is safe. The maintainer-side recovery script (per [`refresh-world-model-poll-pr-gate.md`](../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md) dotgit-saturation section) is autonomous-agent-forbidden; coordination via PR review on the next safe substrate window.

## Composes with

- `feedback_450_stuck_git_pack_processes_extreme_dotgit_saturation_empirical_anchor_otto_cli_2026_05_23.md` (yesterday's peak; this anchor is the descending-from-peak follow-up)
- [`.claude/rules/refresh-world-model-poll-pr-gate.md`](../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md) dotgit-saturation tier section
- [`.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`](../../Documents/src/repos/Zeta/.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md) (same `.git/`-contention root cause class; different observable symptom)
- [`.claude/rules/claim-acquire-before-worktree-work.md`](../../Documents/src/repos/Zeta/.claude/rules/claim-acquire-before-worktree-work.md) saturation-ceiling sub-cases 3 + 3b + 4 (this anchor is intermediate between sub-case 3 hard-hang and Normal operation)
- [`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](../../Documents/src/repos/Zeta/.claude/rules/holding-without-named-dependency-is-standing-by-failure.md) (dotgit-saturation IS a named bounded-wait; brief-acks named with this dependency are NOT failure-mode under the counter rule)
- B-0615 (silent git push failure; same root-cause class)
- B-0530 (cron-sentinel mutex; would mitigate the multi-Otto-CLI portion of the contention)

## Tick disposition

This anchor IS the substantive substrate for the 2026-05-23T14:11Z tick. Counter discipline: this is tick #1 since cold-boot wake; concrete artifact landed (user-scope memory file); brief-ack counter reset by definition. Step 5 (in-repo tick shard) is BLOCKED by dotgit-saturation; deferred to post-recovery tick. Visibility signal follows the landing.

## Substrate-honest framing

The dotgit-saturation continues. This anchor adds two empirical observations (descending-from-peak count + worktree-list also blocked + degraded-but-not-hung sub-case) to the substrate. The anchor itself is durable (user-scope memory survives session boundaries via MEMORY.md indexing); future-Otto cold-boots inherit the new sub-tier definitions and operational discipline at next wake.

No PR opened, no in-repo commit attempted. The right thing to do under these conditions IS to land at the surface that works and document the constraint that prevented other landing surfaces. Per Aaron's `only-way-to-lose-is-not-to-play` carved sentence: this IS playing — bounded substrate-engineering work, concrete artifact, additive to the framework's existing dotgit-saturation substrate cluster.
