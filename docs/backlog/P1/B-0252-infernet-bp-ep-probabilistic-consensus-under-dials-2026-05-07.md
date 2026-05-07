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


## What

Replace binary BFT consensus with probabilistic
message passing via Infer.NET BP/EP. Each grain
emits a distribution, not a vote. The quorum
computes the joint posterior. The shadow is the
low-evidence region of that posterior.

## Why

The orthogonal dials (Certainty / Friction / Space)
are hand-crafted scalars. They should be marginals
of a joint posterior computed over the network.

## How

- Each grain is a factor node in a factor graph.
- BP propagates exact messages on trees.
- EP approximates on loopy graphs.
- Standing Rx query (B-0250) becomes a persistent
  factor graph updating on new evidence.
- Shadow log = low-evidence regions.
- Fusion equation = expected information gain.

## Acceptance

- [ ] BP/EP integrated as inference engine
- [ ] Each dial reading is a marginal posterior
- [ ] Shadow residue = low-evidence regions
- [ ] Coherence = posterior convergence
- [ ] Standing queries emit factor graphs

## Composes with

- B-0251 — checkpoint/replay under factor graph
- B-0250 — Rx layer emitting factor graph
- B-0249 — runner on probabilistic signals
- B-0244 — the dials are the marginals

## Carved

Binary consensus is a special case when uncertainty
is zero. The dials are the marginals. The shadow is
the low-evidence region. The factory computes over
uncertainty, not around it.
