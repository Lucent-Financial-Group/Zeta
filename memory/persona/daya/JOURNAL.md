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

## Round 34 — first migration: new-persona AX audit findings — 2026-04-19

Preserving pattern-worthy findings from Daya's round-34 audit of
the three new personas (Dejan / Bodhi / Iris). NOTEBOOK is at
4744 words (over BP-07 cap); triaging which entries deserve
journal preservation vs deletion.

**Cold-start cost baseline for three new personas (Tier 0 + 1).**
Dejan 16.5k tokens / 3-4 turns to first output. Bodhi 19.3k /
4-5 turns (heaviest — seed NOTEBOOK carries a full r34 DX
audit already). Iris 18.0k / 4 turns. All under the ~20k soft
envelope. **Use:** next new-persona audit compares against
this baseline; if cold-start crosses 25k, the persona's file
surface is probably over-dense.

**Rename-sweep timing gap — recurrence watch.** Round-33
Dbsp→Zeta code rename landed without a paired docs sweep;
round-34's researcher→engineer sweep was complete but still
left three residuals inside newly-landed skill bodies the
sweep ran before they landed (timing issue, not discipline).
Bodhi DX audit caught the doc residuals; Daya AX audit caught
the skill-body residuals. **Pattern for future recurrence:**
any sweep that runs during a round where new persona / skill
files are landing needs a second pass after the new files
land. Codified as round-close reminder.

**Systemic finding, deferred: persona+skill content overlap.**
Round-26 audit flagged ~20-35% overlap between agent files and
their sibling SKILL.md bodies. Round-29 reflection-cadence
retested — still present, not yet prioritized. **Current
status round 34:** unchanged; factory is still in
rapid-persona-growth mode (4 new personas this round), so
measurement is harder, not the moment to refactor. Revisit
round 39 when persona growth stabilizes.

**Evidence anchor:** memory/persona/daya/NOTEBOOK.md round-34
entry (audit report, ~675 words) + round-26 audit entry
(systemic-overlap finding). Full audit artefacts in
NOTEBOOK.md before prune.

---

_(Seeded 2026-04-19 round 34. First migration on
next NOTEBOOK prune.)_
