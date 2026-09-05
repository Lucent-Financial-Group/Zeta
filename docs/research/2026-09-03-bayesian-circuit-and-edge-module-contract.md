# Contract — Bayesian Circuit Terminology and Edge-Module Roadmap

**Status:** Frozen architecture and naming contract. It changes no public API and implements no learned edge module.

## 1. Decision at the terminology boundary

The current `MinimalBnn` and `MultilayerBnn` modules are **declared linear-Gaussian factor graphs / probabilistic circuits**, not established Bayesian neural networks. They contain latent-variable posteriors and message updates, but do not maintain a posterior over learned edge-weight parameters. The historical file names remain API names for now; they do not establish neural learning.

| Term | Required evidence | Current Zeta status |
|---|---|---|
| Declared Gaussian factor graph | Variable/factor topology and Gaussian message algebra | Implemented |
| Gaussian probabilistic circuit | Declared compositional graph with tractable Gaussian query under stated model | Implemented for finite declared paths |
| Bayesian neural network | A probability distribution over learned parameter weights plus a stated learning objective and inference approximation | Not implemented except for separately scoped toy work, if any |
| Probabilistic neural circuit | A hybrid circuit/neural construction with declared tractability/expressivity trade-off | Not implemented |
| Learned DAG structure | Data-driven topology/edge discovery with a separately evaluated objective | Not implemented |

This follows the distinction in the probabilistic-neural-circuit literature between tractable circuit structure, neural parameterization, and hybrid models.[1]

## 2. Declared edge-module interface

A future edge module must declare its input/output variable families, likelihood or factor family, parameter state, update rule, convergence information, and uncertainty meaning. An edge module **does not** earn a learned or neural label merely by being placed in a DAG.

| Module class | Examples | Receipt requirement | Exactness label |
|---|---|---|---|
| Conjugate analytic | Linear Gaussian, Beta–Bernoulli, Gamma–Poisson | Factor family and sufficient statistics | `ExactAcyclic` only on an acyclic declared graph |
| Exact finite fallback | Dense declared linear-Gaussian solve | Dimension cap, solver and condition/refusal status | `ExactDenseGaussian` |
| Approximate message | EP, VMP, expectation-consistent, mixture/particle projection | Approximation family, cavity/tilted or variational assumptions, convergence/status | Never `ExactAcyclic` solely from topology |
| Learned parameter | Variational weight posterior, Gaussian-process edge, amortized factor | Prior, parameter posterior, objective, training/evaluation split | `ApproximateLearned` unless separately proved |

The local-constraint framing of reactive message passing supports mixing BP, VMP, EP, and EM message families, but does not erase their distinct approximation assumptions.[2]

## 3. Composition and order boundary

Inference composition is not automatically commutative because finite floating-point updates and online objectives are history-sensitive. Replicated evidence convergence belongs at a separate boundary: a canonical content-addressed state joins by immutable union; a posterior is a deterministic materialized query over that state. The query must retain source/content identifiers, reject unresolved conflicts, and disclose the declared canonical order.

## 4. Explicit non-claims

This contract does not claim human-like learning, language grounding, spatial semantics, consciousness, a learned topology, generic non-Gaussian calibration, or that any distributed agent society has converged. It does not rename files, migrate public APIs, or adopt the unreviewed terminology proposal in PR #16494.

## References

[1] [Zuidberg Dos Martires, “Probabilistic Neural Circuits,” AAAI 2024](https://ojs.aaai.org/index.php/AAAI/article/view/29675)

[2] [Bagaev and de Vries, “Reactive Message Passing for Scalable Bayesian Inference,” 2023](https://onlinelibrary.wiley.com/doi/10.1155/2023/6601690)
