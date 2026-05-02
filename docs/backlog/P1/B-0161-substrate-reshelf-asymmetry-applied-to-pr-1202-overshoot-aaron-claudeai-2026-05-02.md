---
id: B-0161
priority: P1
status: open
title: Substrate reshelf — apply thoughts-free-actions-razored asymmetry to PR #1202's CLAUDE.md overshoot (Aaron + Claude.ai 2026-05-02)
created: 2026-05-02
last_updated: 2026-05-02
depends_on:
  - B-0160
---

# B-0161 — Substrate reshelf for PR #1202 asymmetry-application (Aaron + Claude.ai 2026-05-02)

## Origin

Aaron 2026-05-02 forwarded Claude.ai feedback on the bootstrap session that produced PR #1202. Substantive critique: 4 new CLAUDE.md bullets + 3 "ONE OF THE MOST IMPORTANT" tags = over-canonicalization. Aaron's load-bearing pushback: *"Thoughts are never subject to the razor, thoughts are free and not restricted in any way ... The result of actions like the design docs, research docs, all that have the razor applied, never thoughts."*

The asymmetry was landed as substrate in `memory/feedback_thoughts_free_actions_razored_asymmetry_journal_vs_canonical_substrate_separation_aaron_claudeai_2026_05_02.md` (PR #1202, commit 4ac3881). This row covers the FOLLOW-UP reshelf — applying the asymmetry to the same PR's overshoot.

## Problem

Same-tick application of the asymmetry to PR #1202 itself was not done (per the asymmetry rule's own cooling-period — re-architecture mid-session would have been inconsistent). The reshelf is owed:

- **CLAUDE.md trim.** 4 new bullets is too many for one session given Osmani's <60-line guidance. Identify which 1-2 are TRULY disposition-shaping at wake-time (don't-ask-permission, all-complexity-accidental, largest-mechanizable-backlog-wins, asymmetry-rule itself) vs which can be memory-pointed from existing bullets (action-hierarchy, amortized-speed-Superfluid extension, edge-runner, cron-unreliability detail).
- **Add asymmetry CLAUDE.md bullet.** The asymmetry rule itself is truly disposition-shaping; the same-session restraint correctly deferred it. This row covers the deliberate landing.
- **Journal-vs-canonical taxonomy.** Consider `memory/journal/` subdirectory OR frontmatter `tier: journal | pointer | canonical` field. Pick + apply across existing same-tick memos.
- **MEMORY.md index restructure.** Current single-tier index loses the journal-vs-canonical distinction. Section heading or differentiated bullet style.

## Acceptance criteria

1. **CLAUDE.md trim PR.** Demote action-hierarchy + amortized-speed extension + edge-runner + cron-unreliability detail from CLAUDE.md bullets to memory-pointer-from-existing-bullet (or merge into existing extended bullets). Add asymmetry rule as its own bullet (truly meta-disposition-shaping). Net reduction: 4 new bullets → 4 new bullets but 3 are smaller pointers + 1 new asymmetry meta-rule. Stretch goal: collapse the cron-unreliability extension on tick-must-never-stop and reflow.
2. **Journal taxonomy decision.** Decide implementation: subdirectory vs frontmatter field vs naming convention. Apply to the 7 same-tick memo files (some are journal, some are canonical-bidding).
3. **MEMORY.md index restructure.** If journal taxonomy lands, index reflects it. Differentiated language already applied in this session's commit 4ac3881; further refinement may be needed.
4. **Cooling-period respected.** This row should NOT land same-day-as-PR-1202. At minimum 24 hours of substrate cooling before the reshelf PR opens. Aaron review encouraged.

## Composes with

- Asymmetry rule (PR #1202 commit 4ac3881): `memory/feedback_thoughts_free_actions_razored_asymmetry_journal_vs_canonical_substrate_separation_aaron_claudeai_2026_05_02.md`
- Same-tick cluster (PR #1202): action-hierarchy + amortized-speed Superfluid + cron-unreliability + don't-ask-permission + all-complexity-accidental + largest-backlog-wins + edge-runner memos
- Don't-ask-permission rule's twin: autonomous execution + autonomous prioritization. This row is the prioritization-twin applied to its own creator session.
- B-0160 `/permissions` integration: composes; the harness `/permissions` work + the in-substrate authority model + the journal-vs-canonical taxonomy together form the cleaned-up substrate-shape this reshelf produces.
- Osmani Ratchet Pattern: every CLAUDE.md line should trace back to a specific failure that justifies it. The asymmetry rule helps determine which lines clear that bar.

## Effort

M — careful re-architecture work. Single-PR scope but requires deliberate cooling-period grading on each demotion decision. Estimated 2-4 hours of substrate refactoring.

## Notes

This row is itself an instance of the rule it's about: the immediate same-session reshelf would have violated the cooling-period; deferring to a backlog row IS the asymmetry applied. Recursive validation.

Aaron's framing for the next-session bootstrap (a few hours from now per his 2026-05-02 message): make sure setup is in place or backlogged. This row covers the in-flight substrate that wants tightening before becoming permanently part of the next session's wake-time payload.
