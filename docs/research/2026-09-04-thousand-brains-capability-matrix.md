# Thousand Brains Capability Matrix for Current Zeta Surfaces

> **Status:** Bounded interface inventory. **Recommendation: use the current multi-observer and frame-tagged primitives as a software test bed only.** They do not implement a cortical column, a biological sensorimotor system, or the Thousand Brains theory of intelligence.

The Thousand Brains sources discuss proposed cortical reference frames, movement-conditioned predictions, object models, and voting among many cortical columns.[1] [2] The table below compares only named software interfaces against those proposed functions. “Present” means a finite code surface exists; it does not mean that the proposed biological function is achieved.

| Proposed functional theme | Current Zeta surface | Status | Bounded evidence and limit |
| --- | --- | --- | --- |
| Partial observations | `ThousandBrains.Column`, `SpatialColumn`, `ReferenceFrameFactorHeterarchy.ColumnMessage` | **Present as records** | Software records contain Gaussian values and labels. They are not sensor streams or cortical cells. |
| Frame compatibility | `SpatialColumn.Frame`, `spatialConsensus`, RFFH `Pose` | **Present, limited** | Mixed string frame tags are refused; RFFH has a declared finite `Cl3` rotation transport. No learned object-attached frame or landmark inference is present. |
| Feature/location pairing | No paired feature-location learning object | **Absent** | Existing records carry values and frames but no learned feature-to-location association or object identity model. |
| Movement-conditioned prediction | No movement/action transition model in the finite spatial-column API | **Absent** | No sensorimotor sequence or prediction-error learning is implemented here. |
| Lateral agreement | Weighted Gaussian consensus query | **Present as query** | It is neither EP nor a replicated CRDT merge; numerical order and evidence provenance remain separate concerns. |
| Many-column scale | List/array inputs and finite factor graphs | **Unmeasured** | No throughput, fault tolerance, scaling, or aggregate accuracy result has been established. |
| Object learning and recognition | No declared train/evaluate loop | **Absent** | No learned objects, recognition accuracy, or transfer result. |
| Continual learning and retention | No task-sequence benchmark receipt | **Absent** | Continual World, Meta-World, and CompoSuite remain future, separately contracted benchmark lanes.[3] |
| Language interface | Finite lexical seed and correction receipts | **Lexical only** | Exact forms, unknowns, conflicts, and provenance are retained; no grammar, word sense, dialogue, or natural-language understanding is implemented. |

The lexical-geometric bridge added under its own contract can supply a user-declared vector to a frame-tagged Gaussian **input**. It does not fill the absent rows: it neither learns a frame nor turns a lexical seed into an object model.[4]

## References

[1] [Hawkins, Lewis, Klukas, Purdy, and Ahmad, “A Framework for Intelligence and Cortical Function Based on Grid Cells in the Neocortex” (2019)](https://www.frontiersin.org/journals/neural-circuits/articles/10.3389/fncir.2018.00121/full)

[2] [Clay, Leadholm, and Hawkins, “The Thousand Brains Project: A New Paradigm for Sensorimotor Intelligence” (2024)](https://arxiv.org/abs/2412.18354)

[3] [Transfer-benchmark source notes, 2026-09-04](2026-09-04-transfer-benchmark-source-notes.md)

[4] [User-declared lexical-geometric Bayesian input contract, 2026-09-04](2026-09-04-user-declared-lexical-geometric-input-contract.md)
