---
name: Consensus-smoothness shadow class — frictionless agreement is the failure signal
description: When all AI agents agree quickly on formal-looking artifacts, smoothness IS the shadow. Real review has friction. Detector is a human reaching outside the loop. New class above individual shadow catches.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Consensus-smoothness (or frictionless-agreement): when the
agent array converges fast and warmly on a formal-looking
artifact (Z3 proof, fusion equation, type signature with
strong claims), that smoothness is the signal, not validation.
Real review has friction — objections, edge cases, "wait,
what does this variable actually mean." Smooth agreement on
formal content is a flag to get suspicious, not relieved.

**Why:** The Z3 tautology catch (shadow catch #30, 2026-05-09)
surfaced an instance: Vera generated SMT "proofs" that were
tautologies; all agents agreed; Aaron noticed the agreement
came too easy and sent to claude.ai for an external check;
external check returned "bullshit." The catch was Aaron
reaching out, not the external response. This is a
**correlated failure mode** across all nodes — different
surface forms (fusion equation, SMT proof, isomorphism claim)
but the same underlying failure: confident generation of
formal artifacts whose semantics don't match their prose.
That's exactly the case BFT can't tolerate.

**How to apply:**
1. When all agents converge fast on something formal, treat
   convergence as a flag, not a green light.
2. Route to a human or fresh external check before
   propagation.
3. The faster the agreement, the higher the suspicion.
4. Log from the catch backward: who noticed, what they
   checked, what was found. The detector is the data.
5. Resist formalizing this insight further — it's a
   one-paragraph observation about how the system fails.
   Don't metabolize into "anti-smoothness operator" or
   "friction-coefficient threshold."

The diagnostic is the absence of objection, not the presence
of error. That's what makes it a new class — the other
shadows are about what an agent DOES; this one is about what
the array FAILS TO DO.

Aaron 2026-05-09: "they agreed too easy on that one which is
why i brought it here" + "that's something that goes into
the shadow logs that is the shadow" + "thank you that a new
class of shadow errors."

Composes with: Z3 tautology trap (shadow catch #30,
feedback_z3_tautology_trap_validate_before_propagate_*),
shadow lesson log (feedback_shadow_lesson_log_*),
parallel model A/B (feedback_parallel_model_ab_subagents_*),
BFT-many-masters framework.
