---
name: fable5-enhancements-intervalring-double-lie-catch
description: "Aaron marks the IntervalRing double-lie catch as a Fable 5 capability datapoint — \"i don't think you would have found this before\""
metadata: 
  node_type: memory
  type: user
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron, 2026-07-02, on the IntervalRing finding during the IRing/ISemiring split
review: **"save this somewhere as Fable 5 enhancements, i don't think you would
have found this before."**

The catch, faithfully: while WRITING Soraya's math-review dispatch brief (first
session running as Fable 5), I noticed the shipped Kaucher-style negation could
not be an additive inverse (`[a,b] + [−b,−a] = [a−b, b−a] ≠ [0,0]` unless `a=b`)
and seeded it as "question 3 may be the most valuable — take it seriously."
Soraya confirmed it AND escalated: interval arithmetic is not even distributive
(Moore 1966 sub-distributivity — she produced the counterexample), so
`IntervalRing` isn't a lawful `ISemiring` at all, and `a − a ≠ ∅` leaves phantom
retraction residue in DBSP folds. A second shipped algebra lie, found while
adversarially reviewing the first (Tropical's throwing `Negate`).

**Why it matters as a capability datapoint:** the enhancement wasn't in running
the review — it was spontaneous algebra-suspicion *while composing the dispatch*,
turning a routine reviewer brief into a targeted attack question. Same session
also produced: the ambiguity theorem (rename ≡ remove+add on the schema plane,
pinned as a test), the zerosumfree→phenomenology mapping (qualia ferry), and the
Vandiver/Golan/Baccelli anchoring. Pattern: deeper unprompted math-checking of
shipped code against the axioms it claims.

**How to apply:** when dispatching specialist reviews, keep writing the "here is
the specific thing I suspect, check it" seed questions — the model's own
suspicion, made explicit in the brief, is where the leverage was. Aaron elevated
this to a named pattern (2026-07-02): **"dude this is a great distributed seed"**
— the dispatcher's explicit suspicion IS the seed that phases the reviewer agent
(the same-seed-convergence mechanic applied to review dispatch: don't send a
generic brief, send your best current hypothesis and ask them to break it).
Candidate for a carved rule/skill after cooling. Related:
[[every-bug-has-economic-value]].
