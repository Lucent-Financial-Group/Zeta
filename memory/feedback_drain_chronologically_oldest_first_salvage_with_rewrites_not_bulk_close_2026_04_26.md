---
name: Drain PR queue chronologically oldest-first; salvage older substrate via rewrites into current architecture, not bulk-close — reverse-chronological + "file exists" → "content captured" inference is double wrong
description: Aaron 2026-04-26 *"it sounds like this is your fuckup and didn't pull over code when you should, you also went in reverse cronlogical order when means most of the code you have now is much older than the code you reference in those PRs. I would have drained the PRs in chrolologicaly order myself, you should probably make a note so you don't rrun into this issues againt. we should try to save all the code with rewirtes that fit into our current archiceture, docs and skill and all that too. Be careful not to overwite newer code with older code."* I drained the LFG queue newest-first (#557 from today → #132 from 4 days ago) and read "file exists on main" as evidence that "content was captured." Both inferences were wrong. Older PRs contain older substrate; newer main may have LOST substantive content that older PRs preserved. Right discipline: drain oldest-first, audit each older PR for unique substrate, REWRITE it into current architecture if it doesn't fit, land via new PR.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## The mistake

This session, when triaging 11 DIRTY LFG PRs, I:

1. Started with #557 (newest, from today) and worked toward older
2. Bulk-closed #544/#546/#554 (heartbeat bundles, today) and #132 (4-day-old Round 44)
3. Inferred "file exists on main" → "content captured downstream"

Both moves were wrong:

**Reverse-chronological order** is wrong because: when older PRs have substrate that newer main DOESN'T have, draining newest-first means newer main overwrites the older PR's substrate when conflicts surface. The right direction: oldest first sets the floor; newer landings respect it.

**"File exists" → "content captured"** is wrong because: a file existing on main only proves the path is occupied. It says nothing about whether the file's CURRENT content includes everything the older PR's snapshot had. A file can be on main with 50% of the older PR's content if newer commits dropped lines or rewrote sections without preserving substance.

## Concrete cost

This session I bulk-closed #132 (Round 44 from 2026-04-22) on the inference "all 25 files exist on main." But:

- `src/Core/SignalQuality.fs`: main's version DIVERGED 246 lines from #132's snapshot. The "file exists" check passed but the substantive content may not match.
- `docs/force-multiplication-log.md`: 491 additions on #132; on main but possibly truncated or pruned by hygiene sweeps.
- Memory files + research docs: filenames present on main, but per-file diffs not audited.

The bulk-close MAY have been correct — but I didn't earn that confidence with file-by-file audit. Aaron's catch is the structural error: I made the call on weak evidence (path-existence) for a 4-day-old PR with 4592 lines of additions.

## Rule

**Drain PR queue oldest-first. For each PR (oldest → newest):**

1. **Audit unique substrate.** What's UNIQUELY on the branch and NOT preserved on main? Don't trust "path exists" — check content equivalence:
   - For source files: `git diff origin/main..origin/<branch> -- <file>` — if non-trivial, content diverged
   - For research / memory / BACKLOG: read both versions, compare substance not metadata
   - For tick-history / append-only: check if the rows are referenced or summarized downstream

2. **Decide per-PR per-file (not per-PR):**
   - **On main, content matches**: skip
   - **On main, content diverged**: salvage divergent content via REWRITE into current architecture (separate PR)
   - **Not on main**: cherry-pick or rewrite into current architecture (separate PR)
   - **Old name (e.g., ServiceTitanCrm renamed to FactoryDemo)**: drop the old-named files

3. **Salvage-with-rewrites is the default for valuable substrate.** Don't bulk-close just because the files happen to exist on main. The substance might not be there even if the filenames are.

4. **Bulk-close is appropriate when:**
   - Hot-file cascade with append-only file (Otto-232 conditions)
   - Content is genuinely captured downstream (verified per-file content match)
   - Cost-benefit calculation explicitly favors close (e.g., 3 hrs cherry-pick for content already represented in summary rows)
   - **All three conditions verified, not assumed**

5. **"Be careful not to overwrite newer code with older code."** Asymmetric resolution: if a conflict appears between older PR substrate and newer main, newer main wins on that line BUT older substrate's intent should be re-introduced via separate rewrite-to-fit-current-architecture work.

## Composition

- `feedback_substrate_changes_require_scenario_thinking_upfront_not_patch_as_it_breaks_2026_04_26.md` — same shape: think through scenarios before acting. Triage decisions need the scenario-list discipline too.
- Otto-232 (hot-file cascade → bulk-close): bulk-close is still valid, but ONLY with three-signal verification that includes per-file content audit, not path-existence.
- Otto-238 (retractability): branches preserved on closures means rewrite-from-branch is always possible; this rule says we OWE the rewrite for valuable substrate.
- Otto-275 (log-but-don't-implement): if rewrite-into-current-architecture is more than a few minutes per file, log as BACKLOG rather than implement-during-drain.
- Otto-225 (serial PR flow): still applies — serial rewrite PRs, not parallel.

## What this rule does NOT do

- Does NOT mean "never bulk-close." Bulk-close is correct when the three-signal verification (with per-file content match) actually holds.
- Does NOT require salvaging trivial drift (typos, comment formatting, whitespace). Substantive divergence only.
- Does NOT block draining when older PRs are content-equivalent to main (verified). Then close-as-superseded is correct.
- Does NOT require cherry-pick — REWRITE is fine when the older code doesn't fit current architecture. The substrate is the value, not the specific commit.

## Worked re-audit (this session)

Per this rule, I owe re-audits on the 4 PRs I just closed:

- **#544/#546/#554** (heartbeat bundles): per-file content audit. Heartbeats are append-only-tick-history rows. The substantive observation columns may contain unique signal not summarized downstream. Worth a 5-minute audit per branch.
- **#132** (Round 44): high-priority audit. 4592 lines, code + docs + memory. The `SignalQuality.fs` divergence + force-multiplication-log + operator-input-quality-log all need per-file diff vs current main.

If audit reveals unique substantive content, file BACKLOG rows (or open new PRs with rewrites) to land that content. The closure stands; the substrate may need separate landing.

## Cost-of-this-miss

- Reverse-chronological order × 4 PRs bulk-closed = potentially 4 PRs of substrate lost or now requiring re-derivation work
- "File exists" inference shortcut saved ~10 min audit time per PR but creates ~30 min/PR re-audit work + risk of unnoticed substrate loss
- Aaron-correction round-trip (this turn)

The 5-min-per-PR per-file content audit is the discipline. Pay it up-front; don't pay it 6x later in re-audits.

## Going-forward shape

For the remaining still-open DIRTY PRs (#143, #145, #514, #535, #537, #540, #200), drain in chronological order:

1. #200 (oldest, need to check date)
2. #143 (2026-04-23)
3. #145 (2026-04-23)
4. #514 (2026-04-25)
5. #535/#537/#540 (2026-04-26)

Per-PR audit: unique-substrate vs main; salvage-with-rewrites if needed; close only with verified per-file content match.

Re-audit closed PRs (#544/#546/#554/#132) for unique substantive content owed for landing.

## Bulk-recovery discipline (Aaron 2026-04-26 confirmation)

Aaron *"yeah and you will recover the branch later and put it on a new PR? maybe in bulk too. is that the plan not to loose the stuff right"* — confirmed the recovery shape:

**Plan for not-losing-stuff:**

1. **Branches preserved** via Otto-238 — closed PRs leave commits + branches in git history (recoverable forever via `git checkout origin/<branch>` or `gh pr reopen`)
2. **Audit later**: walk closed branches, diff against current main, identify unique substrate
3. **Bulk-rewrite into current architecture** — one PR (or a few) salvages substrate from N closed branches, adapting to fit current code/docs/skills
4. **Old branches = raw material; new PR = rewrite-that-fits**

**Cadence:** bulk-recovery fits at end of Phase 1 LFG drain (closures stable) before Phase 2 AceHack drain. Or at any natural pause when the queue has cleared enough to give audit-time space.

**Compose-with:**

- Otto-238 retractability — branches preserved indefinitely; recovery is a structural property, not a hope
- Otto-244 serialized renames — bulk-recovery is itself a serialized rename-cascade pattern (one PR, careful, atomic)
- Otto-225 serial PR flow — bulk-recovery can be ONE big PR; the "no parallel" constraint applies to opening multiple new PRs in the same window, not the size of any individual PR
- "Save all the code with rewrites that fit into our current architecture, docs and skill" — Aaron 2026-04-26; the rewrite adapts older substrate to current shape, not just literal cherry-pick

**Recovery-PR structure (template):**

```markdown
## Bulk-recovery from closed PRs (Phase 1 LFG drain)

Walks N closed-PR branches; salvages unique substantive substrate
not currently on main; rewrites to fit current architecture.

### Branches mined
- `branch-N-1` (closed-as-superseded #NNN) — salvaged X / Y unique substrate
- ...

### Substrate landed (rewritten)
- File 1: rewrite of older-PR observation X to fit current architecture Y
- ...

### Substrate dropped
- File 2: superseded by main's current path; no salvage needed
- ...
```

This shape lets a future Otto / Aaron review at-a-glance: which branches contributed, what landed, what was dropped. Per-row-audit visible.

**What this rule does NOT authorize:**

- Does NOT authorize keeping closed branches forever as a hoarding strategy. Once recovery PR lands, branches CAN be deleted (still in reflog).
- Does NOT replace per-PR audit during initial drain — audit is still owed at close-time, even if recovery is a backstop.
- Does NOT authorize rewriting subjective interpretation — substrate stays attributed to its source (older PR commit author, ferry sequence, etc.) per Otto-279 history-surface attribution.

## Anti-shortcut clarification (Aaron 2026-04-26)

After I claimed "didn't need recovery for #544/#546/#554 in this case" while simultaneously affirming "branches preserved for bulk-recovery," Aaron flagged the contradiction: *"that works but you said you didn't need it in this case"*.

The honest position: **"didn't need it" claims at close-time should be treated as preliminary triage, not as final audit.** When I chose bulk-close on heartbeat bundles based on:

- Main has summary rows referencing bundle existence
- Heartbeats are time-bound
- Otto-342 existence-marker satisfied by branch persistence

— that was preliminary triage, NOT a per-file content audit. Same path-existence-shortcut shape Aaron corrected for #132. The honest reading: I chose bulk-close on cost-benefit (close + comment >> cherry-pick rebase), and I owe a backstop audit at recovery time.

**Operational implication:** the bulk-recovery audit walks ALL closed-as-superseded branches from this drain wave, regardless of how confident I was at close-time that "didn't need it." The audit is the backstop precisely because close-time confidence can be miscalibrated. If audit reveals unique substrate, rewrite-into-current-architecture is owed.

**Why this matters:** without this clarification, "didn't need it" becomes the bulk-close shortcut all over again — the very pattern this rule corrects. The audit-at-recovery discipline reveals close-time confidence as preliminary, not authoritative.
