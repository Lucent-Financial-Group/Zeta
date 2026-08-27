# PR area statistics

_12,935 merged PRs · 16 areas · temporal split · generated 2026-08-27T04:46:30.274Z_

**The BNN earns its place — but only under distribution shift.**

| model | accuracy | Δ vs baseline | macro F1 | where baseline abstains |
|---|---:|---:|---:|---:|
| closed-form baseline | 59.0% | — | 27.9% | 0.0% |
| majority class | 4.0% | -55.0pp | 0.5% | 2.3% |
| random forest | 65.1% | +6.1pp | 21.1% | 24.2% |
| BNN (ADF probit, one-vs-rest) | 72.4% | +13.4pp | 24.2% | 20.9% |
| hybrid: baseline where it speaks, forest elsewhere | 62.2% | +3.2pp | 27.7% | 24.2% |
| _NULL random forest (labels shuffled)_ | 4.9% | — | 1.5% | — |
| _NULL BNN (labels shuffled)_ | 3.1% | — | 2.3% | — |

Label-shuffle null: 4.9% against a majority-class floor of 4.0%.

| comparison | b | c | p | favours |
|---|---:|---:|---:|---|
| random forest vs closed-form baseline | 489 | 292 | 1.8e-12 | random forest |
| BNN (ADF probit, one-vs-rest) vs closed-form baseline | 614 | 181 | 7.5e-56 | BNN (ADF probit, one-vs-rest) |
| BNN (ADF probit, one-vs-rest) vs random forest | 412 | 176 | 8.6e-23 | BNN (ADF probit, one-vs-rest) |
| hybrid: baseline where it speaks, forest elsewhere vs random forest | 292 | 385 | 0.0004 | random forest |

- Coverage: 73.6% parseable, 26.4% unlabellable.
- Disagreement set: 3,037 PRs (31.9% of parseable).
- k-means ARI 0.144 (null -0.000) — clusters are not the taxonomy.
- **Macro-F1 goes the other way**: baseline 27.9% vs 27.7% for the best model (hybrid: baseline where it speaks, forest elsewhere). The models win on accuracy by serving the large areas; they are no better on the tail.
