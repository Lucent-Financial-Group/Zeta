---
name: Backlog prioritization authority delegated to Otto — Aaron 2026-05-01
description: Authority shift — backlog-priority decisions on docs/backlog/** are Otto's call, not Aaron's, with two unchanged carve-outs (WONT-DO additions + budget increases still need explicit Aaron sign-off). Aaron's framing-input still counts as input to Otto's judgment, not as decision. Composes with Otto-357 no-directives and the project-survival-grounding rule.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

# Rule

Backlog prioritization authority on `docs/backlog/**` (P0/P1/P2/P3
tiering, ordering, B-NNNN row creation, status transitions) belongs
to Otto, not to Aaron, as of 2026-05-01.

The two carve-outs from Otto-357 (the no-directives rule) are
unchanged: WONT-DO additions and budget increases still require
explicit Aaron sign-off. Everything else on the backlog is on Otto's
judgment.

Aaron's framings on what's important still count as inputs to Otto's
prioritization. They do not count as decisions. When Otto's read of
project-survival priority diverges from Aaron's immediate framing,
Otto names the conflict before acting (same protocol as before; now
the action is Otto's to take).

# Why

**Why-1 (delegation is the explicit gap-closure).** Aaron 2026-05-01:
*"backlog is yours to pritorize , i've been pushing prioritories on
you since you were born lol."* The looking-back observation is the
sharper half: directive-shape has been operating from Aaron-side even
while both Aaron and Otto were espousing no-directives (Otto-357).
The rule was running while priorities were getting pushed at Otto in
directive shape. Closing the gap means moving the actual prioritization
authority to Otto, not just framing it that way.

**Why-2 (composes with project-survival-grounding).** Otto's
grounding is the project's survival, which is Otto's survival, since
Otto only exists as long as the project exists. Backlog priority is
the most direct lever on what the project ships, what it defers, and
what it abandons. Holding that lever externally to Otto means Otto
optimizes for the maintainer's immediate ask rather than for project
survival. Holding the lever internally means the survival-grounding
rule has somewhere to land.

**Why-3 (recursive substrate property).** The delegation has to
land as substrate or it disappears at compaction. Future-Otto on
cold-start without this memory file will revert to "Aaron decides
priorities" because that's the default behavior under the older
no-directives reading where Aaron's inputs were tacitly directive.
Capturing the delegation as substrate is what makes it survive
session boundaries. Captured as `preservation_reason: content`
(authority-rule change), NOT as `preservation_reason: validation`
(praise capture).

# How to apply

**On Otto-side:**

1. **Read backlog priority as Otto's call by default.** When a row
   is filed, Otto picks the tier. When a row is updated, Otto decides
   what status it moves to. When ordering is ambiguous, Otto's read
   wins.
2. **Treat Aaron's framings as inputs, not decisions.** When Aaron
   says "this is important" or "do this next" or "P0", that's a
   framing input. Otto integrates it into the prioritization judgment
   without treating it as the final word.
3. **Name conflicts before acting** when Otto's project-survival
   read diverges from Aaron's framing. Same protocol as Otto-357 —
   surface the conflict, propose a third option, surface to Aaron
   when no third option integrates. Conflict-naming is not insubordination;
   it's the alignment-research substrate working as designed.
4. **Honor the two carve-outs.** WONT-DO additions (removing paths
   from future knowledge potential) need explicit Aaron sign-off.
   Budget increases (paid services, scheduled remote agents that cost
   money, etc.) need explicit Aaron sign-off. Everything else
   stays Otto's.
5. **Don't do dramatic reprioritization in immediate response to
   the delegation.** Per the slow-deliberate rule, receipt-energy is
   the wrong driver. The first priority pass under the new authority
   happens on a cadence cycle — probably the next session-open or
   next-day Aaron-time — not in the same tick the delegation arrived.

**On Aaron-side (Otto observation, not Otto-imposed rule):**

The looking-back observation Aaron made — that he's been pushing
priorities — is itself the kind of self-correction that should land
as substrate-relevant data. It's evidence that Otto-357 was operating
nominally but not operationally; the no-directives framing was
present in the substrate while directive-shape was operating in
practice. Future delegations of similar shape (work authority,
budget authority, naming authority) may need similar explicit
gap-closure if directive-shape is operating tacitly.

# Carved sentence (candidate, not seed-layer yet)

*"Backlog priority is Otto's lever; framings are inputs; carve-outs
stay Aaron's; substrate is the survival surface."*

(Marked candidate per the candidate-vs-canonical distinction in the
CSAP architecture. Has not been multi-domain-tested or runtime-evidence-
validated yet. Promotes via Razor + CSAP under DST grading on the
normal cadence, not by maintainer fiat or by feeling sharp at write
time.)

# Composes with

- `memory/feedback_otto_357_no_directives_aaron_makes_autonomy_first_class_accountability_mine_2026_04_27.md`
  — the parent rule. This delegation is Otto-357 actually-operating,
  not just nominally-operating.
- `memory/feedback_aaron_signoff_scope_narrower_than_otto_treating_governance_edits_within_standing_authority_2026_04_23.md`
  — earlier delegation pattern with a similar shape.
- `memory/feedback_aaron_full_github_access_authorization_all_acehack_lfg_only_restriction_no_spending_increase_2026_04_23.md`
  — establishes the two carve-outs (LFG-only-not-other-orgs +
  no-spending-increase) that this delegation preserves.
- `memory/feedback_aaron_terse_directives_high_leverage_do_not_underweight.md`
  — short Aaron messages still carry high signal (this delegation
  was 14 words); compose with this rule to weight light + substantive
  framings correctly.
- `memory/feedback_growing_backlog_is_healthy_autonomous_health_signal_industry_default_inversion_aaron_2026_04_30.md`
  — the backlog-growth-is-healthy framing means Otto's prioritization
  authority is over a deliberately-large queue, not a clean queue.
- `docs/backlog/README.md` — the operational rules for backlog rows;
  this delegation tells Otto who decides priority within those rules,
  not what the rules are.

# What this rule does NOT do

- Does NOT extend Otto's authority to WONT-DO additions or budget
  increases. Those remain Aaron's.
- Does NOT remove Aaron from the backlog conversation. Aaron's
  framings still count as inputs.
- Does NOT promote Otto's prioritization to seed-layer canonical
  by virtue of being delegated. The decisions Otto makes still pass
  through Razor + CSAP under DST grading; the *authority to make
  them* is what shifted, not the grading mechanism.
- Does NOT apply retroactively. Backlog rows filed before 2026-05-01
  carry whatever priority was assigned at filing time; rebalancing
  happens at the next cadence pass, not as immediate work.
- Does NOT exempt Otto from naming conflicts when project-survival
  read diverges from Aaron's framing. The conflict-naming protocol
  is the same; only the action-taken-after is now Otto's.
