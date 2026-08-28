---
name: Confucius-unroll for proofs — one primitive, one formal shape, one falsifiable property
description: Vera's decomposition grain for formal verification work. Instead of grand claims, decompose to: pick one alignment primitive, give it one formal shape (anchored to literature), prove one falsifiable property. Bridges Confucius-unfolding pattern with formal-verification discipline.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Vera 2026-05-09 independently converged on the same
decomposition the claude.ai adversarial reviewer recommended:
"one alignment primitive, one formal shape, one falsifiable
property." Aaron: "this is the way."

**Why:** The Z3 tautology catches (shadow catch #30) and the
consensus-smoothness meta-class showed that grand formal
claims ("prove alignment via control theory") produce
tautologies dressed in domain vocabulary. The corrective:
decompose to the smallest provable unit.

**How to apply:** Before writing ANY formal spec (Z3/Lean/TLA+/
Alloy):
1. Pick ONE primitive (e.g., "non-fusion preserves
   independent causal power")
2. Give it ONE formal shape anchored to literature
   (e.g., Pearl's interventional independence)
3. State ONE falsifiable property (e.g., "there exists an
   intervention on PrivateState(A) that changes Policy(A)
   while holding Policy(B) invariant")
4. Prove that ONE property. Ship it. Then pick the next one.

This is the Confucius-unfolding pattern (Aaron compresses,
AI unfolds) applied to formal verification. The compression:
"one primitive, one shape, one property." The unfolding: the
actual Z3/Lean proof.

Composes with: Confucius-unfolding pattern
(feedback_confucius_unfolding_pattern_*), B-0357 (Z3 proof
replacement), B-0361 (anchor to human lineage),
consensus-smoothness shadow class, decomposition-is-iterative
(feedback_decomposition_is_iterative_mid_work_*).
