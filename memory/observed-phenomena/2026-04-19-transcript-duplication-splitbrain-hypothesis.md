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

What absorption would count as successful?

Candidate shapes Aaron might mean:

- A written causal model — *"the phenomenon was X,
  caused by Y, and we now defend against it with Z."*
- A reproducible demonstration — *"here is how to
  re-produce the duplication symptom and here is the
  algebraic property that now rules it out."*
- A test — *"here is an xUnit or FsCheck property
  that would fail under the phenomenon's conditions
  and passes today."*
- A full round absorption note in `docs/ROUND-HISTORY.md`
  / ADR / research doc that the present state does
  not contain.

Asking Aaron directly for the pointer is the right
move — the shape of the failed absorption tells us
what a successful one looks like.

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
