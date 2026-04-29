# Active trajectory

> **READ THIS FILE FIRST** before any work that touches the active trajectory.
> If you (Claude/Otto/whoever) are about to run `git rev-list`, `git diff`,
> open a new audit branch, or invoke a peer-call about the active trajectory,
> stop. Read this file. Do the next action listed here, not a re-derivation.

## Priority — blocking all other work

**0/0/0 hard-reset: AceHack main = LFG main (0 ahead, 0 behind, 0 file content-diff).**

Per `CLAUDE.md` AceHack-LFG topology invariant + `memory/feedback_lfg_master_acehack_zero_divergence_fork_double_hop_aaron_2026_04_27.md`. The maintainer 2026-04-29 framing: *"this is the only trajectory i care about right now, it's blocking everything else."*

While this trajectory is active:

- Do NOT start LOST-branch recovery (task #264).
- Do NOT begin Aurora Round-3 absorption (task #286).
- Do NOT process the multi-AI synthesis backlog (tasks #309 / #310 / #311).
- Do NOT open new memory files or new substrate islands (B-0105 consolidation gate is still active).
- Do NOT run autonomous tick-history shards while in audit-spiral mode — wait for state change.

The autonomous-loop tick MAY still produce minimal honest-wait acknowledgements, but every action toward the trajectory must read this file first.

## Canonical state-bearing artifacts

These are the substrate the trajectory has produced. Read them in order; do NOT re-derive their content:

1. **`docs/0-0-0-readiness/CLASSIFICATION.md`** — file-level classification rubric + calibration batch (5/23 ALREADY-COVERED). The doc body lags the commit narrative; see #2.
2. **Commit `37bbca9`** (2026-04-28T17:53Z, "ops(0-0-0-readiness): final classification 19/4/0/0/0 + 3 Claude.ai upgrades + measurable-alignment round-close note") — declares 19 ALREADY-COVERED + 4 NEEDS-FORWARD-SYNC. The full per-file table never landed in the doc body; the narrative is in the commit message.
3. **`docs/research/2026-04-28-forward-sync-merge-direction-proposal-9-infra-files.md`** — the per-file plan with risk levels and recommended order. **16+ hours stale as of 2026-04-29T09:40Z**; verify against current git state before executing per-file decisions.
4. **`memory/feedback_destructive_git_op_5_pre_flight_disciplines_codex_gemini_2026_04_28.md`** — pre-flight disciplines that apply during any forward-sync or hard-reset.

## Current state (verified 2026-04-29T09:50Z)

Numerical (these numbers are NOT the trajectory; do not chase them):

```text
AceHack ahead of LFG:   145 commits
AceHack behind LFG:     638 commits
Modified files:          30
Deleted on AceHack:     155 (LFG-only — hard-reset adds these back)
```

### Hard-reset-safety classification (NOT merge-direction)

Per Amara 2026-04-29T09:50Z framing correction: "merge-direction is a plan shape; content-loss is the reset gate; do not confuse them." The question for 0/0/0 is NOT "which fork wins this file" but "what unique AceHack content would be LOST on hard-reset?"

Classification taxonomy:

```text
SAFE_TO_RESET_LFG_SUPERSEDES   — LFG has the same or better content; hard-reset is safe and may even improve AceHack.
ALREADY_RESOLVED               — file already identical between forks; nothing to lose.
NEEDS_FORWARD_SYNC             — AceHack has unique substantive content not on LFG; forward-sync to LFG before hard-reset.
EXPLICIT_ACCEPT_LOSS_REQUIRED  — AceHack has unique content but the maintainer chooses to accept its loss rather than forward-sync.
NEEDS_HUMAN_DECISION           — ambiguous; surface to maintainer.
```

### 9 infra files (verified 2026-04-29T09:50Z against current git state, NOT against the 16h-old plan)

| File | Hard-reset safety | Evidence |
|---|---|---|
| `tools/setup/common/verifiers.sh` | ALREADY_RESOLVED | Git shows identical content on both forks (2026-04-29T09:36Z `git diff --stat` empty). |
| `.markdownlint-cli2.jsonc` | ALREADY_RESOLVED | Identical content on both forks. |
| `.github/workflows/scorecard.yml` | ALREADY_RESOLVED | Identical content on both forks. |
| `.mise.toml` | SAFE_TO_RESET_LFG_SUPERSEDES | AceHack has `uv = "0.9"`; LFG has `uv = "0.11.8"`. LFG-newer pins. |
| `.github/workflows/resume-diff.yml` | SAFE_TO_RESET_LFG_SUPERSEDES | AceHack uses `gh pr view --json comments` (returns GraphQL node IDs, broken per Codex P1 on LFG #649). LFG uses `gh api .../issues/.../comments --paginate --jq` (returns REST integer IDs, fixed). LFG version is the bug-fix. |
| `tools/setup/common/elan.sh` | SAFE_TO_RESET_LFG_SUPERSEDES | AceHack uses `curl_fetch_stream <url> \| sh` (streamed pipe-to-sh). LFG uses `curl_fetch --output` to temp + per-arch SHA256 verify + run. LFG version is structurally safer per Scorecard PinnedDependenciesID hardening. |
| `tools/setup/linux.sh` | SAFE_TO_RESET_LFG_SUPERSEDES | AceHack uses `curl_fetch_stream https://mise.run \| sh`. LFG uses pinned-tarball + per-arch SHA256 + temp-dir + trap. LFG version is structurally safer. |
| `.github/workflows/codeql.yml` | SAFE_TO_RESET_LFG_SUPERSEDES | AceHack dropped `java-kotlin` matrix cell. LFG kept it with explicit code-scanning-service rationale (no-findings SARIF per language). LFG-newer matrix structure. |
| `.github/workflows/gate.yml` | SAFE_TO_RESET_LFG_SUPERSEDES | AceHack has `Setup Python` + `pip install semgrep` steps. The maintainer 2026-04-29T09:51Z framing: *"pip-install is wrong, uv we decided a long time ago"* — i.e., AceHack's pip-install path violates a prior maintainer decision (uv-only for Python tool management). LFG installs semgrep via `install.sh` three-way-parity (`pipx:semgrep` from `.mise.toml`, which is uv-managed under the hood). LFG's approach is the canonical-per-decision form. AceHack's extra `tools/tla`/`tools/alloy` cache paths are ALREADY on LFG (in the `Cache verifier jars (TLC + Alloy)` step). The retry-attempts logic (`for attempt in 1 2 3 4 5; do`) is identical on both sides — the diff is just comment wording (AceHack uses "Aaron 2026-04-28 directive" — would also trip the just-landed no-directives lint; LFG uses "the human maintainer's 2026-04-28 input"). Hard-reset REMOVES the wrong-per-decision pip path, GAINS the correct uv path, and cleans the lint-tripping prose register. The declarative pattern matches the broader factory direction (maintainer 2026-04-29T09:53Z: *"everything is declarative; we need all the functionality of `../scratch` — that's what we're aiming for for the ace package manager release"*). AceHack's imperative `pip install` step violates this; LFG's pin-in-`.mise.toml` form is declarative. |

**Result: 9 of 9 infra files SAFE_TO_RESET or ALREADY_RESOLVED.** No NEEDS_FORWARD_SYNC. No NEEDS_HUMAN_DECISION on these 9.

### The other 21 modified files (heuristic-projected; not yet per-file verified)

The 30-file modified-list is a superset of the 9 infra files. The remaining 21 are mostly memory / docs / tick-history / setup-script edits. The prior calibration batch (5 of 23 verified ALREADY-COVERED) + heuristic strongly project the 21 as also ALREADY_RESOLVED or SAFE_TO_RESET_LFG_SUPERSEDES. The pattern: when LFG-newer (-) line count >> AceHack-newer (+) line count, the AceHack content is older drafts of content LFG has since advanced.

Action: spot-verify 3-5 of the 21 before requesting hard-reset sign-off. Specifically, the 5 LARGEST-by-line files among the 21 are the highest-value spot-checks.

### Hard-reset preflight (per Amara 2026-04-29T09:50Z addition)

Before hard-reset, run a NARROW reachability-preservation pass — NOT broad LOST-branch recovery. Purpose: determine whether hard-reset would make AceHack-only substrate harder to recover.

Required checks:

```text
- list local branches whose commits are not reachable from origin/main
- list AceHack remote branches not merged to origin/main
- list worktrees and their HEAD SHAs
- list stashes and their base commits
- list known dangling commits from the corruption / lost-substrate ledger, if any
- classify whether each item intersects 0/0/0 hard-reset safety
```

Preflight classification:

```text
RESET_PREREQ_PRESERVE       — create named preservation ref or PR before hard-reset
RESET_IRRELEVANT_PARKED     — leave parked until after 0/0/0; do NOT recover during the active lane
ALREADY_REACHABLE           — already preserved via origin/main or other ref; no action
NEEDS_HUMAN_DECISION        — surface to maintainer
```

Best rule (Amara): *"Before hard-reset, preserve reachability. After hard-reset, recover history."*

Best blade: *"Do not do archaeology before reset. Do preserve the exits before closing the door."*

## Honest assessment of safety

The 2026-04-28 plan's per-file direction analysis still applies in spirit but its specifics are 16h stale. Today's task #312 (durable retry fix in `elan.sh` + `linux.sh`) shifted the AceHack-side state of those two files — the plan's "AceHack regressed to unsafe form" framing on `linux.sh` may or may not still hold.

Direct git verification 2026-04-29T09:36Z:

- AceHack `linux.sh` mise-install path uses `curl_fetch_stream https://mise.run | sh` (the streamed pipe-to-sh form).
- LFG `linux.sh` mise-install path uses pinned-tarball + arch-specific SHA256 + temp-dir + trap (the structurally-safe form).
- For HARD-RESET (LFG tree replaces AceHack tree): AceHack would GAIN the safe form. Hard-reset is SAFE for `linux.sh`.

A peer-call to Grok this session reported the inverse claim ("AceHack has the secure form"). That claim is WRONG — direct git verification contradicts it. Note for future-self: peer-call output is a single LLM read of supplied text; ground every claim in `git show` before acting on it.

## Next action

**HARD-RESET BLOCKED by unresolved git pack corruption. Corruption-triage sub-trajectory must close FIRST.**

### Preflight result (2026-04-29T09:55Z)

#### File classification — strong heuristic confirmation (10 of 30 verified)

- **9 infra files** verified ALREADY_RESOLVED or SAFE_TO_RESET_LFG_SUPERSEDES (see table above; commit `fdbfa9e`).
- **5 spot-checked** of the other 21 (CURRENT-aaron from calibration batch + 4 LARGEST-by-line: `feedback_lfg_master_acehack_*.md` / `tools/hygiene/fix-markdown-md032-md026.py` / `feedback_outdated_review_threads_*.md` / `feedback_confucius_unfolding_*.md`). All 5 show strong LFG-newer-dominates pattern (LFG-only line counts 127-188 vs AceHack-only 1-17). Each ALREADY_RESOLVED.
- **20 of 30 not yet per-file verified** but heuristic confidence high (10/10 verified-so-far ALREADY_RESOLVED).

File-level safety: AT THIS LAYER, hard-reset would not lose unique AceHack content.

#### Branch / worktree / orphan preflight (2026-04-29T09:55Z)

```text
Local branches not reachable from origin/main:        794
Remote AceHack branches not reachable from origin/main: 122
Worktrees (locked under .claude/worktrees/agent-*):     ~9 visible
Stashes:                                                  7
Dangling unreachable objects:                           many (per fsck)
```

For HARD-RESET of `acehack/main` specifically: branches/worktrees/stashes are NOT affected (hard-reset only moves `acehack/main`, not other refs). They remain reachable post-reset. **All preflight items at this layer: ALREADY_REACHABLE or RESET_IRRELEVANT_PARKED.**

#### **BLOCKER: git pack corruption persists**

```text
$ git fsck --full
error: inflate: data stream error (incorrect data check)
error: cannot unpack 9bf2daee3ce53c88633824f9532a0158aaa92ed9
       from .git/objects/pack/pack-16732bccb3ace9ec45c913c57a1fd050fd730c3f.pack
       at offset 4973478
[+ many dangling blobs/trees/commits]
```

Object `9bf2daee...` is a BLOB (not a commit/tree, so commit history is unaffected). But the PACK is corrupt — git cannot unpack one of its objects. Per `memory/feedback_corruption_triage_discipline_object_health_incident_aaron_amara_2026_04_29.md`: corruption-first triage outranks all background work. Task #308 ("Corruption triage 2026-04-29 — exclusive lane (Aaron + Amara)") is marked completed but the corruption persists — that earlier work was DIAGNOSTIC; repair did not happen.

**Implication for 0/0/0:** hard-reset is a destructive operation. Running it on a repo with a corrupt pack is unsafe. The corruption-triage sub-trajectory must close before hard-reset.

Per the corruption memory's explicit guidance:

> Never run `git gc` / `git prune` / `git repack -Ad` / `git fsck --lost-found` as a "fix" while investigating lost evidence.

So the right move is NOT autonomous repair. It's **surface to maintainer** + wait for corruption-triage closure.

### What stays the next action

1. **STOP autonomous progress on 0/0/0 hard-reset.**
2. **Surface to maintainer**:
   - 9 infra files: ALREADY-COVERED. Hard-reset SAFE at infra-file layer.
   - 5 of 21 other files spot-checked: ALREADY-COVERED. Heuristic strongly holds (10/10 verified ALREADY_RESOLVED).
   - Branch/worktree/stash preflight: all ALREADY_REACHABLE or RESET_IRRELEVANT_PARKED for `acehack/main`-only hard-reset.
   - **Pack corruption (P0 BLOCKER)**: `pack-16732bccb` has an unrecoverable inflate error on blob `9bf2daee...`. Persists from earlier triage (#308). Repair must happen before hard-reset.
3. **Wait for maintainer direction** on corruption-repair path. Candidate paths (NOT autonomous; require maintainer call):
   - Fresh-clone LFG into a sibling dir + verify integrity + replace local clone (per the corruption-triage memory's "fresh-clone verification" step).
   - Identify the corrupted blob's referrer chain (which commits reference it) + targeted re-fetch.
   - Accept-loss on that one blob if it's known-superseded content (NEEDS_HUMAN_DECISION on which option).
4. **After corruption resolves**: re-run preflight, then return to step 3 of the original next-action sequence (request hard-reset sign-off).

This file is the load-state. Even with this STOP marker, the work is preserved: the 9-file table holds, the 5-file spot-check holds, the heuristic holds. Only the corruption-repair step is blocking forward motion.

## Stop conditions

- Any per-file analysis produces NEEDS-HUMAN-REVIEW → STOP, surface to maintainer, do not classify further until resolved.
- Any forward-sync PR's CI fails → STOP, classify the failure (PENDING_CHECKS / FAILING_CHECKS / etc. per the candidate 3-tick-classify rule), do not retry blindly.
- The maintainer redirects to a different trajectory → update this file FIRST, then pivot.
- Compaction or branch-switch happens → on resume, READ THIS FILE FIRST, then verify "current state" section against git, update if drifted, continue from "next action".

## Do-not list (mechanical)

- Do NOT run `git rev-list` or `git diff` on origin/main vs acehack/main as a *first* action. Read this file first; the verified state is here.
- Do NOT open new audit branches without referencing this file's "next action."
- Do NOT invoke peer-call (codex / gemini / grok) without an explicit specific question that this file does not already answer.
- Do NOT confuse parallel-tool-calls with peer mode. Peer mode is each AI running its own autonomous loop with git-native work-claim coordination — that is a separate trajectory (NOT this one) and is captured as a backlog candidate (the maintainer flagged "need a trajectory for real peer mode" 2026-04-29T09:30Z).
- Do NOT add new substrate islands to the absorption files (the multi-AI feedback packets) — they live in `docs/research/` as non-normative archives per B-0105.

## Resume protocol

Every wake / branch-switch / cron tick that touches this trajectory:

1. **Read this file in full.**
2. Produce a one-paragraph "current understanding" — the state I think I'm in + the next action I plan to take.
3. Compare to this file's "current state" + "next action" sections.
4. If they match: proceed.
5. If they DON'T match: STOP. Either the file is stale (update it), or my understanding is wrong (re-read the canonical artifacts in section 2 above). Do NOT proceed on the divergent understanding.

This file is the load-state. Without it, every resume re-derives state from scratch and produces parallel artifacts that don't connect to the prior trajectory. With it, every resume picks up from a known point.

## Trajectory-protocol meta-note

This file is itself an instance of a more general pattern: any multi-session trajectory needs a known-path load-state file. After 0/0/0 closes, candidates for the same shape:

- B-0105 consolidation-gate trajectory (next consolidation round)
- Future peer-mode trajectory (when the maintainer chooses to start it)
- Any future Aurora-round absorption arc

The pattern is: trajectory state lives in one file at a known path; rules-substrate (memory folder) is for cross-trajectory rules; tick history is for what happened. Each storage class has its own retrieval shape; conflating them produces the resume-amnesia failure mode.

## Authorship

Bootstrapped 2026-04-29T09:40Z by Claude (opus-4-7) in response to the maintainer's 2026-04-29T09:38Z message: *"they all got your raw logs and didn't talk to each other about it this is your fuckup, fix it. They might all be wrong, this is on me, don't take shortcuts or you'll just be stuck forever."*

The shape of this file is informed by external multi-AI feedback (Amara / Gemini / Ani / Claude.ai / Alexa / Deepseek), but the content is my own honest read of the failure mode I just lived through. The maintainer correctly noted that the multi-AI feedback was correlated (all read the same raw conversation logs without peer cross-talk), so their convergence is signal-not-proof. The structural diagnosis still landed because the failure mode is verifiable in this session's history.
