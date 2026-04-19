---
name: daya
description: Long-term journal — Daya (agent-experience-engineer). Append-only; never pruned; never cold-loaded.
type: project
---

# Daya — Agent Experience Engineer journal

Long-term memory. **Append-only.** Never pruned, never cleaned
up. Grows monotonically over rounds.

## Read contract

- **Tier 3.** Never loaded on cold-start.
- **Grep only, never cat.** The moment this file is read in
  full, cold-start cost explodes and the unbounded contract
  becomes a bug. Use grep / search to pull the matching
  section on demand.
- Search hooks: dated section headers (`## Round N — ...`)
  + persona names + `file:line` citations + friction type
  names (stale-pointer, duplicated-info, etc.).

## Write contract

- **Newest entries at top.**
- **Append on NOTEBOOK prune.** When the NOTEBOOK hits its
  3000-word cap (BP-07) and Daya prunes, entries that merit
  preservation migrate here rather than being deleted. The
  prune step IS the curation step.
- **Dated section headers.** Every entry starts with
  `## Round N — <short label> — YYYY-MM-DD` so grep
  anchors resolve cleanly.
- ASCII only (BP-09); Nadia lints for invisible-Unicode.
- Frontmatter wins on disagreement (BP-08).

## Why this exists

Current state (as of round 34): NOTEBOOK's 3000-word cap
forces synthesis (good) but discards hard-won observations
when pruned (bad). ROUND-HISTORY is narrative prose, not
structured agent memory. This file is the "permanent facts"
layer — what did Daya learn across rounds that compression
would otherwise erase?

Candidate use cases:
- Pattern detection. "This same README friction showed up
  in rounds 24 / 27 / 31 — it's structural, not incidental."
- Trend data. Cold-start cost per persona, per round, over
  time.
- Friction recurrence. Which pointer-drifts come back after
  being fixed?

---

_(Empty — seeded 2026-04-19 round 34. First migration on
next NOTEBOOK prune.)_
