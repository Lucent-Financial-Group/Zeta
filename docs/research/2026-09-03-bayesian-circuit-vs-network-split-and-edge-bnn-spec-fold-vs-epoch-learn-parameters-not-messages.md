# Bayesian circuit vs. network: the split, the edge-BNN spec, and the fold/epoch line — learn parameters, not messages

**Date:** 2026-09-03
**Work item:** none (math-team lane convened by Aaron; filed as research, not as a backlog row)
**Register:** the classification table (§3) is **measured** — every verdict carries `file:line`. The edge-BNN spec (§5–§6) is **`toy`** throughout (`.claude/rules/toy-is-free-metered-must-be-earned.md`): nothing in it has run. The split plan (§7) is a **proposal**, not a rename — no file is moved by this document.
**Code audited:** `src/Bayesian/*.fs` (49 modules), `tests/Bayesian.Tests/*.fs` (46 files), `src/Core.TypeScript/research/composable-factor-benchmark/*.ts`, plus the five `*bnn*` TypeScript modules outside `src/Bayesian/` that name the same objects.
**Prior in this lineage:** `docs/research/2026-09-01-a-dag-of-bayesian-networks-candidate-anchors-none-confirmed.md` (resolved 2026-09-02 to **probabilistic circuits**), `docs/research/2026-09-02-multilayer-factor-graph-online-update-contract.md`, `docs/research/2026-09-02-composable-dag-learning-competitor-matrix.md`.

---

## The ask, verbatim

Aaron, 2026-09-03:

> *"what i'm hoping for is an in depth spec for making our bayesian dag be able to have bayesian bnns at each connection not just factor graphs, and find out the most optimal way to connect these and also split out our code and test to honestly reference bayesian circuit vs neural networks, we clump a lot into BNN that should likely be bayesian circuits cause they are a dag."*

## The verdict, up front

1. **The clumping is real and it is one-directional.** Of the 49 modules in `src/Bayesian/`, exactly **one** (`ToyBosonFermionBnn.fs`) holds a posterior over *weights of a learned function* — the thing "BNN" means in MacKay 1992 / Neal 1996 / Blundell 2015. The two modules with "Bnn" in their *names* (`MinimalBnn`, `MultilayerBnn`) have **no weights, no learned nonlinearity, and exact inference on trees**. They are linear-Gaussian **circuits**: DAGs of product and marginalisation nodes over a message algebra, which is Darwiche's arithmetic circuit (2003) evaluated over the Gaussian exponential family. §3 has the table.
2. **"Bayesian NN at each connection" has exactly one legal place to sit, and it is `Factor.ComputeMessages`** (`src/Bayesian/FactorGraph.fs:33-38`). Variable nodes are pure products (the cavity, `FactorGraph.fs:116-118`) and must stay exact or EP stops being well-defined (Minka 2001). A learned edge is therefore a learned **marginalisation** node — a learned `∫` — and that is why it can never be exact by construction: it approximates an integral.
3. **The crux Aaron named — what keeps the whole thing a pure function of the evidence set — is a split between two operations that today's vocabulary runs together.** *Inference* is a **fold** over a content-addressed evidence set: commutative, idempotent, order-free. *Learning* is an **epoch**: it consumes a training set, and for every learning rule that is not conjugate sufficient-statistic accumulation it is **order-dependent** (the repo already says so of itself: `ToyBosonFermionBnn.fs:235-236` — *"deterministic in the order"*). An epoch must never run inside the fold. It runs beside it and mints a content-addressed, frozen **weight treaty** `Θ_k`, which the fold then consumes *by hash* as one more input. Two agents agree on the same conclusion iff they agree on `(E, S, Θ_k)` — evidence set, declared structure, weight treaty. **Fold vs. epoch** is the name; §5.5 is the spec.
4. **Most optimal way to connect: learn the parameters of a closed-form factor wherever a closed form exists (a *conditional circuit*, Shao et al. 2020), and learn the message itself only on edges that have no closed form (NEBP-style, Satorras & Welling 2021).** Never a learned message on every edge (it forfeits `ExactAcyclic` everywhere, and the repo's own experiment already measured a BNN adding nothing where a closed form exists — `2026-08-27-toy-boson-fermion-*`); never a single amortised inference network (it destroys composability: compose two circuits and you must retrain). §6 has the four topologies, costs, exactness impact, falsifiers, and what would refute the recommendation.
5. **The exactness classifier has a laundering path that the edge-BNN would walk straight through.** `FactorGraphExactness` (`MultilayerBnn.fs:140-144`) is computed from *topology and convergence only* (`MultilayerBnn.fs:625-629`): `acyclic ∧ converged ⇒ ExactAcyclic`. That is true today only because `MultilayerBnn` can construct nothing but conjugate factors. Add one EP site or one learned edge to an acyclic graph and the receipt would still say `ExactAcyclic`. Invariant (2) requires a **factor-class axis** in the receipt (§5.4), and this is the first code change the spec asks for.

---

## 1. Vocabulary first — because the disagreement is lexical before it is technical

`docs/VISION.md` §"Definition drift versus argument change" (2026-09-02) says the move is to check whether a word changed referent before arguing the conclusion, and that the response is never to freeze the old definition but to **hold both, dated**. This document is that move applied to three words.

### 1.1 "Network" has three referents in `src/Bayesian/` alone

| sense | anchor | where it appears here | risk |
|---|---|---|---|
| **N-a. Bayesian network** — a DAG of random variables with conditional distributions | Pearl 1988 | `MultilayerBnn.fs:3` *"an N-layer Bayesian network"*; type `Network` at `:118` | this is the sense the *code* has |
| **N-b. Neural network** — a composition of learned parameterised nonlinear maps | Rumelhart, Hinton & Williams 1986 | the **"NN" in "BNN"** — `MinimalBnn`, `MultilayerBnn` module names; `docs/ZETA-CORE-TECHNOLOGY-FOR-MAX.md:85` *"BNN over Categorical Tensors"* | this is the sense the *names* imply |
| **N-c. Social / communication network** — agents and message links | Barabási–Albert 1999 (as already anchored in `itron-hub-patent-boundary-*`) | `SparseSocietyNetwork.fs:1`, `SocietyBootstrap`, the Reticulum bus modules | not neural, not Pearl; a third thing |

"Bayesian neural network" is a term of art with one referent — **a neural network (N-b) whose weights carry a posterior** (MacKay 1992, *A Practical Bayesian Framework for Backpropagation Networks*; Neal 1996, *Bayesian Learning for Neural Networks*; Blundell et al. 2015, *Weight Uncertainty in Neural Networks*). A Bayesian network (N-a) whose *variables* carry posteriors is not one. `MinimalBnn`'s own header knows this (`MinimalBnn.fs:5`: *"minimal BNN v0 = factor-graph cell with measurable IV; not a transformer; not gradient-trained weights"*) and chose the name anyway. The header is honest; the name is the drift.

### 1.2 "Circuit" already has a referent in this repo, and it is not this one

`docs/GLOSSARY.md:95` *"### Circuit — the graph of operators that describe a computation. Data flows through it on a clock"* — the **DBSP** circuit (Budiu et al.). A **probabilistic circuit** (Choi, Vergari & Van den Broeck 2020) is a different object: a rooted DAG of *sum*, *product*, and *leaf-distribution* nodes whose **structural properties (smoothness, decomposability, determinism) are what buy tractable exact marginals**. They rhyme — both are DAGs of operators, and `FactorGraph.runToFixpoint` is literally documented as *"the DBSP `NestedCircuit.Fixedpoint`... at the factor-graph level"* (`FactorGraph.fs:172-176`) — but the rhyme is a coincidence of shape, not an identification (`numerology-vs-number-theory.md`). So:

- **"probabilistic circuit"** is the Beacon term, always written with the qualifier;
- **"Bayesian circuit"** is Aaron's Mirror term for *our* probabilistic-circuit-shaped DAG of factors, and compresses to the Beacon term;
- a bare **"circuit"** in this repo continues to mean DBSP.

Namespace `Zeta.Bayesian.Circuit` (§7) is safe only because the enclosing `Bayesian` supplies the qualifier.

### 1.3 The dated glossary entries this document asks for (not yet written — §7.6)

| term | entry dated ≤ 2026-09-02 (held) | entry dated 2026-09-03 (added) |
|---|---|---|
| BNN | any online Bayesian inference cell built on the message algebra, incl. `MinimalBnn`/`MultilayerBnn` (used this way since 2026-05; `docs/research/2026-08-13-society-of-decorrelated-bnns-*`, `2026-08-16-the-llm-replacement-bet-is-a-society-of-decorrelated-bnns-*`) | a model with a posterior over the **weights of a learned function**; in this repo today: `ToyBosonFermionBnn` (F#), `pr-categorization/bnn.ts` (TS). Nothing else. |
| probabilistic circuit | — | Choi/Vergari/Van den Broeck 2020; Darwiche 2003 arithmetic circuits; the tradition `MultilayerBnn` and `FactorGraph` on a tree sit in (§4 says how far that identification is earned) |
| Bayesian circuit | — | Mirror term (Aaron 2026-09-02/03) → Beacon *probabilistic circuit* |
| network | N-a / N-b / N-c undistinguished | the three senses of §1.1, each named |

Both rows are kept. The old sense is not wrong; it was the sense in use, and the dated research files that use it are **history, not renamed** (raw vault: a single version of the facts).

---

## 2. The criterion — six checkable properties, not a feeling

A module is classified by which of these it satisfies. Each is a yes/no with a `file:line` witness in §3.

**Circuit-side (C):**

- **C1 — declared structure, no learned map.** The DAG is an input; every node's operation is a fixed algebraic rule of the message family.
- **C2 — nodes are ⊗ and ∫.** Product (natural-parameter addition: `Message.fs:78-80`) and marginalisation (`convolve` / `throughChannel` / `deconvolve`: `MultilayerBnn.fs:222-256`; the `equality` and `prior` rules: `FactorGraph.fs:46-64`). In Darwiche's arithmetic circuit these are exactly the `×` and `+` nodes; in the Choi et al. framework the ∫ over a latent is the integration a decomposable product permits.
- **C3 — exactness is structural.** The marginal is exact iff the factor graph is a tree, and the code *says which* (`FactorGraphExactness`, `MultilayerBnn.fs:140-144`; `isAcyclicFactorGraph`, `:545-567`).

**Network-side (N):**

- **N1 — parameters with posteriors.** A weight vector with a distribution over it.
- **N2 — a learned map from inputs to a message.** The function that produces a message is fitted, not derived.
- **N3 — approximate inference whose error is not structural.** ADF / EP-on-non-conjugate-sites / variational / sampling — an approximation that would remain even on a tree.

**The name test:** a module may say "network" (N-b) iff it satisfies N1. A module satisfying C1–C3 and none of N is a **circuit**, whatever it is called today.

Anchors for the criterion: Choi, Vergari & Van den Broeck 2020 (structural tractability — C3); Darwiche 2003 (compiling a Bayes net into an arithmetic circuit — C2); Kschischang, Frey & Loeliger 2001 and Aji & McEliece 2000 (sum-product / generalised distributive law — C2 over a semiring); MacKay 1992, Neal 1996, Blundell et al. 2015 (N1); Minka 2001 (N3 — EP/ADF as the moment-matched approximation).

---

## 3. Classification table — measured, with evidence

Legend: **PC** = probabilistic circuit (satisfies C1–C3, no N); **FG** = factor graph *model/schedule* (the substrate a PC is compiled from); **CRDT+Q** = content-addressed evidence set plus deterministic query (invariant 1 made concrete); **BNN** = weight posterior (N1); **—** = not an inference structure at all (metering, society, adapters) and out of scope for the split.

### 3.1 F# — inference-bearing modules

| module | what the code does | C1 | C2 | C3 | N1 | N2 | N3 | class | verdict on the name |
|---|---|---|---|---|---|---|---|---|---|
| `Message.fs` | exponential-family messages in natural parameters; `*` = add, `/` = subtract, `One` = uniform (`:64-90`); commutative group pinned by C1–C4 in `Message.Tests.fs:45,231,313,385,495` | – | ✓ | – | ✗ | ✗ | ✗ | **algebra** (the leaf/⊗ semantics both sides use) | honest; stays in the root namespace |
| `FactorGraph.fs` | bipartite factor graph, `passOnce` (`:124-134`), `runToFixpoint` (`:177-195`), damped variant (`:198-231`); the only state is `FactorToVar` (`:72-77`) | ✓ | ✓ | ✓ (tree ⇒ exact, `:122-123, :170-171`) | ✗ | ✗ | ✗ | **FG** | honest. It is the *model + schedule*; on a tree its unrolled evaluation *is* a PC (§4) |
| `Ep.fs` | EP as a **factor type**: cavity → tilt → moment-match → divide (`:12-24`); probit site cross-checked against quadrature | ✓ | ✓ | ✗ **by design** — moment matching is an approximation even on a tree | ✗ | ✗ | ✓ | **FG with an approximate node** | honest — and the precedent for the exactness downgrade the edge-BNN needs (§5.4) |
| `EngineAdapter.fs` | our FG behind the hexagonal `IInferenceEngine` port (`:5-10`) | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | **FG** | honest |
| `MinimalBnn.fs` | ONE Gaussian latent; prior × cumulative likelihood; a two-unary-factor graph re-materialised per update (`:65-70, :95-118`); header: *"not gradient-trained weights"* (`:5`) | ✓ | ✓ | ✓ (one variable: trivially a tree) | ✗ | ✗ | ✗ | **PC** (a single product node over two leaves) | **misnomer.** Satisfies no N property. Proposed `Circuit.GaussianCell` (§7) |
| `MultilayerBnn.fs` | chain / skip / DAG of scalar Gaussian latents with `child = Σ parents + noise` factors (`sumLinkFactor`, `:449-472`); three inference paths; `parentsOf` the single topology interpreter (`:108-115`); exactness classified (`:140-144, :625-629`); only layer 0 absorbs data (`:277-283`) | ✓ | ✓ | ✓ (`isAcyclicFactorGraph`) | ✗ | ✗ | ✗ | **PC** (linear-Gaussian arithmetic circuit; §4) | **misnomer**, and the one Aaron is pointing at. "Layer" is also N-b vocabulary for what is a *variable*. Proposed `Circuit.GaussianDagCircuit` (§7) |
| `AdinkraEquivariantFactorLayer.fs` | 16 unary Gaussian priors routed by a signed permutation into ± sectors, one `passOnce` (`:261-283`); header: *"It is not a learner"* (`:7`); `LearnsWeights = false` (`:304`) | ✓ | ✓ | ✓ (16 disjoint stars) | ✗ | ✗ | ✗ | **PC** (a structural partition of leaves) | **"Layer" is N-b vocabulary.** Also: `Exactness: string` (`:57`) is prose where `MultilayerBnn` has a DU — drift between two modules' receipts. Proposed `Circuit.AdinkraSectorFactor` |
| `ReferenceFrameFactorHeterarchy.fs` | content-fingerprinted evidence keyed by `EvidenceId` (`:537-590`); duplicate ⇒ `DuplicateIgnored`, changed content ⇒ ONE `ConflictDetected` receipt, idempotent (`:564-586`); two one-variable unary-factor stars (`ObjectGraph`, `PositionGraph`, `:101-107`); order-independence pinned by RFFH-5 and RFFH-20 (`ReferenceFrameFactorHeterarchy.Tests.fs:119,417`) | ✓ | ✓ | ✓ (stars) | ✗ | ✗ | ✗ | **CRDT+Q** — the reference implementation of invariant (1) in F# | honest. "Heterarchy" names the *admission* topology (parent/lateral gates outside inference), not the factor topology, as `2026-09-01-thousand-brains-*` already says |
| `BayesianAggregate.fs` | Beta-Bernoulli / Normal-Inverse-Gamma / Dirichlet-Multinomial conjugate updates as DBSP ops (`:20-28`) | ✓ | ✓ (leaf families) | ✓ | ✗ | ✗ | ✗ | **leaf families** for a PC | honest |
| `SocietyBootstrap.fs` · `HeavyTailFold.fs` · `Attested.fs` · `BoundJustification.fs` | fold member beliefs by ⊗ (`HeavyTailFold.fs:9-12`); Student-t robust fold via EM/IRLS (`:136, :363`); dedup by attestation | ✓ | ✓ | ✗ for the t fold (EM — approximate, multimodal, `:29-46`) | ✗ | ✗ | ✓ (t fold) | **PC product node + one approximate robust node** | honest; the *society* words are N-c, not N-b |
| `ToyBosonFermionBnn.fs` | diagonal Gaussian posterior over a 37-weight vector (`Posterior`, `:181-185`); degree-2 feature map + probit link (`:61-64`); ADF via `Ep.probitProject` (`absorb`, `:199-235`); **`train` is order-dependent** (`:235-236`: *"deterministic in the order"*); predictive integrates the weight posterior (`predict`, `:243-252`) | ✗ | ✗ | ✗ | **✓** | ✓ (fixed feature map, learned linear readout — a Bayesian GLM / Bayes Point Machine, Herbrich, Graepel & Campbell 2001; Graepel et al. 2010) | ✓ (ADF, Minka 2001 / Opper 1998) | **BNN** — the ONLY module in `src/Bayesian/` with a weight posterior | **honest** (`toy` prefix present; one-layer, but N1 holds). The one thing that belongs in `Zeta.Bayesian.Network` today |
| `InferNetTopology.fs` | mutable class; coupling matrix + fixed pseudo-random projection `P`; `Project` adds Box–Muller noise from `Random(seed)` (`:81-106`); `Reconstruct` is described as loopy BP over topological constraints (`:108-110`) | ✓ (fixed `P`) | partial | ✗ (loopy, no receipt) | ✗ | ✗ | ✓ | **FG-flavoured reconstruction demo** (compressed-sensing shape) | "neural topology" (`:6`) is N-b vocabulary for a coupling graph; a **class with instance state** (`interfaces-free-classes-earned-under-rules.md`) and `System.Random` inside a library path (§13 ambient entropy). Not part of the split; flagged |

### 3.2 F# — society / ensemble modules built on the algebra (N-c, not N-b)

| module | structure | class | note |
|---|---|---|---|
| `ThousandBrains.fs` | columns hold a Gaussian; IV-weighted log-linear pooling (`:6-22`) | PC product node with weights that are **measured** (IV), not learned | "voting is lateral EP" (`:17`) — it is a weighted ⊗; honest enough, no rename |
| `YinYangCell.fs` · `YinYangEnsemble.fs` | Adinkra-seeded cells; Condorcet pool (`YinYangEnsemble.fs:11-16`) | PC product node over cells | no rename |
| `SequentialEnsemble.fs` | posterior_i → prior_{i+1}; explicitly *"no neural networks, no gradient descent"* (`:51`) | PC chain of ⊗ | already honest in its header |
| `FigureEightEnsemble.fs` | closed 3-cell mutual-update loop (`:10-12`) | **loopy** ⊗ (collapse studied on purpose) | no rename |
| `SparseSocietyNetwork.fs` | factor graph rebuilt per round from routing decisions (`:7-16`); equality factors per active edge | FG over an N-c graph | "Network" here is N-c. Keep; disambiguate in the glossary |
| `LocalConsensus.fs` · `AttentionRouter.fs` · `LagrangeCondorcet.fs` · `InformationValue.fs` | consensus threshold; routing weights; Routh's constant (metered); KL objective | — (metering / policy) | `LagrangeCondorcet` is a constant with a falsifier, not a graph; `InformationValue` is the meter both sides use |

### 3.3 F# — not inference structures (out of scope for the split)

`AntiSybil` · `CliffordAntiSybil` · `CloneDetectionBenchmark` · `AskBidClearing` · `BayesianTemperature` · `BusDelaySim` · `BusDelayTick` · `BusRegime` · `CondorcetBoundary` · `GossipTelemetry` · `KeptClaimOracle` · `MeshLatencyModel` · `MessageBatch` · `MutualFalsification` · `OrbitalAsymmetryBudget` · `QuantumFusion` · `ReportTriage` · `ReticulumBusMeter` · `ThousandBrainsCron` · `ToyBosonFermionGenerator` · `WeaviateMemory` · `Web3Settlement`. These meter, route, settle, or generate. None should move.

### 3.4 TypeScript — `composable-factor-benchmark/` and the `*bnn*` modules

| file | what it does | class | verdict |
|---|---|---|---|
| `crdt-belief-fusion.ts` | `mergeEvidenceStates` = union keyed by content fingerprint, **sorted by fingerprint** (`:127-136`); `queryIndependentEvidence` = ⊗ fold over the sorted set, refuses unadjudicated conflicts (`:165-172`); CI variants canonicalise the pair (`:187-189`) | **CRDT+Q** — the TS twin of RFFH and the clearest statement of invariant (1) in the repo: *the replicated state is the set; every number is a query* | honest |
| `gaussian-topology.ts` | chain vs. balanced-DAG reduction of the same `n−1` products; dense oracle; branch-drop control | **PC** shape choice over a commutative ⊗ — CFB-A measures that reduction topology is a *scheduling* choice, not a model choice | honest |
| `etth1-static-ensemble.ts` | four experts (`last`, `window-start`, `train-mean`, `ridge-window`); precision-weighted fusion | PC product node + a **point-estimate fitted artifact** (ridge, train split only) | honest; and already practises the fold/epoch split — the ridge is fitted **once**, frozen, then applied as a query (§5.5) |
| `etth1-correlated-error-query.ts` · `etth1-common-noise-query.ts` | validation-fitted covariance / rank-one factor artifacts, *"evaluated only as a deterministic query over canonical evidence"* (`common-noise:1-4`) | same pattern: **epoch mints artifact → fold queries it** | honest |
| `pr-categorization/bnn.ts` | diagonal-Gaussian weight posterior, probit, ADF; header names it honestly as ADF not EP | **BNN** (N1, N3) | honest name |
| `planning/student-t-bnn.ts` | ONE latent, Student-t site, ADF by quadrature; no weights | **PC cell with an approximate node** | **misnomer** — same class as `MinimalBnn`; proposed `student-t-adf-cell.ts` |
| `oracle/hl-bnn-bridge.ts` | feeds `1/(n·A_n)` observations into `MultilayerBnn` | adapter to a PC | name inherits the misnomer; rename with its target |
| `model-backend/own-model.ts` | published model id `"zeta-bnn"`, `kind: "online-learner"`, surfaces `MinimalBnn` + `student-t-bnn.ts` | adapter | the **id is a key** — keep it; the `displayName` may say what it is |

**Count.** Inference-bearing F# modules: 12. Satisfying N1: **1**. Named "Bnn": **3** (`MinimalBnn`, `MultilayerBnn`, `ToyBosonFermionBnn`). Two of the three names are wrong in the direction Aaron said: DAG-shaped circuits called networks. Nothing is wrong in the other direction.

---

## 4. Is `MultilayerBnn` a probabilistic circuit? — earned to "arithmetic circuit", "consistent with" for the rest

`2026-09-01-a-dag-of-bayesian-networks-*` ended with: *"Whether the RFFH / equivariant factor layer satisfies smoothness, decomposability or determinism... is an open, checkable question."* Here is how far it can be settled by reading, and what must be run.

**Darwiche 2003, checked by entailment.** An arithmetic circuit for a Bayes net is a DAG of `+` and `×` nodes over indicator and parameter leaves such that evaluating it yields the marginal (and its partial derivatives yield every posterior marginal). The two-pass smoother `forward`/`backward` on `Sequential` (`MultilayerBnn.fs:267-338, :374-420`) and the tree case of `runToFixpoint` unroll to a DAG whose nodes are `*` (natural-parameter addition — Darwiche's `×`, since a product of densities is a sum of natural parameters) and `throughChannel` / `convolve` (marginalising a latent through a Gaussian link — Darwiche's `+`, the integration). Leaves are the prior and the absorbed-likelihood Gaussians. So on a tree the module **is an arithmetic circuit over the Gaussian family**, and its output is exact — which the repo already pins against an independent Gauss–Jordan solve (`MLBNN-17, -28, -32, -38`). This part is **earned** by the existing falsifiers, and no new experiment is needed to say "arithmetic circuit".

**Choi/Vergari/Van den Broeck 2020, partially.** Their tractability results attach to *smooth* (sum-node children share scope), *decomposable* (product-node children have disjoint scopes), and *deterministic* circuits. On a tree factor graph, each factor's incoming messages come from disjoint subtrees, so the product nodes are **decomposable** — that is just the tree property restated. There are **no mixture (sum) nodes** in a linear-Gaussian chain: `throughChannel` integrates, it does not mix. So smoothness is *vacuously* satisfied and determinism does not apply to a continuous circuit without sum nodes. Honest register: **"consistent with a smooth decomposable PC with no sum nodes"** — the PC framework's own value here is not a new guarantee (the tree already gives exactness) but the **vocabulary for what a learned node would break**, which §5.4 uses.

**Under `SkipConnections` / loopy `Dag`,** the unrolled `runToFixpoint` computation is still a DAG (rounds × edges) but it is *not* a circuit for the joint: the same leaf reaches a product node by two paths, which is the "double counting" that makes Gaussian loopy BP's variances wrong while its means converge exactly (Weiss & Freeman 2001) — precisely the `ConvergedLoopyMeansOnly` receipt (`MultilayerBnn.fs:142, :628`), and precisely a violation of decomposability. So the PC vocabulary and the existing exactness receipt say the same thing in two registers, which is a small but real check that the anchor entails the code.

**Falsifier CIRC-1 (proposed, unrun — this is what promotes "consistent with" to "is").** Build the circuit *explicitly*: a `Node = Leaf of Gaussian | Product of Node list | Integrate of noiseVariance * Node` value from `tryToFactorGraph`'s output on a tree, evaluate it bottom-up **once with no fixpoint loop**, and assert equality with `exactChainMarginals` at every variable within `1e-12` for the same instance set `MLBNN-28/32` use. If it passes, `MultilayerBnn` on a tree is a compiled arithmetic circuit **by construction**, and the compile step is the object a `Zeta.Bayesian.Circuit` namespace would be named after. If it fails, the identification was numerology.

---

## 5. Spec — "a Bayesian NN at each connection" (register: `toy`)

### 5.1 Definitions

- **Evidence set `E`.** A finite set of content-addressed leaves `{(fingerprint, message)}`. Replicated state. Merge = set union (a G-Set; Shapiro, Preguiça, Baquero & Zawirski 2011). Existing instances: `Heterarchy.Evidence` (`RFFH:107`), `EvidenceState` (`crdt-belief-fusion.ts:21-23`).
- **Structure `S`.** The declared factor graph: variables, factors with their neighbour lists, and — because floating-point `⊗` is not bit-associative — the **declared neighbour order** (`MultilayerBnn.fs:103-107` makes this explicit). `S` is data, not learned.
- **Circuit `C(S)`.** The DAG of `⊗` and `∫` nodes that sum-product on `S` unrolls to. On a tree, exact.
- **Edge `e = (f → v)`.** The place a message is computed: `Factor.ComputeMessages : Map<int,'M> -> Map<int,'M>` (`FactorGraph.fs:38`). The variable→factor direction is *derived* (`varToFactor`, `FactorGraph.fs:116-118`) and is a pure `⊗`; it is not an edge one may learn on.
- **Weight treaty `Θ_k`.** A content-addressed, frozen record of every learned parameter posterior the circuit consumes, minted by an epoch (§5.5). "Treaty" deliberately: it is *judgement crystallised once* — the byte-lock sense in `dual-use-detection-is-neutral-oracle-decides.md` §"Crystallised judgement". A learned edge with a frozen treaty is a **meter**; one that keeps updating inside the fold is the **broken meter** that section names.
- **Query `Q(E, S, Θ_k)`.** The inference. A pure function of its three inputs. **Never** a function of arrival order, wall-clock, or any state not named here.

### 5.2 Where the edge-BNN sits — and the reason there is only one place

A factor graph has exactly two node kinds and two message directions. Only one of the four is learnable without destroying the algebra the rest depends on:

| site | operation today | may it be learned? | why |
|---|---|---|---|
| variable node, `v → f` | `⊗` over the *other* incident factors — the cavity (`FactorGraph.fs:116-118`) | **no** | EP is defined *by* the cavity being the exact product of the other messages (Minka 2001, and `Ep.fs:12-15`). Learn this and `divide` no longer inverts `product`, the sweeps stop being idempotent (`MLBNN-35`), and evidence is double-counted with no receipt |
| variable node, marginal | `⊗` over *all* incident factors (`FactorGraph.fs:111-112`) | **no** | same reason; the marginal is the read-out of the product monoid the tests pin (C4) |
| factor node, `f → v` | the factor's local rule: `∫` of the factor against the other incoming messages (`sumLinkFactor`, `MultilayerBnn.fs:449-472`; `Ep` sites) | **yes** | this is the only node that *encodes a model assumption* (the link is linear-Gaussian; the site is probit). It is where a wrong assumption lives, so it is where a learned correction belongs |
| the schedule | `passOnce` in factor-id order (`FactorGraph.fs:124-134`) | **no** | learned scheduling is Bagaev & de Vries' reactive message passing, a different lane; and a learned schedule makes bit-identity across agents depend on the learner |

So **"BNN at each connection" means: a `Factor<'M>` whose `ComputeMessages` is a learned, weight-posterior-bearing function** — one per factor→variable edge, or shared across edges of the same type. It is a *new factor type*, exactly as `Ep.fs:19-22` says of EP: *"EP is not a new engine — it is a new FACTOR TYPE."* The engine (`runToFixpoint`) is untouched.

### 5.3 What an edge-BNN computes

For edge `e = (f → v)` with the other neighbours `u ∈ N(f) \ {v}`:

```text
m_{f→v}  =  ∫ ψ_θ ( { n_{u→f} }_{u ≠ v} ; φ_e )  q_k(θ_e)  dθ_e
```

- `n_{u→f}` — the incoming cavity messages, **in natural parameters** (the input representation is the message algebra, not raw data);
- `φ_e` — declared edge features (factor kind, declared noise variance, the ids — anything in `S`);
- `ψ_θ` — a parameterised map from those inputs to an **outgoing message in natural parameters of the same family** (`Gaussian` ⇒ a `(PrecisionMean, Precision)` pair with `Precision ≥ 0` enforced by the read-out, since a learned map must not be allowed to emit an improper message the way `divide` legitimately may);
- `q_k(θ_e)` — the weight posterior from treaty `Θ_k` (diagonal Gaussian: Blundell et al. 2015's variational family, or the ADF posterior `ToyBosonFermionBnn.Posterior` already computes);
- the outer `∫` — marginalising the weights into the message. With a linear read-out under a diagonal Gaussian this is closed-form moment propagation (`predict`'s `m/√(1+v)`, `ToyBosonFermionBnn.fs:252`, is the probit case); otherwise Monte-Carlo with entropy drawn **only** through the injected `Source` (§13 noninterference; the DST seed must reproduce the same message bit-for-bit).

**Three output modes, and what each does to the family:**

| mode | `ψ` emits | family closed? | downstream `⊗` exact? |
|---|---|---|---|
| **M1 — same-family message** | one `Gaussian` (natural params) | yes | yes — the rest of the circuit is unchanged |
| **M2 — mixture** | `k` weighted Gaussians (a PC *sum* node) | no | needs a projection node (EP moment match, `Ep.fs`) before it re-enters the algebra; the projection is a second approximation with its own receipt |
| **M3 — parameters of a closed-form factor** (the *conditional circuit*: Shao et al. 2020) | e.g. the link's `noiseVariance`, or a gain `a` in `child = a·parent + noise` | yes **given θ** | yes given θ; the θ-uncertainty is integrated at the read-out, or moment-matched if the factor is non-conjugate in θ (a Gaussian gain times a Gaussian parent is not conjugate — Lukashchuk et al.'s bilinear factor, cited in `2026-09-02-composable-dag-learning-competitor-matrix.md` §2.2, is the closed-form variational message for that case) |

M3 is the mode §6 recommends as the default.

### 5.4 How uncertainty composes — the exactness receipt must grow an axis (invariant 2)

The current classifier (`MultilayerBnn.fs:625-629`):

```fsharp
match acyclic, converged with
| true, true -> ExactAcyclic
| true, false -> UnsettledAcyclic
| false, true -> ConvergedLoopyMeansOnly
| false, false -> UnsettledLoopy
```

reads two axes — topology and convergence — and **assumes a third**: that every factor is conjugate and closed-form. That assumption is true inside `MultilayerBnn` only because `tryToFactorGraph` builds nothing else (`:577-598`). Introduce one EP site or one learned edge into an acyclic graph and this code returns `ExactAcyclic` — the receipt would launder a moment-matched or learned approximation into a claim of exactness. That is the invariant-(2) violation waiting to happen, and it exists today in latent form.

**Spec.** The receipt becomes a product of three orthogonal axes plus a witness list:

```fsharp
type TopologyClass   = Acyclic | Loopy
type ConvergenceClass = Converged | Unsettled
type FactorClass =
    | ClosedForm                       // every factor conjugate; ∫ exact
    | MomentMatched of siteIds: int list   // ≥1 EP site (Ep.fs)
    | Learned of edgeIds: int list * treaty: TreatyHash   // ≥1 edge-BNN

type ExactnessReceipt =
    { Topology: TopologyClass
      Convergence: ConvergenceClass
      Factors: FactorClass
      /// present iff Factors <> ClosedForm: the held-out calibration and the
      /// distance to the closed-form oracle where one exists (§5.6)
      Calibration: CalibrationReceipt option }
```

with the **monotone rule**: `Factors` is the *meet* over all factors in the graph — one non-closed-form factor anywhere downgrades the whole receipt. The old four-case DU is kept as a **projection** for existing callers, and the projection maps every `MomentMatched`/`Learned` case to a *new* fifth case rather than to `ExactAcyclic`:

```fsharp
| ExactAcyclic | ConvergedLoopyMeansOnly | UnsettledAcyclic | UnsettledLoopy
| ApproximateFactors of FactorClass   // never collapses into the first four
```

A learned edge can **earn a distance to exact** (`Calibration.DistanceToOracle = Some 3e-12` on instances where the closed form exists) but **never the word** `ExactAcyclic`. That is the whole of invariant (2) in one sentence: *approximation may be measured to be small; it may not be renamed.*

**Where the composition rule comes from.** Product nodes preserve exactness (a product of exact messages is exact); integration through a closed-form factor preserves it; a learned or moment-matched `∫` does not, and nothing downstream repairs it. So the meet is the only sound aggregation — the same shape as `moved` treating a NaN residual as *moved* rather than converged (`FactorGraph.fs:156-160`): the pessimistic reading is the only one that cannot lie.

### 5.5 The crux — fold vs. epoch

Invariant (1) says: agents seeing evidence in different orders reach the same conclusion. Today that holds because inference is `Q(E, S)` and `E` is a set. Weights `Θ` are state. The question is whether **updating `Θ`** can be order-free, and the answer depends entirely on the learning rule:

| learning rule | order-free? | idempotent under redelivery? | may it live *inside* the fold? |
|---|---|---|---|
| **L0 — conjugate sufficient-statistic accumulation** (Bayesian linear regression with known noise: posterior natural params = prior + Σ contributions; `BayesianAggregate`'s families) | **yes** — it is a `⊗` over a set of per-example contributions | yes, if the contributions are keyed by content (the set dedups) | **yes** — it *is* the fold. `Θ` is just more leaves in `E` |
| **L1 — assumed-density filtering / single-pass EP on non-conjugate sites** (`ToyBosonFermionBnn.absorb`, `student-t-bnn.ts`, `pr-categorization/bnn.ts`) | **no** — each projection depends on the posterior the previous example left (`ToyBosonFermionBnn.fs:235-236`) | no — re-absorbing the same example moves the posterior again | **no** |
| **L1′ — full EP with stored sites, synchronous schedule** | yes *iff* the fixed point is unique and reached (Minka 2001 gives no guarantee) | yes at the fixed point | only with a `Converged` receipt; treat as L1 by default |
| **L2 — gradient / Bayes-by-Backprop** (Blundell et al. 2015) | **no** — minibatch order and the reparameterisation noise both enter | no | **no** |

**The split, stated as a rule:**

> **Inference is a fold. Learning is an epoch. An epoch consumes a training evidence set `D ⊆ E` and a seed, runs a learning rule that is allowed to be order-dependent, and mints a frozen, content-addressed weight treaty `Θ_k = hash(rule, D-hash, seed, schedule, θ-posterior)`. The fold reads `Θ_k` by hash and never writes it. Two agents agree iff they hold the same `(E, S, Θ_k)`; if they hold different treaties they hold two meters, and both readings go in the raw vault — they are not averaged.**

Consequences, each of which is a design constraint the code must satisfy:

1. **No learning in `ComputeMessages`.** A learned factor reads `q_k(θ)` from the treaty and computes a message. It has no setter. A "continual learning" edge that updates `θ` per message is L1 inside the fold — forbidden; it is the folder-rename board of §13 (an undeclared channel) and the broken meter of the byte-lock rule, in one object.
2. **A treaty is evidence.** `Θ_k` enters `E` as a leaf of kind `weights` with its own fingerprint. Two agents converge on which treaty to use exactly the way they converge on any other evidence — by union and a declared policy (newest by epoch index, or a specific hash) — never by averaging posteriors from different epochs, which would be a merge that manufactures a truth.
3. **L0 is the only learning that may be promoted into the fold, and it must be *proven* L0** by the permutation falsifier (§5.6 F-4), not declared. `ToyBosonFermionBnn.train` is not L0 and the module says so; that honesty is the template.
4. **Retraction stays generator-side.** Retracting a training example from `D` produces a *new* treaty `Θ_{k+1}` by re-running the epoch (a generator reinterpret, exactly `own-model.ts`'s note that *"EP/ADF re-normalisation is not Z-set minus"*); it never subtracts from `θ` in place.
5. **The entropy budget is the epoch's.** All randomness (BBB noise, minibatch shuffles) is drawn through the injected `Source` and recorded in the treaty, so DST replays the epoch to the same bytes. The fold draws nothing.
6. **This is already how the repo's best-behaved code works.** The ETTh1 lanes fit ridge coefficients and covariance artifacts *once on the training split*, freeze them with a `fittedScalarCount`, and then run only deterministic queries over canonical evidence (`etth1-common-noise-query.ts:1-4`, `etth1-correlated-error-query.ts:1-4`). The spec names the pattern; it does not invent it.

### 5.6 Falsifiers for the spec (each unrun; each names the test that would fail)

| id | claim | falsifier |
|---|---|---|
| **F-1** | an edge-BNN factor composes with `runToFixpoint` unchanged | build a 3-variable chain with one M1 learned edge whose `ψ` is *initialised to reproduce `throughChannel`*; `tryMarginalsViaFactorGraph` must return the `MLBNN-28` marginals within `1e-12`, and the receipt must read `Factors = Learned [e]`, **not** `ClosedForm` — both halves must hold, the second is invariant (2) |
| **F-2** | the receipt is monotone | mutation: flip one factor in an otherwise closed-form tree to an EP site; the receipt must leave `ExactAcyclic`. A test that still reads `ExactAcyclic` is the laundering path, live |
| **F-3** | the fold is a pure function of `(E, S, Θ_k)` | RFFH-5 pattern: all `n!` arrival orders of `E` (n ≤ 5) through a circuit with learned edges give **bit-identical** marginals. Compare bytes, not `%.12g` — `MLBNN-34` records that the formatter hid a real drift |
| **F-4** | a learning rule is L0 iff it may be folded | for a candidate rule, train on all `n!` orders of `D`; bit-identical `θ` ⇒ L0. `ToyBosonFermionBnn.train` must **fail** this test — it is the positive control that the test can fail |
| **F-5** | epochs are DST-replayable | same `(rule, D, seed, schedule)` on two machines ⇒ identical treaty hash. An epoch whose hash differs across runs has an ambient entropy leak |
| **F-6** | treaties are not averaged | two agents with `Θ_1 ≠ Θ_2` merging evidence must end with **both** treaties in `E` and a query that refuses to run until a treaty is selected (the `conflictKeys` refusal in `crdt-belief-fusion.ts:166`, applied to weights) |
| **F-7** | a learned edge earns its place | on the instance class where a closed form exists, the learned edge must match the oracle within tolerance *and* on the class where none exists it must beat EP moment-matching on held-out NLL with a bootstrap CI excluding zero (the `movingBlockDifference` machinery in `etth1-static-ensemble.ts:396`). Failing the second is the `2026-08-27` result again: the BNN adds nothing |

---

## 6. Most optimal way to connect — four topologies, one recommendation, and what refutes it

Notation: `V` variables, `F` factors, `|E|` factor→variable edges, `k` learned edges, `p` parameters per learned edge, `R` BP rounds, `T` training examples.

| topology | what is learned | params | per-query cost | exactness impact (receipt) | composability | falsifier | anchor |
|---|---|---|---|---|---|---|---|
| **A. learned message on every edge** | `ψ_e` for all `e` | `|E|·p` | `R·|E|·cost(ψ)` | **every** query is `Learned`; `ExactAcyclic` is unreachable even on a chain | composes, but every new edge needs training data | F-1 on a chain: if the learned circuit cannot match the exact solve where the closed form is known, A is strictly worse than the closed form it replaced. The repo has already run the analogous experiment once and measured *"adds nothing"* | Yoon et al. 2018 (GNN trained to reproduce BP marginals) |
| **B. learned message only where no closed form exists** (hybrid; the learner takes the BP message as an input and refines it) | `ψ_e` for the `k` non-conjugate edges | `k·p` | `R·(|E|−k)·O(1) + R·k·cost(ψ)` | receipt = `Learned [k ids]`; the closed-form sub-circuit stays exact and **says so per edge** | composes; a new conjugate edge costs nothing | F-7 second half; and **noninterference**: marginals on the closed-form sub-circuit must be bit-identical with the learned edges present vs. replaced by EP — if they move, the learned edge leaked across the cavity | Satorras & Welling 2021 (NEBP: GNN refines BP messages on the same factor graph) |
| **C. one amortised inference network** | a single `ψ : E → all marginals` | `p_global` | one forward pass | receipt = `Amortized`; structure `S` is not used for any guarantee | **does not compose**: compose two circuits ⇒ retrain (the "very composable learning" Aaron asked for is exactly what this forfeits); amortisation gap (Cremer, Li & Duvenaud 2018) | composability test: train on circuits `C_1`, `C_2`; query `C_1 ∘ C_2` without retraining; B and D answer, C does not | Kingma & Welling 2014 (amortised VI); Yoon et al. 2018's global variant |
| **D. learned *parameters* of closed-form factors** (conditional circuit) | `θ_e` = link variance / gain / mixture weight for factor `e` | `k·p` (small `p`) | `R·|E|·O(1)` + one read-out per learned parameter | receipt = `Learned [k ids]` but **exact given θ** — the approximation is confined to integrating `q(θ)`, which is closed-form for a learned *variance* and moment-matched for a learned *gain* | composes at the factor level: the circuit is still a circuit, so PC operations (products, marginals) apply (Vergari et al. 2021) | F-1 with `ψ` emitting `noiseVariance` instead of a message: bit-identical to `MultilayerBnn` at the treaty's point estimate; then F-7 on the Dynamic/Noisy ETTh1 slice where the link variance genuinely varies | Shao et al. 2020 (conditional SPNs); Peharz et al. 2020 (Einsum networks — the tensorised form when `k` is large) |

**Recommendation: D by default, B where D cannot apply, never A, never C.**

Why D first: it is the only topology under which the exactness receipt can still say something strong (*exact given θ*), the only one whose approximation is localised to a parameter integral rather than smeared over a message, the cheapest in parameters, and the one that keeps the object a probabilistic circuit — so the `Circuit` namespace of §7 is still telling the truth after the learned edges arrive. It is also the one Aaron's phrase fits best: a *Bayesian* NN at a connection means the *connection's* parameters carry a posterior — which is what D says literally.

Why B second: some factors have no closed form at all (a gate, a non-Gaussian likelihood with no conjugate family, an unknown link shape). There the choice is EP moment-matching versus a learned message, and the honest answer is *EP until F-7 says otherwise*. NEBP's design — feed the BP message *into* the learner rather than replacing it — means a learner that has learned nothing degrades to EP rather than to noise.

**What would refute the recommendation.**

1. **D loses to B on the Dynamic/Noisy ETTh1 slice.** If a learned *message* on the gate edges beats a learned *variance* on the same edges on held-out NLL with the bootstrap CI excluding zero, the parameter form is too restrictive there and B becomes the default for gate-shaped factors.
2. **B's learned edges fail F-7's second half against EP.** Then there is no case in the repo's current problem set that earns a learned message at all, and the answer is "more EP factor types, no BNN" — which is where `2026-08-27` already landed for one problem.
3. **The noninterference falsifier fails for B or D.** If the closed-form sub-circuit's marginals move when learned edges are present elsewhere, the cavity is being written to and the hybrid is unsound as built; §5.2's claim that the factor node is the only legal site would need revisiting.
4. **CIRC-1 (§4) fails.** If `MultilayerBnn` on a tree is not a compiled arithmetic circuit, D's "still a circuit" argument has no floor, and the namespace of §7 should say `Graph`, not `Circuit`.

---

## 7. Split plan — a migration with no behaviour change (not performed here)

### 7.1 Namespaces

| namespace | holds | criterion |
|---|---|---|
| `Zeta.Bayesian` (root, unchanged) | `Message`, `MessageBatch`, `InformationValue`, `BoundJustification`, `Attested`, and every §3.2/§3.3 module | the algebra, the meters, the society. Nothing here moves |
| `Zeta.Bayesian.Circuit` (new) | `FactorGraph`, `Ep`, `EngineAdapter`, `GaussianCell` (ex-`MinimalBnn`), `GaussianDagCircuit` (ex-`MultilayerBnn`), `AdinkraSectorFactor` (ex-`AdinkraEquivariantFactorLayer`), `ReferenceFrameFactorHeterarchy`, `BayesianAggregate` (leaf families) | satisfies C1–C3, no N1 |
| `Zeta.Bayesian.Network` (new) | `ToyBosonFermionBnn` (name kept — it *is* one; the `toy` prefix stays); future `EdgeMessageNetwork`, `WeightTreaty`, `Epoch` | satisfies N1 |

Directory mirrors namespace: `src/Bayesian/Circuit/*.fs`, `src/Bayesian/Network/*.fs`. Compile order in `Bayesian.fsproj` is unchanged in *sequence* (only paths change), which is what keeps the F# dependency chain identical.

### 7.2 Renames (module + the type that carried the misnomer)

| today | proposed | why this word |
|---|---|---|
| `MinimalBnn` · `MinimalBnn.State` | `GaussianCell` · `GaussianCell.State` | one Gaussian latent; "cell" is the word `YinYangCell`/`ThousandBrains` already use for it |
| `MultilayerBnn` · `MultilayerBnn.Network` · `MultilayerBnn.Layer` | `GaussianDagCircuit` · `GaussianDagCircuit.Circuit` · `GaussianDagCircuit.Node` | it is a DAG of Gaussian variables; "layer" was N-b vocabulary for a variable; "network" was N-a vocabulary colliding with N-b |
| `AdinkraEquivariantFactorLayer` · `FactorDagLayerDescriptor` | `AdinkraSectorFactor` · `FactorDagDescriptor` | it is a factor (a sectorising partition), not a layer |
| `FactorGraphExactness` | kept, plus `ExactnessReceipt` (§5.4) | the DU name is honest; the new record is the axis it lacks |
| `Topology` (`MultilayerBnn`) | kept | already the right word |

**Not renamed:** `FactorGraph`, `Ep`, `EngineAdapter`, `ReferenceFrameFactorHeterarchy`, `ToyBosonFermionBnn`, everything in §3.2/§3.3, and **every dated file under `docs/research/`** — those are history and carry the sense in use on their date (raw vault).

### 7.3 The no-behaviour-change mechanism

1. **Shims, not edits, for consumers.** F# module abbreviations are not exported from a compilation unit, so the old names survive as real modules in one new file `src/Bayesian/Compat.fs` (compiled last), each member a one-line forwarder carrying `[<System.Obsolete("Moved to Zeta.Bayesian.Circuit.GaussianDagCircuit (2026-09-03, docs/research/2026-09-03-bayesian-circuit-vs-network-*.md)")>]`; type aliases `type Network = GaussianDagCircuit.Circuit` likewise. `TreatWarningsAsErrors` is on, so a consumer that still uses the old name is told at build time and has one release to move.
2. **Public-API gate.** `Zeta.Bayesian` is a published library; a namespace move is a breaking change for C# consumers. The shim keeps the old surface intact for one release; removal (phase 3) goes through the public-API review persona, not this document.
3. **Bit-identity, not "tests pass".** Before and after the move, a one-off script serialises `toJsonString` for the `MLBNN-23/24/28/32` instance set, the RFFH-5 permutation set, and the `toy-boson-fermion-golden-vectors.json` run, and diffs the bytes. Zero diff is the acceptance criterion; the test suite passing is necessary but is the weaker check (`MLBNN-34`'s lesson: `%.12g` hides drift).
4. **Test IDs are keys.** `MLBNN-1..44`, `RFFH-*`, `AEFL-*`, `SM-*` keep their ids verbatim after the file moves. A renamed id breaks every cross-reference in `docs/research/` and the lineage the tests are cited by; a comment at the top of the moved file maps the prefix to the new module name instead.

### 7.4 Which tests move where

| test file (today) | moves to | ids kept |
|---|---|---|
| `MinimalBnn.Tests.fs` | `tests/Bayesian.Tests/Circuit/GaussianCell.Tests.fs` | (3 `[<Fact>]`s, unnamed — name them `GC-1..3` on the way, since unnamed facts cannot be cited) |
| `MultilayerBnn.Tests.fs` | `Circuit/GaussianDagCircuit.Tests.fs` | `MLBNN-1..44` |
| `FactorGraph.Tests.fs` · `Bp.Tests.fs` · `Ep.Tests.fs` · `SoftMode.Tests.fs` | `Circuit/` | as-is |
| `AdinkraEquivariantFactorLayer.Tests.fs` | `Circuit/AdinkraSectorFactor.Tests.fs` | `AEFL-*` |
| `ReferenceFrameFactorHeterarchy.Tests.fs` | `Circuit/` | `RFFH-*` |
| `tests/Tests.FSharp/ToyBosonFermionParity.Tests.fs` | stays in its project; `open Zeta.Bayesian.Network` | as-is |
| `Message.Tests.fs` · `MessageBatch.Tests.fs` · everything in §3.2/§3.3 | stay | — |
| *(new)* `Circuit/Circuit.Tests.fs` | `CIRC-1` (§4) | — |
| *(new)* `Network/EdgeMessageNetwork.Tests.fs` · `Network/Epoch.Tests.fs` | `F-1..F-7` (§5.6) | — |

TypeScript: `planning/student-t-bnn.ts` → `planning/student-t-adf-cell.ts`; `oracle/hl-bnn-bridge.ts` → `oracle/hl-gaussian-dag-bridge.ts`; `model-backend/own-model.ts` keeps `id: "zeta-bnn"` (a published key) and changes only `displayName`. `pr-categorization/bnn.ts` keeps its name (it is one).

### 7.5 A falsifier for the split itself

`src/Core.TypeScript/hygiene/lint-circuit-namespace-carries-no-weight-posterior.ts` (proposed): fails if any file under `src/Bayesian/Circuit/` declares a record field or type whose name matches `/Weight|Bnn|Backprop|Gradient/` outside a comment, or if any file under `src/Bayesian/Network/` fails to declare a posterior over a parameter vector. Drift tier, not `gate (required)`. It is the mechanical form of the name test in §2, and it is what stops the clumping from re-accreting.

### 7.6 Phases

| phase | content | behaviour change | gate |
|---|---|---|---|
| **0** | this document; the four dated glossary entries of §1.3; a one-line note in `docs/ZETA-CORE-TECHNOLOGY-FOR-MAX.md:85` that "BNN" there is sense N-a | none | markdownlint; glossary-churn watcher |
| **1** | directories, namespaces, renames, `Compat.fs` shims; `Bayesian.fsproj` / `Bayesian.Tests.fsproj` path updates; test files moved | **none** — proven by §7.3 (3) | `dotnet build -c Release` 0 warnings; full suite; byte-diff = 0 |
| **2** | consumers migrate off shims (`src/Core/ZSetRx.fs:20` comment, the four TS modules, `own-model.ts` surfaces map); `ExactnessReceipt` added **alongside** the old DU with the projection of §5.4 | none for existing callers | F-2 |
| **3** | remove shims (breaking); `AdinkraSectorFactor.Exactness: string` → the DU | **yes** — separate PR, public-API review | — |
| **4** | `Network/WeightTreaty.fs`, `Network/Epoch.fs`, `Network/EdgeMessageNetwork.fs` — the §5 objects, D-mode first | new surface | F-1..F-7; CIRC-1 |

---

## 8. Claims register

| id | claim | register | what makes it so / what would unmake it |
|---|---|---|---|
| S1 | exactly one module in `src/Bayesian/` satisfies N1 | **measured** | `grep -n "weight" src/Bayesian/*.fs` and the table in §3; unmade by any second module with a parameter posterior |
| S2 | `MinimalBnn` and `MultilayerBnn` satisfy C1–C3 and no N property | **measured** | `file:line` in §3.1; unmade by a learned map anywhere in either module |
| S3 | `MultilayerBnn` on a tree is an arithmetic circuit (Darwiche 2003) | **earned by existing falsifiers** (`MLBNN-17/28/32/38`) for the *output*; **unmetered** for the *construction* until CIRC-1 | CIRC-1 |
| S4 | `MultilayerBnn` is a smooth, decomposable PC | **consistent with** (no sum nodes; tree ⇒ decomposable) | stays "consistent with" until a sum node exists to test smoothness on |
| S5 | the exactness classifier keys on topology ∧ convergence only and would label an acyclic graph with an EP site `ExactAcyclic` | **measured** (`MultilayerBnn.fs:625-629`); latent, since the module cannot build such a graph today | F-2 |
| S6 | the factor→variable message is the only learnable site | **argued** from the cavity identity (Minka 2001) + `MLBNN-35` idempotency | F-3 on a variable-node learner would show bit drift; unrun |
| S7 | L1 (ADF) learning is order-dependent | **measured** in the module's own words (`ToyBosonFermionBnn.fs:235-236`); F-4 would make it a test | F-4 |
| S8 | D (learned parameters) dominates A/B/C on exactness and composability | **`toy`** — argued, unrun | §6 refuters 1–4 |
| S9 | the split can be done with zero behaviour change | **`toy`** until phase 1's byte-diff runs | §7.3 (3) |

---

## 9. Anchors (Beacon) — and how far each was checked

Per `anchor-to-human-prior-art.md`, an anchor must be checked by entailment, not merely cited. The honest state of each, in this pass:

| anchor | used for | checked? |
|---|---|---|
| Darwiche 2003, *A Differential Approach to Inference in Bayesian Networks*, JACM 50(3) | AC = DAG of `+`/`×` compiled from a BN (§4) | **entailment argued in §4** against the code; not page-checked in this pass |
| Choi, Vergari & Van den Broeck 2020, *Probabilistic Circuits: A Unifying Framework for Tractable Probabilistic Modeling* | smooth / decomposable / deterministic ⇒ tractable (§2, §4, §5.4) | the structural-property definitions are used as stated in the 2026-09-01 resolution; **the "no sum nodes ⇒ smoothness vacuous" step is mine and should be checked against their definition of smoothness for circuits without sum units** |
| Poon & Domingos 2011, *Sum-Product Networks* | the instance the umbrella generalises | cited, not load-bearing |
| Kschischang, Frey & Loeliger 2001; Loeliger 2004; Aji & McEliece 2000 | sum-product / GDL over a semiring (§2 C2) | already load-bearing in `FactorGraph.fs` and `MultilayerBnn.fs`; not re-checked |
| Minka 2001, *A family of algorithms for approximate Bayesian inference* | EP cavity identity (§5.2); ADF as one-pass EP (§5.5 L1) | load-bearing in `Ep.fs`, `ToyBosonFermionBnn.fs`, `pr-categorization/bnn.ts`; consistent across all three |
| Weiss & Freeman 2001 | Gaussian loopy BP: means exact at convergence, variances not (§4) | load-bearing in the existing `ConvergedLoopyMeansOnly` receipt; not re-checked |
| MacKay 1992; Neal 1996; Blundell, Cornebise, Kavukcuoglu & Wierstra 2015 | what "BNN" denotes (N1); diagonal-Gaussian variational weight posterior (§5.3) | from standing knowledge; the *definition* is not contested, the specific BBB update is not used numerically here |
| Yoon, Liao, Xiong, Zhang, Fetaya, Urtasun, Zemel & Pitkow 2018, *Inference in Probabilistic Graphical Models by Graph Neural Networks* | topology A/C (§6) | from standing knowledge; **needs page-check** that their message-passing GNN is trained to match marginals (as used) and not only MAP |
| Satorras & Welling 2021, *Neural Enhanced Belief Propagation on Factor Graphs*, AISTATS | topology B (§6): GNN refines BP messages rather than replacing them | from standing knowledge; **needs page-check** of the exact coupling (they run BP and GNN in parallel and combine) |
| Shao, Molina, Vergari, Stelzner, Peharz, Liebig & Kersting 2020, *Conditional Sum-Product Networks*, PGM | topology D (§6): a neural net supplies parameters of a tractable circuit conditioned on inputs | from standing knowledge; **needs page-check** — the claim used is only that the circuit stays tractable in its output variables given the conditioning |
| Peharz et al. 2020, *Einsum Networks*, ICML | tensorised PC layers when `k` is large (§6 D) | cited as the scaling form; not load-bearing |
| Vergari, Choi, Liu, Teso & Van den Broeck 2021, *A Compositional Atlas of Tractable Circuit Operations*, NeurIPS | products and marginals of circuits compose (§6 D composability) | from standing knowledge; **needs page-check** of which operations preserve which properties |
| Cremer, Li & Duvenaud 2018, *Inference Suboptimality in Variational Autoencoders* | amortisation gap (§6 C) | from standing knowledge |
| Herbrich, Graepel & Campbell 2001 (BPM); Graepel, Candela, Borchert & Herbrich 2010 (adPredictor); Opper 1998 | the ADF weight update `ToyBosonFermionBnn` implements (§3.1) | already load-bearing in that module's header; consistent |
| Shapiro, Preguiça, Baquero & Zawirski 2011 | G-Set / state-based CRDT (§5.1) | the evidence-set union is the textbook G-Set; not contested |
| Lukashchuk et al. (Precision-Gated Experts), via `2026-09-02-composable-dag-learning-competitor-matrix.md` §2.2 | the bilinear factor's closed-form variational message for a Gaussian gain (§5.3 M3) | as cited there; not re-checked |
| Bagaev & de Vries (Reactive Message Passing), via the same doc §2.1 | why the schedule is not a learnable site (§5.2) | as cited there |

Five entries say **needs page-check**. Under `toy-is-free-metered-must-be-earned.md` that keeps §5–§6 at `toy` regardless of how the falsifiers land, until those checks are done. They are the first thing to do after the split, not the last.

---

## 10. What this document does not do

- It moves no file, renames no module, and changes no behaviour. `.claude/rules/anti-babel-preserve-reconcilability.md` — a rename is a definition change; it is recorded here with its date and both senses held, and it lands as phases, each with its own falsifier.
- It runs no experiment. Every `toy` mark in §5–§6 is a promise of a falsifier, not a result.
- It does not settle whether a learned edge is worth having *at all* in this repo's problem set. The one experiment on record (`2026-08-27`) says it was not, for one problem. F-7 is the question stated so that a second problem can answer it differently.
- It does not write the glossary entries of §1.3 — they belong to phase 0 alongside this file, in a diff a glossary keeper reviews, because a glossary entry is a definition and definitions are dated, not slipped in.
