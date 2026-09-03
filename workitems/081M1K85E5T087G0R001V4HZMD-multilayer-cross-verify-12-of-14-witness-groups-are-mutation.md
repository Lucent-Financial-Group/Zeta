---
id: 081M1K85E5T087G0R001V4HZMD
type: task
state: backlog
priority: P2
slug: multilayer-cross-verify-12-of-14-witness-groups-are-mutation
title: "Multilayer cross-verify: 12 of 14 witness groups are mutation-insensitive; add a variance-moving mutant and pin per-group counts"
created: 2026-09-03T09:03:58.138Z
depends_on: []
composes_with: []
---

# Multilayer cross-verify: 12 of 14 witness groups are mutation-insensitive; add a variance-moving mutant and pin per-group counts

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1K85E5T087G0R001V4HZMD-*.md` glob. -->

**Source:** adversarial math review (Soraya, 2026-09-03), routed by Aaron.

## The claim as stated is refuted

`tests/cross-verification/multilayer-bnn-online-update/cross-verify.ts:136-160` prints
*"14 finite witness groups across production F#/independent Python"*, which implies all 14 are
cross-oracle and all 14 are load-bearing. Neither holds:

- **5 are cross-oracle** (lines 136-140)
- **8 are F#-only self-reports** (lines 144-151) compared against string/boolean literals —
  `exactness === "ExactAcyclic"`, `strictError.includes(...)`. These restate what the xunit tests
  already assert, carried across a process boundary: a smoke test of the driver, not verification.
- **1 is the mutant check** (line 160)

**Credit where due:** the Python oracle IS genuinely independent — it builds the joint precision
matrix and inverts by Gauss-Jordan (`multilayer_online_oracle.py:39-68`), a different algorithm
from sum-product, not a transliteration. That is real N-version evidence, for the **means**.

## 12 of 14 groups cannot detect the mutant, and one of them cannot BY SYMMETRY

The coupling-sign mutant reproduces: exactly 4 disagreements, **all in `sequentialMeans`, none in
`sequentialVariances`** (`|d| = 0` exactly).

That zero is not luck. **Flipping the off-diagonal sign is a similarity transform by
`diag(1,-1,1,-1)`, which leaves the covariance diagonal invariant.** So the variance witness group
is insensitive to the entire class of coupling-sign errors *by construction*, and
`layerZeroPrecision` / `layerZeroObservationCount` / `deeperObservationCounts` are insensitive
because the mutant does not touch the code producing them.

**Net: 1 of 14 groups carries the whole mutation-detection load.**

## Second defect: the count is printed, never pinned

Line 160 asserts only `mutantDisagreements > 0`. The "4" is printed and never asserted — degrade
the detector to 1 disagreement and the check still passes.

## Route

1. A **second mutant that moves variances** — perturb a `variances[child]` *magnitude*, not its
   sign, so the similarity-transform invariance does not absorb it.
2. **Pin the disagreement count per group**, not a `> 0` aggregate.
3. Correct the console line so it states the real split (5 cross-oracle / 8 self-report / 1 mutant)
   rather than 14 undifferentiated "witness groups".

**BP-16 note from the review:** the two independent implementations clear the two-tool bar for the
**means**. They do **not** clear it for the **variances**, which no mutant currently exercises.
