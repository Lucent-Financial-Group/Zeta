# PR area statistics

_13,259 merged PRs · 16 areas · temporal split · generated 2026-08-29T00:59:30.741Z_

**The BNN earns its place — but only under distribution shift.**

| model | accuracy | Δ vs baseline | macro F1 | where baseline abstains |
|---|---:|---:|---:|---:|
| closed-form baseline | 58.2% | — | 28.7% | 0.0% |
| majority class | 3.7% | -54.6pp | 0.4% | 2.2% |
| random forest | 71.6% | +13.4pp | 22.6% | 29.1% |
| BNN (ADF probit, one-vs-rest) | 74.4% | +16.2pp | 25.4% | 29.6% |
| hybrid: baseline where it speaks, forest elsewhere | 62.2% | +4.0pp | 28.8% | 29.1% |
| _NULL random forest (labels shuffled)_ | 4.4% | — | 1.3% | — |
| _NULL BNN (labels shuffled)_ | 20.2% | — | 4.6% | — |

Label-shuffle null: 20.2% against a majority-class floor of 3.7%.

| comparison | b | c | p | favours |
|---|---:|---:|---:|---|
| random forest vs closed-form baseline | 609 | 164 | 6.1e-61 | random forest |
| BNN (ADF probit, one-vs-rest) vs closed-form baseline | 689 | 153 | 6.5e-82 | BNN (ADF probit, one-vs-rest) |
| BNN (ADF probit, one-vs-rest) vs random forest | 238 | 147 | 4.1e-6 | BNN (ADF probit, one-vs-rest) |
| hybrid: baseline where it speaks, forest elsewhere vs random forest | 164 | 478 | 1.6e-36 | random forest |

- Coverage: 73.8% parseable, 26.2% unlabellable.
- Disagreement set: 3,111 PRs (31.8% of parseable).
- k-means ARI 0.089 (null -0.001) — clusters are not the taxonomy.
