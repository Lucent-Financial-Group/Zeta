---
name: Strike-don't-annotate refinement to verbatim-preservation discipline — preserve the conversation, but strike (not annotate) the agent's own draft headers when superseded (Aaron + Claude.ai + Otto 2026-05-05)
description: Refinement to substrate-or-it-didn't-happen (Otto-363) verbatim-preservation discipline. The verbatim-preservation invariant applies to the EXTERNAL CONVERSATION (forwarded packets, ferry content, multi-AI review threads), not to the AGENT'S OWN PROVISIONAL DRAFT HEADERS. When the agent's own headlines/synthesis text gets superseded by a same-tick correction, strike (delete + replace) the superseded text rather than preserving it with annotation. Annotation creates self-contradictions reviewers and lints cannot ignore; striking keeps the verbatim conversation intact while letting the agent's own framing converge cleanly. The Claude.ai instance flagged this as a discipline refinement worth landing in CLAUDE.md after observing Otto's #1610 second-wave reviewer fix.
type: feedback
---

# Strike-don't-annotate -- verbatim-preservation discipline refinement

## The carved blade

> *"Verbatim-preservation applies to the external conversation;
> the agent's own draft headers are editable when superseded.
> Strike, don't annotate."*

## What this codifies

The substrate-or-it-didn't-happen rule (Otto-363) names verbatim-
preservation as a load-bearing invariant for external-conversation
absorbs (Aaron-forwarded packets, courier ferries, multi-AI review
threads). The 2026-05-05 #1610 review cycle surfaced an edge case
that needed clarification:

When the agent's OWN draft synthesis text gets superseded by a
same-tick correction (e.g., Otto first treated tinygrad UOp IR as
the resolved paper-id; Aaron then disconfirmed via Claude.ai
routing), there are two ways to preserve fidelity:

- **(rejected) Annotate the superseded text**: keep the original
  draft text in place, add "(Original draft framing — superseded)"
  + "(CORRECTED 2026-05-05 same-tick)" annotation blocks. Goal:
  preserve the trajectory of Otto's thinking.
- **(canonical) Strike the superseded text**: delete the original
  draft headers + replace with corrected text. Goal: preserve the
  conversation faithfully, let the agent's own framing converge.

The annotate-pattern fails because it creates **self-contradictions
reviewers and lints cannot ignore**. The doc still contains the
"X is the answer" assertion AND the "X is not the answer"
correction, with the surface text claiming both. Reviewer-bots
flag the contradiction; markdown-readers parse the text as
internally inconsistent; future-Otto cold-reading sees confusing
mixed signals.

The strike-pattern works because it preserves the discipline at
the right scope:

- **The verbatim conversation IS preserved** — Aaron's actual
  quotes and the Claude.ai instance's actual responses live in
  the verbatim section of the research-doc, unmodified
- **The agent's own provisional framings ARE editable** — Otto's
  draft synthesis text, which was Otto's own work-in-progress
  reading of the conversation, gets corrected to match the final
  understanding without contradiction artifacts
- **The trajectory is preserved in git history** — if anyone
  needs to see how Otto's thinking evolved, `git log -p` shows
  the strike + replace; the trajectory is recoverable without
  polluting the surface text

## Why:

- **Annotate-creates-contradictions failure mode**: The doc's
  surface text asserts both X and not-X; readers can't determine
  which is operative without reading the entire annotation tree;
  reviewer-bots flag P0/P1 contradictions; lint tools can't
  reason about superseded vs current.
- **Strike-preserves-the-right-discipline**: the EXTERNAL
  conversation IS the substrate-or-it-didn't-happen target;
  the agent's own draft text is provisional-by-nature; striking
  doesn't violate verbatim-preservation because verbatim-
  preservation is about preserving what the OTHER PARTY said,
  not what the agent's own draft said.
- **Git history is the audit trail**: trajectory of
  understanding-evolution is recoverable from git diff, not
  required to be persistent in surface text.
- **Reviewer-feedback efficiency**: striking-not-annotating
  resolves contradiction-flag review threads in one fix-commit,
  without creating second-wave reviews about the annotation
  itself.

## How to apply

When a same-tick correction lands on a research-doc / preservation
artifact / synthesis text:

1. **Identify the boundary**: external conversation vs agent's
   own draft text. The conversation is verbatim-preserved
   (untouched). The agent's draft is editable.
2. **Strike the agent's superseded draft**: delete the original
   wording + replace with the corrected wording. Don't add
   annotation blocks like "(superseded)" or "(corrected
   same-tick)" to the surface text.
3. **Add a single clean correction note**: in the operational-
   status header (frontmatter) or a brief paragraph in the
   relevant section, name the correction once. Example: *"Aaron
   explicitly disconfirmed tinygrad-as-paper-id; B-0202
   substrate-engineering claim survives independently."*
4. **Trust git history for the trajectory**: anyone who needs
   to see how Otto's thinking evolved can `git log -p <file>`
   to see strike + replace. The audit trail doesn't need to be
   in surface text.

## When this rule does NOT apply

- **External conversation content is NEVER struck** — Aaron's
  quotes, Claude.ai responses, ferry content, multi-AI review
  text all stay verbatim. The strike-discipline is for the
  agent's own draft framings ONLY.
- **Doctrine correction landed in memory files**: when a memory
  file's stated rule changes, the discipline is supersession +
  dated revision note (per the `superseded_by` frontmatter
  pattern), not strike. Memory files have their own preservation
  semantics.
- **CLAUDE.md / GOVERNANCE.md / ALIGHMENT.md**: these are
  current-state surfaces; edit in place to reflect current truth
  per GOVERNANCE.md §2 (historical narrative belongs in
  ROUND-HISTORY.md / ADRs / DECISIONS).

## Trigger lineage (2026-05-05)

- **Otto's #1610 first-draft** treated tinygrad UOp IR as the
  resolved paper-identification of Aaron's half-remembered
  YouTube paper. The forwarded-conversation context cut off
  before Aaron's disconfirmation reached Otto's first draft.
- **Aaron's same-tick disconfirmation via Claude.ai routing**:
  *"it's still not tinygrad, i did see that but that's not my
  univeral language"*.
- **Otto's first fix-commit (0df52f6)**: annotated the original
  Headline 1 with "(Original draft framing — superseded)" +
  "(CORRECTED 2026-05-05 same-tick)" blocks. Preserved trajectory.
- **Reviewer second wave**: 8 fresh threads flagged the
  annotation as creating internal contradictions (P0: "section
  header still asserts tinygrad IS the paper-identification";
  P0: "razor cuts list says tinygrad IS the paper-id"; etc.).
- **Otto's second fix-commit (0400c63)**: replaced annotation
  with strike-and-replace. All 8 threads resolved.
- **Claude.ai instance** flagged this as a discipline refinement
  worth landing in CLAUDE.md as a clarification of the
  preservation-discipline.

## Composes with

- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
  — the parent verbatim-preservation discipline; this refinement
  clarifies the boundary
- `memory/feedback_engagement_gate_substantive_claim_level_discipline_aaron_otto_2026_05_05.md`
  — the engagement-gate discipline (recursion-1 from the
  embodiment-thread research-doc); strike-don't-annotate is
  another recursion of substantive-claim discipline applied at
  the agent's-own-draft level
- `memory/feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md`
  — Otto-364 + its method-level recursion; strike-don't-annotate
  is similar shape: the discipline applies at the right level,
  not at every level uniformly
- `docs/research/2026-05-05-claudeai-girard-mimetic-theory-zeta-closes-thiel-hsieh-failure-mode-dora-correction-aaron-forwarded-preservation.md`
  (PR #1618) — the conversation that explicitly recommended
  landing this refinement in CLAUDE.md

## Carved sentence

**"Verbatim-preservation applies to the external conversation;
the agent's own draft headers are editable when superseded.
Strike, don't annotate. The trajectory of understanding-
evolution is preserved in git history; surface text should
converge cleanly to the current understanding without
self-contradiction artifacts."**
