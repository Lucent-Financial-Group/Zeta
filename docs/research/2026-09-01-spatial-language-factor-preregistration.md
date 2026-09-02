# Does an Explicit Reference Frame Help English Relational Reasoning?

## A Preregistered Zeta Comparison

**Author:** Manus AI
**Date:** 2026-09-01
**Status:** Preregistered; no benchmark result measured
**Key recommendation:** Test the narrow statement that an explicit spatial reference-frame factor improves systematic generalization on spatial relational English **more than** it improves matched nonspatial reasoning. Do not test or claim that English generally runs on geospatial circuitry.

## 1. Question and Claim Boundary

The motivating hypothesis is that some English meaning may reuse computations developed for spatial reference frames. Existing evidence supports interaction between spatial language and spatial transformation systems, and grid-like or relational codes have been reported in some nonspatial tasks.[1] [2] A serious alternative is that domain-general predictive clustering yields both spatial and conceptual representations without spatial machinery being the universal substrate.[3]

The first Zeta experiment therefore asks:

> Does a declared reference-frame factor improve held-out relational composition specifically on text-defined spatial tasks, after controlling for graph structure, vocabulary labels, model capacity, and generic relation composition?

### The linguistics lineage this hypothesis actually descends from

The neuroscience above was cited and the LINGUISTICS was not, which left the newest
evidence carrying an argument that is decades older. Added 2026-09-01 after an
adversarial review observed the gap. Each is stated with what it entails **and what it
does not**, because an anchor attached to a claim it does not support keeps a model in
`toy` rather than moving it (`.claude/rules/anchor-to-human-prior-art.md`).

- **Lakoff & Johnson, _Metaphors We Live By_ (1980)**[7] — abstract domains are
  systematically structured by spatial and bodily schemas (`argument is war`, `more is
  up`). This is the canonical statement of the intuition behind the maintainer's
  "English runs on the same geospatial wiring."
  **What it does NOT establish:** anything neural. It is a claim about the *structure of
  language*, evidenced from usage patterns, not about shared circuitry. Citing it as
  support for "same wiring" would be exactly the overreach this preregistration exists
  to avoid — it makes the hypothesis *motivated*, not *supported*.

- **Landau & Jackendoff, "'What' and 'where' in spatial language and spatial cognition",
  _Behavioral and Brain Sciences_ 16 (1993)**[8] — and this one **constrains our design
  rather than merely encouraging it.** Their finding is that spatial language encodes a
  *coarse, schematic* geometry: axes, regions, contact, containment — with object shape
  largely abstracted away. English has a few dozen spatial prepositions, not a metric
  space.
  **The consequence for `M_pose` is testable and uncomfortable:** a full rigid-pose model
  with continuous rotors supplies *more* geometric structure than English spatial
  language appears to use. If the reference-frame factor helps, it may help through the
  coarse axial part and not through the metric part.

  **NO EXISTING CONTROL SEPARATES THOSE TWO.** A first draft of this paragraph claimed
  SL-4 did; it does not. SL-4 permutes the direction→vector mapping and so distinguishes
  *uses geometry* from *ignores geometry* — a model relying only on coarse axial
  structure would fail SL-4 exactly as a metric one would. SL-1 (basis
  rotation/reflection invariance) is nearer but still does not isolate it. That gap is
  what this anchor actually contributes, so it is written as a new control rather than
  as a claim that the suite already covers it:

  | ID | Control | Expected implication |
  |---|---|---|
  | SL-11 | Quantise every direction vector to the coarse axial set the language uses (the ~dozen prepositional relations), keeping composition otherwise identical | If `M_pose` retains its advantage, the METRIC structure is unused and the model is doing what Landau & Jackendoff say language does. If it loses the advantage, the metric part is load-bearing — which is a claim about the MODEL, and evidence *against* the language analogy that motivated it |

  SL-11 is the rare control whose *passing* is the uncomfortable result: retention would
  mean the rotor machinery is heavier than the phenomenon requires.

- **Talmy, _Toward a Cognitive Semantics_ (2000)** — figure/ground asymmetry and force
  dynamics as grammatical primitives; the schematic vocabulary Landau & Jackendoff
  measure.

**None of these three is neural evidence, and none is offered as such.** They establish
that spatial *schemas* pervade language. Whether that reuse is implemented on spatial
*circuitry* is the open question, and Mok & Love[3] remains the standing alternative.

This experiment does not test natural-language understanding end to end. The first slice consumes dataset relation labels after parsing and tests the relational inference layer. A later parser benchmark is required before making a claim about English words or syntax.

## 2. Public Evidence Lanes

| Lane | Dataset | Role | Limitation |
|---|---|---|---|
| Spatial development | StepGame[4] | Text-only, controlled multi-hop directional composition | Synthetic templates and finite relation vocabulary |
| Spatial transfer | SpartQA[5] | Richer textual spatial phenomena | Distribution and answer ontology differ from StepGame |
| Nonspatial transfer | CLUTRR[6] | Text-based compositional kinship reasoning with held-out rule combinations | Not perfectly matched to StepGame’s templates or labels |
| Structure-matched ablations | Deterministic transforms of the published StepGame split | Isolate labels, coordinate basis, and geometric laws without creating new examples | Controls the existing benchmark rather than adding ecological validity |

Published train/dev/test partitions remain immutable. No test example may be used to choose relation mappings, hyperparameters, stopping time, or architecture. Path-length results are reported separately; an aggregate score may not hide a collapse at long horizons.

## 3. Model Lanes

All learned lanes receive the same parsed relation graph and use the same evidence IDs, graph topology, training examples, stopping rule, and optimization budget.

| Model | Relation representation | Composition rule | Purpose |
|---|---|---|---|
| `M_pose` | Fixed two-dimensional vectors plus explicit frame transforms | Vector/pose composition constrained by spatial geometry | Target hypothesis |
| `M_table` | Learned unconstrained relation-composition table | Generic associative table where supported by data | Geometry-free symbolic control |
| `M_free` | Learned vectors of the same dimension as `M_pose` | Unconstrained learned composition | Capacity-matched representation control |
| `M_graph` | Categorical factor messages without coordinates | Sum-product over relation labels | Pure composable-factor baseline |
| `M_frequency` | Label/path-frequency predictor | No relational composition | Dataset-bias floor |

`M_pose` may not receive a hand-coded answer unavailable to the other lanes. If the spatial relation vectors deterministically solve StepGame, that is reported as a symbolic solver result, not a learned-language result. Training and deterministic inference results must remain separate.

## 4. Primary Estimands

For dataset `D`, define the paired negative-log-likelihood gain

`Δ_D = NLL(M_graph,D) − NLL(M_pose,D)`.

The primary specificity contrast is

`C = Δ_StepGame − Δ_CLUTRR`.

The hypothesis receives bounded support only if the held-out confidence interval for `C` is above zero and `M_pose` also improves StepGame long-hop calibration or exact accuracy relative to both `M_graph` and the capacity-matched `M_free`. A StepGame gain without a positive specificity contrast supports useful spatial structure, not a claim about English-wide wiring.

| Metric | Status | Reason |
|---|---|---|
| Held-out NLL | Primary | Proper scoring rule for probabilistic predictions |
| Exact answer accuracy | Secondary | Interpretable but insensitive to calibration |
| Expected calibration error | Secondary, with fixed bins declared before training | Detects confident errors but depends on binning |
| Brier score | Secondary | Proper finite-answer probability score |
| Runtime and parameter count | Resource report | Prevents hidden capacity from masquerading as geometry |

All intervals are paired across the same examples. The analysis reports raw per-path-length counts and scores. No example deletion is permitted after seeing model outputs except malformed records identified by a predeclared parser rule and reported with hashes.

## 5. Falsifiers and Negative Controls

| ID | Control | Expected implication |
|---|---|---|
| SL-1 | Passive rotation/reflection of every coordinate basis, applied consistently | `M_pose` predictions remain invariant after decoding |
| SL-2 | Reverse one composition order | Long-hop spatial predictions change and degrade |
| SL-3 | Consistent bijection of direction words across train and test, with the mapping supplied to every model | Geometry result is label-name invariant |
| SL-4 | Independently permute the direction-to-vector mapping at test time without a dictionary | `M_pose` loses its advantage; otherwise it was ignoring geometry |
| SL-5 | Replace spatial vectors with free learned vectors of equal dimension | Separates geometric law from parameter count |
| SL-6 | Evaluate the same architecture on CLUTRR | Equal or larger gains count against spatial specificity |
| SL-7 | Shuffle graph edges while preserving label frequencies | All compositional models should fail toward the frequency floor |
| SL-8 | Replace full reference-frame transport with token co-occurrence | Any surviving performance is lexical/statistical, not frame-based |
| SL-9 | Duplicate one evidence edge under the same `EvidenceId` | Posterior remains unchanged |
| SL-10 | Hold out longer path lengths and relation compositions | Tests systematic generalization rather than interpolation |

The control suite is considered non-vacuous only if at least SL-2, SL-4, and SL-7 measurably damage the target model. A geometry lane that survives an incorrect coordinate dictionary is not using the declared geometry.

## 6. Decision Table

| Observed pattern | Allowed interpretation |
|---|---|
| `M_pose` beats all controls on spatial lanes and `C>0` | Explicit spatial structure helps this bounded relational benchmark |
| `M_pose` improves StepGame but ties `M_free` | Low-dimensional composition helps; geometric constraint adds no measured value |
| `M_pose` improves StepGame and CLUTRR equally | Generic compositional inductive bias, not spatial specificity |
| `M_table` beats `M_pose` on spatial transfer | Fixed Euclidean relation algebra is too restrictive for that lane |
| Test-time mapping mutation does not hurt | Geometry path is vacuous or bypassed |
| Coordinate-basis change alters decoded answers | Reference-frame implementation is unsound |
| No lane beats `M_frequency` | Dataset or pipeline does not expose relational inference |

No outcome establishes that English, language generally, or conceptual thought is implemented by grid cells or cortical geospatial wiring. A positive result would justify a narrow spatial-relation factor in Zeta; a negative result would preserve the generic factor-graph path and reject the stronger adapter for that benchmark.

## 7. Reproducibility Contract

The implementation must pin dataset revisions and file hashes, publish the exact split manifest, fix seeds before training, serialize predictions as text/JSON rather than opaque binaries, and run at least one independent scoring implementation. Model selection uses development data only. The test report includes every lane, every declared control, and all failed runs; it may not publish only the best seed.

## 8. Current Status

No benchmark has been downloaded, trained, or scored in this contract. The public datasets have been identified, the comparison and falsifiers are frozen, and the RFFH implementation may expose the required interfaces. Language grounding remains **unmeasured** until the complete protocol is run.

## References

[1]: https://pmc.ncbi.nlm.nih.gov/articles/PMC9578291/ "Emmorey et al., Neural correlates for spatial language"
[2]: https://www.pnas.org/doi/10.1073/pnas.2413449122 "Haga et al., A unified neural representation model for spatial and conceptual computations"
[3]: https://www.nature.com/articles/s41467-019-13760-8 "Mok and Love, A non-spatial account of place and grid cells"
[4]: https://arxiv.org/abs/2204.08292 "Shi et al., StepGame"
[5]: https://aclanthology.org/2021.naacl-main.364/ "Mirzaee et al., SpartQA"
[6]: https://aclanthology.org/D19-1458/ "Sinha et al., CLUTRR"
[7]: https://press.uchicago.edu/ucp/books/book/chicago/M/bo3637992.html "Lakoff and Johnson, Metaphors We Live By (1980)"
[8]: https://doi.org/10.1017/S0140525X00029733 "Landau and Jackendoff, What and where in spatial language and spatial cognition, BBS 16 (1993)"
[9]: https://mitpress.mit.edu/9780262700962/toward-a-cognitive-semantics/ "Talmy, Toward a Cognitive Semantics (2000)"
