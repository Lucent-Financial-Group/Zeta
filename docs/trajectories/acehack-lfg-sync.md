# Trajectory — AceHack ↔ LFG Sync

## Scope

The two-fork topology where AceHack is the dev-mirror (where
maintainer + agents iterate) and LFG is the project-trunk (where
all contributors coordinate). The 0/0/0 invariant (AceHack main =
LFG main: 0 commits ahead AND 0 commits behind at the close of
every paired-sync round). The double-hop workflow (work lands
AceHack first → forward-sync to LFG → AceHack absorbs LFG's
squash-SHA via force-push). Open-ended because every PR shifts
divergence; sync rounds collapse it back. Bar: 0/0/0 reached at
end of every paired-sync round; in-flight feature branches are
the only allowed deviation.

## Cadence

- **Per-PR-merge**: forward-sync candidate; sync rounds bundle
  multiple PRs.
- **Per-paired-sync-round**: 0/0/0 reach is the round-close
  signal.
- **Daily check**: divergence-snapshot tracks how far apart
  the two forks are.

## Current state (2026-04-28)

- AceHack main: ~50 commits ahead of LFG main (substrate work
  not yet forward-synced)
- LFG main: ~500 commits ahead of AceHack (the bulk forward-sync
  rounds via #647/#648/#649/#651/#653/#654 etc. on 2026-04-27)
- Divergence is bidirectional and large; 0/0/0 not currently
  achieved
- Aaron 2026-04-27 strategic reframe: bidirectional content-sync
  too hard; collapse to project-trunk-canonical + dev-mirror
  topology (LFG=trunk, AceHack=mirror)
- Force-push to AceHack main is part of protocol; force-push to
  LFG main is forbidden
- Pre-start state: project is "in pre-start mode" until 0/0/0
  is reached (Aaron 2026-04-27)

## Target state

- **0/0/0 sync**: AceHack main = LFG main exactly at close of
  every paired-sync round.
- Force-push-to-AceHack-main reconciles the dev-mirror after
  LFG absorbs AceHack-originating PRs.
- Feature branches are the only allowed deviation; main itself
  diverges only during the brief window between AceHack PR
  landing and LFG forward-sync + AceHack hard-reset.
- Going forward, both forks share identical SHAs (mirror's
  defining invariant).

## What's left

In leverage order:

1. **Reach 0/0/0 baseline** — pre-start mode persists until
   this lands. Per Aaron: until 0/0/0, project is "hobbling."
2. **Forward-sync ~50 AceHack-ahead commits to LFG** — substrate
   work that hasn't propagated yet (PRs #25/#72/#73/etc.).
3. **AceHack hard-reset to LFG** — after the forward-sync
   completes.
4. **Sync-cadence automation** — currently manual; could be
   tooled with a "sync-round" skill.
5. **Divergence-snapshot dashboard** — daily count of
   commits-ahead in both directions; surface staleness.

## Recent activity + forecast

- 2026-04-28: 4 LFG PRs in flight that originated AceHack-side
  (#655/#656/#657/#658); will need forward-sync after merge.
- 2026-04-28: AceHack PR #73 (Elisabeth → Elizabeth) merged on
  AceHack but LFG mirror PR #658 was needed because forward-sync
  hadn't propagated.
- 2026-04-27: bulk forward-sync round (~500 commits LFG-side
  via #647/#648/#649/#651).
- 2026-04-27: strategic reframe — LFG=trunk, AceHack=mirror,
  0/0/0 invariant naming captured in fork roles.

**Forecast (next 1-3 months):**

- Reach 0/0/0 milestone (project officially "starts").
- Sync-cadence skill candidate.
- External-contributor onboarding workflow opens once 0/0/0 +
  branch-protection-on-main + reviewer-floor land.

## Pointers

- Skill: `.claude/skills/git-workflow-expert/SKILL.md`
- Skill: `.claude/skills/fork-pr-workflow/SKILL.md`
- Memory: `memory/feedback_lfg_master_acehack_zero_divergence_fork_double_hop_aaron_2026_04_27.md`
- Memory: `memory/feedback_zero_diff_means_both_content_and_commits_*.md`
- Memory: `memory/feedback_zero_diff_is_start_line_until_then_hobbling_*.md`
- BACKLOG: task #275 acehack-first development workflow
