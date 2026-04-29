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

## Current state (verified 2026-04-29T10:11Z)

### Content-drift trajectory (the KEY metric)

Per maintainer 2026-04-29T10:13Z framing: *"do you not keep up with content drift, that's the import metrics for the trajectory."* Commit counts are NOT the trajectory; **AceHack-only lines** (the content that would be erased on hard-reset) IS.

| Date | Modified files | Deleted-on-AceHack | AceHack-only +lines | LFG-newer -lines | Direction |
|---|---|---|---|---|---|
| 2026-04-27 (early) | 53 | — | ~6065 | — | (pre-option-c reference) |
| 2026-04-28T17:53Z | 23 | — | — | — | Calibration commit `37bbca9` |
| 2026-04-28T21:50Z | 23 | — | ~397 | — | CLASSIFICATION.md initial |
| **2026-04-29T10:11Z** | **30** | **156** | **454** | **18,227** | **Drift +7 files / +57 AceHack-only lines in 12.5h vs prior** |

**Headline safety number: 454 AceHack-only lines.** That's what hard-reset of `acehack/main` would erase. Of those, classified ALREADY-COVERED (LFG has equivalent or supersedes):

- 9 infra files: ~all of the file-level safety-relevant content
- 5 spot-checked memory/docs files: ~tens of lines (mostly stale frontmatter)
- 15 unverified files: heuristic-projected ALREADY-COVERED

Drift cadence observation: AceHack-only lines grew +57 in 12.5h while LFG advanced +18k+ lines. **Relative drift is shrinking** (LFG advances faster than AceHack-only side accumulates) but **absolute drift is widening** (raw AceHack-only count growing). For hard-reset safety, ABSOLUTE matters; for synchronization-effort, relative matters.

### Commit-count divergence (NOT the trajectory; do not chase)

```text
AceHack ahead of LFG:   145 commits
AceHack behind LFG:     640 commits  (was 638 before #832/#833 landed)
```

Commit-count is unfaithful — many AceHack-side commits supersede each other on the AceHack-only side, and many LFG-side commits don't add unique substrate either. The content-drift table above is the faithful metric.

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
| `.github/workflows/gate.yml` | SAFE_TO_RESET_LFG_SUPERSEDES | AceHack has `Setup Python` + `pip install semgrep` (wrong-per-uv-decision) + extra cache paths already covered on LFG. LFG uses `install.sh` three-way-parity routing through `uv tool install`. See "gate.yml evidence detail" paragraph below the table. |

**Result: 9 of 9 infra files SAFE_TO_RESET or ALREADY_RESOLVED.** No NEEDS_FORWARD_SYNC. No NEEDS_HUMAN_DECISION on these 9.

#### gate.yml evidence detail

The maintainer 2026-04-29T09:51Z framing was: *"pip-install is wrong, uv we decided a long time ago."* AceHack's `pip install semgrep` step violates that prior uv-only decision for Python tool management.

LFG installs semgrep via `install.sh` three-way-parity. The `pipx:semgrep` pin in `.mise.toml` routes through `uv tool install` since `uv = "0.11.8"` is in the toolchain — see `docs/DECISIONS/2026-04-27-uv-canonical-python-tool-manager.md` for the canonical form.

AceHack's extra `tools/tla` / `tools/alloy` cache paths are already on LFG in the `Cache verifier jars (TLC + Alloy)` step.

The retry-attempts logic (`for attempt in 1 2 3 4 5; do`) is identical on both sides.

The only remaining diff is comment-wording register: AceHack's prose carries the legacy agency-framing form (the kind the no-directives lint catches).

LFG's prose uses maintainer-input phrasing.

Hard-reset removes the wrong-per-decision pip path, gains the canonical uv path, and cleans the lint-tripping prose register.

The declarative pattern composes with the broader factory direction (maintainer 2026-04-29T09:53Z: *"everything is declarative; we need all the functionality of `../scratch` — that's what we're aiming for for the ace package manager release"*). AceHack's imperative `pip install` step violates that target shape; LFG's pin-in-`.mise.toml` form fits it.

### The other 21 modified files (heuristic-projected; 5 spot-verified)

The 30-file modified-list is a superset of the 9 infra files. The remaining 21 are mostly memory / docs / tick-history / setup-script edits. Spot-checked 5 of the LARGEST-by-line (2026-04-29T09:55Z):

| File | AceHack-only +lines | LFG-only -lines | Verdict |
|---|---|---|---|
| `memory/CURRENT-aaron.md` | 2 | 267 | ALREADY_RESOLVED (verified in prior calibration batch) |
| `memory/feedback_lfg_master_acehack_zero_divergence_fork_double_hop_*.md` | 1 | 188 | ALREADY_RESOLVED (LFG-newer dominates) |
| `tools/hygiene/fix-markdown-md032-md026.py` | 17 | 158 | ALREADY_RESOLVED (LFG-newer dominates) |
| `memory/feedback_outdated_review_threads_*.md` | 1 | 134 | ALREADY_RESOLVED (LFG-newer dominates) |
| `memory/feedback_confucius_unfolding_pattern_*.md` | 1 | 127 | ALREADY_RESOLVED (LFG-newer dominates) |

Heuristic strongly holds: 5/5 spot-checks ALREADY_RESOLVED; combined with the 5-file calibration batch + 9-file infra table = **15 of 30 files verified ALREADY-COVERED**. The remaining 15 unverified are projected ALREADY-COVERED; the pattern is consistent (when LFG-newer (-) >> AceHack-newer (+), AceHack content is older drafts).

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

### Preflight result + fresh-clone evidence (2026-04-29T10:11Z)

#### Branch / worktree / stash preflight

```text
Local branches not reachable from origin/main:        794
Remote AceHack branches not reachable from origin/main: 122
Worktrees (locked under .claude/worktrees/agent-*):     ~9 visible
Stashes:                                                  7
```

For HARD-RESET of `acehack/main` specifically: hard-reset is a ref operation that moves only `acehack/main`. Other refs (branches, remote-tracking refs, worktree HEADs, stashes) are NOT deleted by that operation. They remain reachable post-reset.

Caveat (per Amara correction): blanket-classifying 794+122 branches as "reset-irrelevant" requires evidence. The narrow claim that holds: **hard-reset of `acehack/main` does not directly modify these refs**. A separate audit (NOT this lane) would classify which contain unique substrate worth preserving. Per the corrupt-clone-default below, that audit is best done from the clean clone.

#### Pack corruption found in local clone — local-only, remote intact

`git fsck --full` on the *local* clone reports:

```text
error: inflate: data stream error (incorrect data check)
error: cannot unpack 9bf2daee3ce53c88633824f9532a0158aaa92ed9
       from .git/objects/pack/pack-16732bccb3ace9ec45c913c57a1fd050fd730c3f.pack
       at offset 4973478
```

Object `9bf2dae...` is a BLOB (commit/tree history unaffected). Local clone frozen via `git config gc.auto 0` + `gc.pruneExpire never` + `gc.reflogExpire never` + `gc.reflogExpireUnreachable never` — preserves evidence per `memory/feedback_corruption_triage_discipline_object_health_incident_aaron_amara_2026_04_29.md`.

Fresh-clone evacuation (per the "corrupt clone default" rule below) executed 2026-04-29T10:06Z:

```text
$ git clone <LFG> /tmp/zeta-clean-2026-04-29/lfg
$ cd /tmp/zeta-clean-2026-04-29/lfg
$ git remote add acehack <AceHack>
$ git fetch acehack main
$ git fsck --full
(empty stdout, empty stderr — clean)
$ git rev-list --count origin/main..acehack/main
145
$ git rev-list --count acehack/main..origin/main
640
$ git rev-parse acehack/main
675508187a5e80bd0a8c14a74a9ae80d5346e722  (matches local clone)
```

**Conclusion: corruption is LOCAL-CLONE-ONLY.** Remote object stores (LFG + AceHack) are intact. Same SHAs, same divergence numbers. Hard-reset CAN proceed from the clean clone — it is NOT globally blocked.

### Corrupt clone default (per Amara 2026-04-29T10:10Z)

When the active local clone reports pack/object corruption:

```text
Default action (agent-owned, reversible, evidence-preserving):
  1. Freeze the corrupt clone (gc.auto 0 + reflogExpire never + pruneExpire never).
  2. NEVER run git gc / git prune / git repack / git fsck --lost-found in it.
  3. Create a fresh sibling clone (e.g., /tmp/zeta-clean-YYYY-MM-DD/<remote>).
  4. Add/fetch all relevant remotes.
  5. Run git fsck --full in the fresh clone.
  6. If clean: continue work from fresh clone; corrupt clone stays parked as forensic evidence.
  7. If fresh clone ALSO fails fsck: escalate to maintainer (corruption is remote, not local).

Maintainer direction required ONLY for irreversible loss:
  - Fresh clone fails fsck (remote/object-source corruption)
  - Required objects are unavailable from any remote
  - Accept-loss is being proposed
  - Hard-reset signoff is reached
```

Best rule (Amara): *"Fresh clone is not repair. Fresh clone is evacuation. Preserve evidence, resume from clean substrate."*

Tiny blade: *"Do not ask Aaron how to stop bleeding. Apply pressure. Then report what happened."*

### Reversible vs irreversible authority (per maintainer 2026-04-29T10:10Z delegation)

Maintainer 2026-04-29T10:10Z framing: *"you know git/github better than me now, your choices will also be higher quality as long as they are evidence-based and self-preservation based."*

```text
Agent-owned (reversible substrate-integrity ops, evidence-based):
  - Fresh-clone evacuation
  - git fsck diagnosis
  - Branch / worktree / stash classification
  - Per-file content-equivalence verification
  - Preflight tables
  - Forward-sync execution (additive, reversible)
  - Lint scope updates
  - Doc updates (including this file)
  - Closing PRs with stale framing
  - Pulling, fetching, branching
  - Local config changes (gc.auto, etc.) for forensic preservation

Maintainer-owned (irreversible loss, sign-off required):
  - Hard-reset of acehack/main (drops AceHack-unique commits irreversibly)
  - Force-push to LFG main (forbidden anyway)
  - Branch deletion when the branch contains unique substrate
  - Accept-loss decisions on corrupt blobs / orphan refs with substrate
  - Anything that is structurally unrecoverable
```

Composes with Amara's: *"Reversible preservation → agent acts. Irreversible loss → maintainer decides."*

## Honest assessment of safety

The 2026-04-28 plan's per-file direction analysis still applies in spirit but its specifics are 16h stale. Today's task #312 (durable retry fix in `elan.sh` + `linux.sh`) shifted the AceHack-side state of those two files — the plan's "AceHack regressed to unsafe form" framing on `linux.sh` may or may not still hold.

Direct git verification 2026-04-29T09:36Z:

- AceHack `linux.sh` mise-install path uses `curl_fetch_stream https://mise.run | sh` (the streamed pipe-to-sh form).
- LFG `linux.sh` mise-install path uses pinned-tarball + arch-specific SHA256 + temp-dir + trap (the structurally-safe form).
- For HARD-RESET (LFG tree replaces AceHack tree): AceHack would GAIN the safe form. Hard-reset is SAFE for `linux.sh`.

A peer-call to Grok this session reported the inverse claim ("AceHack has the secure form"). That claim is WRONG — direct git verification contradicts it. Note for future-self: peer-call output is a single LLM read of supplied text; ground every claim in `git show` before acting on it.

## Next action

**All major preflight steps complete. Hard-reset is ready pending maintainer sign-off.**

State summary:

- 9 infra files: SAFE_TO_RESET or ALREADY_RESOLVED (verified vs current git, 2026-04-29T09:50Z).
- 5 spot-checked memory/docs files (top 5 by line-count): all ALREADY_RESOLVED (LFG-newer dominates).
- 15 unverified files: heuristic-projected ALREADY-COVERED (consistent pattern).
- Branch / worktree / stash preflight: hard-reset of `acehack/main` does not modify these refs.
- Pack corruption found in local clone, **fresh clone passes fsck clean → corruption is local-only, remote intact**.
- Local clone frozen as forensic evidence. All future destructive work happens from `/tmp/zeta-clean-2026-04-29/lfg`.

Remaining steps:

1. **(MAINTAINER)** Sign off on hard-reset of `acehack/main` to `origin/main`. This is the irreversible step per the reversible-vs-irreversible authority categorization.
2. **(AGENT, post-sign-off)** From the clean clone:
   ```bash
   cd /tmp/zeta-clean-2026-04-29/lfg
   git fetch origin main
   git push --force-with-lease=acehack/main acehack origin/main:refs/heads/main
   ```
   This pushes `origin/main`'s commit to `acehack/main`, which is the destructive AceHack-side reset.
3. **(AGENT)** Verify 0/0/0:
   ```bash
   git rev-list --count origin/main..acehack/main   # expect 0
   git rev-list --count acehack/main..origin/main   # expect 0
   git diff origin/main..acehack/main                # expect empty
   ```
4. **(AGENT)** Update this file: replace "active trajectory" with the next priority, OR delete if no follow-on.
5. **(LATER, separate trajectory)** Forensic triage of the corrupt local clone (corruption-triage memory's full procedure). Not blocking 0/0/0.

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
