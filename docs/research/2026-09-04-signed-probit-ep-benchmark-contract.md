# Contract — Finite Signed-Probit EP Benchmark

**Status:** Frozen benchmark contract. It defines a bounded experimental query
and its rejection conditions. It does not yet implement a new inference engine,
change CRDT state semantics, or establish generic non-Gaussian inference.

## 1. Decision

The first new non-Gaussian increment is a **three-group, one-dimensional,
signed-probit expectation-propagation (EP) query**. It uses the existing
Gaussian message family, but not the generic `FactorGraph` scheduler: the
generic implementation derives each unary cavity by enumerating every incident
factor and is quadratic in the number of sites. The bounded query instead
maintains one scalar natural-parameter total per group and subtracts the
current site to derive its cavity in constant time.

The query is exact only at the local **probit tilted-distribution
moment-matching** step. Its global posterior is an EP Gaussian approximation.
It must therefore be labeled `ApproximateUnaryEP`, never `ExactAcyclic`.

## 2. Declared model

For `g ∈ {housing-no, housing-yes, housing-unknown}`, the model has one scalar latent
`θ_g ~ Normal(0, 1)`. For each record assigned to `g`, the binary outcome is
encoded as `y_i ∈ {-1, +1}` and has likelihood

```text
P(y_i | θ_g) = Φ(y_i θ_g).
```

Each site is represented by an unnormalised scalar Gaussian natural-parameter
pair. A canonical pass updates the site in increasing source-row order:

1. remove the prior site from the group total to form a proper cavity;
2. map the signed cavity for `θ_g` to the positive-probit cavity for
   `y_i θ_g`;
3. use the existing closed-form probit projection;
4. map the projected moments back to `θ_g` and divide by the cavity to form
   the proposed site;
5. either apply the declared damping coefficient or refuse the run when a
   proper finite cavity or posterior cannot be formed.

The primary receipt uses `maxPasses = 16`, damping `1.0`, residual tolerance
`1e-10`, prior variance `1.0`, and a source-row canonical schedule. The
receipt records convergence status, passes, posterior means and variances,
and the fixed input fingerprint.

## 3. Data and split

The benchmark source is UCI's **Bank Marketing** `bank-additional-full.csv`.
UCI documents 41,188 date-ordered instances, the binary `y` outcome, and a
CC BY 4.0 license.[1] The pinned outer archive SHA-256 is
`e0bf5f5de5b846e2f18e9d90606637267d46dfa260e0f17bb12e605db5efbeb4`; the
extracted CSV SHA-256 is
`74adfc578bf77a7ff4bb1ba4a9f8709d9e3c6907342959c2c8416847e0afb4d8`.

Only the source row number, `housing`, and `y` are admitted. UCI describes
`housing` as client data, while `duration` is a last-contact field and is
explicitly excluded.[1] The source's three observed categorical forms—`no`,
`yes`, and `unknown`—map one-to-one to the three declared groups. `unknown`
is retained as an explicit category rather than erased or relabeled. The first
32,950 source rows are training; the last
8,238 rows are held out. The split preserves source order and is not shuffled.
It is a bounded historical split, **not** a claim of independence, causal
identification, client uniqueness, or suitability for marketing action.

The real-data runner receives an explicit path to the pinned CSV and must
refuse a wrong SHA-256, malformed field, a `housing` category other than the
three declared forms, or an unknown outcome.
It must emit `Unavailable` when no path is supplied rather than invent a
result. The public source remains reproducible without making network access a
required CI dependency.

## 4. Comparators and metrics

For each group, an independently authored Python oracle must compute the exact
one-dimensional posterior integral for the **same model**, using the sufficient
training success/failure counts and a standard-library-error-function normal
CDF. It must emit posterior mean, variance, and held-out posterior-predictive
probability

```text
E[Φ(θ_g) | training data].
```

The F# runner must use its EP Gaussian approximation for the same predictive
quantity, `Φ(m / sqrt(1 + v))`. The receipt reports—not asserts in advance—
the absolute exact-versus-EP differences in posterior mean, variance, and
per-group predictive probability. The seven-observation regression control may
bound its measured discrepancy after recording it; that bound is solely a
fault detector for that catalogue, not an accuracy guarantee for the benchmark
or other data.

The held-out comparison is against one **training-only Beta(1,1) global-rate
baseline**, using Brier score and mean negative log predictive density. A lower
score on this one split is a measured property of this declared model and
slice; a tie or worse score is a negative result. Neither outcome demonstrates
general classification capability.

## 5. Required controls

| Control | Required observation | What it rules out |
|---|---|---|
| Local moment control | Existing closed-form signed projection agrees with independently implemented numerical integration on finite moderate cavities. | A wrong sign transform or reused closed-form formula. |
| Exact scalar posterior | Python integral and F# EP receive the same group counts, prior, and source fingerprint. | Comparing different models or data slices. |
| Canonical-input control | The F# query produces one receipt when the fixed catalogue is supplied in multiple permutations and canonical source-row sort is enabled. | Reporting an arbitrary arrival order as a stable result. |
| Sort-removal mutation | Removing canonical source-row sort must be tested on a declared finite adversarial ordering; if it does not change the receipt, the control is recorded as non-discriminating rather than called a proof. | A vacuous order test. |
| Label-sign mutation | Flipping one declared training label must change the group receipt and the independent count oracle. | A dead label path. |
| Duplicate-source mutation | Reusing a source row must refuse before inference. Repeating the same label/group with a distinct source row is a distinct datum and must change the receipt. | Treating non-idempotent evidence absorption as an ACI merge or silently choosing between source-identity collisions. |
| Dataset-fingerprint control | Wrong extracted CSV digest causes refusal before inference. | Silent dataset substitution. |

## 6. State/query boundary

This benchmark consumes a fixed external catalogue. It neither implements nor
changes replicated state. If future evidence arrives through the canonical
content-addressed multi-value union, that union remains the only CRDT state
merge; a conflict-free, version-resolved materialization in declared canonical
order is a precondition for any EP query. Sequential EP updates and finite
floating-point reductions are not commutative or idempotent simply because the
input came from a convergent state.

## 7. Explicit non-claims

This work does not claim generic non-Gaussian inference, EP convergence on
arbitrary graphs, exact global inference, VMP implementation, online learning,
language semantics, behavioral prediction, financial or marketing advice,
agent autonomy, or a CRDT posterior merge. It does not use `duration`, infer
individual intent, or make a decision about any person.

## References

[1] [Moro, Rita, and Cortez, *Bank Marketing*, UCI Machine Learning Repository](https://archive.ics.uci.edu/dataset/222/bank+marketing)

[2] [Anceschi et al., *Scalable Expectation Propagation for Generalized Linear Models*, arXiv:2407.02128 (2024)](https://arxiv.org/abs/2407.02128)

[3] [Şenöz et al., *Variational Message Passing and Local Constraint Manipulation in Factor Graphs*, Entropy 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8303273/)
