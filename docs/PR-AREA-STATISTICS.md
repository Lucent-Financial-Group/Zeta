# PR area statistics

_13,329 merged PRs · 16 areas · temporal split · generated 2026-08-29T06:45:35.104Z_

**The BNN earns its place — but only under distribution shift.**

| model | accuracy | Δ vs baseline | macro F1 | where baseline abstains |
|---|---:|---:|---:|---:|
| closed-form baseline | 58.3% | — | 28.6% | 0.0% |
| majority class | 3.6% | -54.6pp | 0.4% | 2.2% |
| random forest | 75.3% | +17.0pp | 22.2% | 27.5% |
| BNN (ADF probit, one-vs-rest) | 76.8% | +18.6pp | 26.5% | 33.3% |
| hybrid: baseline where it speaks, forest elsewhere | 62.0% | +3.7pp | 28.6% | 27.5% |
| _NULL random forest (labels shuffled)_ | 5.0% | — | 1.5% | — |
| _NULL BNN (labels shuffled)_ | 15.1% | — | 4.5% | — |

Label-shuffle null: 15.1% against a majority-class floor of 3.6%.

| comparison | b | c | p | favours |
|---|---:|---:|---:|---|
| random forest vs closed-form baseline | 751 | 183 | 2.8e-82 | random forest |
| BNN (ADF probit, one-vs-rest) vs closed-form baseline | 787 | 168 | 2.3e-96 | BNN (ADF probit, one-vs-rest) |
| BNN (ADF probit, one-vs-rest) vs random forest | 189 | 138 | 0.0056 | BNN (ADF probit, one-vs-rest) |
| hybrid: baseline where it speaks, forest elsewhere vs random forest | 183 | 627 | 1.3e-57 | random forest |

- Coverage: 73.9% parseable, 26.1% unlabellable.
- Disagreement set: 3,134 PRs (31.8% of parseable).
- k-means ARI 0.106 (null -0.001) — clusters are not the taxonomy.
- **Macro-F1 goes the other way**: baseline 28.6% vs 28.6% for the best model (hybrid: baseline where it speaks, forest elsewhere). The models win on accuracy by serving the large areas; they are no better on the tail.
