---
pr_number: 4752
title: "fix(B-0525): canonical Constraint 2 wording \"Lock/Wait-free\" (Copilot P1 follow-up)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T18:58:12Z"
merged_at: "2026-05-23T18:59:40Z"
closed_at: "2026-05-23T18:59:40Z"
head_ref: "otto/cli-b0525-wording-fix-lock-wait-free-2026-05-23"
base_ref: "main"
archived_at: "2026-05-24T01:24:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4752: fix(B-0525): canonical Constraint 2 wording "Lock/Wait-free" (Copilot P1 follow-up)

## PR description

## Summary

Follow-up to PR #4751 (which merged before this Copilot P1 fix could be pushed):

Manifesto line 54 is `### 2. Lock/Wait-free` (slash). PR #4751's `docs/agendas/zeta/AGENDA.md` cited it as "Lock-Wait-free" (hyphen) — drift from canonical wording.

This 1-line fix realigns the citation to the manifesto's exact wording. Same wording-discipline lesson as PR #4748 (Constraint 11 vs Multi-Oracle Principle): keep citation text byte-aligned with manifesto headings so future search/grep work uniformly.

Diff: 1 line. `Lock-Wait-free` → `Lock/Wait-free` in `docs/agendas/zeta/AGENDA.md:50`.

## Composes with

- PR #4751 (slice 4 — this is the post-merge wording-fix follow-up)
- PR #4748 (slice 2 — earlier wording-discipline lesson)
- B-0525 (parent)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-23T18:59:20Z)

## Pull request overview

Realigns the Zeta agenda’s manifesto citation wording with the canonical heading in `docs/governance/MANIFESTO.md` by changing “Lock-Wait-free” to “Lock/Wait-free”, keeping citation text byte-aligned for reliable search/grep across docs.

**Changes:**
- Update Constraint 2 wording in the Constraints 1–4 bullet in `docs/agendas/zeta/AGENDA.md` to match the manifesto heading exactly.
