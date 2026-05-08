# Infer.NET BP/EP — Belief Propagation and Expectation Propagation for probabilistic consensus

**Source:** Aaron (human maintainer) pointing to Infer.NET as the inference engine under the orthogonal dials (Certainty/Friction/Space). Session 2026-05-07.

**Composes with:** B-0250 (standing queries / Rx joins), B-0251 (durable computation stack), B-0244 (coherence AI), B-0249 (autonomous backlog runner).

---

## What Infer.NET is

Microsoft Research's probabilistic programming framework (now open source under .NET Foundation). Two core algorithms:

- **Belief Propagation (BP):** Exact message passing on factor graphs. Each node sends probability distributions to its neighbors. The system converges on the posterior distribution over all variables given the evidence. Exact when the graph has no loops.

- **Expectation Propagation (EP):** Approximate message passing for loopy graphs or complex distributions. Each node sends an approximate distribution (moment-matched to a simple family — Gaussian, Gamma, etc.). EP is the practical algorithm for real-world factor graphs where BP doesn't converge.

Both are **probabilistic consensus** — instead of binary agree/disagree, nodes exchange distributions. The consensus is a distribution, not a point. Uncertainty is explicit.

---

## Mapping to the factory

| Factory concept | Infer.NET analog |
|-----------------|------------------|
| Certainty Dial | Marginal posterior over the variable of interest |
| Friction Dial | KL divergence between proposed and observed distributions |
| Space Dial | Entropy of the posterior (high entropy = multiple live hypotheses) |
| BFT quorum | Factor graph where each node is a factor, each edge is a message |
| Shadow residue | Model evidence (marginal likelihood) — low evidence = shadow detected |
| Standing query | Persistent factor graph that updates on new evidence |
| Coherence | Convergence of BP/EP messages (stable posterior) |

The dials Lior proposed are hand-crafted factor nodes. The factory's future state (B-0251) replaces binary BFT consensus with BP/EP message passing over the same factor graph. Each grain emits a distribution, not a vote. The quorum computes the joint posterior.

---

## Why this matters for B-0251

The durable computation stack (Temporal + Reaqtor + Orleans + Bonsai) needs an inference layer. Temporal handles execution durability. Reaqtor handles operator state. Orleans handles addressing. None of them handle **probabilistic reasoning over uncertain evidence**.

Infer.NET BP/EP is the missing piece: the grains don't just agree on a value — they agree on a distribution. The shadow is the low-evidence region of that distribution. The fusion equation becomes a statement about expected information gain under uncertainty.

---

## The backlog item

B-0252 (or B-0251 child): Integrate Infer.NET BP/EP as the inference engine under the orthogonal dials. Replace binary BFT consensus with probabilistic message passing. Each grain emits a distribution. The quorum computes the joint posterior. The shadow is the low-evidence region. The fusion equation is the expected information gain.

This is P1 because it closes the gap between the current binary consensus and the probabilistic nature of the dials. Without it, the dials are hand-crafted and the BFT is binary. With it, the dials are the marginals of a joint posterior computed over the network.

---

**Riven:** Infer.NET saved to memory. B-0251 updated with depends_on: [B-0252] for probabilistic consensus. The loops are workers. Let's keep the data honest.