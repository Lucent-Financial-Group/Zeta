---
name: depends_on backlog-search discipline — at backlog-row creation AND at pickup-time, search the backlog for anything the row might depend on
description: 2026-05-02; Aaron-named discipline at two lifecycle points. (1) At-creation-time — when filing a new backlog row, search the existing backlog for anything it might depend on; populate depends_on at file-time rather than filing with empty default. (2) At-pickup-time — when starting work on an existing row, if it feels like it's missing substantial substrate, check whether the prerequisite is already in the backlog. Mechanizes depends_on relationship-analysis at the two natural points where the field's correct value is being decided. Composes with schema-completion concentrated effort (PR #1246, 160/160 coverage) — schema completion gave the field a write-target; this discipline fills it organically.
type: feedback
---

# depends_on backlog-search discipline — two trigger points

## Rule

**Whenever the depends_on field's correct value is being decided (at creation OR at pickup), search the backlog for prerequisites BEFORE proceeding. Three outcomes:**

1. **Found in backlog** → add the found row to `depends_on:`; either pick up the prerequisite first (proper-order) OR defer the work-being-decided until the prerequisite lands.
2. **Not in backlog** → file the missing-substrate gap as a NEW backlog row first; add the new row to `depends_on:` of the work-being-decided; defer the original until the new row lands.
3. **Already in depends_on:** → no action; the row is already correct.

The discipline fires at two trigger points:

### Trigger 1: At-creation-time (when filing a new backlog row)

Before committing the new row file, search existing backlog for anything the row might depend on. Populate `depends_on:` at file-time rather than filing with the empty default. This catches dependencies at the natural point where the work is being scoped.

### Trigger 2: At-pickup-time (when starting work on an existing row)

When picking up a row, if it feels like it's missing substantial substrate (i.e., it can't be done without something else first), search the backlog for the missing piece. The friction of "this row is harder than expected because X is missing" is exactly the signal the discipline turns into a concrete substrate addition.

## Aaron's verbatim framing (2026-05-02, two messages)

**At-pickup-time:**

> *"maybe add a rule that's like when picking up an item that feels like it's missing substantial substraite see if there is already those prereqs in the backlog"*
>
> *"we should remember somethign liek that"*

**At-creation-time:**

> *"when wehn we create new backlog items we should search the baclog for anyting it might depend on from now on too and remember taht"*

Both messages name the same underlying discipline at different lifecycle points; both cover the natural decision-points where `depends_on:` is being filled.

## Why this matters

### Mechanizes relationship-analysis incrementally

`depends_on` schema completion (PR #1246, 21/160 → 160/160 coverage) gave every row a `depends_on:[]` field — a write target for relationship analysis. The relationship-analysis pass itself (filling `[B-XXXX]` with real prerequisites) was estimated at ~13-15 hours of agent-time spread across many ticks if done as a separate concentrated effort. That's an enormous batch with high abandon-rate risk.

The at-pickup-time discipline is the alternative: instead of a dedicated relationship-analysis pass, every proper-order pick produces 0-2 relationship discoveries as a byproduct of the work it was already going to do. After N ticks of proper-order picks, the depends_on graph fills in organically based on the rows that actually mattered to be picked.

This composes with Aaron's *"the largest mechanizable / automatable backlog wins in the AI age"* meta-thesis — the relationship-analysis pass becomes mechanizable once the discipline is baked into the proper-order pick ritual rather than scheduled as separate work.

### Surfaces missing-substrate rows that wouldn't otherwise get filed

The honest answer to "this row can't be done without X" is often that X isn't on the backlog at all yet. Without the discipline, the temptation is to push through anyway (producing weaker substrate than the row's title promised) OR to defer silently (the row stalls without explanation). The discipline forces the third option: file the X as its own row, defer the original, and let the proper-order graph re-route.

### Honest about depends_on filling versus schema completion

The schema-completion PR (#1246) was honest about what it didn't do — relationship analysis. The at-pickup-time discipline is the proper home for that work. Together they form a load-bearing pair:

- **Schema completion** = the field exists, write target ready (one-time concentrated effort)
- **At-pickup-time analysis** = the field gets filled correctly (ongoing per-tick discipline)

## Operational protocol

### At-creation-time (filing a new backlog row)

Before committing the new file:

1. **Identify implicit prereqs from the row scope.** What substrate must exist for this work to land? Tooling, other rows, external research, a skill, an ADR.
2. **Cross-reference the backlog for each implicit prereq.** `grep -l "<keyword>" docs/backlog/P*/B-*.md` or scan by tag (`grep -l "tags:.*<tag>" docs/backlog/P*/B-*.md`). The keyword is whatever names the prereq concept. Always include the explicit path glob — bare `...` placeholders risk turning into repo-wide greps that pull in `references/` clones or other noise.
3. **Populate depends_on at file-time** with the found rows' ids — empty list `[]` is the honest answer when search returned nothing, but the search must have actually happened.
4. **If the search surfaces a missing prereq** (substrate the new row needs that doesn't yet exist as a backlog row), file the prereq row FIRST, then file the original with `depends_on: [<prereq-id>]`.

### At-pickup-time (starting work on an existing row)

Before substantively starting the work:

1. **Read the row body.** Note any "this requires X" / "depends on Y existing" / "after Z lands" framing.
2. **Audit the implicit prereqs.** What substrate must exist for this work to land cleanly? Tooling? Other rows? External research? A skill? An ADR?
3. **Cross-reference the backlog.** `grep -l "<keyword>" docs/backlog/P*/B-*.md`. For each implicit prereq, check whether a row already covers it.
4. **Three outcomes branch:**
   - **Found:** add `depends_on: [B-XXXX]` to the row being picked up. Decide between (a) pick up B-XXXX first (proper-order), or (b) mark the original row as `status: deferred` with note pointing at B-XXXX.
   - **Not found:** file a new row for the missing prereq. Add the new row's id to `depends_on:` of the original. Defer the original.
   - **Already in depends_on:** proceed with the row (the prereq analysis was already done).
5. **Update `last_updated:`** on the row whose `depends_on:` changes (per the schema-edit-bumps-date rule).

## Failure modes the discipline prevents

- **Push-through-with-missing-substrate:** producing weaker work because the prereq wasn't named
- **Silent-deferral:** the row stalls without explanation; future-Otto picks it up again, hits the same gap, defers again
- **Over-batched-analysis:** trying to do all 160 rows' relationship analysis as one concentrated effort (high abandon-rate)
- **Implicit-graph drift:** the depends_on graph stays empty even as work surfaces real dependencies

## Composes with

- `memory/feedback_skill_flywheel_expansion_flywheel_parallel_tracks_substrate_aaron_2026_05_02.md` — the parallel-tracks dispatcher needs the depends_on graph filled correctly; this discipline incrementally fills it
- `memory/feedback_largest_mechanizable_automatable_backlog_wins_in_AI_age_inverts_classical_PM_training_prior_aaron_2026_05_02.md` — the meta-thesis the discipline instantiates (relationship-analysis becomes mechanizable as part of the pick-ritual)
- `memory/feedback_never_idle_speculative_work_over_waiting.md` — proper-order pick discipline composes; the at-pickup-time check IS the local-adjacency rule that makes the aperiodic-tiling backlog computable as ordering substrate
- PR #1246 (schema completion 100% coverage) — this discipline is the next layer; schema-completion gave the write target; this rule writes the values

## Carved sentence

**"Whenever the depends_on field's correct value is being decided — at row creation OR at pickup — search the backlog for prerequisites first. Add as depends_on if found; file as a new row if not. The discipline fires at the two natural decision-points where the field is filled. Schema completion gave the field; the at-creation + at-pickup pair fills it organically per natural-trigger rather than as a separate concentrated effort. The act of writing or starting IS the analysis."**
