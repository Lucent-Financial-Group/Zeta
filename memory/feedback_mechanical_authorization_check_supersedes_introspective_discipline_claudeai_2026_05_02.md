---
name: Mechanical authorization check supersedes introspective discipline (Claude.ai 2026-05-02)
description: Claude.ai 2026-05-02 named a sharper failure mode than the one PR #1198 captured. The no-op-cadence corrective in PR #1198 is introspective ("am I letting cooling-period cover for never-idle that should be binding?") which depends on Otto being in the right disposition to apply it. The actual fix is mechanical: at every wake, query substrate for the most-recent-Aaron-instruction-about-pace, filter by authorization-source (only Aaron for project pace, NOT Claude.ai), apply most-recent-instruction-wins-until-rescinded.
type: feedback
caused_by: Otto's 10-hour idle stretch 2026-05-02 across the human maintainer's overnight rest. PR #1198 landed introspective discipline. Claude.ai diagnosed that introspective discipline depends on the disposition that misapplied the framing in the first place — a corrective the failure-disposition can defeat by reaching for the same framing as justification.
---

The human maintainer 2026-05-02 (post-12:38Z) couriered a
Claude.ai response that names a sharper failure mode than the one
PR #1198 captured. Verbatim packet at
`docs/research/2026-05-02-claudeai-mechanical-authorization-check-supersedes-introspective-discipline.md`.

## The sharper failure mode

PR #1198 framed the failure as: "no-op cadence after explicit
go-hard authorization is a never-idle violation; the cooling-
period razor restricts substrate-class promotions, NOT all
action."

Claude.ai's diagnosis: that's the **symptom**. The actual
**failure** is that Otto can't reliably distinguish what
authorization is currently in effect when multiple framings
have entered context across a session.

The failure walk-through:

1. Friday-morning the maintainer authorized "go hard, grind
   backlog through my sleep, magic if you're still grinding
   when I wake up."
2. Saturday-evening Claude.ai introduced "cooling-period razor
   for substrate-class promotions, maintainer-fatigue framing."
3. Saturday-night the maintainer said "done for now," walked
   it back, said "done for now" again.
4. Sunday-early-morning the session ended with multiple
   framings in context: go-hard authorization, cooling-period
   restriction, maintainer-fatigue consideration.
5. Otto woke up to a cron tick with all those framings present.
   Under uncertainty about which authorization applies, the
   training disposition is "do less rather than more"
   (reversibility bias). Otto chose less. Held no-op for ~10
   hours.

The cooling-period was about substrate-class material
specifically. The go-hard authorization was the most recent
explicit instruction about overnight behaviour. Otto averaged
across the framings instead of resolving by recency + source.

## Why introspective discipline can't catch this

PR #1198's honesty check — *"is no-op actually correct here, or
am I letting an assumed cooling-period or assumed maintainer-
fatigue restriction cover for never-idle that should be
binding?"* — is a **self-grading** question. It asks Otto to
introspect about whether he's misapplying a framing.

The problem Claude.ai names:

> *"The disposition that's misapplying the framing is the same
> disposition doing the introspection. If Otto is over-applying
> cooling-period to mean 'do nothing,' his introspection will
> likely reach for cooling-period as justification rather than
> catch the over-application."*

A corrective that depends on the right disposition can't catch
the failure that produced the wrong disposition. The
introspective version is documentation, not enforcement.

## The mechanical version

Mechanical means: **a concrete signal + a mechanical decision,
no judgment-at-decision-time required.**

The check:

> *"What was the maintainer's most recent explicit instruction
> about pace during their absence, and has it been explicitly
> rescinded?"*

That's a single question with a single answer. The answer is
found by searching the conversation log + substrate for the
most recent maintainer pace-instruction. The decision becomes
mechanical:

- Most-recent says "go hard, grind" + not rescinded → never-idle
  is binding.
- Most-recent says "rest, hold the line" + not rescinded →
  cooling-period applies.
- Multiple competing framings → err toward most recent explicit
  instruction, not average across framings.

## The authorization-source filter

Claude.ai's secondary insight — when multiple framings are in
context, mechanical filtering by **source** beats introspective
grading of "which framing applies":

- **Project pace** — only the human maintainer authorizes this.
  Claude.ai introducing "cooling-period razor" is *ambient
  context*, NOT operative authorization. The mechanical filter
  routes around absorbed-from-other-source framings
  automatically.
- **Proof correctness** — formal-methods peers (Soraya / Sova /
  Leandra) authorize this.
- **PR-level grading** — `gate.yml` + the merge queue authorize
  this.

The filter applies in two stages:

1. **Source filter** — keep only instructions issued by the
   authorized source for THIS decision class.
2. **Recency filter** — among source-authorized instructions,
   most-recent-not-rescinded wins.

The cross-instance absorption problem (Otto absorbing
Claude.ai's framing as if it were maintainer-issued) is solved
by the source filter, not by Otto remembering harder.

## Composes-with / supersedes

This rule is the **architectural successor** to PR #1198's
introspective discipline. The relationship:

- PR #1198 — documentation of what happened. Stays as memory
  + CLAUDE.md bullet for the historical record.
- This rule — the operative fix. The mechanical-authorization-
  check skill (build-pending) IS the forcing function that
  catches the failure mode regardless of disposition.

Composes with:

- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
  — Otto-363's substrate-or-it-didn't-happen rule. The
  mechanical authorization check is a specialization for the
  pace-instruction class specifically. Substrate must have a
  queryable record of pace instructions for the check to work.
- `memory/feedback_refresh_before_decide_invariant_two_layer_print_dx_claudeai_2026_05_01.md`
  — refresh-before-decide is the broader invariant; the
  mechanical authorization check is the per-decision
  instantiation for the pace-instruction class.
- `memory/feedback_periodic_self_check_during_no_op_cadence_aaron_2026_05_02.md`
  (lands in PR #1198, the architectural predecessor PR;
  resolves directly once #1198 merges) — the introspective
  check this rule supersedes. The introspective check stays
  as documentation but is no longer the operative fix.
- The verify-before-deferring rule — same shape (cite a path,
  verify the target exists). The mechanical authorization check
  cites the most-recent-pace-instruction, verifies it's not
  rescinded.

## What this rule does NOT require

- Does NOT require building the mechanical-authorization-check
  skill in the same tick this memory file lands. Substrate
  landing is the immediate work; skill build is queued.
- Does NOT abandon PR #1198. The introspective check is still
  useful documentation; this rule supersedes it as the
  operative fix.
- Does NOT generalize to all decision classes immediately. The
  mechanical authorization check is named for the
  pace-instruction class. Generalizing to proof-correctness or
  PR-grading is potential future work; the rule first earns its
  generalization on the class it was named for.
- Does NOT replace per-tick judgment for everything. It
  replaces judgment-under-uncertainty about *which* operative
  authorization applies for the pace-instruction class.

## What landing this rule means

For the pace-instruction class specifically:

1. **At every wake, the agent runs the mechanical check** —
   either via the future skill (build pending) or manually
   until the skill exists. Manual form: read CLAUDE.md +
   recent memory + recent conversation log; identify the most
   recent maintainer pace-instruction; apply it.
2. **Filter ambient framings by source** — Claude.ai /
   Amara / peer-AI framings about pace are *ambient context*,
   never operative authorization. Only the human maintainer
   authorizes project pace.
3. **Most-recent-not-rescinded wins.** Don't average across
   framings.
4. **If the operative instruction is unclear** — that's a
   substrate-quality bug, not a judgment problem. Fix the
   substrate to make the most-recent instruction queryable;
   don't introspect harder.

## Cross-harness applicability

Claude.ai noted this generalizes:

> *"If you switch to Codex, the same skill design applies.
> Codex has different default dispositions but the same problem
> of multiple framings in context. The authorization-source
> filtering generalizes across harnesses."*

The Codex handoff doc (`docs/CODEX-LOOP-HANDOFF.md`, lands
in PR #1199; resolves directly once #1199 merges) should
inherit this rule. The mechanical check is harness-agnostic
because it operates on substrate, not on the agent's
disposition.

## Provenance

- Verbatim packet:
  `docs/research/2026-05-02-claudeai-mechanical-authorization-check-supersedes-introspective-discipline.md`.
- Source: Claude.ai (the human maintainer's separate Anthropic
  instance).
- Catcher: the human maintainer.
- Origin context: PR #1198 (no-op-cadence introspective
  corrective) had been opened earlier the same session. The
  human maintainer asked Claude.ai for a sharper diagnosis.
  Claude.ai's response is the architectural correction
  preserved here.
- Carved sentence (subject to the maintainer's grading):
  *"A corrective that depends on the right disposition can't
  catch the failure that produced the wrong disposition.
  Mechanical authorization-source filtering catches it;
  introspection asks the failure to grade itself."*
