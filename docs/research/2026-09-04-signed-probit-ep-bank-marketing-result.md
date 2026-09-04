# Result — Finite Signed-Probit EP on UCI Bank Marketing

**Recommendation:** Retain this as a **bounded non-Gaussian factor-query
receipt**, not as a capability promotion. The exact-integral comparator agrees
closely with the finite EP output on the declared scalar model, while the
held-out score difference against a global-rate baseline is small and has no
generalization claim.

## Declared run

The run uses the CC BY 4.0 UCI Bank Marketing `bank-additional-full.csv`
source, whose 41,188 records are documented as date ordered.[1] The extracted
CSV hash was
`74ADFC578BF77A7FF4BB1BA4A9F8709D9E3C6907342959C2C8416847E0AFB4D8`.
Rows 1–32,950 form the fixed source-order training segment; rows 32,951–41,188
are held out. Only the source row, the pre-contact `housing` category, and the
binary outcome `y` are consumed. The documented `duration` field and every
other column remain outside this model.[1]

The three observed `housing` forms—`no`, `yes`, and `unknown`—are retained as
three independent scalar groups. The initial two-group proposal refused at
row 30 because it encountered `unknown`; it was revised to retain that third
category rather than dropping or reclassifying it. Each group has a
`Normal(0,1)` latent and a signed-probit likelihood. This is a finite EP
Gaussian approximation, even though each local probit moment projection has a
closed form.[2]

| Receipt field | Value |
|---|---:|
| Canonical input fingerprint | `488C65230DDEAB54A41BB0B6DF7DF1634C50D39E8CDF6859CB0163CD4D92302A` |
| Training / held-out rows | 32,950 / 8,238 |
| EP Brier score | 0.2730078099 |
| Beta(1,1) global-rate Brier score | 0.2730749986 |
| EP − baseline Brier | −0.0000671887 |
| EP mean negative log predictive density | 0.8940258065 |
| Beta(1,1) baseline mean negative log predictive density | 0.8942828394 |
| EP − baseline mean negative log predictive density | −0.0002570329 |

## Independent posterior comparison

The F# query and independently authored Python oracle receive the same
reported per-group count and success statistics. The Python oracle uses its
standard-library `erf` normal CDF and scaled Simpson integration of the exact
one-dimensional posterior. It does not import the F# EP implementation. The
largest observed discrepancy occurred in the retained `housing-unknown`
group, whose smaller training count is 781.

| Group | Training count | Successes | Max absolute mean error | Max absolute variance error | Max absolute predictive error |
|---|---:|---:|---:|---:|---:|
| `housing-no` | 15,191 | 929 | 1.26468895e-7 | 2.92761098e-8 | 2.28287812e-10 |
| `housing-yes` | 16,978 | 1,130 | 2.19873567e-7 | 1.93953842e-8 | 1.48139404e-10 |
| `housing-unknown` | 781 | 41 | 4.57142149e-6 | 1.48038225e-5 | 6.25867571e-8 |

This compares a Gaussian EP approximation with an exact **one-dimensional**
integral under exactly the declared model. It does not make EP exact on a
larger graph, validate a different likelihood, or show a result for arbitrary
non-Gaussian observations. EP is a local site-projection method whose global
result can depend on its approximation family and schedule.[2] [3]

## Interpretation boundary

Both reported scoring differences favor this EP query on this one fixed,
historical split, but the margins are small. No statistical significance test,
resampling study, decision threshold, or deployment analysis has been
performed. The dataset may contain repeated contacts for a client, so rows are
not assumed independent.[1] Therefore the run is neither a marketing
recommendation nor an individual-level prediction claim.

The only replicated-state claim remains unchanged: a canonical
content-addressed evidence union may converge as CRDT state. The EP posterior
above is a deterministic materialized query after canonical ordering; it is
not an ACI merge. A duplicate source-row identity is refused, while the same
label under a new source row is a separate non-idempotent datum. The complete
machine-readable receipt is stored in
`docs/research/data/2026-09-04-signed-probit-ep-bank-marketing-result.json`.

## References

[1] [Moro, Rita, and Cortez, *Bank Marketing*, UCI Machine Learning Repository](https://archive.ics.uci.edu/dataset/222/bank+marketing)

[2] [Anceschi et al., *Scalable Expectation Propagation for Generalized Linear Models*, arXiv:2407.02128 (2024)](https://arxiv.org/abs/2407.02128)

[3] [Şenöz et al., *Variational Message Passing and Local Constraint Manipulation in Factor Graphs*, Entropy 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8303273/)
