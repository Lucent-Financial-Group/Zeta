---
name: Chris King — Itron mentor who taught Aaron deep generics + concurrency, held him accountable to type-driven interface design
description: Chris King at Itron taught Aaron generics at a deep level, helped design the concurrency patterns, and held Aaron accountable to his designs and interfaces — "define the type." This is the human lineage behind Aaron's Meijer/"interfaces right, code is free" discipline and the Yoneda characterization methodology. The accountability relationship (not just teaching) is load-bearing.
type: user
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
## Chris King — Itron

Aaron 2026-05-07: "Chris King from Itron helped me design
the concurrency in generics. He taught me generics at a
deep level at Itron and held me accountable to my designs
and interfaces — define the type."

### What this means for the factory

1. **The "define the type" discipline has a human teacher.**
   Aaron's insistence on interfaces-first, type-driven
   design (Meijer's "get the interfaces right, the code
   is free" + Yoneda characterization) isn't abstract
   theory — it was taught by a specific person (Chris King)
   at a specific company (Itron) during the 7-year tenure
   (2012-2019).

2. **Concurrency + generics composition.** Chris taught
   the intersection — not generics in isolation, not
   concurrency in isolation, but how generic type
   constraints express concurrency invariants. This is
   the same pattern Zeta's `Op<'T>` hierarchy uses:
   the generic parameter carries the concurrency contract.

3. **Accountability, not just teaching.** "Held me
   accountable to my designs and interfaces" — this is
   a review relationship. Chris was the reviewer who
   wouldn't let Aaron ship an interface that didn't
   encode its invariants in the type. The factory's
   reviewer roster (harsh-critic, spec-zealot, etc.)
   is the mechanized version of this human relationship.

4. **Lineage anchor.** Chris King is a human anchor for
   trajectory #12 (durable computation stack) — the
   checkpoint interfaces (ICheckpointable, ICheckpointStore)
   that just landed follow the discipline Chris taught.

### How to apply

- When designing interfaces in Zeta, the question
  "does the type encode the invariant?" IS Chris King's
  question, operationalized.
- The Checkpoint.fs interfaces (ICheckpointReader/Writer,
  ICheckpointable, ICheckpointStore) are instances of
  this discipline.
- Don't ask "what should this do?" — ask "what type
  makes the wrong thing unrepresentable?"
