# gSCAN Lexical-Geometric Transfer Benchmark Contract

> **Status:** Frozen benchmark contract with a completed lexical-admission preflight and no model run. **Recommendation: begin gSCAN `situational_1` scoring only after an explicit model adapter and official evaluator path are implemented.** This is a finite synthetic-grid benchmark plan, not a result, an English-language result, a real-world navigation result, or evidence of general learning.

## 1. Claim under test

The only candidate claim is narrow: under one fixed gSCAN source revision, split, budget, and evaluator, does a declared lexical-geometric feature encoding improve **held-out exact action-sequence accuracy** over a named token-only baseline? A negative result, an unavailable-data result, or a failed execution-validity check is a valid result.

| Item | Frozen declaration |
| --- | --- |
| Upstream | `LauraRuis/groundedSCAN`, commit `29d2247dff8f060f81910092a3bc01eef6874ff7` (2022-01-10) [1] |
| License | MIT; retain upstream notice with any adapter [2] |
| Task carrier | Synthetic instruction plus finite feature-vector grid world, predicting low-level action sequences [3] |
| First split | `situational_1` only: held-out agent/target south-west relation [3] |
| Data identity | `data/compositional_splits.zip`, SHA-256 `92228fef0551c5ac1de349c34a91ab714a159bd3f07979bd9704e1a89c7431f9`; archive member `compositional_splits/dataset.txt`; parser version, row counts, and split statistics must be recorded before the first run |
| Seed | One declared seed, `0`, with no seed selection after observing scores |
| Primary metric | Official-evaluator exact action-sequence accuracy on the named held-out split |
| Secondary metric | Official world execution validity, recorded separately from exact match |
| Compute envelope | One CPU-only run of at most 60 wall-clock minutes; report actual host, elapsed time, peak memory, and early termination |

The upstream source describes its grammar and internally represented logical forms as benchmark machinery. This contract does not promote those representations to natural-language semantics.[3]

## 2. Required model variants

All variants must receive the same parsed training examples, split, seed, tokenization, action vocabulary, and training-time limit. No score may be compared across different source revisions or data hashes.

| Variant | Inputs permitted | Purpose |
| --- | --- | --- |
| `T0` token-only | Instruction tokens and required grid representation; no lexical-geometric receipt | Baseline for the declared benchmark adapter |
| `G0` declared geometry | `T0` inputs plus fixed lexical-geometric receipt features for exact declared forms | Tests whether this particular added feature changes the named metric |
| `G-permuted` negative control | `G0` with a documented fixed permutation of calibration coordinates, preserving dimensions and token coverage | Tests whether any result is sensitive to the declared geometry rather than extra feature capacity alone |
| `G-unresolved` ablation | `G0` with every lexical-geometric projection retained as unresolved | Tests whether a result depends on resolved declared calibration entries |

The user-declared calibration remains absent from version control. Until a user supplies a versioned calibration with consent, all `G0` work uses an explicitly non-personal fixture and cannot be described as evaluating a personal representation.

### Preflight admission gate

The pinned paper-data archive was profiled without executing upstream generator or model code. It contains 367,933 `train` examples and 88,642 `situational_1` examples. The current 65-entry candidate seed exposes 75 normalized forms including allolexes. It covers 214,108 of 1,898,360 command-token occurrences in `train` (11.27857730%) and 51,578 of 457,355 in `situational_1` (11.27745406%). The unresolved forms include the article, preposition, actions, colors, shapes, adverbs, and multiword adverbs used by the selected grammar.

Therefore **no full-command lexical-geometric `G0` example is admitted under the current seed**. It would be false to call an unmeasured sparse `big`/`small` feature a test of the declared lexical-geometric representation. The runner must emit `preflight-unresolved` and refuse to score `G0` until either:

1. A versioned, non-personal calibration fixture covers every normalized form in a declared evaluation subset, with excluded counts retained; or
2. The contract is amended before execution to name a partial-coverage ablation, its unresolved receipt, its train/test selection rule, and a baseline that has the same non-lexical inputs.

`T0`, `G0`, `G-permuted`, and `G-unresolved` remain planned variants. No model has run, no action-sequence score exists, and this preflight block is an informative negative result rather than a benchmark failure.

The streaming preflight implementation was then run against the full 4,225,776,355-byte member, using `ijson==3.5.1` and a binary file reader. Its receipt is committed at `docs/research/data/2026-09-05-gscan-situational-1-lexical-preflight.json`; raw upstream data remains outside version control. It completed in 43.422 seconds with an observed wrapper resident-set maximum of 35,460 KiB and returned `preflight-unresolved`: 405,777 of 457,355 command-form occurrences were unresolved. Thus the input is readable within the declared resource envelope, but the current seed does not admit the `G0` model variant.

A separately authored `ijson.parse` event-stream oracle reproduced every stable field of that receipt from the explicit external paths; the full two-implementation plus committed-receipt check completed in 105.947 seconds and returned `verified`. Mutating only the committed `unresolved_form_count` from 405,777 to zero in a temporary receipt made the verifier exit nonzero (`mutation_exit=1`). These checks establish the stated finite receipt comparison, not a model score or a general parser guarantee.

### Preflight receipt rules

The first runnable component is a **diagnostic**, not an evaluator. It accepts explicit paths to one JSON dataset and one seed JSON, plus the expected dataset SHA-256. It normalizes a command only by splitting its comma-delimited source form and lowercasing each non-empty token; it does not stem, infer synonyms, expand phrases, infer a grammar, or derive coordinates from a hash.

| Receipt status | Required meaning | Scoring allowed? |
| --- | --- | --- |
| `preflight-lexically-covered` | Every selected command token is admitted by the versioned seed. This is not yet coordinate-calibration admission. | No; a separately declared non-personal coordinate-calibration gate remains required. |
| `preflight-unresolved` | At least one selected command token has no admitted form or calibration. Retain every unresolved token and count. | No. |
| `dataset-hash-mismatch` | The bytes at the explicit dataset path do not match the declared source hash. | No. |
| `malformed-dataset` | The JSON carrier or selected split does not have the declared finite structure. | No. |
| `malformed-seed` | The seed fails the existing versioned seed parser. | No. |

An admissible `preflight-unresolved` receipt exits normally because it is a measurement outcome, not a parser crash. The other four failure statuses must refuse scoring and produce no partially measured model result. `preflight-lexically-covered` also refuses scoring until the later coordinate-calibration gate is declared. A deterministic input reorder must preserve aggregate counts and canonical token lists. A deliberate seed-entry removal must be detected as either a changed receipt or a new unresolved token. These are the pre-implementation fault controls.

The streaming implementation is not its own numerical authority. Before any public receipt is accepted, a separately authored Python oracle must parse the same JSON carrier incrementally, produce the same schema, and be compared field-by-field against the production receipt. A small synthetic fixture must exercise valid coverage, unresolved retention, malformed input, hash mismatch, and a seed-removal mutation. For the full external carrier, a separate explicit-path verifier must re-run both implementations and refuse if either differs from the committed summary receipt. Raw data remains external; only the verified summary is versioned.

## 3. Admission, correction, and result receipt

The adapter must retain source-form, normalized-form, seed ID, calibration fingerprint, coordinate, RGB metadata, uncertainty, and unresolved/conflict states. It must refuse bad schema and preserve all correction-conflict content IDs. It must not infer synonyms, collapse a conflict, or use hash-derived coordinates as a default.

| Gate | Required observable receipt | Failure reading |
| --- | --- | --- |
| Dataset | Upstream commit, archive SHA-256, parser version, row counts, split statistics | Dataset identity was not established |
| Feature admission | Counts for resolved, unresolved token, unresolved calibration, conflict, and refusal outcomes | Feature coverage was obscured |
| Train/test boundary | Training and held-out fingerprints plus no-overlap check | Transfer boundary is invalid |
| Evaluation | Official evaluator command, prediction file hash, exact-match count, execution-valid count | Metric is not reproducible |
| Controls | Metrics for `T0`, `G0`, `G-permuted`, and `G-unresolved` | Claimed feature effect is not discriminated |

No result can be called a transfer improvement unless `G0` exceeds `T0` under the same receipt and is distinguishable from both negative controls. That still establishes only a measurement on this source, split, model, and budget.

## 4. Explicit non-claims

This contract does not test open English, grounded perception outside the synthetic grid, personal cognition, cortical columns, geospatial truth, continual learning, causal understanding, or general intelligence. Published gSCAN scores are not targets for this implementation because model family, data preprocessing, and budget must match before numerical comparison.[3] [4]

## References

[1] [groundedSCAN master commit feed](https://github.com/LauraRuis/groundedSCAN/commits/master.atom)

[2] [groundedSCAN MIT License](https://raw.githubusercontent.com/LauraRuis/groundedSCAN/master/LICENSE)

[3] [Ruis et al., “A Benchmark for Systematic Generalization in Grounded Language Understanding” (2020)](https://arxiv.org/abs/2003.05161)

[4] [groundedSCAN source and evaluation documentation](https://github.com/LauraRuis/groundedSCAN)
