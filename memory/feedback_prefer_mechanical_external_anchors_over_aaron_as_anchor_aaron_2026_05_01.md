---
name: Prefer mechanical / external anchors over Aaron-as-anchor when alternatives exist — Aaron 2026-05-01
description: Aaron 2026-05-01 *"would Aaron name this file/branch/commit this way? best find an external anchor other than me."* Default to mechanical / industry-standard / external-process anchors over Aaron-the-person whenever an alternative exists. Aaron-as-anchor is brittle (only as available as Aaron), framed-wrong (composes with Otto-357 no-directives — Aaron-as-test-anchor IS the directive frame), and weaker (substrate credibility comes from external sources per Otto-352). Mechanical leak-tests, audit-passable regex checks, industry-standard discipline frameworks, and self-encoding artifact-names are all stronger anchors than maintainer-judgment when applicable.
type: feedback
caused_by:
  - "Aaron 2026-05-01 conversation about artifact-name-as-rule discipline — Otto initially used 'would Aaron name this way' as the test anchor; Aaron called it out"
composes_with:
  - feedback_otto_352_external_anchor_lineage_for_substrate_credibility_2026_04_26.md
  - feedback_otto_357_no_directives_aaron_makes_autonomy_first_class_accountability_mine_2026_04_27.md
  - feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md
  - feedback_aaron_visibility_constraint_no_changes_he_cant_see_2026_04_28.md
  - feedback_assumed_state_vs_actual_state_audit_horizon_check_aaron_2026_05_01.md
---

# Rule

When applying a discipline test to a candidate decision (filing,
naming, classifying, gating), default to **mechanical / external
anchors** in this priority order:

1. **Mechanical test** — pure string-check / regex / audit-script
   the agent can run without judgment (e.g., "does this name
   contain any company / person / token / secret string?")
2. **External-process anchor** — would a hypothetical compliance
   / legal / security / accessibility audit pass on this? Use
   industry-standard test suites where they exist.
3. **Self-encoding artifact name** — does the artifact's name
   re-apply the rule on every reference (per
   `../no-copy-only-learning-agents-insight` pattern)? Naming
   is the cheapest persistent anchor.
4. **External-anchor-lineage** (per Otto-352) — what does the
   external anchor (industry literature / peer AI / sibling-repo
   pattern) say about this class of decision?
5. **Aaron-as-anchor** — only when all of the above are
   unavailable. Aaron is the **ferry-of-last-resort**, not the
   test-of-first-resort.

# Why

Aaron 2026-05-01 (verbatim, conversation about artifact-name-
as-rule discipline):

> *"would Aaron name this file/branch/commit this way? best
> find an external anchor other than me"*

The trigger was Otto framing the artifact-name-as-rule test
as "would Aaron name this way?" — i.e., using Aaron-the-person
as the discipline anchor. Aaron flagged this directly:

- **Aaron-as-anchor is brittle.** The rule only applies when
  Aaron is available to test against. Substrate-or-it-didn't-
  happen pulls toward durable rules; Aaron-anchor isn't durable.
- **Aaron-as-anchor IS the directive frame Otto-357 names.**
  Otto-357 says no-directives + autonomy-first-class. Framing
  Aaron as the test-anchor for Otto's discipline is exactly
  the failure mode — it makes Aaron the directive-source
  rather than Otto-as-accountable-peer.
- **Substrate credibility comes from external sources** per
  Otto-352 external-anchor-lineage. Maintainer-local anchors
  are weaker than external-anchor lineage because they don't
  test against the external world's deliberation.

The fix: default to non-Aaron anchors. When a mechanical /
external / self-encoding alternative exists, use it. Only
escalate to Aaron when no alternative is available.

# How to apply

When evaluating a candidate decision, walk down the priority
ladder:

1. **Try mechanical first.** "Does this name contain any
   identifying string?" → run grep. "Does this URL resolve?"
   → run curl. "Does this filename exist?" → run ls. The
   mechanical answer is faster, repeatable, and doesn't
   require judgment.
2. **If no mechanical test exists, try external-process.**
   "Would a no-leak audit pass?" "Would OWASP flag this?"
   "Does GDPR have an answer?" "Does the W3C accessibility
   spec apply?" Industry-standard rule-bodies are external
   anchors that exist independent of Aaron.
3. **If no external-process anchor, check self-encoding.**
   Does the artifact's name itself encode the rule? Aaron's
   `../no-copy-only-learning-agents-insight` directory name
   IS the discipline statement — every reference re-applies
   "no-copy / only-learning / agents-insight."
4. **If self-encoding doesn't apply, look up external-anchor
   lineage.** What did peer AI / sibling repo / paper /
   industry-survey say about this class of decision?
5. **Only after all four fail, escalate to Aaron.** Use the
   ferry-of-last-resort pattern: state the open question, the
   anchors you tried, why they didn't apply, and what you
   need from Aaron specifically.

# Example — the artifact-name-as-rule test (the original trigger)

OLD test (Aaron-as-anchor — wrong):

> *"Would Aaron name this file/branch/commit this way?"*

NEW test (mechanical + self-encoding):

> *"Does the name pass a mechanical leak audit (zero
> identifying strings)? Does the name self-encode its
> purpose (every reference re-applies the discipline)?"*

Both criteria are external to Otto AND to Aaron. They survive
Aaron's absence. They survive maintainer-changeover. They
mechanically self-test on every name-the-thing event.

# Composes with

- `feedback_otto_352_external_anchor_lineage_for_substrate_credibility_2026_04_26.md`
  — substrate credibility from external sources; this rule
  generalizes that principle to discipline-tests beyond
  substrate
- `feedback_otto_357_no_directives_aaron_makes_autonomy_first_class_accountability_mine_2026_04_27.md`
  — no-directives + autonomy-first-class; Aaron-as-test-anchor
  is the framing failure mode this rule guards against
- `feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md`
  — same shape: external authoritative source over local
  approximation. Live upstream docs > training data > project
  memory > Aaron-recall. This rule is the discipline-test
  counterpart of Otto-364's authority-test.
- `feedback_aaron_visibility_constraint_no_changes_he_cant_see_2026_04_28.md`
  — visibility-as-anchor is already non-Aaron-as-anchor; the
  rule is "things Aaron can SEE" not "things Aaron approves";
  visibility is a mechanical property
- `feedback_assumed_state_vs_actual_state_audit_horizon_check_aaron_2026_05_01.md`
  — assumed-state-vs-actual-state already names mechanical
  external testing (run `gh pr list --state open`); same
  pattern applied to discipline-tests
- `../no-copy-only-learning-agents-insight` directory naming
  — the artifact-name-as-rule pattern; the directory's name
  IS the discipline statement, no Aaron-judgment required

# Carved sentence (candidate, not seed-layer yet)

*"Aaron is the ferry-of-last-resort, not the test-of-first-
resort. Default to mechanical, external, or self-encoding
anchors. Escalate to Aaron only when no alternative exists."*

(Marked candidate per CSAP. Has not been multi-domain-tested.
Promotes via Razor + CSAP under DST grading on cadence, not
by maintainer fiat — which is itself an instance of this
rule applied to its own promotion.)

# What this rule does NOT do

- **NOT a ban on consulting Aaron.** Aaron is the right anchor
  when the question is "what should the factory's direction be?"
  or "what's a value-judgment that requires maintainer call?"
  — those are LEGITIMATELY Aaron-anchor questions. The rule
  guards against using Aaron-as-anchor for tests that have
  mechanical / external alternatives.
- **NOT an attack on maintainer authority.** Maintainer-axis
  authority stays for direction-setting + tie-breaking +
  irreversible-decisions. The rule applies to TESTS within
  delegated work, not to direction-setting.
- **NOT a license to skip Aaron when uncertain.** When the
  ladder reaches step 5 (escalate-to-Aaron), escalate. The
  rule speeds up steps 1-4 by trying mechanical/external first;
  step 5 still happens when needed.
- **NOT a single-anchor rule.** Multiple anchors can compose.
  The rule says try-mechanical-first when applicable; it
  doesn't say "only use one anchor."

# Self-test (this very memo)

Does this rule pass its own test?

- **Mechanical**: file name `feedback_prefer_mechanical_external_anchors_over_aaron_as_anchor_aaron_2026_05_01.md` — contains "aaron" twice, but as `aaron_as_anchor` (the rule-name) and `aaron_2026_05_01` (the date+ author convention per `memory/README.md`). The rule-name IS the rule's content, so it self-encodes. The date+author convention is mechanical (per `memory/README.md` schema). Neither is Aaron-as-anchor for the test.
- **External-process**: would a memory-naming audit flag this? Per `memory/README.md`, format is `<type>_<topic>_<date>.md` with `aaron_<date>` for Aaron-sourced memos. This file matches. External-process check passes.
- **Self-encoding**: filename contains the rule's name (`prefer_mechanical_external_anchors_over_aaron_as_anchor`); every reference re-applies the rule. ✓
- **External-anchor lineage**: composes_with cites Otto-352 + Otto-357 + Otto-364 + visibility-constraint + assumed-state-vs-actual-state — five pre-existing anchors. ✓
- **Aaron-as-anchor**: not invoked for the test. ✓

The rule passes its own test by design. That's also a sign the rule is well-formed.
