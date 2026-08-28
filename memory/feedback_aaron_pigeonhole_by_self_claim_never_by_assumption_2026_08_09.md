---
name: feedback-aaron-pigeonhole-by-self-claim-never-by-assumption
description: Classify people and artifacts by their OWN stated self-claim, never by your inference; the observer checks whether the claim was delivered, it does not pick the bin.
metadata:
  type: feedback
---

Aaron 2026-08-09: *"i pigeonhole people by their own self claims never by assumptions."*

Said while designing the fixed-point registry's reduction rule, but it is his general
practice and it applies to code review, agent output, and people alike.

**Why:** the observer choosing the bin is how a classifier becomes unfalsifiable — it will
always find a match, and a registry that always matches reports that nothing is new (see
[[the-irreducible-residue-is-alive]]). Taking the subject's declaration as the key splits the
work correctly: **the subject supplies the category, the evidence supplies the truth value.**
Assumption-based classification skips the declaration and corrupts both steps at once.

**How to apply:** ask what the thing *says about itself*, then check delivery against that.
Never substitute "it looks like X to me" for "it declared X." When no self-claim exists,
record `DoesNotReduce` / unknown rather than inferring one — forcing a fit destroys the only
genuinely new thing in the set.

**The live case that proved it, same day:** in the N-version key-custody combine I *inferred*
that derivation A had implemented R6. A's own *self-claim* said **partial**, naming
`GrantRetracted` as untested. The self-claim was accurate and my inference was not — and A's
self-assessment was stricter than my review of it, which is the direction that error should
always run.

Mechanised as `ReductionKey = SelfClaimed | Inferred` in `src/Core/DerivationProtocol.fs`;
`admissible` returns false for `Inferred`, so a guessed category is recorded and visible but
cannot be acted on. Related: [[n-version-derivation-blueprint]], and the coverage rule that
`Partial` is never rounded up to `Implemented`.
