# Thousand Brains Capability-Matrix Source Notes

> **Status:** Source inventory for a bounded comparison only. The sources describe a proposed biological and software architecture; they do not establish that Zeta implements cortical columns, reproduces human cognition, or has general learning capability.

## Recommendation

**Use a capability matrix, not an analogy score.** Zeta may compare individually testable interfaces—typed evidence, reference-frame transforms, lateral agreement, and next-observation queries—with the functional interfaces named in the Thousand Brains sources. Each row must record whether Zeta has an implementation, a finite test, an external benchmark, or no corresponding artifact.

| Functional item in source | Source status | Closest bounded Zeta surface | Status that may be claimed |
| --- | --- | --- | --- |
| Feature plus location input | Proposed model element and simulation input | `ReferenceFrameFactorHeterarchy.ColumnMessage` combines object evidence, a 3-D Gaussian observed position, and a pose | Typed finite data shape only |
| Frame transform | Proposed/software geometry mechanism | `Cl3` rotor and `ReferenceFrameFactorHeterarchy` covariance transport | Finite transform laws and refusal controls |
| Multiple partial observations with lateral agreement | Proposed column interaction and software voting mechanism | RFFH conflict-retaining, domain-separated evidence routing | Bounded evidence admission/query topology only |
| Movement-conditioned next observation | Proposed sensorimotor mechanism | No directly corresponding movement-to-next-sensory model | **Absent** |
| Object learning from feature-location sequences | Proposed/simulated learning mechanism | No matched learning module or benchmark result | **Absent** |
| Transfer learning across tasks | Explicitly identified as absent in the analyzed presentation | No Zeta result yet; gSCAN is a candidate measurement | **Unmeasured** |

## Source findings that constrain the comparison

The Numenta companion describes the Thousand Brains Theory as a **proposal** that every part of the neocortex learns complete models through movement, with many models operating in parallel rather than a single hierarchy.[1] The 2024 project white paper likewise presents an ongoing research effort and an early sensorimotor system, centered on semi-independent learning modules, spatially structured reference frames, movement, and hierarchical/non-hierarchical messaging.[2]

The primary Jeff Hawkins presentation analyzed for this note describes reference frames, feature-location pairing, path integration, and inter-column voting as architecture concepts, while also enumerating limitations in earlier simulation work: orientation was not represented, distal vision was not handled, voting omitted orientation and object-relative location, goal-directed motor generation was absent, and transfer learning was absent.[3] These limitations are constructive requirements for a capability matrix: they prevent a finite pose/evidence implementation from being mislabeled as a sensorimotor column model.

The 2017 hypothesis-and-theory paper explicitly says that a column model combines sensory input with object-relative location, proposes lateral connections to support faster inference, and presents simulations; it also notes that the detailed function of columnar organization remains unclear and that function assignment is controversial.[4] The source supports an interface comparison, not a biological identity claim.

## References

[1] [Numenta, "Companion paper to A Framework for Intelligence and Cortical Function Based on Grid Cells in the Neocortex" (2018)](https://www.numenta.com/resources/research-publications/papers/thousand-brains-theory-of-intelligence-companion-paper/)

[2] [Clay, Leadholm, and Hawkins, "The Thousand Brains Project: A New Paradigm for Sensorimotor Intelligence" (2024)](https://arxiv.org/abs/2412.18354)

[3] [Jeff Hawkins, "Jeff Hawkins on Object Modeling in the Thousand Brains Theory" (2021 video)](https://www.youtube.com/watch?v=p_KRsF-ncJQ)

[4] [Hawkins, Ahmad, and Cui, "A Theory of How Columns in the Neocortex Enable Learning the Structure of the World" (2017)](https://doi.org/10.3389/fncir.2017.00081)
