# Bayesian Evidence Composition Roadmap — Bounded Architecture

> **Recommendation:** Treat immutable content-addressed evidence union as the asynchronous convergence layer. Treat Gaussian, exact-dense, loopy, EP, VMP, mixture, and learned-edge results as separately labeled deterministic queries over that state. Build the next edge-module only after its factor family, uncertainty semantics, and independent falsifiers are frozen.

**Status:** Architecture roadmap. It documents present implementation limits and ordered future work; it does not establish language grounding, a society consensus mechanism, a neural weight posterior, or a general non-Gaussian solution.

## 1. Current measured layers

| Layer | Present artifact | What is established | What is not established |
|---|---|---|---|
| Replicated evidence state | Immutable multi-value `EvidenceState` union | Finite ACI, monotonicity, redelivery invariance, visible same-key conflict retention | Global transport delivery, consensus, or a causal total order |
| Canonical query adapter | `canonical-kahan-gaussian-product/v1` | Same conflict-free finite evidence set yields the same declared query receipt under six tested arrival permutations | Unknown correlation, shared-prior correction, non-ASCII oracle collation |
| Declared Gaussian graph | `MinimalBnn`, `MultilayerBnn`, `FactorGraph` | Exact acyclic inference under declared linear-Gaussian model; exact-dense covariance fallback through 64 layers | Learned topology, generic neural weights, generic non-Gaussian posterior |
| Loopy Gaussian graph | Per-edge BP and exact-dense fallback | Converged BP means under stated Gaussian conditions; finite exact-dense covariance correction | Exact loopy BP covariance or general convergence |
| RFFH | Unary-factor blackboards with deterministic compensated fusion | Content-derived factor IDs, collision refusal, external topology/admission routing | Multi-variable RFFH factor propagation or cortical/linguistic equivalence |

The architecture makes an intentional distinction between a **state** that must converge under replica reordering and a **query** whose statistical assumptions must be named. This follows the CvRDT least-upper-bound requirement and avoids treating non-idempotent posterior multiplication as a replicated merge.[1]

## 2. Edge-module composition contract

Every future edge module should expose a receipt with the following fields: `(factorFamily, parameterPrior, updateFamily, exactness, convergence, inputFingerprints, sourceVersions, approximationDiagnostics)`. The receipt lets a caller distinguish exact conjugacy, exact finite dense fallback, converged means-only loopy BP, and approximate EP/VMP/mixture/particle results.

| Candidate edge module | Correct initial role | Minimum falsifier before integration |
|---|---|---|
| Linear-Gaussian | Exact conjugate factor | Independent joint-precision solve, replay and out-of-order query controls |
| Beta–Bernoulli / Gamma–Poisson | Conjugate non-Gaussian message family | Independent sufficient-statistics oracle and prior-accounting test |
| EP | Moment-projected non-conjugate factor | Cavity/tilted distribution failure control, damping/convergence receipt, calibration comparison |
| VMP | Factorized variational approximation | ELBO/objective monotonicity under declared schedule, held-out calibration control |
| Finite Gaussian mixture / particle | Explicit multimodal query | Resampling/mixture-pruning sensitivity and deterministic-seed disclosure |
| Learned edge parameters | Bayesian-neural edge only after training objective exists | Train/validation/test separation, parameter-posterior calibration, ablation and topology baseline |

Reactive message-passing research supports local composition of BP, VMP, EP, and EM methods, but each method retains its own assumptions and convergence conditions.[2]

## 3. Asynchronous adapter rule

The current adapter is deliberately a read-only bridge. It accepts an `EvidenceState`, canonicalizes its full content identities, refuses unresolved multi-value keys, and returns a fresh posterior. A retry sends the same immutable state through the query; it does not append a second copy to a mutable posterior. This is how the current implementation preserves the user’s central requirement that different observers holding the same evidence set can reach the same declared conclusion despite delivery order.

The rule is not universal Bayesian fusion. If an input represents a local posterior rather than an independent likelihood-like message, multiplying it can re-count a shared prior. Such sources require an explicit prior-accounting factor before they may enter a query.[3]

## 4. Ordered engineering steps

1. Add a typed production bridge from `EvidenceState` receipts to a fresh declared Gaussian factor query, including source identity, source version, conflict list, and prior provenance.
2. Add one conjugate non-Gaussian factor family with an independent oracle and a declared finite benchmark. This is the lowest-risk next move beyond the current Gaussian boundary.
3. Compare EP and VMP only under a frozen factor and calibration protocol. Neither should be called an order-independent merge or an exact posterior.
4. Only then prototype learned edge-parameter posteriors. The evaluation must distinguish model learning from merely rearranging a declared graph.
5. Keep the lexical/Clifford proposal in a generator register until it has declared finite lexicon data, retention and correction measurements, and an independently checkable baseline. Dimension, periodicity, or a visual pattern alone do not establish semantic geometry.

## 5. Terms that must remain distinct

| Do not conflate | Boundary |
|---|---|
| Factor graph and Bayesian neural network | A graph of latent Gaussian factors is not a posterior over learned neural weights. |
| Probabilistic circuit and learned DAG | Declared tractable structure is not learned structure. |
| Evidence union and posterior fusion | Union is the replicated state merge; posterior fusion is a query. |
| Converged loopy mean and calibrated uncertainty | Exact Gaussian means do not supply exact variances on loops. |
| Language-seed hypothesis and linguistic result | A design prompt is not a finite language benchmark. |
| Local conflict visibility and global consensus | Retaining a conflict is not resolving it or establishing a global authority. |

## References

[1] [Shapiro et al., “Conflict-free Replicated Data Types,” SSS 2011](https://www.lip6.fr/Marc.Shapiro/papers/2011/CRDTs_SSS-2011.pdf)

[2] [Bagaev and de Vries, “Reactive Message Passing for Scalable Bayesian Inference,” 2023](https://onlinelibrary.wiley.com/doi/10.1155/2023/6601690)

[3] [Wu et al., “Bayesian Data Fusion with Shared Priors,” arXiv:2212.07311](https://arxiv.org/pdf/2212.07311)
