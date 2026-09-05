# Non-Gaussian Factor Benchmark: Source Notes

**Status:** Source notes only. This document does not change inference code,
declare a benchmark result, or establish generic non-Gaussian capability.

## Decision-Relevant Sources

| Candidate | Verified support | Constraint on a Zeta increment |
|---|---|---|
| Unary probit EP | EP repeatedly replaces one likelihood site by a Gaussian moment-matched projection of its cavity-times-site hybrid. A Gaussian prior plus binary/probit likelihood lacks a generally closed-form posterior. [1] | Current Zeta has this unary EP site, but no public-data held-out receipt or independently authored exact posterior oracle. |
| Scalable EP for GLMs | A 2024 preprint reports an EP GLM formulation and publishes an MIT-licensed R implementation with probit and Poisson illustrations. [2] [3] | Its high-dimensional efficiency and its reported real-data performance are not comparable to Zeta's present unary factor without a shared model, data, and metric protocol. |
| Constrained VMP | Factor-graph VMP can be derived from a constrained Bethe-free-energy objective; changing local constraints changes the approximation and evidence-estimation trade-off. [4] | A VMP comparison requires declaring the variational family, objective, schedule, and evidence metric; it cannot be treated as a free exactness upgrade. |
| Closed-form Gaussian/Gamma VMP composition | A 2026 preprint declares a five-factor Gaussian/Gamma/exponential/equality grammar and reports time-series expert-gating experiments. [5] | It needs Gamma, exponential-link, and structured-message machinery absent from the current Zeta factor API. Reproducing its full composition is not a narrow first increment. |
| Public binary-outcome data | UCI's Bank Marketing dataset contains 45,211 instances, a binary term-deposit outcome, date-ordered full datasets, and a CC BY 4.0 license. [6] | A bounded benchmark can use only declared pre-contact covariates and fixed source order. It must disclose repeat client contacts and must not make operational marketing, credit, or behavioral claims. |

## Conservative Direction

The most implementable first non-Gaussian lane is a finite **unary signed-probit
EP posterior query**, compared with independently implemented one-dimensional
numerical integration under the same Gaussian-prior, binary-probit model. The
public-data lane should use a fixed, content-addressed UCI Bank Marketing slice
only after data provenance and a pre-contact feature policy are frozen. It
should be reported as model-fit and held-out posterior-predictive calibration
under the declared model, not as a generic classification, language, or agent
learning result.

Canonical content-addressed evidence union remains a separate CRDT state
operation. The EP posterior is a deterministic query over one fixed,
conflict-free, canonically ordered input catalogue. It is not an ACI merge;
sequential EP is order-sensitive without an explicit schedule.

## References

[1] [Anceschi et al., *Scalable Expectation Propagation for Generalized Linear Models*, arXiv:2407.02128 (2024)](https://arxiv.org/abs/2407.02128)

[2] [Anceschi et al., arXiv HTML full text](https://arxiv.org/html/2407.02128v1)

[3] [Anceschi et al., EPglm reference implementation, MIT license](https://github.com/niccoloanceschi/EPglm)

[4] [Şenöz et al., *Variational Message Passing and Local Constraint Manipulation in Factor Graphs*, Entropy 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8303273/)

[5] [Lukashchuk et al., *Composing Non-Conjugate Factor Graphs with Closed-Form Variational Inference*, arXiv:2605.29467 (2026 preprint)](https://arxiv.org/abs/2605.29467)

[6] [Moro, Rita, and Cortez, *Bank Marketing*, UCI Machine Learning Repository](https://archive.ics.uci.edu/dataset/222/bank+marketing)
