# Thousand Brains, Factor Heterarchies, and Geometric Reference Frames: Claim Matrix

**Author:** Manus AI
**Date:** 2026-09-01
**Status:** Source-grounded boundary plus measured finite RFFH implementation
**Key recommendation:** Use the measured **reference-frame factor heterarchy** as a typed inference layer and benchmark foundation. It now carries object-plus-pose hypotheses through `FactorGraph` and `Cl3`, but it still does **not** learn object models, reproduce a cortical column, support every neocortical capability, ground English generally, or derive meaning from the Four Color Theorem.

## 1. Terminology Verdict

The user remembered an older term for “a DAG of Bayesian networks” and explicitly did **not** recognize GMDH, cascade-correlation, sum-product networks, randomly wired networks, object-oriented Bayesian networks, multiply sectioned Bayesian networks, probabilistic relational models, multi-entity Bayesian networks, or deep belief networks as that term.[1] The historical name therefore remains **unresolved**. The best current Thousand Brains term is **heterarchy**: Hawkins, Leadholm, and Clay combine hierarchical parent-child relations with lateral, cross-modal, cortico-thalamic, and motor connections.[2]

The unresolved historical term does not block the current engineering vocabulary. Zeta’s implemented inference substrate is a **composable Bayesian factor graph**, while **heterarchy** describes the mixed parent-child and lateral module topology. GMDH remains useful prior art for structure search and model selection, but it is explicitly not promoted as the user’s remembered name. These layers remain separate in code and evidence.

> “We believe that neocortical organization is best described as a heterarchy rather than a hierarchy.” — Hawkins, Leadholm, and Clay.[2]

## 2. What Thousand Brains Actually Establishes

The central 2019 papers are explicitly hypothesis-and-theory papers. They propose grid-like location representations in every cortical column, object-centric reference frames, and multiple columns learning parallel models.[3] [4] The more recent Monty work supplies an engineering implementation and quantitative 3-D object-recognition evidence, but its demonstrated scope remains narrower than the project’s long-term capability list.[5] [6]

> “How the neocortex works is a mystery. In this paper we propose a novel framework for understanding its function.” — Hawkins et al.[3]

> “While Monty is still in a nascent stage of development, these findings support thousand-brains systems as a powerful and promising new approach to AI.” — Leadholm et al.[6]

| Capability or claim | Best current status | Zeta implementation criterion | Decisive falsifier or boundary |
|---|---|---|---|
| Repeated semi-independent learning modules | Implemented in Monty; biologically inspired | Two modules can maintain distinct posteriors and communicate through a typed protocol | Shared hidden state makes “independent modules” vacuous |
| Object identity plus pose hypotheses | Implemented in Monty’s 3-D task | Message contains object key, pose, covariance/precision, evidence provenance, and abstention state | Dropping pose or uncertainty leaves the same verdict |
| Object-centric reference frames | Implemented as explicit 3-D graph models in current Monty | Coordinate-change test preserves physical predictions | Results change under a passive frame change |
| Sensorimotor path integration | Implemented in Monty and the 2019 model | Pose transition composes action with prior pose and propagates uncertainty | Closed motion loop fails to return within declared tolerance |
| Multiple-module voting | Implemented in Monty’s benchmark | Product/factor update combines independently produced likelihoods after pose alignment | Duplicating one module changes evidence as if it were independent |
| Ambiguous unions of hypotheses | Implemented in the 2019 model | Competing hypotheses remain explicit until evidence separates them | Early argmax silently erases alternatives |
| Rapid and continual learning | Reported for Monty’s YCB benchmark | Must be measured on a declared Zeta training stream with held-out recall | No Zeta claim until a learning rule and benchmark exist |
| Active, model-based sensing | Implemented in Monty’s object task | Action policy chooses an observation expected to distinguish live hypotheses | Random action performs equivalently under a powered benchmark |
| Compositional parent-child objects | TBT 2.0 proposal, not a completed general result | Parent factor relates whole child objects by explicit pose transforms | Composition succeeds when relative transforms are scrambled |
| Egocentric-to-allocentric transform | TBT 2.0 thalamic proposal | A typed transform converts sensor pose into object-frame pose with covariance | Reversing transform order leaves all tests green |
| Abstract concepts in reference frames | Proposal with partial related cognitive-map evidence | Separate benchmark must define dimensions, transitions, and held-out relational inference | Geometry-free clustering matches or beats the pose model |
| Grounded language | Thousand Brains project goal | Spatial language must outperform matched nonspatial and scrambled-label controls | Equivalent gains across all labels indicate generic capacity, not spatial grounding |
| Theory of mind | Project goal | Unmeasured | No proxy score may be promoted to this claim |
| “Any task the neocortex can solve” | Design aspiration | Unmeasured and presently untestable as a universal | One demonstrated capability cannot discharge the universal statement |
| Faithful cortical-column model | Contested neuroscience | Not claimed | Column heterogeneity and lack of a demonstrated canonical circuit block the label |

Horton and Adams provide the necessary independent counterweight: cortical columns are observable anatomical/functional patterns in some contexts, but a universal one-column/one-canonical-computation interpretation has not been demonstrated.[7] Zeta should therefore call its units **column-inspired learning modules**, not simulated cortical columns.

> “No one has demonstrated a repeating, canonical cellular circuit within the cerebral cortex that has a one-to-one relationship with the minicolumn.” — Horton and Adams.[7]

## 3. Geometric Algebra Boundary

The existing `Cl3` module is a real and useful spatial primitive. It implements the Euclidean Clifford algebra `Cl(3,0)`, unit rotors, vector rotation by `R v R̃`, and Euclidean distance. It does not encode translation as a single motor and it is not the same representation as the finite `Cl(0,7)` Adinkra action. The smallest honest pose type is therefore a pair `(rotor, translation-vector)` with explicitly declared composition; a later projective or conformal algebra may unify these operations if separately implemented and tested.[8]

For a pose `g=(R,t)` acting on point `x`, use `g·x = R x R̃ + t`. Composition must be declared as `(R₂,t₂)∘(R₁,t₁) = (R₂R₁, R₂t₁R̃₂+t₂)`. A factor graph then carries distributions over pose coordinates and object identity; the Clifford action transports means or sigma points, while covariance transport is a separate Jacobian/adjoint calculation. This is a real geometry–probability composition, not an identification of probabilities with multivectors.

| Geometric requirement | Positive witness | Mutation control |
|---|---|---|
| Rotor identity and inverse | `R̃R=1`; inverse action recovers the point | Omit reverse in sandwich product |
| Pose associativity | Three composed poses agree on every probe point | Reverse translation-rotation order |
| Frame naturality | Passive coordinate change commutes with prediction | Rotate means but not covariance |
| Uncertainty transport | Positive-semidefinite covariance remains finite and symmetric | Negative variance or singular precision is refused |
| Separation from `Cl(0,7)` | Type system requires an explicit adapter | Accidental cast/import must not compile |

## 4. English-on-Geospatial-Wiring Is a Hypothesis

Spatial language clearly recruits spatial computations in some tasks. Emmorey and colleagues found both shared and modality-specific neural recruitment for spatial relations in spoken English and American Sign Language, with perspective-dependent expressions placing different demands on transformation and parietal systems.[9] Recent models also show mathematical or computational relationships between successor-like spatial representations and word co-occurrence representations.[10]

Those results do not show that English as a whole runs on geospatial wiring. A serious alternative reverses the causal story: a domain-general clustering or predictive-learning mechanism can produce grid-like responses in uniformly sampled low-dimensional tasks without being intrinsically spatial.[11] This alternative must be a first-class control.

> “Perhaps, rather than concepts grounding in the machinery of navigation, spatial concepts are a limiting case of a single, more general, learning system.” — Mok and Love.[11]

The preregistered comparison should use four matched lanes: spatial reference-frame language, nonspatial relational language, a label-scrambled spatial lane, and a geometry-free factor/clustering baseline. The load-bearing outcome is held-out likelihood or calibration improvement, not an appealing visualization. A larger gain only in the spatial lane would support a bounded spatial-language adapter; equal gains would favor generic compositional capacity; a geometry-free win would falsify the proposed Clifford requirement for that task.

## 5. Four Colors: A Scheduling Result, Not a Meaning Theory

The Four Color Theorem gives a narrow but real engineering connection. If the conflict graph of simultaneous column updates is planar, at most four update classes suffice so adjacent/conflicting modules never execute together.[12] The color is a schedule class, not a semantic state, cortical cell type, Adinkra color, or component of English.

| Graph control | Expected chromatic result | Interpretation |
|---|---:|---|
| Tree or path | At most 2 | Baseline scheduler calibration |
| Odd cycle | 3 | Catches a bipartite-only implementation |
| `K4` planar clique | 4 | Proves the fourth class is reachable |
| Planar triangulation | At most 4 | Conditional theorem surface |
| `K5` | 5 and nonplanar | Decisive refusal of a universal four-class scheduler |
| `K3,3` | 2 but nonplanar | Proves nonplanarity does not imply five colors |

This distinction is essential: `K5` grades chromatic sufficiency, while `K3,3` grades whether planarity is being confused with color count. An implementation must separately report planarity status, proper-color validity, and colors used.

## 6. Bounded Zeta Target

The implemented finite **Reference-Frame Factor Heterarchy (RFFH)** is not a “complete artificial cortex.” Each module contributes typed object-plus-pose evidence. Messages carry the sender’s frame, generator convention, logical sequence, full Gaussian uncertainty, evidence identity, and an explicit unresolved state. Shared factors align poses and combine likelihoods without treating duplicated evidence as independent. A separate graph-color scheduler batches nonadjacent updates only when the declared conflict graph and certificate permit it.

The first release now measures these properties: typed message compatibility; pose-action laws; full-covariance uncertainty preservation; order-invariant finite factor fusion; retention of contradictory hypotheses; duplicate-evidence refusal; explicit parent-child and lateral wiring; four-class scheduling for a declared planar `K4`; and explicit failure of four-class scheduling on `K5`. Eighteen F# scenarios, five TypeScript coloring scenarios, an F#/TypeScript dispatcher, and two axiom-audited Lean modules pass. Learning, active sensing, language grounding, abstract concepts, theory of mind, and universal neocortical capability remain future measurements.

The practical capability ceiling is therefore **L1** in the linked RFFH contract: this is a verified inference and coordinate-transport substrate, not yet a system that learns reusable models or selects actions. The source-grounded StepGame/CLUTRR comparison has been preregistered separately and has no result. “All neocortical capabilities” remains an unmeasured design aspiration in Thousand Brains publications and an unsupported Zeta claim.

## References

[1]: ./2026-09-01-a-dag-of-bayesian-networks-candidate-anchors-none-confirmed.md "A DAG of Bayesian networks — candidate anchors, none confirmed"
[2]: https://arxiv.org/abs/2507.05888 "Hawkins, Leadholm, and Clay, The Thousand Brains Theory 2.0"
[3]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6336927/ "Hawkins et al., A Framework for Intelligence and Cortical Function Based on Grid Cells in the Neocortex"
[4]: https://www.frontiersin.org/journals/neural-circuits/articles/10.3389/fncir.2019.00022/full "Lewis et al., Locations in the Neocortex"
[5]: https://arxiv.org/abs/2412.18354 "Clay, Leadholm, and Hawkins, The Thousand Brains Project"
[6]: https://arxiv.org/abs/2507.04494 "Leadholm et al., Thousand-Brains Systems"
[7]: https://pmc.ncbi.nlm.nih.gov/articles/PMC1569491/ "Horton and Adams, The cortical column: a structure without a function"
[8]: https://link.springer.com/book/10.1007/978-0-85729-811-9 "Dorst and Lasenby, Guide to Geometric Algebra in Practice"
[9]: https://pmc.ncbi.nlm.nih.gov/articles/PMC9578291/ "Emmorey, Brozdowski, and McCullough, Neural correlates for spatial language"
[10]: https://www.pnas.org/doi/10.1073/pnas.2413449122 "Haga, Oseki, and Fukai, A unified neural representation model for spatial and conceptual computations"
[11]: https://www.nature.com/articles/s41467-019-13760-8 "Mok and Love, A non-spatial account of place and grid cells"
[12]: https://www.ams.org/conm/098/conm098-endmatter.pdf "Robertson et al., Every planar map is four colorable"
