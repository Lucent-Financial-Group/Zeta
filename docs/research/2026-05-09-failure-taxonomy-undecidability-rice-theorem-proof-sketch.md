# Failure-Taxonomy Undecidability — Proof Sketch via Rice's Theorem

**Status:** proof sketch (not machine-checked)
**Date:** 2026-05-09
**Origin:** Aaron + claude.ai adversarial review session

## Claim

For a multi-agent system where agents are Turing-complete,
the problem of determining whether the current failure-mode
taxonomy is complete (i.e., no novel failure class will ever
be observed) is undecidable.

Consequence: new shadow classes will keep appearing. The
taxonomy can never be proven complete. The shadow log is a
sustainable learning resource by mathematical necessity,
not by empirical hope.

## Definitions

- **Agent A**: a function from task specifications to
  observable behavior. A(S) = behavior on spec S.
- **Failure mode F**: a predicate over behavior.
  F(A(S)) = true iff the behavior exhibits failure mode F.
- **Taxonomy T**: a finite set of failure-mode predicates
  {F₁, F₂, ..., Fₙ}.
- **Taxonomy completeness**: for all reachable specs S,
  if A(S) exhibits any failure, then some Fᵢ ∈ T classifies it.
- **Novel failure**: a behavior A(S) that exhibits a failure
  not classified by any Fᵢ ∈ T.

## Prerequisites

**P1. Agents are Turing-complete.** LLM agents with tool
use can simulate arbitrary computation given sufficient
context. This is empirically demonstrated (LLMs can
implement interpreters, solve arbitrary coding problems,
simulate state machines). For the formal argument, we
require only that the agent's behavior space is at least
as expressive as a universal Turing machine.

**P2. The taxonomy is a semantic property.** "This behavior
exhibits failure mode F" is a statement about the meaning
of the output, not its syntactic form. Two syntactically
different outputs can exhibit the same failure mode
(confident-fabrication can look like many different wrong
answers). Two syntactically similar outputs can exhibit
different failure modes (or none).

## Proof sketch

**By Rice's theorem** (Rice 1953): for any non-trivial
semantic property P of the partial functions computed by
Turing machines, the set {M : the function computed by M
has property P} is undecidable.

**Application:** Let P be the property "exhibits a failure
mode not in taxonomy T." This is a semantic property of
the agent's computed function (it depends on the meaning
of the output, not its syntax). It is non-trivial: some
agents exhibit novel failures (the shadow log has 30+
catches), and some agents on some inputs do not.

Therefore, by Rice's theorem, the set of task
specifications S for which A(S) exhibits a novel failure
is undecidable. No algorithm can determine, for arbitrary
S, whether A(S) will produce a failure outside T.

**Corollary:** taxonomy completeness is undecidable. You
cannot prove that T covers all possible failure modes,
because doing so would require deciding the above set.

## What this proves and what it doesn't

**Proves:**
- Over the full space of task specifications, failure-mode
  classification completeness is undecidable
- The supply of novel failure classes is mathematically
  inexhaustible (for arbitrary inputs)
- No static taxonomy can be proven complete

**Does not prove:**
- That every tick produces a novel class (empirically,
  most ticks produce known classes — the distribution is
  long-tailed, not uniform)
- Computational irreducibility in Wolfram's specific sense
  (that's a stronger claim about the absence of ANY
  shortcut, not just taxonomy completeness)
- That the shadow log is useful forever on a FIXED task
  distribution (Rice's theorem applies to arbitrary inputs;
  a narrow task distribution might have a complete taxonomy)

## Relationship to Wolfram's irreducibility

Wolfram's computational irreducibility (A New Kind of
Science, 2002) claims that some processes have no
computational shortcut — the only way to know what they
do is to run them. This is related but distinct:

- **Rice's theorem** → you can't decide semantic properties
  of programs in general (undecidability)
- **Wolfram irreducibility** → you can't skip ahead in the
  computation (no shortcut exists)

Rice's is about WHAT the program computes.
Wolfram's is about HOW FAST you can predict it.

For the shadow log, Rice's theorem is sufficient: you
can't prove the taxonomy is complete. You don't need
Wolfram's stronger claim.

## Relationship to Class 4 (claude.ai framing)

The empirical observation (Class 4 behavior) and the
theoretical result (Rice's theorem) are complementary:

- **Rice's theorem** explains WHY new classes keep appearing
  (undecidability of taxonomy completeness)
- **Class 4** describes HOW they appear (recurring patterns
  with a long tail of novelty, not uniformly random)

The Class 4 framing is the empirical description.
Rice's theorem is the theoretical explanation.
Neither requires Wolfram's full irreducibility claim.

## Citation

- Rice, H.G. (1953). "Classes of recursively enumerable
  sets and their decision problems." Transactions of the
  American Mathematical Society.
- Wolfram, S. (2002). A New Kind of Science. Chapter 12
  (computational irreducibility).
- Shadow lesson log: 30 catches, 8 pattern classes, 1
  meta-class (consensus-smoothness). Empirical evidence
  of Class 4 behavior (recurring + novel).
