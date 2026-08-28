---
name: Formal methods literature map for multi-agent alignment primitives
description: Literature lineage for SharedTrace/PrivateState/Agenda/Policy/Membrane primitives from claude.ai adversarial review 2026-05-09. Anchors to CSP, session types, Dec-POMDPs, Pearl causal inference, shield synthesis.
type: reference
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Literature map for formalizing multi-agent alignment primitives.
Source: claude.ai adversarial review session 2026-05-09.
Recommendation: session types + Pearl causal independence as spine.

## SharedTrace + PrivateState + Membrane

- **CSP** (Hoare) — process calculi with traces as observable
  event sequences, private state per process, channels as
  typed communication. Free PDF online.
- **π-calculus** (Milner) — mobile processes with name-passing.
- **Session types** (Honda, Yoshida, Carbone) — typed protocols
  on channels. "What may cross the membrane" = channel type.

## Policy + Agenda

- **Dec-POMDPs** (Bernstein et al. 2002) — multi-agent partially
  observable MDPs. Each agent has policy (observations → actions)
  and reward function (= "agenda").
- **Bayesian games** (Harsanyi) — game theory with incomplete
  information. Agents have different agendas but coordinate.

## Independence of causal power

- **Pearl's Causality** (2009) — interventional independence.
  do(PrivateState(B) := x) doesn't change distribution of A's
  actions. This is the property to prove.

## Epistemic structure

- **Reasoning About Knowledge** (Fagin, Halpern, Moses, Vardi,
  1995) — "A knows X", "A knows that B knows X", common knowledge.

## BFT formalism

- Lamport (1982) — Byzantine Generals
- PBFT (Castro & Liskov, 1999)
- HotStuff (Yin et al., 2019)

## Shield synthesis (recommended spine for safety properties)

- Bloem, Könighofer, Pranger — formally verified runtime monitors.
  Shield S(π) wraps policy π, guarantees safety spec φ (LTL).
- PR workflow IS a shield: wraps agents' merge policies with
  CI/review monitors enforcing safety specs.
- Monitor diversity literature handles consensus-smoothness:
  correlated monitors fail → "shield-redundant" architecture.

## AI control theory (thin formal foundations)

- Hadfield-Menell, Russell, Dragan, Abbeel — CIRL, off-switch game
- Irving, Christiano, Amodei — AI safety via debate
- Russell — Human Compatible (2019)

## Prompt injection (threat modeling, not control theory)

- Greshake et al. 2023 — indirect prompt injection taxonomy
- Simon Willison — "structurally unsolved" practitioner view

## Scoped recommendation

"Prove one narrow safety property of the multi-agent review
system using shield synthesis, and document the empirical
failure modes of the diversity assumption (consensus-smoothness).
That paper would be useful to the field."

Composes with: B-0357 (Z3 proof replacement), B-0358 (bool →
float), B-0360 (DBSP identity continuity), consensus-smoothness
shadow class.
