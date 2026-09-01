# RFFH Independent Geometry and Planarity Oracle Contract

**Status:** Measured; independent F#/TypeScript controls agree
**Author:** Manus AI
**Scope:** Finite Gaussian frame transport, finite embedding-certificate validation, exact bounded graph coloring, and canonical string order

## Key Recommendation

Retain the Reference-Frame Factor Heterarchy geometry and conditional scheduling surface with the strengthened controls. RFFH-6 and RFFH-8 now compute literal expected values without production transforms; every declared embedding-verifier condition has a named finite falsifier; an interleaved crown graph distinguishes exact search from greedy first-fit; and supplementary-plane identifiers are ordered by the repository’s Unicode code-point treaty.

## 1. Fixed Geometry Conventions

The production pose action is `x_room = Q x_sender + t`, where `Q` is derived from the existing spatial `Cl3` rotor sandwich action. Covariance transport is `Σ_room = Q Σ_sender Qᵀ`. Gaussian fusion is performed in information form:

`Λ = Σ₁⁻¹ + Σ₂⁻¹`, `η = Σ₁⁻¹μ₁ + Σ₂⁻¹μ₂`, `Σ = Λ⁻¹`, and `μ = Ση`.

The expected values in the new controls must be computed from literal trigonometric and rational expressions. They may not call `tryTransformPoint`, `tryInversePose`, `tryComposePose`, `tryTransformGaussian`, `addMessage`, or `positionPosterior` on the expected-value side.

| Control | Independent expected witness | Failure it must expose |
|---|---|---|
| Two-frame alignment | For `θ=π/2`, `Q(x,y,z)=(-y,x,z)`; sender `(2,3,4)` and translation `(4,-2,1)` yield room point `(1,0,5)` | Reversed sandwich, wrong translation sign, production inverse used on both sides |
| Isotropic fusion | Two independent `N((1,0,5),2I)` observations yield `N((1,0,5),I)` | Duplicate suppression of distinct evidence, covariance not fused |
| Passive-coordinate naturality | The untransformed pair has exact mean `(-3/5, 3/4, 11/7)` and covariance `diag(4/5,3/4,10/7)` | Uniformly wrong production transform cancelling on both sides |
| Rotated naturality | For `θ=0.63`, compute the expected mean and all six symmetric covariance entries from `sin θ`, `cos θ`, and `QΣQᵀ` directly | Wrong handedness, dropped cross-covariance, translation applied to covariance |

Passing these tests supports only the declared finite pose and Gaussian equations. It does not establish physical coordinate frames, cortical fidelity, or language grounding.

## 2. Planar-Embedding Validator Mutation Matrix

The finite verifier accepts oriented facial boundary cycles for a connected cellular embedding on the sphere. Each load-bearing condition receives a witness designed to make that condition fail visibly, even when neighboring checks also fail.

| Mutation or omission | Required named control |
|---|---|
| Ignore face length below three | A two-vertex face emits the short-face violation |
| Ignore unknown boundary vertices | A face naming an undeclared vertex emits the unknown-vertex violation |
| Ignore non-edge traversal | A boundary step between declared non-neighbors emits the non-edge violation |
| Ignore one traversal per directed edge | A duplicated orientation emits the directional-traversal violation |
| Ignore total traversal count | A witness with an extra traversal emits the `2E` violation |
| Ignore `V-E+F=2` | A connected directed-edge-complete one-face triangle word has Euler characteristic one and is rejected |
| Ignore connectedness | Two disjoint triangle components, each represented by one bidirectional face word, satisfy Euler two and edge counts but are rejected for disconnection |
| Replace exact search by first-fit greedy | An interleaved six-vertex crown graph has `χ=2` but the declared deterministic greedy order uses three |
| Use raw JavaScript UTF-16 `<` | A graph containing BMP `U+E000` and supplementary `U+10000` identifiers retains Unicode code-point canonical order under endpoint reversal |

`K₄`, `K₅`, and `K₃,₃` retain their distinct roles: `K₄` witnesses a valid planar four-class case; `K₅` witnesses that four classes do not always suffice outside the planar domain; `K₃,₃` witnesses that low chromatic number does not imply planarity.

## 3. Independent Verification

The existing standalone F#/TypeScript reference-frame dispatcher will be extended rather than replaced. F# will emit independently calculated closed-form geometry aggregates and exact chromatic numbers for `K₄`, `K₅`, `K₃,₃`, and the interleaved crown graph. TypeScript will compare those values to production outputs and run the isolated embedding-certificate controls. A green aggregate without the named controls is insufficient.

## 4. Measured Result

| Surface | Exact bounded result |
|---|---|
| Two-frame alignment | `Q(2,3,4)+(4,-2,1)=(1,0,5)`; two independent variance-2 observations return variance 1 |
| Untransformed fusion | Mean `(-3/5,3/4,11/7)` and covariance `diag(4/5,3/4,10/7)` agree within `10⁻¹⁰` |
| Rotated naturality | All three mean and all six symmetric covariance entries agree with direct `sin(0.63)`/`cos(0.63)` formulas within `10⁻¹⁰` |
| Facial conditions | Short face, unknown vertex, non-edge, directed traversal, total `2E`, Euler, and connectivity each have an explicit named failing witness |
| Exact versus greedy | Interleaved six-vertex crown graph: exact `χ=2`, deterministic first-fit `3` |
| Graph controls | `χ(K₄)=4`, `χ(K₅)=5`, `χ(K₃,₃)=2`, and crown `χ=2` agree independently in F# and TypeScript |
| Canonical collation | `U+E000` precedes `U+10000` in vertices, endpoints, and the resulting deterministic schedule under input reversal |
| Cross-language aggregate | 18 finite witness groups, zero F#/TypeScript disagreements |
| Strict suites | 18 focused F# scenarios; 15 TypeScript scheduler scenarios; strict TypeScript passes |

The planarity controls prove only that these finite certificates exercise every declared condition. They do not constitute an independent implementation of a general planarity algorithm.

## 5. Decision Rule

| Result | Allowed conclusion |
|---|---|
| Independent values agree and every mutation is killed | The declared finite geometry and certificate checks are non-vacuous for these witnesses |
| A production and independent geometry value disagree | Preserve the disagreement and correct the implementation or convention before any public update |
| A validator mutation survives | Report the corresponding planarity condition as unchecked |
| Greedy and exact results agree only on existing complete graphs | Exactness remains untested |
| Non-BMP endpoint order changes the schedule | Canonical scheduling is not substrate-independent |

## 6. Explicit Non-Claims

This program does not prove the Four Color Theorem, infer planarity from a coloring, model cortical columns, establish English as geospatial, establish active learning, or make the finite `Cl(0,7)` Adinkra carrier a spatial pose algebra. It strengthens only the named finite RFFH geometry and scheduling checks.

## References

[1]: https://github.com/Lucent-Financial-Group/Zeta/pull/16299 "PR #16299 — close two blind spots three independent reviews found"
[2]: ./2026-09-01-reference-frame-factor-heterarchy-contract.md "Reference-Frame Factor Heterarchy contract and measured result"
[3]: ./2026-09-01-thousand-brains-factor-geometry-claim-matrix.md "Thousand Brains factor/geometry claim matrix"
