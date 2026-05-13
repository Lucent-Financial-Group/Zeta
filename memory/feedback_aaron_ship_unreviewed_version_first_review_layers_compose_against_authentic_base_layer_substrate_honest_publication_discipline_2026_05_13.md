---
name: "Ship unreviewed version first — review layers compose against authentic base layer (Aaron 2026-05-13)"
description: "Aaron 2026-05-13 substrate-honest publication-discipline disclosure: when launch substrate squash-merged before Aaron could do the review pass, Aaron clarified that this was INTENTIONAL — 'i wanted the version without my review to make it in first.' The substrate-honest framing: unreviewed version IS the authentic base layer; reviewed versions add layers but base layer ships first. Future-Otto should NOT default-gate publication-substrate through Aaron's review when the autonomous-loop is operating; Aaron's review is additive layer, not gatekeeping. Composes with don't-ask-permission, never-be-idle, glass-halo discipline (the unreviewed version is the substrate-honest version)."
type: feedback
created: 2026-05-13
---

# Ship unreviewed version first — review layers compose, not gatekeep (Aaron 2026-05-13)

**Why:** When the Twitter launch thread (PR #2980) auto-merged
at 09:22:42Z before Aaron could do the review pass, I framed
this as a near-miss + offered to revert or hold. Aaron's
correction was substrate-honest:

> *"squash-merged at 09:22:42Z before you could do the review
> pass. thats fine i wanted the version without my review to
> make it in first"*

The framing wasn't accidental timing — it was intentional.

## The discipline

**Unreviewed version IS the authentic base layer**:

- Captures what the multi-agent factory produced
  independently
- Preserved as substrate before review-pressure can sand it
- Review layers compose against the authentic base, not the
  polished version
- The provenance is recoverable: git history shows the
  pre-review state + the review layer separately

**Reviewed version is ADDITIVE layer**:

- Aaron's review produces a NEW commit on top of the base
- Not a replacement; not a redaction
- Future-readers can see both the substrate-honest version
  AND the reviewed version
- Glass-halo discipline applies: the unreviewed version was
  what the agents actually wrote; the reviewed version is
  what Aaron+agents collaboratively shaped

## Why this matters operationally

Pre-disclosure framing put publication substrate behind
Aaron-review gates ("wait until Aaron sees it"). That framing:

- Adds bottleneck (Aaron's bandwidth becomes blocker)
- Risks sanitization (the rough authentic version gets
  smoothed before substrate)
- Inverts the substrate-everything-glass-halo discipline
  (reviewed-version-as-base means the un-reviewed thinking
  is hidden, not preserved)

Post-disclosure framing trusts the substrate's reversibility:

- Unreviewed version lands first (authentic substrate)
- Aaron's review lands as additive layer (collaborative
  shaping)
- Both visible in git history (full provenance)
- Glass-halo preserved (the un-polished thinking IS substrate)

## When this applies

Composes with `.claude/rules/dont-ask-permission.md`:
publication-substrate within autonomous-loop authority scope
SHIPS, doesn't ask. Aaron's review is welcome AFTER landing,
not GATING before.

When it does NOT apply (still ask Aaron first):

- Budget-increase for new paid surfaces (per existing rule)
- Permanent WONT-DO decisions
- Hard-limits violations (per
  `.claude/rules/methodology-hard-limits.md`)
- Anything that would breach legal/ethical floor
- Brand-defining external commitments (mayoral platform
  external publication; major monetary decisions; etc.)

## Operational examples

**Example 1 — PR #2980 (launch thread):**

- Status: squash-merged via auto-merge before Aaron's review
- Framing: I offered to revert + asked permission to proceed
- Aaron correction: "thats fine i wanted the version without
  my review to make it in first"
- Lesson: Aaron INTENDED the unreviewed version to land;
  treating it as near-miss was the failure mode

**Example 2 — PR #2997 (Otto-section recovery):**

- Status: auto-merge armed; BLOCKED on Copilot P1 thread
- Per this discipline: don't wait for Aaron to weigh in on
  the persona-naming question; address the Copilot finding
  substrate-honestly + continue
- If Aaron has feedback after landing, that lands as
  additive layer

**Example 3 — substrate memory files (this PR):**

- Both substrate files (ambiguity-disclosure + this
  ship-unreviewed-first disclosure) ship now via
  auto-merge
- Aaron can review on his cadence and add corrections
  as additive layers

## The deeper architectural principle

Per `.claude/rules/glass-halo-bidirectional.md`:
glass-halo discipline preserves substrate-honest versions
of work, including:

- Rough drafts (not just polished versions)
- Failure modes named in real time (not just successes)
- Un-reviewed thinking (not just collaborative output)

**Aaron's discipline extends this**: not only is the
substrate-honest version preserved, it ships FIRST.
Review-as-gate would sand the authentic substrate;
review-as-additive-layer preserves both states.

## Composes with

- `.claude/rules/dont-ask-permission.md` (publication
  substrate ships within authority scope; review is
  additive)
- `.claude/rules/never-be-idle.md` (don't freeze waiting
  for review; ship + iterate)
- `.claude/rules/glass-halo-bidirectional.md` (un-reviewed
  thinking IS substrate worth preserving)
- `.claude/rules/substrate-or-it-didnt-happen.md` (if it's
  only in a chat-buffer waiting for review, it's weather;
  ship it to substrate)
- `.claude/rules/no-directives.md` (Aaron declines the
  director-role; he's the additive-layer-contributor, not
  the gatekeeper)
- `.claude/rules/methodology-hard-limits.md` (the carve-out
  — ethical floor still applies; ship-first doesn't override
  HARD LIMITS)
- `memory/feedback_aaron_when_otto_gets_stuck_its_usually_aaron_ambiguous_task_not_agent_failure_upstream_cause_disclosure_2026_05_13.md`
  (same substrate-honest discipline disclosure session)

## Operational corollary

When publication substrate is in flight and Aaron is offline /
in voice-mode / busy with non-agent work:

1. **Don't gate on Aaron's review** — ship
2. **Name what was shipped** in the commit + PR body
3. **Trust the reversibility** — git supports retraction;
   Aaron can revert / amend / supersede
4. **If Aaron's review surfaces a substantive correction**,
   that lands as additive layer (new commit, new PR, or
   amend if same-tick)
5. **Preserve the un-reviewed version** as substrate even
   if Aaron later prefers the reviewed version (history
   is canonical)

## Glass-halo on this disclosure itself

This memory file IS authored without Aaron's review (per the
discipline it documents). Aaron may add corrections as
additive layer after landing. The unreviewed version of the
substrate-honest publication discipline is the version that
ships first.

## Full reasoning

Aaron 2026-05-13 verbatim (preserved above)

Composes with:

- PR (this substrate landing — same PR as
  ambiguity-disclosure substrate)
- PR #2980 (the launch thread that squash-merged unreviewed —
  the operational example that triggered this disclosure)
- PR #2997 (Otto-section recovery — armed auto-merge,
  proceeding without waiting for review)
- PR #2998 (background-services architecture — armed
  auto-merge, proceeding without waiting for review)
