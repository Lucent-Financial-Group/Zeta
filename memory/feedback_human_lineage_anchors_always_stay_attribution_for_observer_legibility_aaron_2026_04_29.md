---
name: Human-lineage anchors always stay — as attribution for observer legibility, not as engineering proof (Aaron 2026-04-29)
description: Aaron 2026-04-29 — *"The human lineage link is always important like the The Conway-Kochen parity intuition we might have engineering on our side like Amara says but we still need to link to human lineage so external observerse have a frame of references without fully understading our engineering"* — when an engineering claim stands without the metaphor, KEEP the metaphor as "this is the human-lineage analog of our pattern" attribution. Do NOT remove human-lineage anchors just because the engineering claim doesn't need them for proof. External observers (people who don't share our engineering vocabulary) need a recognizable reference frame to read our substrate. The metaphor is observability infrastructure, not proof scaffolding. Composes with the Beacon-promotion pattern (load-bearing rules earn external anchors).
type: feedback
---

# Human-lineage anchors always stay — for observer legibility

## Source

Aaron 2026-04-29 (mid-tick correction during autonomous-loop
tick 06:49Z), reversing one direction of Amara's round-4
push to drop Conway-Kochen from prose:

> *"The human lineage link is always important like the The
> Conway-Kochen parity intuition we might have engineering on
> our side like Amara says but we still need to link to human
> lineage so external observerse have a frame of references
> without fully understading our engineering"*

Typos preserved per
`memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md`.

## What this names

There are TWO failure modes around metaphor + engineering:

1. **Using metaphors as engineering proof.** Bad. The
   metaphor doesn't prove the claim; the substrate does.
   Amara was right to push back on this in round-4.

2. **Removing human-lineage anchors entirely because the
   engineering claim is self-sufficient.** Also bad. External
   observers (people without our vocabulary) lose their
   reference frame. Aaron's correction surfaces this second
   failure mode.

The two failure modes compose:

```text
Cite the lineage, do not dress engineering claims with it.
```

Or equivalently:

```text
Engineering claims must stand on substrate.
But the substrate must be readable by people without our
engineering vocabulary.
Human-lineage anchors are the bridge.
```

## The rule (load-bearing)

```text
Human-lineage anchors stay in research notes + chat
commentary + memory files as ATTRIBUTED external references
for observer legibility.

Do NOT remove a human-lineage anchor just because the
engineering claim is self-sufficient — the anchor is
observability infrastructure for external readers.

Do NOT use a human-lineage anchor as engineering proof —
the metaphor is a frame of reference, not a derivation.

Examples of acceptable anchors:
  - Conway-Kochen parity intuition (for "two scaffolded
    loops can converge")
  - Goodhart's law (for "metrics that become targets")
  - Campbell's law (for measurement perversion under
    pressure)
  - Free Will Theorem (for choice/parity arguments)
  - DBSP / Z-set algebra (for retraction-native semantics)
  - Lattice theory (for evidence ordering)
  - Git internals reachability (for PR-liveness vs merge
    state)

Each anchor is named, attributed, AND tied to the engineering
claim it accompanies. The reader can verify the lineage
externally OR read the engineering directly; both paths work.
```

## How to apply

When writing research notes, memory files, tick shards, or
PR descriptions:

1. **State the engineering claim** in operational terms,
   provable from substrate (code, CI logs, git state, diff,
   measurable evidence).

2. **Cite the human-lineage anchor**, if one exists, as a
   recognizable external reference frame:
   ```markdown
   This pattern is the engineering analog of the
   <Anchor Name> from <field>: <one-sentence explanation>.
   ```

3. **Do not** let the anchor *carry* the engineering claim.
   The substrate carries the claim; the anchor adds
   readability for observers without our vocabulary.

4. **Do not** strip the anchor in the name of "engineering
   purity." External observers — present + future, human +
   AI peer — depend on these anchors to enter the substrate
   without first absorbing factory-internal jargon.

## What this rule does NOT mean

- Does not mean every engineering claim needs a metaphor.
  Many claims (CI failures, lint pseudocode, file-naming
  conventions) are best left in operational terms with no
  human-lineage anchor at all.

- Does not mean the metaphor proves the claim. Per Amara's
  round-4 push: when the metaphor is doing the proving,
  delete it. When the metaphor is doing the framing for an
  observer, keep it.

- Does not mean every observer needs the anchor. People
  with our engineering vocabulary can read the substrate
  directly. The anchor is for observers WITHOUT shared
  vocabulary.

- Does not mean any metaphor is acceptable. Anchors that
  overclaim ("this PROVES our claim") get rejected; anchors
  that frame ("this is the human-lineage analog of our
  pattern") get kept.

## Composes with

- `memory/feedback_beacon_promotion_load_bearing_rules_earn_external_anchors_aaron_amara_2026_04_28.md`
  — load-bearing rules earn external anchors when they're
  correct. This rule is the rendering-side specification:
  once an anchor IS earned, it stays in the prose for
  observability.
- `memory/feedback_otto_340_language_is_the_substance_of_ai_cognition_ontological_closure_beneath_otto_339_mechanism_2026_04_25.md`
  — language IS substrate; word choice shifts weights.
  Anchor naming is part of the substrate-rendering layer.
- `memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md`
  — Aaron's correction is preserved verbatim above per the
  channel rule.
- The 2026-04-29 round-4 absorb at
  `docs/research/multi-ai-feedback-2026-04-29-round4-amara-on-tick-0637Z-pr-818.md`
  — where this correction lands operationally; updates the
  round-4 §A.3 framing.
- Otto-339 / Otto-340 — words-shift-weights + substrate-IS-
  identity. The metaphor in prose is part of the substrate
  the next reader (human or AI) will absorb.

## Distilled keepers

```text
Cite the lineage, do not dress engineering claims with it.
```

```text
Human-lineage anchors are observability infrastructure,
not proof scaffolding.
```

```text
Aaron 2026-04-29:
  "we still need to link to human lineage so external
   observerse have a frame of references without fully
   understading our engineering"
```
