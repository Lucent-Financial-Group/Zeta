---
name: Rebase-decision discipline — clean-rebase vs cherry-pick-supersede on the line-overlap axis — Otto 2026-05-01
description: When a PR branch goes DIRTY because main moved, the choice between traditional `git rebase origin/main` and "branch fresh from main + apply edits + close old PR" depends on a single discriminating signal: do main's intermediate merges touch the SAME LINES your branch edits? If yes → cherry-pick supersede. If no → rebase. 2x-confirmed pattern this session — PR #1161 (loading-taxonomy memo) hit unmergeable cumulative conflicts on rebase as main advanced through related CLAUDE.md merges; superseded via PR #1164 from fresh main. Same tick, PR #1155 (SQLSharp memo) rebased cleanly because no intermediate main-merges touched its specific files. The discipline saves wasted rebase-fight time on the unmergeable case.
type: feedback
caused_by:
  - "Otto observation 2026-05-01 — same-tick contrast between PR #1155 clean rebase (succeeded immediately, no conflicts) and PR #1161 unmergeable rebase (multiple conflict-aborts, ultimately superseded via PR #1164 from fresh main)"
  - "Prior worked example: poll-pr-gate-batch episode 2026-05-01 (cherry-picked baaab52 onto fresh main after multi-commit branch hit add/add conflicts on memory file already squash-merged via #1152)"
  - "Composes with the meta-rule on substrate-or-it-didn't-happen — wasted time fighting unmergeable rebases is substrate-loss; the cherry-pick supersede path lands the substrate cleanly"
composes_with:
  - feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md
  - feedback_learnings_must_land_in_claude_md_or_pointer_aaron_2026_05_01.md
  - feedback_prefer_ts_scripts_over_dynamic_bash_for_conversation_ux_dst_in_ts_aaron_2026_05_01.md
---

# Rule

When a PR branch shows DIRTY status (`git status` reports
divergence; `gh` reports `mergeStateStatus: BEHIND` or
`DIRTY`; the poll-pr-gate-batch tool reports
`gate: "DIRTY"` and `nextAction: "rebase"`):

1. **First, identify the line-overlap signal.** Run:

   ```bash
   git fetch origin main
   git diff origin/main...HEAD --stat
   ```

   List the files your branch edits. Then:

   ```bash
   git log origin/main --not <branch-base> --format='%H' \
     | xargs -I{} git show --stat {}
   ```

   List files modified by main's intermediate merges since
   your branch diverged.

2. **Decision rule** based on file overlap:

   - **No file overlap** (your branch edits files that
     main's intermediate merges didn't touch): traditional
     `git rebase origin/main` will succeed cleanly. Use it.
     Force-with-lease push afterwards.
   - **File overlap, but different LINE regions in the
     overlapping files**: traditional rebase usually
     succeeds with no conflicts (git's three-way merge
     handles disjoint line edits). Try rebase first; abort
     if conflicts.
   - **File overlap AND overlapping line regions** (your
     branch edits the same CLAUDE.md / MEMORY.md / source
     file lines that main's recent merges also edited):
     **cumulative conflicts likely**. Skip the rebase
     attempt; go directly to cherry-pick-supersede.

3. **Cherry-pick-supersede protocol** (when conflicts are
   likely or confirmed):

   ```bash
   # Save your edits' final state
   git status --short  # confirm clean tree
   mkdir -p /tmp/<branch>-state
   cp <edited files> /tmp/<branch>-state/

   # Branch fresh from main
   git checkout -b <new-branch-name> origin/main

   # Apply ONLY surgical edits against current main
   # (use Edit tool calls referencing main's current line
   # numbers; don't bulk-copy your old saved state — that
   # may regress content that landed via intermediate PRs)

   # Commit + push + open new PR
   git add <files>
   git commit -m "<title> (rebased clean from main)"
   git push -u origin <new-branch-name>
   gh pr create --base main --head <new-branch-name> ...
   gh pr merge --squash --auto

   # Close the old PR with explicit supersession comment
   gh pr close <old-PR-number> --comment "Superseded by #<new>"
   ```

4. **DO NOT bulk-copy old saved state onto fresh main.**
   The saved state is from your branch's old base; it
   doesn't include intermediate merges' content. Bulk-copy
   regresses those merges. Apply surgical Edit tool calls
   against main's CURRENT line numbers instead — same
   pattern, fresh context.

# Why

Two same-tick worked examples 2026-05-01:

## Worked example 1 — PR #1155 (clean rebase succeeded)

- Branch: `otto/sqlsharp-bun-ts-pattern-anchor-2026-05-01`
- 2 commits ahead of main (aa48bce, cea6017)
- Files edited: `memory/feedback_ts_dependencies_as_interface_di_pattern_sqlsharp_anchor_aaron_2026_05_01.md` (new file), `memory/MEMORY.md` (new row)
- Main's intermediate merges touched: `memory/MEMORY.md` (other rows) but NOT the same line region as my row
- Rebase outcome: clean. `git rebase origin/main` reported
  "Successfully rebased and updated" with zero conflicts.
- Force-with-lease push completed.

## Worked example 2 — PR #1161 (rebase unmergeable)

- Branch: `otto/claude-code-loading-taxonomy-2026-05-01`
- 4 commits ahead of main (fc30b49 → 74e079d → b032057 → f771171)
- Files edited: `CLAUDE.md` (new ground-rule bullet), `memory/MEMORY.md` (new row), `memory/feedback_claude_code_loading_taxonomy_*.md` (new file)
- Main's intermediate merges touched: `CLAUDE.md` (PR #1153 added wake-time bullets near my insertion point; PR #1160 added more bullets in same area), `memory/MEMORY.md` (multiple new rows in same region as mine)
- Rebase outcome: add/add conflicts during cumulative
  application of my 4 commits; each commit's diff context
  was based on the prior tip, not on rebased state, so
  conflicts compounded.
- Resolution: aborted rebase, branched fresh from current
  main (`otto/loading-taxonomy-rebased-2026-05-01`), applied
  edits via surgical Edit tool calls against main's current
  line numbers, committed as single commit, opened PR #1164,
  closed PR #1161 with supersession comment.

## Discriminating signal

The two outcomes differed on **line-region overlap in
edited files**, not file overlap alone. PR #1155 also
edited a file that main edited (`memory/MEMORY.md`) but in
a non-overlapping region. PR #1161 edited
`memory/MEMORY.md` in the SAME REGION as main's intermediate
merges. The line-region overlap is the discriminator.

## Why the cherry-pick-supersede path is faster

Once line-region overlap is confirmed:

- **Rebase attempt**: each of N commits has to be
  individually 3-way-merged against the changing base.
  Conflicts may compound (N commits × multiple files).
  Each conflict requires manual resolution. Often the
  resolution is "throw away my old version, take main's,
  re-apply my intent" — which IS what cherry-pick-supersede
  does in one step.
- **Cherry-pick-supersede**: one fresh branch from current
  main + surgical edits = one commit, no conflicts. Total
  time: ~2-3 minutes vs 10-30 minutes fighting rebase.

# How to apply

When a PR shows DIRTY:

1. Run `git diff origin/main...HEAD --stat` and `git log origin/main --not <base>` to enumerate the overlap.
2. If the same line regions are edited on both sides → skip rebase, go straight to cherry-pick-supersede.
3. If the line regions are disjoint → try `git rebase origin/main` first. Abort if it conflicts and pivot to cherry-pick-supersede.
4. After cherry-pick-supersede, **explicitly close the old PR** with a supersession comment. Don't leave dual PRs open — the old one is now misleading.

# Composes with

- `feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` — wasted time fighting unmergeable rebases is substrate-loss in the operational layer; the cherry-pick supersede path preserves substrate.
- `feedback_learnings_must_land_in_claude_md_or_pointer_aaron_2026_05_01.md` — this rule is itself a learning that needs CLAUDE.md scope or pointer to land for future-Otto.
- `feedback_prefer_ts_scripts_over_dynamic_bash_for_conversation_ux_dst_in_ts_aaron_2026_05_01.md` — the discipline of "if a recurring bash invocation surfaces twice, extract to TS script" composes here too: once we have a peer-call/claude-code.sh or substrate-discovery.ts, the rebase-decision check could be partially automated as a TS tool that runs `git diff...HEAD --stat` + `git log` and reports line-overlap or not.

# What this rule does NOT do

- **NOT a ban on rebase.** Rebase is the right tool when
  line regions are disjoint. The rule is about WHEN to
  pivot, not about avoiding rebase categorically.
- **NOT a ban on multi-commit branches.** Multi-commit
  branches ARE more likely to compound conflicts during
  rebase, but they're also natural for review-iteration
  workflows. The rule is: when a multi-commit branch hits
  conflicts on rebase, pivot rather than fight.
- **NOT a license to bulk-overwrite main with stale
  branch state.** The cherry-pick-supersede protocol
  explicitly says: re-apply edits against current main's
  line numbers using Edit tool calls; don't bulk-copy
  the saved state (that would regress intermediate merges).
- **NOT prescriptive about force-push vs force-with-lease.**
  Always prefer `--force-with-lease` for any rebased
  branch with an open PR (protects against overwriting
  unseen commits).

# Carved sentence (candidate, not seed-layer yet)

*"Rebase when line regions are disjoint; cherry-pick-
supersede when they overlap. The discriminating signal is
line-region overlap, not file overlap. Wasted rebase-fight
time is substrate-loss; pivot fast."* (Synthesis 2026-05-01.)

(Marked candidate per CSAP. Has not been multi-domain-tested.
Promotes via Razor + CSAP under DST grading on cadence,
not by maintainer fiat.)
