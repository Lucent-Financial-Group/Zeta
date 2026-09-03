# Common-noise forecast query — source notes

**Status:** Source notes only; no result or Zeta claim

Poncela and Senra, *Forecast Combination through Factor Models: Assessing consensus and disagreement* ([International Institute of Forecasters PDF](https://forecasters.org/wp-content/uploads/Poncela_2005-1.pdf)), model multiple forecasts as a low-dimensional common-factor component plus forecast-specific residuals. Their factor-combination rule estimates common factors from past forecast panels and evaluates true ex-ante forecasts by re-estimating only with information available before each forecast period. The source also emphasizes that equal weighting is difficult to beat and that adding factors does not automatically improve accuracy. This supports testing a declared common-noise/factor query, but it does not establish that such a query will help ETTh1.

Weigt and Wilfling, *An approach to increasing forecast-combination accuracy through VAR error modeling* ([Journal of Forecasting open copy](https://www.econstor.eu/bitstream/10419/233668/1/for.2733.pdf), DOI `10.1002/for.2733`), use past forecast-error vectors to estimate cross-series dependence, adapt future forecasts, and evaluate out of sample. They explicitly distinguish an ex-post upper benchmark from realistic ex-ante model selection and report that high forecast-error correlation can make covariance inversion numerically unstable. This supports chronological train/validation/test separation and an explicit conditioning/refusal control.

The directly accessible INFORMS pages for *Combining Forecasts from Multiple Experts for Multiple Variables* (`10.1287/mnsc.2024.06161`) and *Bias–variance trade-off and shrinkage of weights in forecast combination* (`10.1287/mnsc.2019.3476`) returned only login shells during this audit. No theorem, method detail, or result from those pages is accepted here beyond bibliographic discovery; they must not carry the contract.

## Boundary for the next contract

The next ETTh1 query should estimate a **one-common-factor plus diagonal residual covariance** from training residuals, select any strength or regularization only on validation, and execute once on held-out test data. The zero-common-factor mutation must change the selected artifact; otherwise the mechanism is vacuous and the query fails regardless of calibration. This remains a deterministic query over deduplicated evidence state, never a CRDT merge.

## Independent-oracle boundary

The existing Python oracle independently parses the pinned CSV, constructs the frozen windows and four experts, fits the ridge expert, computes metrics, and reproduces the xorshift32 moving-block bootstrap. CFB-D may reuse that Python-only data boundary, but its new factor mathematics must not port TypeScript’s 256-step power iteration. It will use `numpy.linalg.eigh` on the symmetric training covariance, orient the leading eigenvector canonically, apply the frozen uniqueness floor and ridge, and then use the existing independently authored NumPy active-set solver. Agreement of those distinct eigen-solvers is a load-bearing cross-check.
