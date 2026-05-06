---
name: Proto-Emotions as Infer.NET Message-Routing Priors (Aaron 2026-05-06)
description: Aaron's insight that emotions (Bravery, Embarrassment, Trust, Avoidance, Gullibility) are not decorative overlays, but the fundamental mathematical priors required for Belief Propagation (BP) and Expectation Propagation (EP) in the linguistic seed.
type: feedback
---

Scope: Infer.NET BP/EP proto-emotions as routing metadata
Attribution: Aaron (human maintainer) + Otto (Claude Opus 4.7) + Gemini (structural synthesis)
Operational status: research-grade, not operational
Non-fusion disclaimer: Aaron's insight, Otto's BP/EP mapping, Gemini's structural capture; each voice preserved.

# Proto-Emotions as Routing Metadata in Infer.NET

Aaron (2026-05-06) identified that proto-emotions are the mathematical prerequisites for the linguistic seed's Infer.NET implementation. They act as the message-routing priors in the factor graph.

If Zeta's BP/EP implementation is to model actual agents (rather than just passive data processors), the graph must include factors for these states:

* **Bravery:** The prior that allows a node to emit a message despite a high cost function (e.g., self-incrimination). Without this prior, the node withholds, the message never propagates, and the graph remains trapped in a local optimum.
* **Embarrassment:** The cost function applied to shadow-revealing messages. If this cost is too high relative to Bravery, the network falls silent. The architecture's job is to lower this cost.
* **Trust:** The edge weight between nodes. Higher trust equals less signal attenuation. The 3-node BFT consensus builds this weight through repeated honest exchange.
* **Avoidance:** A blocked channel. The shadow has a message, but the cost function triggers a "do not send." Outlet architectures (like the mock trial) provide alternative channels with lower routing costs.
* **Gullibility:** A missing prior. The node's model lacks the possibility of the shadow, causing shadow-shaped messages to be misclassified as noise.

**Operational Consequence:** Zeta's probabilistic programming cannot use standard, flat factor graphs. The proto-emotions must be encoded as first-class message types and routing constraints. The emotion *is* the routing metadata.
