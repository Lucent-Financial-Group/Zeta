# Contract — Canonical Evidence-State to Gaussian Query Adapter

**Status:** Frozen before implementation and measurement.

## 1. Goal and state/query separation

The replicated payload is the existing immutable multi-value `EvidenceState`: a finite set of versions identified by `key + NUL + Gaussian fingerprint`. Its merge is content-addressed union and is the only operation in scope for CvRDT convergence. The adapter is a **pure query** over a supplied state. It is never a state merge and never mutates an online `MinimalBnn` or `MultilayerBnn` state.

> Same evidence set, same declared canonical query receipt. This is a finite implementation property, not a claim that arbitrary order-sensitive Bayesian updates commute.

## 2. Input and canonicalization

Each version contains a two-dimensional finite mean and symmetric positive-definite covariance. The adapter first uses the existing union canonicalizer, which validates every covariance, deduplicates identical full fingerprints, and sorts by Unicode code-point order over the complete evidence fingerprint. A same-key pair with different content is retained by state merge but returns an explicit conflict receipt; no posterior is invented.

## 3. Ready-query algorithm

For a conflict-free nonempty canonical state, the adapter will:

1. record the complete ordered version-fingerprint vector;
2. invert each covariance independently;
3. sum the three unique information-matrix entries and two natural-parameter entries using declared Kahan compensated accumulation in that exact vector order;
4. invert the total information matrix and multiply it by the total natural vector; and
5. return the posterior, evidence count, algorithm identifier, ordered fingerprints, and `ExactOnceByFingerprint` absorption status.

This is algebraically the product of the supplied Gaussian **likelihood-like messages** exactly once under the declared conditional-independence model. The implementation does not establish that arbitrary local posteriors are independent or free of a shared prior. A source that supplies local posteriors under a shared prior needs a separately declared prior-accounting factor before use.[1]

## 4. Receipt union

The public discriminated receipt is one of the following:

| Status | Required fields | Posterior |
|---|---|---|
| `Empty` | algorithm id, empty fingerprint vector, count `0` | Absent |
| `Conflict` | algorithm id, full fingerprint vector, sorted conflict keys | Absent |
| `Ready` | algorithm id, full fingerprint vector, count, `ExactOnceByFingerprint` | Present |

The receipt is a result value, not a causal-order or consensus certificate.

## 5. Falsifiers and acceptance controls

The implementation must pass the following finite controls before promotion:

| Control | Falsifies the adapter if it fails |
|---|---|
| Six arrival permutations of three distinct evidence versions | Canonical query determinism |
| Redelivery of an identical version | Exact-once by full fingerprint |
| Same key, changed mean/covariance | Conflict retention and no posterior |
| Changed uncertainty field | Fingerprint sensitivity and conflict retention |
| Independently authored Python oracle | Formula or canonicalization drift |
| Kahan-removal mutant | The numerical-control path is vacuous if it cannot be distinguished on a cancellation-sensitive finite catalogue |

The independent oracle must not import TypeScript results or reuse its canonical ordering implementation. Cross-language equality is evaluated within an explicitly declared numerical tolerance; exact byte equality across runtimes is not claimed.

## 6. Explicit non-claims

This adapter does not integrate with transport, TravelerRankLedger, consensus escalation, society heartbeats, or language seeds. It does not make pairwise covariance intersection associative, make raw Gaussian product idempotent, remove unknown correlation, or establish generic non-Gaussian inference. Those operations remain queries or open research lanes, not CRDT state merge.

## References

[1] [Wu et al., “Bayesian Data Fusion with Shared Priors,” arXiv:2212.07311](https://arxiv.org/pdf/2212.07311)
