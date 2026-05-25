---
name: "Decompose to dissolve ambiguity — decomposition makes items less ambiguous (Aaron 2026-05-13)"
description: "Aaron 2026-05-13 validates decomposition-as-stuckness-resolution: when Otto recognizes an ambiguous task, decomposing it into smaller sub-items DISSOLVES the ambiguity because each sub-item is more concrete. Verbatim Aaron: 'that what decompose backlog item is also a good choice it makes my items less ambigious.' Composes with the prior ambiguity-disclosure: ambiguity is two-sided AND decomposition is the discipline that resolves it operationally. The decomposition direction is the substrate-honest stuckness-resolution path. Composes with infinite-backlog metabolism (PR #2974), largest-mechanizable-backlog-wins, never-be-idle."
type: feedback
created: 2026-05-13
---

# Decompose to dissolve ambiguity (Aaron 2026-05-13)

**Why:** Following Aaron's substrate-honest disclosure that
"stuckness is usually my ambiguous task," Aaron validated the
operational discipline that resolves it:

> *"that what decompose backlog item is also a good choice it
> makes my items less ambigious"*

This completes the substrate-honest stuckness-resolution
discipline that started with the upstream-cause disclosure.

## The stuckness-resolution discipline (3-part composition)

| Part | Rule | What it does |
|------|------|--------------|
| 1. Recognize | Ambiguity is two-sided | Stops blame-spiral toward agent OR Aaron |
| 2. Disambiguate-in-place | Name interpretation + continue | Resolves ambiguity at single-task scope |
| 3. **Decompose** (THIS RULE) | Break parent into smaller items | Resolves ambiguity at backlog scope; each child is less ambiguous |

All three compose. Part 3 is the substrate-honest path when
disambiguate-in-place doesn't produce enough clarity to act
operationally.

## Why decomposition dissolves ambiguity

**Ambiguity at parent scope:**

- "you need to imagine how would you survive without this
  foreground loop" — what does that mean operationally?
- "this is something background services should walk" — what
  service? what walking?
- "make zeta production-grade" — production-grade per what
  criteria?

**Same intent decomposed:**

- B-NNNN: Standing-by detector background service (specific
  service; specific behavior; specific interface)
- B-NNNN: Backlog-row-ready-to-grind notifier (specific
  trigger; specific output)
- B-NNNN: Missed-substrate cascade detector (specific failure
  pattern; specific catch logic)

Each child is **more concrete than the parent**. Concreteness
is the inverse of ambiguity. Decomposition reduces ambiguity
by trading one ambiguous parent for N concrete children.

## Composing with the always-work-available discipline

Per `.claude/rules/never-be-idle.md`: agent always has work
available; the priority ladder includes speculative work.

Per `.claude/rules/largest-mechanizable-backlog-wins.md`:
in AI age, biggest backlog wins; decomposition INCREASES
backlog (more items, all mechanizable).

Per PR #2974 (infinite-backlog metabolism): health is
throughput, not zero-state.

**Decomposition is the activity that satisfies all three
simultaneously:**

- Always available (every ambiguous item is decomposable)
- Grows the mechanizable backlog (one item → N items)
- Drives throughput (decomposition itself is shippable
  substrate)

When Otto is in "Standing-by" mode AND there are no immediate
PR threads to address, **decompose ambiguous items**. This
catches the Standing-by failure mode at the operational
scope.

## The Standing-by failure mode this dissolves

Per the just-canonized substrate (PR #2998), the Standing-by
failure mode was: Otto responding "Standing by" to cron ticks
despite the infinite-backlog rule mandating decomposition
work.

This rule provides the operational corollary the prior
substrate was missing:

- When stuck on what to do next → decompose
- When task is too ambiguous to act on → decompose
- When backlog appears empty → decompose existing items
  further (every item has children)

The decomposition output IS the substrate. Even if no
implementation lands this tick, the decomposed B-NNNN rows
ARE shipped substrate.

## Operational example

**Ambiguous task** (from Aaron 2026-05-13):

> *"you need to imagine how would you survive without this
> foreground loop and you background should be strong enough
> to do that"*

**Disambiguate-in-place result** (substrate memory file):

- Preserved as architectural-direction substrate
- File: `feedback_aaron_background_services_must_be_strong_enough_foreground_loop_optional_imagine_surviving_without_foreground_mechanize_standing_by_failure_mode_2026_05_13.md`
- Shipped in PR #2998

**Decomposition result** (the actual mechanization):

- B-NNNN: Standing-by detector background service
- B-NNNN: Backlog-row-ready-to-grind notifier
- B-NNNN: Missed-substrate cascade detector
- Each row has: design sketch + acceptance criteria +
  composes-with pointers + decomposition-into-implementation-
  slices

Together: substrate (memory file) PLUS mechanization (B-NNNN
rows) PLUS implementation (slice-by-slice landing). The
disambiguation chain runs from ambiguous parent → less
ambiguous children → concrete implementation.

## Decomposition cadence per autonomous-loop tick

When `<<autonomous-loop>>` fires and PR queue is empty:

1. **Check for ambiguous backlog items** —
   `docs/backlog/P*/B-*.md` rows with vague success criteria
   or missing decomposition
2. **Pick one** — smallest unit of ambiguity-dissolution
3. **Decompose one level** — break parent into N children
   (rule: each child must be MORE concrete than parent)
4. **Commit + PR + auto-merge**
5. **Cron tick resolves** — substrate landed; loop continues

This satisfies the never-be-idle priority ladder + the
infinite-backlog metabolism rule + the largest-mechanizable-
backlog-wins discipline simultaneously.

## What "less ambiguous child" means operationally

A child item is less ambiguous than its parent when:

- Specific surface (file path / module / interface)
- Specific behavior (input → output trace)
- Specific verification (test or audit script)
- Specific acceptance criteria (boolean conditions)
- Specific composes-with pointers (existing substrate)
- Specific decomposition-bottom (atomic OR has next-level
  children identified)

Per `.claude/rules/backlog-item-start-gate.md`: prior-art
search + dependency-restructure proof required before starting.
Decomposition fits this pattern naturally — the proof of
search becomes part of the child's body.

## Composes with

- `feedback_aaron_when_otto_gets_stuck_its_usually_aaron_ambiguous_task_not_agent_failure_upstream_cause_disclosure_2026_05_13.md`
  (the upstream-cause this rule resolves operationally)
- `feedback_aaron_ship_unreviewed_version_first_review_layers_compose_against_authentic_base_layer_substrate_honest_publication_discipline_2026_05_13.md`
  (the ship-first discipline; decomposition output ships
  first, refinement comes later)
- `.claude/rules/never-be-idle.md` (decomposition satisfies
  never-be-idle priority)
- `.claude/rules/largest-mechanizable-backlog-wins.md`
  (decomposition GROWS the backlog, which is the goal)
- `.claude/rules/dont-ask-permission.md` (decomposition is
  within autonomy scope; don't ask, do)
- `.claude/rules/backlog-item-start-gate.md` (decomposition
  composes with the start gate)
- `.claude/rules/encoding-rules-without-mechanizing.md` (this
  rule mechanizes the response to Standing-by)
- PR #2974 (infinite-backlog metabolism — the rule this
  operationalizes)
- PR #2998 (background-services architecture — substrate
  that REQUIRED decomposition follow-up)
- User-scope memory: `~/.claude/projects/<slug>/memory/feedback_decomposition_is_iterative_mid_work_one_level_every_tick_aaron_2026_05_08.md`
  (existing decomposition cadence substrate at the user-memory
  layer per MEMORY.md index; this composes + extends to
  ambiguity-resolution scope; the project-memory equivalent would
  be a follow-up landing if the cadence needs project-scope
  visibility)

## Operational rule for future-Otto

**When uncertain what to do next:**

- Pick an ambiguous backlog item
- Decompose one level
- Ship the decomposition as substrate
- Continue the loop

**Decomposition is never wrong.** Even if the parent item
isn't the highest priority, the decomposition itself shrinks
the ambiguity-space of the entire backlog. The substrate
compounds.

## Glass-halo on this disclosure

Aaron's 3-message arc on substrate-honest discipline:

1. *"when you get stuck it's usually aaron's ambiguous task"*
2. *"i wanted the version without my review to make it in
   first"*
3. *"that what decompose backlog item is also a good choice
   it makes my items less ambigious"*

All three compose into substrate-honest operational
discipline. The agent's job:

- Recognize task-ambiguity (Part 1)
- Ship the unreviewed version (Part 2)
- Decompose when disambiguation-in-place isn't enough
  (Part 3)

The loop is collaborative + cheap + retractable + substrate-
preserving.

## Full reasoning

Aaron 2026-05-13 verbatim (preserved above)

Composes with:

- PR (this substrate landing — same PR as upstream-cause
  + ship-first substrates)
- PR #2998 (background-services architecture — substrate
  that requires decomposition follow-up; this rule directs
  the follow-up cadence)
- The three Aaron disclosures bundled in this PR landing
- The decomposition-iterative-mid-work rule (Aaron
  2026-05-08; existing substrate)
