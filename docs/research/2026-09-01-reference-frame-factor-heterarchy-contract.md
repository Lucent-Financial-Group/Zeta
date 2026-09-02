# Reference-Frame Factor Heterarchy: Pre-Implementation Contract

**Author:** Manus AI
**Date:** 2026-09-01
**Status:** Measured finite implementation; language and learning claims remain unmeasured
**Depends on:** `FactorGraph<'M>`, `IMessage<'M>`, `Cl3`, and the corrected `AdinkraEquivariantFactorLayer` descriptor from PR #16283

## 1. Decision

Retain the finite **Reference-Frame Factor Heterarchy (RFFH)** name for the whole boundary, but describe its implemented inference core precisely: it is a reference-frame evidence blackboard with logarithmic opinion pooling for object labels and information-form sensor fusion for position. The current `FactorGraph` containers are two one-variable stars of unary prior factors. Parent-child and lateral topology gates admission and composes poses outside those factor graphs; it does not yet participate in multi-variable inference. The module demonstrates typed object-plus-pose exchange, coordinate-frame alignment, full-covariance uncertainty transport, duplicate/conflict control, and explicit admission topology. It is not a cortical simulation, a weight-learning algorithm, or evidence that the architecture can perform every neocortical task.

The user’s remembered older term for a “DAG of Bayesian networks” remains **unresolved** after they explicitly rejected the closest historical candidates.[1] The current Thousand Brains connectivity term is **heterarchy**. RFFH does not need the missing name: the heterarchy is the external module/admission graph, while the present probabilistic fold is blackboard fusion. A future multi-variable factor graph must make parent/lateral edges load-bearing before it is described as heterarchical graphical inference. GMDH remains separate structure-search prior art rather than an asserted identification.

## 2. Typed Surfaces

### 2.1 Column and evidence identities

Every observation has a stable `EvidenceId`, `EmitterColumn`, `LogicalSequence`, and content fingerprint. Replaying the same evidence identity must not multiply precision or posterior odds. Two distinct evidence identities may combine even when their content is equal. A later content change under the same identity is a conflict, not a replacement.

### 2.2 Object hypotheses

Object identity is a finite categorical exponential family represented by natural log-weights. Product adds log-weights; division subtracts them; uniform is the all-zero natural parameter. The candidate support is declared by the room/task, not inferred from whichever labels happen to arrive first. Marginals are normalized only at the observation boundary.

### 2.3 Pose hypotheses

The first release carries deterministic orientation/frame transforms and a full three-dimensional Gaussian for position. The Gaussian is represented in information form `(η, Λ)`, where `η=Λμ` and `Λ=Σ⁻¹`. Product and division add/subtract these natural parameters. The covariance is a symmetric positive-definite `3×3` matrix at construction; EP cavities may be improper and must be detectable rather than forbidden in algebraic operations.

This release does not claim a probability distribution on `SO(3)`. Orientation uncertainty, multimodal pose uncertainty, and non-Gaussian messages remain unmeasured. A later manifold distribution must not be approximated as an unconstrained Gaussian over rotor coefficients without a separate error study.

### 2.4 Column message

| Field | Meaning | Required boundary |
|---|---|---|
| `EvidenceId` | Deduplication and conflict identity | Same ID cannot count twice |
| `EmitterColumn` | Local model source | No hierarchy or trust inferred from the label |
| `ObjectEvidence` | Categorical natural parameters | Preserve multiple candidates |
| `ObservedPosition` | `Gaussian3` in the sender frame | Must be proper at construction |
| `SenderToRoom` | Explicit spatial pose transform | Must pass unit-rotor and finite-translation checks |
| `GeneratorOrder` | Orientation convention | Reversal is visible and testable |
| `Status` | `Resolved`, `Unresolved`, or `Conflict` | No early argmax manufactures resolution |

### 2.5 Capability envelope

The protocol may reserve typed variants for `SensorObservation`, `ObjectHypothesis`, `GoalState`, `MotorEfference`, and `CompositionRelation`. Merely carrying these variants does not implement sensing, object learning, planning, motor control, language, or composition. Each remains `unmeasured` until it has its own transition rule, benchmark, and falsifier.

## 3. Geometry–Probability Composition

Let a room-frame pose be `g=(R,t)`, with unit `Cl3` rotor `R` and vector translation `t`. A sender-frame point transforms as `x_room = R x_sender R̃ + t`. Its Gaussian moments transform as

`μ_room = Q(R) μ_sender + t`,

`Σ_room = Q(R) Σ_sender Q(R)ᵀ`,

where `Q(R)` is the real `3×3` rotation induced by the Clifford sandwich action. The implementation must derive `Q(R)` by rotating the three basis vectors, not by copying an unrelated quaternion formula.

The unary factor store retains aligned Gaussian and categorical natural parameters. A deterministic magnitude-ordered compensated reduction combines Gaussian information components and categorical log-weights, making the finite fold independent of accepted-message arrival order even under large cancellation. Geometry changes coordinates; probability represents uncertainty. Neither operation is defined as the other.

## 4. Heterarchy Semantics

An RFFH topology is a directed acyclic parent-child relation plus an undirected or reciprocal lateral relation. In the current implementation, parent-child edges authorize and compose explicit transforms before evidence enters the room blackboard; lateral edges authorize cross-column admission. These links are not edges in `ObjectGraph` or `PositionGraph`. A positive control with a real two-variable equality factor shows that genuine graph propagation changes a remote marginal after a second round, while seven additional rounds on the current unary stars are inert. Loopy BP requires damping and a convergence receipt; no loopy result may be labeled exact merely because an iteration cap was reached.

Column voting is Bayesian evidence fusion, not a majority count. Votes must be aligned into the receiving frame before combination. Evidence dependence is explicit: messages with overlapping evidence provenance are deduplicated or rejected, rather than multiplied as independent likelihoods.

## 5. Declared Finite Scenarios

| ID | Scenario | Expected result | What failure means |
|---|---|---|---|
| RFFH-1 | One proper object/pose message | Posterior equals the input evidence | Adapter changes a baseline |
| RFFH-2 | Two independent agreeing columns | Categorical odds and pose precision increase | No real evidence fusion |
| RFFH-3 | Two conflicting object hypotheses | Both candidates remain finite; status is unresolved/conflict | Early argmax erased uncertainty |
| RFFH-4 | Same `EvidenceId` replayed | Posterior is byte/equality-identical to one copy | Duplicate evidence is double-counted |
| RFFH-5 | Same messages in every permutation | Unary-blackboard posterior is invariant | Schedule leaks into meaning |
| RFFH-6 | Two coordinate frames viewing one point | Aligned room-frame means agree within tolerance | Pose action or frame direction is wrong |
| RFFH-7 | Rotate anisotropic covariance | Off-diagonal covariance appears as analytically expected | Mean-only transform silently corrupts uncertainty |
| RFFH-8 | Passive room-frame coordinate change | Transformed posterior commutes with fusion | Geometry adapter is not natural |
| RFFH-9 | Non-unit rotor, NaN translation, or non-SPD covariance | Teaching error names the violated field and safe next step | Malformed geometry enters inference |
| RFFH-10 | Same ID with changed fingerprint | Visible conflict; neither version silently wins | Content identity is not enforced |
| RFFH-11 | Parent-child transform composition | Composed admission transform matches direct pose composition | Parent-path geometry is only prose |
| RFFH-12 | Lateral edge removed | Cross-column admission is refused | Lateral admission wiring is vacuous |
| RFFH-19 | Accepted messages inspected as graph structure | Two variable-0 unary stars; zero multi-neighbor factors; seven extra rounds inert | Heterarchy inference was overstated |
| RFFH-20 | Three contributions `10¹⁶,-10¹⁶,1` in all orders | Object and Gaussian posteriors equal the compensated exact fold in all six orders | Floating-point association leaks arrival order into meaning |
| RFFH-21 | Separate two-variable equality-factor graph | Remote marginal changes from `0.5` to `0.9` after propagation | Architecture census cannot detect real topology load |

## 6. Mutation Controls

The minimum fault set is load-bearing. It includes: ignore `SenderToRoom`; reverse rotor sandwich order; rotate the mean but not covariance; drop off-diagonal covariance; multiply duplicate evidence; replace Bayesian product with majority count; sort candidates by label and select the first; ignore parent-child edges; coerce `Unresolved` to `Resolved`; and restore the pre-PR-#16283 descriptor that ignores the measured sectorization argument.

Each mutation must kill at least one named scenario. A surviving mutation is reported as a possible equivalence or a vacuous test; it is never silently accepted.

## 7. Claim Ladder

| Level | Statement | Current status |
|---|---|---|
| L0 | Typed messages can carry object, pose, uncertainty, provenance, and unresolved state | Implemented and tested |
| L1 | Finite frame alignment and blackboard fusion satisfy RFFH-1…21 | Measured; all named scenarios pass |
| L2 | Parent/lateral topology participates in multi-variable factor inference | Unmeasured; current census finds only unary stars |
| L3 | Modules learn reusable object models | Unmeasured |
| L4 | Active sensing accelerates disambiguation | Unmeasured |
| L5 | Parent-child modules learn compositional objects | Unmeasured |
| L6 | Spatial factors improve grounded English | Unmeasured; separate preregistration |
| L7 | Architecture supports every neocortical capability | Not established and not implied by lower levels |

## 8. Measured Result

The production F# implementation stores evidence in `FactorGraph<LogCategorical>` and `FactorGraph<Gaussian3>`, but the executable architecture census finds one variable and only unary prior factors in each graph. Object evidence is fused in log-natural form; position evidence is fused in information form. Deterministic factor IDs derive from evidence identity and content fingerprint, collision detection fails closed, and posterior reduction uses magnitude ordering plus Neumaier compensation. Position evidence is transformed from sender coordinates into room coordinates using the existing `Cl3` sandwich action, with the induced real matrix obtained by rotating basis vectors. Covariance is transported as `QΣQᵀ`; it is not left behind or replaced by a diagonal approximation.

| Surface | Exact bounded result |
|---|---|
| Message identity | SHA-256 content fingerprint binds emitter, logical sequence, object evidence, Gaussian information, pose, generator order, and status |
| Duplicate evidence | Same identity and content is ignored without changing either posterior |
| Changed content | Same identity with changed content yields a retained conflict receipt |
| Categorical fusion | Two independent `9:1` messages produce posterior `81/82` |
| Gaussian fusion | Two equal variance-2 observations produce variance 1 |
| Contradiction | Equal `cup`/`bowl` evidence remains `0.5/0.5` and unresolved |
| Arrival order | All six permutations of `10¹⁶,-10¹⁶,1` produce categorical `logit⁻¹(1)` and Gaussian mean/variance `1/3`; content-addressed factor IDs are identical |
| Covariance rotation | A 45-degree `e12` rotor maps `diag(4,1,9)` to `XX=YY=2.5`, signed `XY=+1.5`, `ZZ=9` |
| Independent frame alignment | Literal `Q(x,y,z)=(-y,x,z)` at `π/2` gives `Q(2,3,4)+(4,-2,1)=(1,0,5)`; two variance-2 observations fuse to variance 1 |
| Passive coordinate change | Direct information-form and trigonometric expected values agree for all mean/covariance components within `10⁻¹⁰`; the expected side calls no production transform |
| Parent-child topology | Explicit child-to-parent paths compose as the semidirect pose action |
| Lateral topology | Removing the declared lateral edge blocks cross-module evidence |
| Cycles | Parent cycles are refused rather than labeled exact loopy inference |
| Convention mismatch | A message with a different generator order is refused at the room boundary |
| Architecture census | Each current graph has variable set `{0}`, only unary factors, and no message change after seven additional rounds |
| Topology positive control | A separate two-variable equality-factor graph changes its remote `cup` posterior from `0.5` after one round to `0.9` after two |

The focused F# suite contains twenty-three named tests, including the replay-idempotence additions from PR #16348 and the architecture/associativity controls above. The strict TypeScript scheduler has fifteen scenarios: `K4`, `K5`, and `K3,3` keep colorability distinct from planarity; every declared facial-certificate condition has an isolated failing witness; an interleaved crown graph needs two colors exactly but three under deterministic first-fit; and canonical output follows Unicode code-point order above the BMP.

A standalone cross-language dispatcher executes the production F# layer and compares eighteen aggregate witness groups against TypeScript calculations. The F# oracle now computes frame-alignment and coordinate-naturality expectations from literal formulas rather than production transforms and independently solves `K4`, `K5`, `K3,3`, and crown chromatic numbers. It reports zero failures. An external ten-mutant review found eight direct kills, one control in the adjacent Adinkra module, and one apparent tie gap. The tie report was resolved by the pre-existing strict-majority invariant: a resolution threshold must lie in `(0.5,1]`, so two equal maxima cannot resolve. RFFH-18 freezes that boundary directly.

Two machine-checked Lean modules establish the algebra used below the implementation. `RigidPoseSemidirect` proves action identity, inverse, composition, and associativity for a group acting on an additive coordinate space. `ConflictFreeColorSchedule` proves that every class of a proper coloring is conflict-free and specializes this implication to supplied `Fin 4` witnesses. Both are in the default Lean build and protected by crash-aware axiom audits denying `sorryAx` and unresolved declaration names. The Lean theorem does not prove planarity or the Four Color Theorem; finite graph certificates remain explicit inputs.

## 9. Non-Claims

RFFH does not establish a biological cortical column, broad neocortical grid cells, consciousness, theory of mind, universal language grounding, substrate-independent identity, or physical equivalence between agents and Clifford modules. It does not connect spatial `Cl(3,0)` to the finite Adinkra `Cl(0,7)` action. It does not yet implement multi-variable heterarchical factor inference, turn a factor graph into a neural network, or supply a learning rule. Regularity and homoiconicity remain separately unmeasured.

## References

[1]: ./2026-09-01-a-dag-of-bayesian-networks-candidate-anchors-none-confirmed.md "A DAG of Bayesian networks — candidate anchors, none confirmed"
[2]: https://arxiv.org/abs/2507.05888 "Hawkins, Leadholm, and Clay, The Thousand Brains Theory 2.0"
[3]: https://arxiv.org/abs/2412.18354 "Clay, Leadholm, and Hawkins, The Thousand Brains Project"
[4]: https://arxiv.org/abs/2507.04494 "Leadholm et al., Thousand-Brains Systems"
[5]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6336927/ "Hawkins et al., Grid Cells in the Neocortex"
[6]: https://www.frontiersin.org/journals/neural-circuits/articles/10.3389/fncir.2019.00022/full "Lewis et al., Locations in the Neocortex"
[7]: https://pmc.ncbi.nlm.nih.gov/articles/PMC1569491/ "Horton and Adams, The cortical column: a structure without a function"
[8]: https://www.mitpressjournals.org/doi/pdf/10.1162/089976601750541769 "Kschischang, Frey, and Loeliger, Factor Graphs and the Sum-Product Algorithm"
