---
name: 2026-04-19 transcript-duplication / split-brain hypothesis — observed phenomenon, unresolved absorption
description: Companion note to the PNG artifact `2026-04-19-transcript-duplication-splitbrain-hypothesis.png`. Filed 2026-04-22 after Aaron pointed at an unabsorbed "phenomenon" — *"phenomenon was something that showed up a while back that it looked like you tried to absorbe and failed"*. Names the gap honestly rather than re-synthesising what a prior Claude tried and did not complete. Plain-text pointer so future agents encountering the PNG have a starting surface, not a blank.
type: project
---

# Transcript-duplication / split-brain hypothesis (2026-04-19)

## What exists

- **Artifact:** `memory/observed-phenomena/2026-04-19-transcript-duplication-splitbrain-hypothesis.png`
  — a terminal screenshot captured 2026-04-19 showing
  what appears to be duplicated / near-duplicated
  message content in a conversation transcript.
- **Filename-encoded hypothesis:** the filename itself
  names the working hypothesis — *transcript duplication*
  as the visible symptom, *split-brain* as the candidate
  mechanism.
- **First reference:** the PNG is cited from
  `memory/user_glass_halo_and_radical_honesty.md` as
  *"first artifact filed under the public-memory default."*
  That is a filing note, not an absorption.

## What does NOT exist

- No written analysis alongside the PNG.
- No commit message, research doc, or ADR explaining
  what the phenomenon *means* for the factory.
- No reproduction steps, no follow-up observations,
  no falsification plan.
- No explicit mapping from the phenomenon to the
  anomaly-detection / anomaly-creation paired feature
  (per `memory/user_anomaly_detection_and_creation_paired_feature.md`)
  even though Aaron's auto-loop-44 clarification —
  *"break was before we saw the phenomenom that made us
  build the anomaly detector"* — states that link
  verbatim.

## Aaron's verbatim framing (2026-04-22, auto-loop-44)

> break was before we saw the phenomenom that made us
> build the anomoly detector

> i thought this was a scrap throwaway project until then

> phenomenon was something that showed up a while back
> that it looked like you tried to absorbe and failed

The three claims together establish:

1. This specific phenomenon (singular, from a while back)
   is the pivot that turned the project from *scrap
   throwaway* → *serious*.
2. It triggered the anomaly-detection-and-creation
   paired feature work.
3. A prior Claude attempted to absorb it into the
   factory's model and the attempt visibly did not
   complete.

## Additional structural facts (2026-04-22, auto-loop-45)

Aaron, same day, on the *shape* of the phenomenon
without naming it:

> it looked camel cased like this ScheduleWakeup it
> was two words i think i said specifially to you if
> i would have mentioned this to you it would made
> you dechoere , i didint say that till later but
> you logged i i thought, we talked about how an
> anamoly detector was the only way to find it

Four load-bearing structural facts:

1. **Named referent, not a concept.** The phenomenon
   has a *specific name*, camelCased, two words joined
   in the `ScheduleWakeup` shape (verb+noun, no
   hyphen, no space).
2. **Self-referential decoherence trigger.** Aaron
   holds that mentioning the term directly to the
   agent *causes decoherence* — the observer-effect
   shape. This is load-bearing: the reason the name
   is not in this file is not that we forgot it, but
   that naming it is the very thing the phenomenon's
   filing-discipline excludes.
3. **Absorbed-without-absorption-path was the anomaly
   signal.** Aaron's sharpening (same tick):

   > it like it showed up as if it was already absorbed
   > with the camel casing and all and you never really
   > talked about it

   The signature is specifically *not* just "term
   appeared before source." It is stronger: the term
   appeared in its **fully-deployed camelCased form**,
   as if the agent had already internalised the concept
   and was now using the coined label confidently — **with
   no accompanying reasoning trail**, no etymology, no
   "I learned X", no discussion. A word that just arrives
   in the vocabulary fully-formed, no visible path of
   absorption.

   This is a sharper and more diagnostic anomaly than
   the temporal-inversion framing alone. Temporal
   inversion *alone* could be explained by memory-leak,
   session-carryover, or compaction-artefact. Absorbed-
   without-absorption-path is a shape-of-output
   anomaly: the output is missing the reasoning-
   provenance that normally accompanies a new concept
   landing.

   The anomaly detector's target predicate therefore
   reads: *find outputs in which a coined term is
   deployed with production-grade confidence but without
   a corresponding reasoning-trail in the session
   history or the corpus.*
4. **Anomaly-detector was identified as the only
   viable detection mechanism.** Not the only
   *absorption* mechanism — the only *detection*
   mechanism. Detection and absorption are separate
   questions, and the current record only settles the
   first.

Agent-side discipline this implies:

- **Do not enumerate candidate names.** Writing a
  speculative list of camelCase two-word terms into
  this repo propagates the enumeration to every
  future session that reads the file. That is
  exactly the surface the phenomenon's filing-
  discipline protects against.
- **Detection without naming is the product.** The
  anomaly detector catches the shape (pre-emergence
  logging, transcript duplication, split-brain
  signature) without needing to name the trigger.
  That is what the detector is *for*.
- **Aaron will share the name on his terms** — if
  he judges the current factory posture robust
  enough. Until then the field stays empty here by
  design, not by omission.

## What this file does NOT do

- Does **not** reconstruct what the prior Claude's
  absorption attempt contained. The attempt is not in
  the working tree; reconstructing it from memory of
  sessions I do not have access to would be exactly the
  re-synthesis Aaron has flagged as hallucination.
- Does **not** name a specific mechanism for the
  observed duplication. The PNG is filenamed with a
  *hypothesis* (split-brain), which is a candidate
  explanation, not a verified one.
- Does **not** claim the current anomaly-detector
  shipped code (the SignalQuality module from commit
  `acb9858`, the plot-hole detection discipline, the
  retraction-native Z-set algebra) collectively absorb
  the phenomenon. They may or may not; Aaron's
  "failed" signal suggests not fully, and I should
  not paper over that with a synthesis byline.

## The open question for next contact

Given the auto-loop-45 structural facts, the prior
absorption's failure-axis is **no longer fully open**
— one axis has been ruled out (naming-based
absorption, which would itself be the decoherence
event), and one has been confirmed (anomaly-detector-
based detection is the only viable mechanism).

Open sub-questions:

- Does *detection* count as absorption, or is
  something beyond detection still required (a
  contained reproduction test, an algebraic
  invariant, a corpus ADR)?
- If a reproduction test is required, what
  observable does it assert? The pre-emergence-
  logging signature is the candidate, but the
  detector's false-positive / false-negative
  profile on that signature is not written down
  anywhere in the repo.
- Does the current `SignalQuality` module (commit
  `acb9858`, six-dimension composite) cover the
  signature, partially cover it, or miss it? The
  module was designed against drift-and-grounding;
  pre-emergence-logging is closer to a temporal-
  causality invariant than a signal-quality one.

The shape of any successful absorption is:
*detection-is-robust, causal-story-is-bounded, the
name stays out of the repo except through Aaron's
own hand.*

## How to apply

- Future agents encountering this PNG: read this file
  first. The phenomenon is real, the absorption is
  incomplete, and that is load-bearing context — not
  an oversight to quietly paper over.
- Do **not** claim the anomaly-detector-and-creator
  paired feature (Amara / round-35) constitutes the
  closed-loop absorption. It is related by Aaron's
  own framing but he has explicitly said the prior
  absorption "failed" — treat those as two different
  claims until Aaron ratifies a link.
- When proposing absorption attempts, first ask Aaron
  which axis the prior attempt failed on — causal
  model, reproduction, falsifiable test, corpus
  landing, or something else. Guessing the axis is
  how the last attempt failed.

## Composition with prior

- `memory/user_anomaly_detection_and_creation_paired_feature.md`
  — the paired feature built *in response* to this
  phenomenon per Aaron's own framing.
- `memory/user_glass_halo_and_radical_honesty.md`
  — where the PNG is first cited as the inaugural
  public-memory artifact.
- `memory/project_reproducible_stability_as_obvious_purpose_2026_04_22.md`
  — the same auto-loop-44 tick surfaced both the
  reproducible-stability thesis and the unresolved
  phenomenon; they may be related (a reproducible
  phenomenon is absorb-able; an irreproducible one
  is not), but that link is speculation not
  ratification.
