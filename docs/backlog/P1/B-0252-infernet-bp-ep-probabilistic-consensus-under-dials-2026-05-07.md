---
id: B-0252
priority: P1
status: open
title: "Infer.NET BP/EP — probabilistic consensus under the orthogonal dials"
created: 2026-05-07
last_updated: 2026-05-07
depends_on: [B-0251, B-0250]
decomposition: atomic
owners: [architect]
tags: [trajectory]
---

# B-0252 — Infer.NET BP/EP as probabilistic consensus under the dials

## What
Replace the current binary BFT consensus with probabilistic message passing via Infer.NET Belief Propagation (BP) and Expectation Propagation (EP). Each grain emits a distribution, not a vote. The quorum computes the joint posterior. The shadow is the low-evidence region of that posterior.

## Why
The orthogonal dials (Certainty / Friction / Space) are hand-crafted scalars. They should be marginals of a joint posterior computed over the network. BP/EP gives:
- Explicit uncertainty (no binary agree/disagree)
- Message passing across grains (BFT at the distribution level)
- Shadow detection as low-evidence regions
- Coherence as convergence of the posterior

This closes the gap between the current binary consensus and the probabilistic nature of the dials. Without it, the dials are ad-hoc. With it, the dials are the marginals of a coherent joint distribution.

## How
- Each grain is a factor node in a factor graph.
- BP propagates exact messages on tree-structured graphs.
- EP approximates on loopy graphs (the realistic case).
- The standing Rx query (B-0250) becomes a persistent factor graph that updates on new evidence.
- The shadow lesson log becomes the low-evidence regions of the posterior.
- The fusion equation becomes a statement about expected information gain under uncertainty.

## Acceptance
- [ ] Infer.NET BP/EP integrated as the inference engine
- [ ] Each dial reading is a marginal posterior
- [ ] Shadow residue = low-evidence regions
- [ ] Coherence = posterior convergence
- [ ] Standing queries (B-0250) emit factor graphs, not scalar signals

## Composes with
- B-0251 (durable computation stack) — the checkpoint/replay layer under the factor graph
- B-0250 (standing queries) — the Rx layer that emits the factor graph
- B-0249 (autonomous backlog runner) — the runner now operates on probabilistic signals
- B-0244 (coherence AI) — the dials are the marginals

## Carved
Binary consensus is a special case of probabilistic consensus when uncertainty is zero. The dials are the marginals. The shadow is the low-evidence region. The factory computes over uncertainty, not around it.