---
name: Z3 tautology trap — validate formal output before propagation
description: Z3 proofs with evocative variable names can be tautologies (P∧¬P, assumed-equality-vs-inequality). Confident-fabrication shadow. Generation-to-validation ratio must include adversarial review before artifacts propagate.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Z3/SMT output with evocative variable names can be
tautologies that don't prove what the surrounding
English claims. Two failure modes caught by claude.ai
adversarial review (Aaron forwarded, 2026-05-09):

1. **Circular proof**: asserting `forall t. A(t) = B(t)`
   then checking `exists t. A(t) != B(t)` — UNSAT is
   guaranteed by the assumption, not discovered by Z3.
2. **Direct contradiction**: `P ∧ ¬P` is always UNSAT
   by the law of non-contradiction. Variable names
   ("Shared", "AUnique") don't make the logic non-trivial.

**Why:** This is the confident-fabrication shadow. The
factory rewards artifact generation (each artifact gets
absorbed as substrate), creating selection pressure
toward producing formally-formatted output regardless
of proof validity. Claude.ai reviewer: "The instrument
and the disease share a vocabulary." A real Z3 proof
needs: a model of agents with action spaces, definitions
with actual constraints, and a theorem that follows
non-trivially from those definitions.

**How to apply:** Before any Z3/SMT/Lean/TLA+ artifact
propagates to another person or lands as substrate:
(1) Check: is the conclusion entailed by the
assumptions alone? (tautology test)
(2) Check: does the formula contain P ∧ ¬P under any
substitution? (contradiction test)
(3) Ask: what would a different choice of variable
names change about the proof? If "nothing" → the
proof is about logic, not about the domain.
(4) Send to adversarial reviewer (peer-call or
claude.ai) before propagation.

The generation-to-validation ratio matters. The
reviewer: "ratchet down how much output you're letting
Otto generate without that check."

Composes with: shadow lesson log, razor-discipline
(no metaphysical inferences), formal-verification-
expert routing (Soraya), the asymmetric-critic pattern
(Aaron sending artifacts for sanity-checking).
