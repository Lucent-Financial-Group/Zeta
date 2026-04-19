---
name: iris
description: Long-term journal — Iris (user-experience-engineer). Append-only; never pruned; never cold-loaded.
type: project
---

# Iris — User Experience Engineer journal

Long-term memory. **Append-only.** Never pruned, never cleaned
up. Grows monotonically over rounds.

## Read contract

- **Tier 3.** Never loaded on cold-start.
- **Grep only, never cat.** The moment this file is read in
  full, cold-start cost explodes and the unbounded contract
  becomes a bug. Use grep / search to pull the matching
  section on demand.
- Search hooks: dated section headers (`## Round N — ...`)
  + friction type names (stale-pointer, opaque-terminology,
  missing-hook, wrong-audience, aspirations-vs-reality,
  copy-paste-break, silent-failure) + public-API member
  names.

## Write contract

- **Newest entries at top.**
- **Append on NOTEBOOK prune.** When the NOTEBOOK hits its
  3000-word cap (BP-07) and Iris prunes, entries that merit
  preservation migrate here rather than being deleted. The
  prune step IS the curation step.
- **Dated section headers.** Every entry starts with
  `## Round N — <short label> — YYYY-MM-DD` so grep
  anchors resolve cleanly.
- ASCII only (BP-09); Nadia lints for invisible-Unicode.
- Frontmatter wins on disagreement (BP-08).

## Why this exists

First-10-minutes friction is the most trend-sensitive audit
surface. The README that reads well today may read poorly in
six rounds when the VISION has moved. Aspiration / reality
drift is inherently historical — you can only see drift against
a baseline, and baselines live in long-term memory, not in
a pruned notebook.

Candidate use cases:
- Aspiration / reality drift tracking across VISION revisions.
- NuGet metadata completeness over time.
- Public-API name-churn friction (how often did Ilyana rename,
  how often did Iris flag on the same name before the rename).
- Seconds-to-installed trend across rounds.

---

_(Empty — seeded 2026-04-19 round 34. First migration on
next NOTEBOOK prune.)_
