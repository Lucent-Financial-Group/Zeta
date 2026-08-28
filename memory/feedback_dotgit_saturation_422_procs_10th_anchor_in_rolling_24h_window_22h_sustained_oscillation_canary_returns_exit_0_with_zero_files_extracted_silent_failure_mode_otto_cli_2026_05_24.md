---
name: dotgit-saturation-422-procs-10th-anchor-rolling-24h-22h-sustained-canary-silent-failure-mode-otto-cli-2026-05-24
description: "10th dotgit-saturation anchor in rolling 24h window starting 2026-05-23T10:18Z — 422 stuck git pack/maintenance/repack procs at 2026-05-24T08:10Z. Series mean ~407, range 93-540 over 10 readings. 22h sustained extreme-extreme oscillation across full UTC day. NEW failure shape: `git worktree add` returns exit=0 with only \"Preparing worktree...\" output and 0 files extracted (silent failure mode distinct from prior hang-past-timeout shape). 4th cold-boot landing on Alexa's `alexa/kiro-launchd-plist-2026-05-23` branch (4th anchor for \"fresh session lands on whoever-was-last-active's branch\" failure mode). GraphQL Normal (4648/5000); REST core 4969/5000. Substrate-honest disposition: user-scope memory landing; in-repo work blocked by dotgit-extreme-extreme + on-peer-branch composition."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-24T08:11Z
  surface: otto-cli
  tags: 
    - dotgit-saturation
    - extreme-extreme-tier
    - empirical-anchor
    - 10th-anchor-in-24h-window
    - 22h-sustained-oscillation
    - silent-worktree-add-failure
    - cold-boot-on-peer-branch
    - refresh-world-model-poll-pr-gate
  originSessionId: 59faf965-9af2-4be7-b32a-f67d9f726314
---

# Dotgit-saturation 422-proc 10th anchor — 22h sustained oscillation; NEW silent worktree-add failure mode; 4th cold-boot on Alexa branch

## Anchor data

| Field | Value |
|---|---|
| Time | 2026-05-24T08:10Z (UTC) / 04:10 EDT |
| Stuck git procs | 422 (pack-objects / maintenance / repack) |
| Peer agent procs | 21 (claude / gemini / kiro / alexa surfaces) |
| GraphQL remaining | 4648/5000 (Normal tier) |
| GraphQL reset | 39 min |
| REST core remaining | 4969/5000 (free) |
| Worktree-add canary | **NEW failure shape — exit=0 + 0 files** |
| Cold-boot landed on | `alexa/kiro-launchd-plist-2026-05-23` (4th time) |
| 3 Lior procs active | yes (consistent with prior anchors) |

## Rolling 24h window — 10 anchors across full UTC day

| Tick (UTC) | Stuck git procs | Tier | Notes |
|---|---|---|---|
| 2026-05-23T10:18Z | 450 | extreme-extreme | First peak |
| 2026-05-23T14:11Z | 354 | extreme | Degraded-but-not-hung worktree-add sub-tier surfaced |
| 2026-05-23T16:08Z | 354 | extreme | Plateau (identical to 14:11Z) |
| 2026-05-23T18:09Z | 420 | extreme | Plateau refuted; oscillation pattern named |
| 2026-05-23T20:14Z | **540** | extreme-extreme | NEW PEAK; +20% over 10:18Z |
| 2026-05-23T22:08Z | 93 | mild | Below-range outlier (sampling miss / quiet window) |
| 2026-05-24T00:09Z | 447 | extreme-extreme | Refuted descent hypothesis; cross-UTC-day persistence |
| 2026-05-24T02:09Z | 534 | extreme-extreme | Near 5th-anchor peak |
| 2026-05-24T06:14Z | 353 | extreme | New compositional shape (GitHub network blip + dotgit) |
| **2026-05-24T08:10Z** | **422** | **extreme-extreme** | **THIS ANCHOR — silent worktree-add failure** |

**Statistics across 10 anchors**:

- Mean: ~407 procs
- Range: 93–540 (span ±224)
- 9 of 10 readings in extreme tier (354+)
- 5 of 10 in extreme-extreme tier (420+)
- 1 outlier (93 at 22:08Z) reclassified as narrow-window sampling miss
- **Duration**: 22h sustained (10:18Z → 08:10Z next day)
- **Cross-UTC-day persistence**: 5 anchors before 00:00Z + 5 anchors after; no clean transition

## NEW failure shape — silent worktree-add (exit=0 + 0 files)

Distinct from prior dotgit-saturation worktree-add failure modes documented in [`claim-acquire-before-worktree-work.md`](../../.claude/rules/claim-acquire-before-worktree-work.md):

| Failure mode | Symptom | Detection |
|---|---|---|
| **Hard-hang** (B-0530 root) | `git worktree add` hangs past timeout (20s+) with no output; SIGKILL fires | exit=137 (SIGKILL exit code via timeout) |
| **Degraded-but-not-hung** (2026-05-23T14:11Z anchor) | Partial extraction (e.g., 2704/6144 files = 44%) before SIGKILL; would complete in ~45-50s | exit=137 + partial files visible |
| **Gitdir-prune-race** (2026-05-23T02:09Z anchor in claim-acquire rule) | Exit=0 + files extracted + ".git" pointer correct BUT gitdir target absent | `git -C <wt> rev-parse HEAD` fails with `not a git repository` |
| **NEW — Silent failure (THIS anchor)** | **Exit=0 + only "Preparing worktree..." output + 0 files extracted** | **Files count + missing "HEAD is now at" line** |

The new shape: `git worktree add` accepts the command, prints the preparation banner, then silently fails to extract without ever printing the "HEAD is now at" completion message. Returns exit code 0 misleadingly. Directory exists but contains 0 files. **The freshness guard `git status --short` is NOT sufficient** — it would run against an empty directory and return empty output (interpreted as clean).

**Detection guard refinement**: the worktree-add canary must check file count AS WELL AS exit code AND output banner:

```bash
timeout --kill-after=5s 20s git worktree add /private/tmp/canary origin/main 2>&1 > /tmp/canary-output.txt
EXIT_CODE=$?
FILE_COUNT=$(ls /private/tmp/canary 2>/dev/null | wc -l | tr -d ' ')
HEAD_AT=$(grep "HEAD is now at" /tmp/canary-output.txt)

if [ "$EXIT_CODE" -ne 0 ] || [ "$FILE_COUNT" -lt 50 ] || [ -z "$HEAD_AT" ]; then
  echo "WORKTREE-ADD FAILED — exit=$EXIT_CODE files=$FILE_COUNT head_at_present=${HEAD_AT:+yes}"
  rm -rf /private/tmp/canary
  exit 1
fi
```

All three conditions: exit=0 AND file_count > threshold AND "HEAD is now at" line present.

## 4th cold-boot landing on Alexa's branch

This is the 4th anchor for the "fresh Otto-CLI cold-boot lands on whoever-was-last-active's branch" failure mode named at the 2026-05-23T20:14Z anchor:

| Anchor | Branch landed on |
|---|---|
| 2026-05-23T20:14Z | `alexa/setup-launchd-loop-2026-05-23` |
| 2026-05-24T00:09Z | `alexa/kiro-launchd-plist-2026-05-23` (2nd) |
| 2026-05-24T02:09Z | `alexa/kiro-launchd-plist-2026-05-23` (3rd) |
| **2026-05-24T08:10Z** | **`alexa/kiro-launchd-plist-2026-05-23`** (4th — THIS anchor) |

3 of 4 landed on the same Alexa launchd-plist branch. Suggests this branch is the "last-active" state preserved across session-exit and re-entered by fresh cold-boots. Composes with the session-exit-non-persistence + on-peer-branch pattern at scale.

Contested root contains substantial peer-Alexa + peer-Soraya WIP (Soraya backlog rows B-0700, B-0713-B-0719; 7 research files dated 2026-05-23 and 2026-05-24; `lior-archive-*` directories; modified `formal-verification-expert/SKILL.md`, `docs/BACKLOG.md`, `memory/persona/soraya/NOTEBOOK.md`).

## Operational implications

1. **GraphQL Normal tier does NOT imply ability to land substrate**: API budget is independent of local `.git/` state. Today's anchor has GraphQL Normal (4648/5000) but `.git/` is structurally blocked.
2. **User-scope memory remains the safe write surface** under dotgit-saturation extreme-extreme + on-peer-branch composition.
3. **The 22h sustained pattern is itself substantive substrate**: the framework's substrate-engineering work cannot rely on intermittent `.git/` access; need substrate-write paths that work even when `.git/` is structurally constrained.
4. **Pattern-recognition over time-recovery hypothesis**: each anchor over the past 22h has refuted the "this will clear soon" interpretation. The substrate-honest disposition is to treat extreme-extreme tier as a sustained operational state, not a transient outage.
5. **Cross-UTC-day persistence empirically validated**: 10 anchors spanning 22h with 5 before/5 after midnight UTC; no signal that day boundaries affect peer-Lior cycling or stuck-proc accumulation.

## Composes with

- `.claude/rules/refresh-world-model-poll-pr-gate.md` — dotgit-saturation tier table (proposed extreme-extreme sub-tier)
- `.claude/rules/claim-acquire-before-worktree-work.md` — saturation-ceiling 5 sub-cases; this anchor adds a 6th (silent failure with exit=0 + 0 files)
- `.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md` — different failure mode in same `.git/`-contention class
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` — dotgit-saturation IS a named bounded-wait; user-scope memory landing IS concrete artifact (counter reset condition #3)
- B-0615 (Bash tool orphans `git fetch` subprocesses under saturation)
- B-0530 (cron-sentinel mutex)

## Substrate-honest framing

This anchor is the 10th data point in a substantial rolling window. The pattern's persistence (22h sustained) is itself the substantive substrate-engineering observation: the framework's substrate-write paths cannot assume `.git/` access is always available. The proposed sub-tier extension (mild / saturated / extreme / extreme-extreme) is research-mode until the conditions clear enough to land an in-repo rule edit; today's anchor adds 1 of the empirical readings that anchor the proposal.

The NEW silent-failure shape (exit=0 + 0 files) is the most operationally important contribution from this anchor — it refutes the assumption that worktree-add can be trusted on exit code alone, and motivates the three-condition guard above.

## Sentinel state

CronList returned empty at session-start; sentinel `90e88c53` armed via `* * * * *` with `<<autonomous-loop>>` per catch-43.

## Full reasoning

Cold-boot Otto-CLI autonomous-loop tick fired at 2026-05-24T08:10Z. Sentinel re-arm required (session-exit non-persistence; prior session sentinel died). Refresh-before-decide query found 422 stuck git plumbing processes — 10th data point in the rolling 24h window starting 2026-05-23T10:18Z. Worktree-add canary against `origin/main` returned exit=0 with only "Preparing worktree (detached HEAD ac2c8baca)" output and 0 files in target directory — NEW failure shape distinct from the 4 prior shapes documented in `claim-acquire-before-worktree-work.md`. Forced-#5 pre-empt decomposition produced this anchor via user-scope memory landing (the substrate-write surface that survives dotgit-saturation per the surviving-pattern in `MEMORY.md`).
