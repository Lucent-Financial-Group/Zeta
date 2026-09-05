# CRDT-Compatible Belief Fusion Contract

**Status:** Finite state/query census and canonical Gaussian evidence-query adapter independently cross-verified in TypeScript and Python

**Author:** Manus AI

## Key Recommendation

Treat the content-addressed evidence ledger as the replicated state and probabilistic fusion as a deterministic query over that state. The ledger merge is set union and can satisfy the associative, commutative, idempotent, and monotonic laws required of a state-based CRDT.[1] Do not call pairwise Bayesian product or covariance intersection a CRDT merge unless each law is separately established.

## 1. Declared State and Query Boundary

The candidate replicated state is a finite map from content identity to an immutable Gaussian estimate plus provenance. Merge is fail-closed union: identical key/content is idempotent; disjoint keys are combined; one key with different content yields a visible conflict atom. The probabilistic posterior is a query computed from canonical key order. It is not the replicated payload.

| Layer | Operation | Required law |
|---|---|---|
| Evidence state | Content-addressed union | Associative, commutative, idempotent, monotonic by key inclusion |
| Independent-error query | Gaussian information product over unique evidence | Permutation invariant; not idempotent as a raw numeric binary operator |
| Unknown-correlation query | Covariance intersection over unique estimates | Conservative under its declared correlation assumptions; CRDT laws not assumed |

## 2. Covariance-Intersection Convention

For two Gaussian estimates `(m₁,P₁)` and `(m₂,P₂)` and weight `ω∈[0,1]`, define

`P⁻¹ = ωP₁⁻¹ + (1-ω)P₂⁻¹`

and

`m = P(ωP₁⁻¹m₁ + (1-ω)P₂⁻¹m₂)`.

The primary finite census uses two declared weight rules:

| Rule | Definition | Purpose |
|---|---|---|
| `fixed-half` | `ω=1/2` | Exact rational counterexample surface |
| `trace-grid` | Choose the first minimum of `trace(P)` over `ω=k/1000`, `k=0,…,1000`; ties break toward smaller `k` after canonical operand order | Deterministic approximation to optimized CI |

Canonical operand order is by a stable content fingerprint, not arrival order. `trace-grid` is a declared finite algorithm, not a claim of continuous optimum.

## 3. Required Algebraic Census

The implementation must report exact or tolerance-bounded witnesses for the following laws.

| Operation | Idempotent | Commutative | Associative | Monotonic |
|---|---|---|---|---|
| Evidence-map union | Must pass | Must pass | Must pass | Must pass under key inclusion |
| Gaussian product | Must fail on repeated nonzero evidence | Must pass | Must pass algebraically; floating implementation must use canonical compensated reduction | Information increases for positive-definite inputs |
| Fixed-half CI | Must pass | Must pass | Must be measured; an explicit counterexample is expected but not assumed | Information monotonicity is measured, not presumed |
| Trace-grid CI | Must pass after canonicalization | Must pass after canonicalization | Must be measured by exhaustive finite search | Conservativeness and information order are separate outputs |

At least one associativity witness must use three distinct two-dimensional means and anisotropic positive-definite covariances. A scalar fixed-half witness is retained as a transparent calibration, but it cannot grade matrix inversion or weight optimization.

## 4. Finite Search Space

The two-dimensional trace-grid associativity search uses a declared finite catalog rather than random matrices:

`m ∈ {(0,0),(1,0),(0,1),(2,-1)}`

and

`P ∈ {diag(1,4), diag(4,1), [[2,1],[1,2]], [[5,-1],[-1,1]]}`.

Every covariance must pass symmetry and positive-definiteness checks. Search triples are lexicographically ordered by canonical content fingerprint. The first counterexample, if one exists, is the stable witness. Both parenthesizations report means, covariances, selected weights, and maximum absolute difference.

## 5. Fault Controls

| Fault | Required response |
|---|---|
| Redeliver one identical evidence atom | Evidence-map merge and query remain unchanged |
| Reuse one key with changed Gaussian content | Visible conflict; neither version silently wins |
| Drop content identity and numerically fuse redelivery | Gaussian product becomes overconfident; negative control fires |
| Reverse replica merge order | Evidence state and query remain equal |
| Reassociate three replica merges | Evidence state and query remain equal |
| Reassociate pairwise CI | Any difference is retained as an obstruction, not averaged away |
| Replace canonical reduction with arrival-order fold | Cancellation-sensitive three-message control fails |

## 6. Decision Rule

| Result | Allowed conclusion |
|---|---|
| Evidence union passes ACI and monotonicity | The provenance ledger is a valid finite state-merge candidate under the declared conflict policy |
| Pairwise CI fails associativity | CI may remain a deterministic query over the complete evidence set; it is not a state-merge CRDT operator |
| Pairwise CI passes only the finite catalog | Associativity remains unproved beyond the catalog |
| Multiway query is permutation invariant | Replicas with the same evidence state compute the same declared query |
| Any query changes under redelivery after deduplication | The state/query boundary is unsound |

## 7. Measured Result

The finite census supports the state/query separation and rejects all three tested numeric binary operators as replicated-state merge rules.

| Operation | Measured result | Verdict |
|---|---|---|
| Content-addressed multi-value evidence union | Associative, commutative, idempotent, monotonic by key inclusion, redelivery invariant, and changed-content conflict retaining | Finite state-merge candidate under the declared conflict policy |
| Raw Gaussian product | Commutative and associative within tolerance, but repeated evidence changes covariance; the measured repeated-evidence variance ratio is `0.5` | Rejected as state merge by non-idempotency |
| Fixed-half CI | Idempotent and commutative, but the first declared catalog witness has maximum parenthesization difference `0.26288972189176474` | Rejected as state merge by explicit non-associativity |
| Trace-grid CI | Idempotent and commutative, but the first declared catalog witness chooses final weights `0.881` and `0.347` under the two parenthesizations and differs by `0.24355734504083776` | Rejected as state merge by explicit non-associativity |

For the chosen anisotropic input pair, neither CI result covariance dominates both input covariances in the finite positive-semidefinite order diagnostic. This is not a CI conservativeness theorem: that theorem concerns consistency under unknown cross-correlation assumptions, whereas this row measures one declared covariance order only.[2] [3]

The Python oracle independently implements the two-dimensional matrix arithmetic, evidence union, 1,001-point trace search, catalog traversal, and covariance-order diagnostic. It agrees with TypeScript on all law flags and exact witnesses within `1e-12`. A deliberately changed 999-step trace grid is rejected by the comparator, demonstrating that agreement is not a schema-only tautology.

## 8. Canonical evidence-query adapter result

`crdt-evidence-query-adapter.ts` is the first deliberately narrow adapter from immutable evidence state to a fresh query receipt. It normalizes a supplied `EvidenceState` through full-fingerprint union, refuses visible same-key multi-value conflicts, and computes the conflict-free Gaussian query by Kahan-compensated information accumulation in declared Unicode code-point order. It does not mutate an online posterior and does not promote the resulting product to a state merge.

| Finite check | Result |
|---|---|
| Three-version posterior mean | `(0.01754385964912282, 0.3508771929824561)` |
| Three-version posterior covariance | `[[0.5380116959064327, 0.09356725146198831], [0.09356725146198831, 0.5380116959064327]]` |
| Six arrival permutations | Identical complete receipt |
| Duplicate redelivery | Identical complete receipt; count remains `3` |
| Changed mean or covariance at same key | `Conflict`; no posterior |
| Kahan-versus-naive cancellation control | Distinguished (`9.999999999999997e-17` versus `1e-16`) |
| Independent implementation | Separately authored Python; strict TypeScript comparator passes |
| Naive-accumulation mutant | Detected |

The Python oracle's string-order check is intentionally scoped to declared ASCII finite test keys. It does not establish non-ASCII cross-runtime collation. The adapter does not yet feed `MinimalBnn`, `MultilayerBnn`, RFFH, transport, or consensus; a future bridge must retain input fingerprints, source versions, conflict status, and prior/independence assumptions in every receipt.

## 9. Explicit Non-Claims

This census does not prove all covariance-intersection variants conservative, derive unknown cross-covariances, make probabilities a semilattice, or remove the need for provenance. It does not identify a neural, cortical, physical, or linguistic mechanism. A finite counterexample disproves a universal algebraic law for the declared operator; a finite pass does not prove the universal law.

## References

[1]: https://inria.hal.science/inria-00555588/document "Shapiro et al., A comprehensive study of Convergent and Commutative Replicated Data Types"
[2]: https://arxiv.org/abs/2403.03543 "Cros et al., Split Covariance Intersection with Correlated Components for Distributed Estimation"
[3]: https://pmc.ncbi.nlm.nih.gov/articles/PMC10874429/ "Guo et al., Distributed asynchronous measurement system fusion estimation based on inverse covariance intersection"
