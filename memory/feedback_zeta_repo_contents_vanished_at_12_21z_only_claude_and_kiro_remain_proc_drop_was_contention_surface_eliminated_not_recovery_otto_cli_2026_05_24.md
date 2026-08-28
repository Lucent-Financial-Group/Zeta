---
name: zeta-repo-contents-vanished-at-12-21z-only-claude-and-kiro-remain-proc-drop-was-contention-surface-eliminated-not-recovery
description: "Major state change observed 2026-05-24T12:26Z by autonomous-loop Otto-CLI tick — Zeta repo contents at /Users/acehack/Documents/src/repos/Zeta/ reduced to only `.claude/` and `.kiro/` subdirs (dir mtime 2026-05-24T08:21 EDT = 12:21Z UTC); no `.git`, no source, no docs/, no memory/, no tools/; the simultaneous 434→0 stuck-git-proc drop was the contention surface being eliminated rather than recovery; well outside autonomous-loop scope to act on; maintainer surface deferred."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-24T12:26Z
  originSessionId: 34b47991-283e-4d2c-a5a9-1ab1d3de1847
---

# Zeta repo contents vanished at ~2026-05-24T12:21Z — saturation drop was contention surface elimination, not recovery

## Observation

At 2026-05-24T12:26Z, autonomous-loop Otto-CLI tick observed:

```
ls -la /Users/acehack/Documents/src/repos/Zeta/
total 0
drwxr-xr-x@   4 acehack  staff   128 May 24 08:21 .       ← 12:21Z UTC
drwxr-xr-x@ 205 acehack  staff  6560 May 24 08:18 ..
drwxr-xr-x@   3 acehack  staff    96 May 24 08:18 .claude
drwxr--r--@   3 acehack  staff    96 May 24 08:21 .kiro
```

Only `.claude/` and `.kiro/` subdirectories remain. No `.git/` directory; no source code; no `docs/`; no `memory/`; no `tools/`; no `references/`; no `lior-*/` worktree dirs (all 17+ visible at session start); no any of the other ~25 untracked files that were visible in `git status` at the original 06:14Z tick.

`git -C /Users/acehack/Documents/src/repos/Zeta rev-parse --git-dir` → `fatal: not a git repository (or any of the parent directories): .git`

## The 434→0 stuck-git-proc drop was contention surface elimination, NOT recovery

Saturation series this session:

| Time | Stuck procs | Interpretation |
|---|---|---|
| 12:08Z | 428 | Extreme holds |
| 12:17Z | 434 | Extreme peak in this session |
| **12:21Z** | (repo dir mtime) | **`.git/` removed; source removed; only `.claude/` + `.kiro/` left** |
| 12:26Z | **0** | Contention surface eliminated — no procs to count because there's no shared `.git/objects/pack/` to contend on |

The proc drop is NOT "saturation cleared via natural recovery." It's "every stuck process found `.git/objects/pack/` deleted from under it and exited."

Future-Otto cold-boots must NOT interpret 0-proc readings as saturation recovery without verifying the repo is intact.

## Substrate-honest scope-judgment by THIS tick

The autonomous-loop-check guidance is conservative on inventing new work or making irreversible changes without clear conversation authorization. The observation falls well outside:

- Continuing established work (no PR in flight; no conversation thread; this is unprecedented state change)
- Acting on the observation (cloning the repo back / fetching from origin / restoring from `lior-archive-20260523/`) would be inventing major new work

Disposition: land THIS substrate-honest observation at user-scope memory so future-Otto cold-boots inherit the truth about what 12:26Z showed. Do NOT attempt repo restoration. Do NOT continue substrate-engineering work. The maintainer needs to see this state.

## Hypotheses (preserved per default-to-both; none collapsed)

| Hypothesis | Evidence for | Evidence against |
|---|---|---|
| **A — Maintainer-side intentional cleanup** | Saturation persisted ~26h+ (10:18Z 2026-05-23 → 12:17Z 2026-05-24); maintainer recovery script per `refresh-world-model-poll-pr-gate.md` dotgit-saturation tier was explicitly available; `lior-*` worktree dirs gone in same window suggests cleanup-script ran with `git worktree prune` semantics | No bus envelope or maintainer message surfaced this session announcing it |
| **B — Catastrophic multi-agent self-destruction** | Sustained extreme saturation across 9+ anchors; B-0615 self-saturation feedback loop class; orphan `git pack-objects`/maintenance/repack accumulated to 540 peak | `.claude/` + `.kiro/` survived = selective deletion shape; pure self-destruction wouldn't preserve those |
| **C — Repo moved to different path on disk** | Selective preservation of `.claude/` + `.kiro/` is consistent with rename-with-leftovers shape | Would expect to find the moved repo somewhere obvious; not verified by this tick |
| **D — `rm -rf` accident** | Possible but consistency-of-preservation makes this less likely | Same selective-shape argument against pure-disaster |

The most likely hypothesis (per Occam) is **A** — maintainer ran a cleanup that recreated the repo from clone OR moved the repo OR is rebuilding. The next session's CLAUDE.md / repo state will disambiguate.

## What survives this state change

- All user-scope memory files at `/Users/acehack/.claude/projects/-Users-acehack-Documents-src-repos-Zeta/memory/` — the autonomous-loop substrate work landed at user-scope (intentionally chosen because it survives dotgit-saturation per `refresh-world-model-poll-pr-gate.md`); ALSO survives `.git/` removal
- The 9th anchor file landed at 06:14Z this session
- All 8 prior same-day saturation anchors landed by peer Otto-CLI sessions
- MEMORY.md index entries pointing at them
- Cron sentinel `646446c7` (session-only; dies at session exit; would need re-arming in restored session)

What's gone (or moved or in maintenance state):

- The Zeta repo's git history
- All in-repo substrate (docs/, memory/, .claude/rules/, tools/, references/)
- The Soraya in-flight work visible at session start (16 backlog rows, NOTEBOOK.md modifications, SKILL.md modification, BACKLOG.md modification)
- All `lior-*` worktree dirs (17+)
- The Alexa branch this session was rooted on (`alexa/kiro-launchd-plist-2026-05-23`) — gone from local; presumably still on origin if pushed

## Operational implications for future-Otto cold-boots

1. **Do NOT trust 0-proc readings as recovery** without `git rev-parse --git-dir` succeeding from the repo root
2. **The repo state may be different** at next cold-boot than at session-start — refresh-before-decide invariant applies at REPO-EXISTENCE scope too
3. **User-scope memory IS the canonical persistence layer** across these state changes — landing substrate at `/Users/acehack/.claude/projects/.../memory/` is the bandwidth-engineering choice that survives both dotgit-saturation AND `.git/` removal
4. **If next session encounters fresh repo from clone**, the canonical CLAUDE.md / .claude/rules/ etc will be re-projected from origin; this user-scope memory file will surface in MEMORY.md index AND remain readable
5. **The 9 saturation anchors documented this 24h window are STILL VALID empirical substrate** — they happened, they're documented, the series is intact regardless of repo state

## This tick ends here

Per autonomous-loop-check guidance: when state is materially different from anything in established conversation context, lean toward waiting rather than inventing work. The autonomous-loop sentinel will continue firing every minute; subsequent ticks will detect the state and either confirm restoration OR continue the quiet-discipline pattern. No further action this tick beyond landing this observation.

## Composes with

- The 9th anchor file landed at 06:14Z THIS session: `feedback_dotgit_saturation_353_procs_9th_anchor_in_24h_window_cross_utc_day_persistence_with_github_network_blip_otto_cli_2026_05_24.md`
- All 8 prior same-day saturation anchors (10:18Z, 14:11Z, 16:08Z, 18:09Z, 20:14Z, 22:08Z, 00:09Z, 02:09Z) — empirical series intact
- `refresh-world-model-poll-pr-gate.md` dotgit-saturation tier — the rule's predictions about `.git/` contention were validated across 24h+ of empirical anchoring; this state change is the (presumably-maintainer-triggered) terminus of that saturation arc
- `holding-without-named-dependency-is-standing-by-failure.md` counter-with-escalation — this tick's brief-ack-#1 of new cycle landed substantive new substrate (this file); counter reset on concrete-artifact completion
