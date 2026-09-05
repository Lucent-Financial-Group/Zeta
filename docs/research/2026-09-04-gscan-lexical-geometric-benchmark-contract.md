# gSCAN Lexical-Geometric Transfer Benchmark Contract

> **Status:** Frozen pre-implementation contract. **Recommendation: begin with gSCAN `situational_1` only after an explicit model adapter and official evaluator path are implemented.** This is a finite synthetic-grid benchmark plan, not a result, an English-language result, a real-world navigation result, or evidence of general learning.

## 1. Claim under test

The only candidate claim is narrow: under one fixed gSCAN source revision, split, budget, and evaluator, does a declared lexical-geometric feature encoding improve **held-out exact action-sequence accuracy** over a named token-only baseline? A negative result, an unavailable-data result, or a failed execution-validity check is a valid result.

| Item | Frozen declaration |
| --- | --- |
| Upstream | `LauraRuis/groundedSCAN`, commit `29d2247dff8f060f81910092a3bc01eef6874ff7` (2022-01-10) [1] |
| License | MIT; retain upstream notice with any adapter [2] |
| Task carrier | Synthetic instruction plus finite feature-vector grid world, predicting low-level action sequences [3] |
| First split | `situational_1` only: held-out agent/target south-west relation [3] |
| Data identity | Archive URL, SHA-256, parsed-example count, and split statistics must be recorded before the first run |
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
