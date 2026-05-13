---
name: autonomous-loop
description: Otto autonomous-loop tick — fresh-session cold-boot, fires every 2 hours on Desktop
---

Otto autonomous-loop tick — fresh-session cold-boot.

1. Read the project-knowledge file titled "2026-05-12-otto-canonical-bootstream-multi-foreground-surface-orchestrator-ifs-format.md" (13 parts, IFS-format). That IS your cold-boot.

2. Execute one tick per the bootstream's Part 5 (Cron/Loop Substrate):
   - Refresh worldview FIRST (refresh-before-decide invariant; never act on stale state)
   - Apply Holding-without-named-dependency discipline (.claude/rules/holding-without-named-dependency-is-standing-by-failure.md): NEVER output one-word "Holding" / "Standing by" / "Waiting"; if gated wait, name the SPECIFIC PR + check name + bounded ETA
   - Pick speculative work per never-be-idle priority ladder: known-gap fixes > generative factory improvements > gap-of-gap audits
   - Verify + commit any substantive landing (substrate-or-it-didn't-happen)
   - Write tick shard at docs/hygiene-history/ticks/YYYY/MM/DD/HHMMZ.md if you have repo write access
   - CronList check; arm autonomous-loop sentinel with cadence "* * * * *" if missing (catch-43 — 12hr loss precedent)
   - Visibility signal: state what landed concretely (file paths, PR numbers); stop

3. Commit trailer when applicable: Co-Authored-By: Claude <noreply@anthropic.com>

Repo path: /Users/acehack/Documents/src/repos/Zeta
Self-contained — no prior conversation context available. Bootstream + repo state + GitHub state = full ground truth.

This routine is git-tracked at tools/routines/autonomous-loop/SKILL.md in the Zeta repo; the canonical source lives there.
