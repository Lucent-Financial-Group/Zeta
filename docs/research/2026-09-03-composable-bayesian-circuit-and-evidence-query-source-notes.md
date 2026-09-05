# Source Notes — Composable Bayesian Circuits and Canonical Evidence Queries

**Status:** Source notes only. They do not establish an implementation result, language semantics, learned topology, or a consensus protocol.

## 1. Terminology boundary

Zuidberg Dos Martires (2024) describes probabilistic circuits as a model family supporting tractable queries, and probabilistic neural circuits as a hybrid that trades some circuit tractability for neural-network expressivity. The paper calls its own construction deep mixtures of Bayesian networks; it does not license calling every declared Gaussian DAG a Bayesian neural network.[1]

**Implication for Zeta:** a declared graph of conjugate Gaussian factors is best called a **Gaussian probabilistic circuit** or **factor graph**, depending on the representation. A module earns “Bayesian neural network” only when it places a distribution over learned network parameters and specifies the associated learning objective and posterior approximation. The existing `MinimalBnn`/`MultilayerBnn` names are historical API names, not evidence of weight-posteriors.

## 2. Edge-local approximate modules

Bagaev and de Vries (2023) present reactive message passing as an execution paradigm for factor graphs. Their implementation can combine BP, VMP, EP, and EM under local form and factorization constraints, interpreted through constrained Bethe free-energy minimization.[2] This supports a modular **message-algebra** interface, but it does not make any chosen approximation exact, schedule-independent, or a CRDT merge.

**Implication for Zeta:** a future edge module should disclose its factor family, approximation family, cavity/tilted-distribution assumptions where applicable, convergence criterion, and uncertainty status. Acyclic exact conjugate modules, converged Gaussian loopy mean-only modules, exact-dense Gaussian fallbacks, and EP/VMP/particle approximations need distinct receipt tags.

## 3. Asynchronous replicas and Bayesian evidence

Shapiro et al. define strong eventual consistency for state-based CRDTs in terms of same delivered updates producing equivalent states. A CvRDT uses a monotonic join-semilattice; its merge is the associative, commutative, idempotent least upper bound.[3] The guarantee applies to payload state, not arbitrary non-idempotent downstream analytics.

Wu et al. show that distributed Bayesian fusion can reuse a shared prior or re-count data when locally computed posteriors are fused without provenance-aware correction. Under conditionally independent likelihoods, the prior must be accounted for once; naïvely multiplying local posteriors is generally only approximate.[4]

**Implication for Zeta:** replicas may converge on a content-addressed multi-value evidence state through union. A posterior is a deterministic query over that full canonical state, must expose its evidence fingerprints and conflict status, and cannot be used as the state merge. A same-key changed-content state stays visible as unresolved rather than receiving a silent posterior.

## 4. Candidate implementation boundary

The first implementable adapter is deliberately narrow: canonically sort conflict-free evidence atoms by full fingerprint; emit a query receipt naming the ordered fingerprint list; apply each likelihood exactly once to a fresh declared prior; and reject multi-value key conflicts before inference. This makes two replicas holding the same evidence set query-identical under the declared floating-point algorithm. It does not make a stream of mutable online posterior states commutative, and it does not establish a distributed consensus protocol.

## References

[1] [Zuidberg Dos Martires, “Probabilistic Neural Circuits,” AAAI 2024](https://ojs.aaai.org/index.php/AAAI/article/view/29675)

[2] [Bagaev and de Vries, “Reactive Message Passing for Scalable Bayesian Inference,” 2023](https://onlinelibrary.wiley.com/doi/10.1155/2023/6601690)

[3] [Shapiro et al., “Conflict-free Replicated Data Types,” SSS 2011](https://www.lip6.fr/Marc.Shapiro/papers/2011/CRDTs_SSS-2011.pdf)

[4] [Wu et al., “Bayesian Data Fusion with Shared Priors,” arXiv:2212.07311](https://arxiv.org/pdf/2212.07311)
