# Guess #001 — B-0173 hook-authoring-for-skill-creation-contracts

## Target

`docs/backlog/P1/B-0173-hook-authoring-for-skill-creation-contracts-aaron-2026-05-03.md`

The architectural choice: Aaron filed B-0173 for a "hook-authoring"
backlog row in the context of skill-creation contracts. The question
this guess answers: **what is Aaron's architectural intent for using
hooks (specifically) — vs alternatives like CI workflows, manual
review, or in-skill-body validation?**

## Read state at guess time (2026-05-03 ~02:42Z)

Otto has already read (in this session or via prior ticks):

- The B-0173 ROW NAME ONLY (from `ls docs/backlog/P1/`)
- The skill-design-rules memo
  (`feedback_skills_as_carved_sentences_knowledge_in_docs_datavault_2_0_pattern_aaron_2026_05_03.md`)
  — Aaron's skill-design rule 2: no dynamic commands in skills, use TS
  files under tools/ and reference by path; rule 3: package skill
  domains as plugins, use harness hooks for pre/post-condition
  enforcement (contract-based development)
- The decision-graph emergent property memo
  (`feedback_decision_graph_emergent_from_archaeologies_and_flywheel_aaron_2026_05_03.md`)
  — names B-0173 as "edge-property checks at commit / merge time" + as
  "edge-implementation discipline"
- The substrate-claim-checker (B-0170, shipped) — which is the kind of
  TS tool Aaron's rule 2 wants

## Research deliberately AVOIDED

Otto has NOT read:

- The B-0173 row body text (only the title from `ls`)
- Any commits referencing B-0173
- Any persona notebooks discussing hook-authoring
- Any prior conversation about Claude Code hooks specifically

## Otto's in-the-moment guess

### Architectural intent (high confidence)

Aaron's primary architectural intent for hooks-as-the-mechanism:
**hooks are local-fast-feedback enforcement at the commit boundary,
which is where skill-creation iteration happens.**

Specifically:

1. **Local enforcement vs CI workflows** — CI workflows fire after PR
   push; hooks fire at `git commit` time. For skill-creation iteration,
   the agent authoring the skill needs immediate feedback (was the
   skill body well-formed? did it break the carved-sentence
   discipline?). CI delay = bad iteration UX
2. **Harness-native enforcement** — Claude Code has hook machinery
   (pre-commit hooks, settings hooks, etc.). Aaron's skill-design rule 3
   names "use harness hooks for pre/post-condition enforcement
   (contract-based development)" — hooks compose with the harness's
   native event model
3. **Separation of concerns** — the skill body says WHAT the skill
   does; the hook enforces IS THIS SKILL VALID. Two different
   responsibilities; two different surfaces. The skill body shouldn't
   carry its own validator (that violates rule 2's no-dynamic-commands
   direction)

### Substrate-content intent (medium confidence)

The hook will likely be:

- A pre-commit hook that fires when `.claude/skills/*/SKILL.md` files
  are staged
- TS-implemented (per rule 2: no dynamic commands; TS files under
  tools/) — concretely something like `tools/git/hooks/skill-creation-contract-check.ts`
  (NOTE: I'm guessing the path here; the decision-graph memo cited
  `tools/git/hooks/` so I'm using that)
- Composes with substrate-claim-checker (B-0170) — runs the same
  count-drift / existence-drift / etc. checks on the skill body that
  the standalone CLI tool would
- May also enforce: carved-sentence presence, frontmatter completeness,
  hub-satellite-pattern markers, no-cargo-cult-references, etc.

### Specific implementation intent (lower confidence)

The hook will probably:

- Use Claude Code's `.claude/settings.json` `hooks` field to register
  itself
- Take input via stdin per Claude Code's hook protocol (the hook
  payload includes file paths + event type)
- Output structured result (block-or-allow + reason) per Claude Code's
  hook contract
- Provide override path for emergency commits (no false-positive lock)

## Confidence levels

| Layer | Confidence | Reasoning |
|---|---|---|
| Architectural — "hooks because local-fast-feedback" | **High** | Composes naturally with Aaron's skill-design rule 3 (already first-party-confirmed) + the iteration-UX argument is self-evident |
| Substrate-content — "TS file under tools/git/hooks/" | **Medium** | Decision-graph memo cited the path; rule 2 forces TS; but the specific filename + scope is inferred not confirmed |
| Specific — "Claude Code settings.json + stdin protocol" | **Low** | Standard Claude Code hook shape but I haven't confirmed the specific event names or payload schema for this hook type |

## Ground truth (TO BE FILLED IN AFTER VERIFICATION)

(Empty at write time. Populated when Otto reads B-0173 row body OR
asks Aaron OR runs decision-archaeology on the row.)

## Calibration delta (TO BE FILLED IN AFTER VERIFICATION)

(Empty at write time. Populated alongside ground truth section.)

---

**Guess timestamp:** 2026-05-03 ~02:42Z
**Author:** Otto autonomous (architect hat)
**Protocol:** in-the-moment guess per
`memory/feedback_guess_then_verify_architectural_intent_calibration_protocol_aaron_2026_05_03.md`
