# PR area statistics

_13,154 merged PRs · 16 areas · temporal split · generated 2026-08-28T21:48:54.161Z_

**The BNN earns its place — but only under distribution shift.**

| model | accuracy | Δ vs baseline | macro F1 | where baseline abstains |
|---|---:|---:|---:|---:|
| closed-form baseline | 58.2% | — | 28.6% | 0.0% |
| majority class | 3.8% | -54.4pp | 0.5% | 2.2% |
| random forest | 69.7% | +11.5pp | 21.6% | 26.9% |
| BNN (ADF probit, one-vs-rest) | 72.9% | +14.7pp | 26.6% | 24.3% |
| hybrid: baseline where it speaks, forest elsewhere | 61.9% | +3.7pp | 28.7% | 26.9% |
| _NULL random forest (labels shuffled)_ | 4.1% | — | 1.1% | — |
| _NULL BNN (labels shuffled)_ | 2.6% | — | 1.8% | — |

Label-shuffle null: 4.1% against a majority-class floor of 3.8%.

| comparison | b | c | p | favours |
|---|---:|---:|---:|---|
| random forest vs closed-form baseline | 539 | 162 | 3.7e-48 | random forest |
| BNN (ADF probit, one-vs-rest) vs closed-form baseline | 649 | 164 | 5.7e-69 | BNN (ADF probit, one-vs-rest) |
| BNN (ADF probit, one-vs-rest) vs random forest | 263 | 155 | 1.4e-7 | BNN (ADF probit, one-vs-rest) |
| hybrid: baseline where it speaks, forest elsewhere vs random forest | 162 | 418 | 4.7e-27 | random forest |

- Coverage: 73.7% parseable, 26.3% unlabellable.
- Disagreement set: 3,089 PRs (31.9% of parseable).
- k-means ARI 0.103 (null 0.000) — clusters are not the taxonomy.
