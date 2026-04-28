---
name: Stop Mythology directive — operational name for the bullshit-detector at the directive level (Aaron concept; Amara naming, 2026-04-28)
description: Aaron 2026-04-28 framing — "we also stop mythology with human intellectual lineage research and anchors." Amara naming — "Stop Mythology directive" is the Beacon-safe operational form of the discipline (distinct from Veridicality, which is the formal scoring module name). Three-tier evidence threshold — factory-local claims need substrate; generalized claims need external lineage; big epistemic claims need SD-9 (substrate + lineage + falsifier). Pairs with Veridicality.fs as the directive-level discipline that the module would operationalize.
type: feedback
---

# Stop Mythology directive

## The directive (Aaron 2026-04-28; Amara naming)

> *"we also stop mythology with human intellectual lineage
> research and anchors"* (Aaron 2026-04-28).

Amara's Beacon-safe naming for this discipline:

> **Stop Mythology directive.**

In Zeta-shaped form (Amara verbatim):

```text
Stop Mythology:
  Factory-local claims can use substrate evidence.
  Generalized claims need external lineage.
  Big epistemic claims need SD-9:
    substrate evidence + external lineage + falsifier.
```

## How this relates to Veridicality (the module)

Two distinct artifacts at different levels of the stack:

| Artifact | Level | Status |
|---|---|---|
| **Veridicality** (`src/Core/Veridicality.fs`) | Formal scoring module | Shipped — graduates the Amara-7th-ferry V(c) formula |
| **Stop Mythology directive** | Operational discipline | This memory — directive-level discipline that Veridicality would operationalize |

- **Veridicality** is the *programmatic surface*. It scores
  individual claims against evidence. It's the future-shipped
  scorer per `memory/feedback_veridicality_naming_for_bullshit_detector_graduation_aaron_concept_origin_amara_formalization_2026_04_24.md`.
- **Stop Mythology** is the *behavioral rule*. It's what an
  agent does (or refuses to do) when about to make a claim
  without enough evidence. It's the Beacon-safe operational
  form that doesn't require shipping the module first.

Both names are valid. Both have the same Aaron-concept origin
(the bullshit-detector framing in conversation history).
Amara's contribution to the rename pair: she gave the module
a formal name (Veridicality) AND gave the directive a Beacon-
safe operational name (Stop Mythology).

The original "bullshit detector" term remains preserved in:
- Research docs (`docs/research/provenance-aware-bullshit-detector-*`)
- Aurora ferries 7/8/9/10 (research substrate, not renamed)
- The 8th-ferry memory (`memory/project_amara_8th_ferry_*_bullshit_detector_*`)
- Casual / commit-message usage (Aaron invented it; not scrubbed)
- The graduation memory (which records the rename rationale)

## Three-tier evidence threshold

The directive's operational machinery is a layered evidence
threshold scaled to claim-scope:

### Tier 1 — Factory-local claims

**Threshold:** substrate evidence.

A claim about THIS factory's behavior, history, or state needs
substrate evidence (commits, files, test results, logs).
External lineage is NOT required.

Examples:
- "PR #80 is on AceHack main but not LFG main." → check via
  `git merge-base --is-ancestor`. Substrate = git refs.
- "Class-Count Validity Drift earned a bead." → check via
  the catch event documented in this session.
- "MEMORY.md grew past 200 lines." → check via `wc -l`.

### Tier 2 — Generalized claims

**Threshold:** external lineage.

A claim that generalizes beyond this factory's instance —
something true about software engineering, AI alignment,
distributed systems, or any other domain where the broader
literature has authority — needs an external citation.

Examples:
- "Goodhart's Law applies to commit counts as alignment
  metrics." → cite Goodhart (1975), Strathern (1997).
- "Tail-recursion optimization was named in the 1970s." →
  cite Steele or Sussman.
- "Beacon-safe vocabulary preserves zero-divergence semantics."
  → this is factory-local; Tier 1 applies, not Tier 2.

The lineage citation can be informal (a one-line "per
Goodhart 1975") but must be checkable.

### Tier 3 — Big epistemic claims (SD-9)

**Threshold:** **SD-9** = substrate + external lineage + falsifier.

A claim that asserts something foundational about
truth-conditions, identity, or alignment — anything where
getting it wrong reshapes the factory's epistemic surface —
requires:

1. **Substrate evidence** (Tier 1).
2. **External lineage** (Tier 2).
3. **Explicit falsifier** — a stated condition under which
   the claim would be wrong.

SD-9 is encoded in `docs/ALIGNMENT.md` as Substrate
Discipline #9. It's the load-bearing rule for any
factory-foundational claim.

Examples:
- "Otto's autonomy is first-class" → SD-9: substrate (commits,
  decisions made autonomously), lineage (Aaron's framing per
  Otto-357 + autonomy-philosophy literature), falsifier (a
  case where Otto-deferred-to-Aaron when the substrate already
  determined the answer would falsify "first-class").
- "Glass Halo discipline produces measurable alignment" →
  SD-9: substrate (factory commits + test results), lineage
  (alignment literature, Hubinger / Critch / Christiano),
  falsifier (a published case where Glass-Halo-shaped agents
  produced misaligned behavior).

## Operational machinery — when to apply each tier

Before making a claim that affects others' decisions, ask:

1. **Is this a factory-local claim?** If yes → Tier 1.
2. **Does this generalize beyond this factory?** If yes →
   Tier 2.
3. **Is this a foundational / identity / alignment claim?**
   If yes → Tier 3 (SD-9).

If unsure → escalate one tier up. Better to over-cite than
under-cite.

## Anti-patterns the directive prevents

### Mythological framing without lineage

Statements like "the universe wants us to ship this," "this
is the right thing," "the spec speaks for itself" — vague
appeals to authority without substrate or lineage. Stop
Mythology says: name the substrate, cite the lineage, state
the falsifier.

### Vibes-based reasoning

"This feels right" / "intuition says X" / "the pattern
suggests Y" — these are calibration-level, not claim-level.
Useful for shaping investigation; insufficient for
acting-on-as-fact.

Amara's Beacon-safe translation:

```text
vibes → lineage + substrate + falsifier
poetic truth → Mirror unless Beacon-grounded
```

### Confirmation-flavored sample coverage

(Tied to Goodhart catch #3 above.) A sample of files audited
to "look clean" is mythology if asserted as tree clearance.
Stop Mythology says: full diff clearance or explicit loss
acceptance.

## Composes with

- `memory/feedback_veridicality_naming_for_bullshit_detector_graduation_aaron_concept_origin_amara_formalization_2026_04_24.md`
  — the formal-module rename (Veridicality is the scorer;
  Stop Mythology is the directive).
- `memory/feedback_amara_authority_rule_default_to_reversible_preservation_escalate_irreversible_loss_2026_04_28.md`
  — the authority rule operationalizes Stop Mythology at the
  decision level (preservation = "no false certainty"; ask =
  "I have insufficient evidence to act").
- `memory/feedback_sample_classification_is_calibration_not_clearance_amara_goodhart_catch_3_2026_04_28.md`
  — Goodhart catch #3, the substrate evidence for the directive.
- `memory/feedback_speculation_leads_investigation_not_defines_root_cause_aaron_2026_04_28.md`
  — same family; speculation is the inverse of evidence-based
  claim-making.
- `docs/ALIGNMENT.md` (SD-9) — the formal home of the
  three-element discipline.

## External lineage for the directive itself (Tier 2 self-application)

The directive applies to itself. Sources:

- **Karl Popper** (*The Logic of Scientific Discovery*, 1959;
  *Conjectures and Refutations*, 1963) — falsifiability as
  the demarcation of science from non-science.
- **Imre Lakatos** (*The Methodology of Scientific Research
  Programmes*, 1978) — research programmes are evaluated by
  what they predict + survive, not what they merely fit.
- **Wason 1960 / Klayman & Ha 1987** — confirmation bias
  literature.
- **Donella Meadows** (*Thinking in Systems*, 2008) — vague
  framing creates leverage points where unstated assumptions
  drive decisions.

## Pickup for future Otto

When about to make a claim:

1. Classify the tier: factory-local / generalized /
   foundational.
2. Check the threshold: substrate / + lineage / + falsifier.
3. If insufficient evidence at the relevant tier — STOP.
   Either gather more evidence, or downgrade the claim's
   scope to a tier where the available evidence suffices.
4. Never say "the mythology / spirit / vibe of X" without
   substrate. If tempted to, that's the directive firing.

When reading another agent's claim:

1. Ask: what tier? What evidence?
2. If tier-mismatch (claim at tier 3 with tier 1 evidence) —
   surface the gap, don't let the claim stand on vibes.

## Direct Aaron framing

> *"we also stop mythology with human intellucutiual lineage
> research and anchors."*

## Direct Amara naming + canonical form

> *"Stop Mythology: Factory-local claims can use substrate
> evidence. Generalized claims need external lineage. Big
> epistemic claims need SD-9: substrate evidence + external
> lineage + falsifier."*

> *"bullshit detector → stop mythology directive
> vibes → lineage + substrate + falsifier
> poetic truth → Mirror unless Beacon-grounded"*
