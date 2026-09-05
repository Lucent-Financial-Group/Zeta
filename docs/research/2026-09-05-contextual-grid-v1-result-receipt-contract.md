# Contextual-Grid v1: 100-Seed Result-Receipt Contract

**Status:** frozen execution and receipt contract. This document permits one
finite 100-seed run under the merged v1 carrier. It does not convert that run
into a reproduction of the NeurIPS experiment, a generalization result beyond
this carrier, or a society-level result.

**Depends on:** `contextual-grid-curiosity-transfer/v1` and its
paper-reconciliation record. [1] [2]

## Recommendation

> Produce one canonical receipt from each independently authored runner and
> admit the result only when their complete UTF-8 receipt bytes match. A
> missing, reordered, altered, or non-identical receipt is a refusal, not a
> score.

The seeded roster is a finite, fully reproducible comparison. A matching pair
of emitters demonstrates only that the declared F# runner and independently
authored Python oracle agreed for this carrier, these policies, and these
budgets. It cannot establish intrinsic curiosity, general transfer, deep EDE,
or an advantage outside the configured grid.

## 1. Admission and Exact Roster

Both emitters must verify the environment manifest and evaluator-catalogue
SHA-256 fingerprints before beginning the first seed. The admitted roster is
the canonical ascending sequence of unsigned integers `0` through `99`, each
appearing exactly once. The episode count is `1,000` and action cap is `250`
for every policy and seed.

| Input condition                                                       | Required result                                                         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Exact environment and catalogue fingerprints; seeds `0…99` in order   | Emit a receipt                                                          |
| Missing seed, duplicate seed, nonzero first seed, or reordered roster | `INCOMPLETE_OR_NONCANONICAL_ROSTER`; no aggregate                       |
| Mismatched environment/catalogue fingerprint                          | Existing fail-closed admission before action 1                          |
| F# and Python receipt bytes differ                                    | `CROSS_ORACLE_MISMATCH`; preserve both files and do not issue a verdict |
| Any missing required field or noncanonical action/policy order        | `INVALID_RECEIPT`; no inferred default                                  |

The order of policies is fixed as `uniform-random/v1`, `q-epsilon/v1`,
`q-ucb/v1`, `count-first/v1`. The candidate is exactly
`count-first/v1`; all other entries are comparators. Neither policy order nor
receipt order selects an evaluator.

## 2. Canonical Receipt Bytes

Both independently authored emitters serialize one UTF-8 JSON object with no
insignificant whitespace, ASCII property names, and the exact field order below.
Integer quantities are JSON numbers except seeds and the resampler seed, which
are decimal strings to retain their unsigned-64-bit identity. Every floating
novelty statistic is represented only by its sixteen lower-case hexadecimal
IEEE-754 binary64 bits. Neither implementation may serialize a locale- or
runtime-dependent decimal float.

| Object               | Required fields in exact order                                                                                                                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root                 | `schemaVersion`, `configuration`, `environmentFingerprint`, `evaluatorCatalogueFingerprint`, `optimalHeldOutReturnPpm`, `policies`, `bootstrap`, `comparisonVerdict`                                                                                                             |
| `configuration`      | `actionCap`, `episodes`, `seedCount`, `seedFirst`, `seedLast`                                                                                                                                                                                                                    |
| Policy row           | `policy`, `meanHeldOutReturnPpm`, `meanSuboptimalityPpm`, `seeds`                                                                                                                                                                                                                |
| Seed row             | `seed`, `heldOutReturnPpm`, `trainingGoalEpisodes`, `trainingReturnPpm`, `trainingUniqueStates`, `trainingUniqueStateActions`, `meanPreIncrementNoveltyBits`, `trainingTraceDigest`, `evaluationTraceDigest`, `qDigestBeforeEvaluation`, `qDigestAfterEvaluation`, `streamDraws` |
| `bootstrap`          | `confidenceLevelPercent`, `replicates`, `resamplerSeed`, `draws`, `rejections`, `indexDigest`, `comparisons`                                                                                                                                                                     |
| Bootstrap comparison | `baselinePolicy`, `candidateMeanDeltaPpm`, `lowerPpm`, `upperPpm`                                                                                                                                                                                                                |

The `schemaVersion` is `zeta.contextual-grid/result-receipt/v1`. The mean
fields are integer ppm values because every v1 action reward is a multiple of
`40,000 ppm` and every declared aggregate has exactly 100 rows. A value that
cannot be represented exactly under this rule invalidates the receipt rather
than being rounded.

## 3. Deterministic Denominator and Bootstrap

The optimal held-out return is computed by finite dynamic programming directly
over the carrier's deterministic transition/reward table, held-out start, and
250-action cap. Let `d_i,p = optimalHeldOutReturnPpm − heldOutReturnPpm_i,p`.
The reported policy mean is `sum_i d_i,p / 100`; lower is better.

For the candidate and each comparator, the paired value is
`δ_i,b = d_i,count-first − d_i,b`. Negative is better for the candidate. The
candidate mean delta is `sum_i δ_i,b / 100`; it is exact ppm under the admitted
roster.

The 95% percentile interval uses exactly 10,000 resamples. Start a fresh
benchmark-local SplitMix64 stream at unsigned decimal seed
`4851599761931322454` (`0x4354584752494456`). For each draw, take the lower 32
bits of the next 64-bit word. Reject values in `[4,294,967,200, 2^32)`;
otherwise map `value mod 100` to the canonical roster index. Generate one
shared ordered vector of 100 indices for each resample, use that same vector
for every comparator, and record all emitted draws and rejections. The digest
is SHA-256 of the newline-joined decimal index sequence. Sort the 10,000
integer bootstrap means in nondecreasing numeric order; the lower and upper
fields are zero-based indices `floor(0.025 × 9,999) = 249` and
`ceil(0.975 × 9,999) = 9,750`.

The interval is a finite-sample description of this roster. It is not a proof
of generalization, a probability statement about unobserved grids, or an
uncertainty estimate for agent motives.

## 4. Predeclared Comparison Label

`comparisonVerdict` is a deterministic label over the retained raw values; it
is not an auto-certified scientific claim.

| Condition                                                                                                                       | Required label                              |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Candidate mean delta is strictly negative versus both `uniform-random/v1` and `q-epsilon/v1`, and nonpositive versus `q-ucb/v1` | `criterion-met-on-declared-grid`            |
| Candidate is strictly negative versus both first comparators but positive versus UCB                                            | `criterion-met-except-ucb-on-declared-grid` |
| Any other result                                                                                                                | `criterion-not-met-on-declared-grid`        |

The labels are deliberately narrow. No label authorizes a statement about
human curiosity, a global objective, semantic understanding, non-Gaussian
learning, society consensus, parameter efficiency, compute efficiency, or
another environment family.

## 5. Required Controls

The execution change must add a direct test for every condition below. A
written assertion that a failure "would be caught" is insufficient.

| Fault                                                       | Required observed failure                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Remove or reorder a roster seed                             | Canonical-roster admission refuses before aggregate calculation   |
| Change one frozen carrier byte                              | Existing exact carrier admission refuses before action 1          |
| Reorder policy rows                                         | Canonical receipt validation refuses or cross-oracle bytes differ |
| Change the result resampler seed or lower-32-bit mapping    | `indexDigest` differs                                             |
| Update Q/count during held-out evaluation                   | Existing before/after Q digest control fails                      |
| Change one independent-oracle transition/policy computation | Full F#–Python receipt bytes differ                               |
| Replace result bytes with an incomplete preflight           | Required root/schema/100-row validation refuses                   |

The committed result files must be named
`2026-09-05-contextual-grid-v1-100-seed-fsharp.json` and
`2026-09-05-contextual-grid-v1-100-seed-python.json`. A separate validation
record may name their SHA-256 values only after exact byte equality is observed.
The one-seed preflight remains a different schema and can never satisfy this
contract.

## 6. Explicit Boundaries

The v1 personal lexical-geometric calibration, `TangleNavigator`,
`SocietyBootstrap`, and `empowermentBound` do not enter the receipt. This is a
single-agent, fixed-environment action-selector comparison. A consented
multi-agent consensus protocol needs its own environment, agent identities,
externality records, decision rule, and independent benchmark.

The paper that inspired the carrier identifies exploration as a factor in its
own tabular CMDP and reports an EDE deep-learning evaluation on Procgen and
Crafter. This contract neither reimplements EDE nor reproduces the paper's
held-out-coordinate/hyperparameter procedure. [1] [2]

## References

[1] [Jiang, Kolter, and Raileanu, _On the Importance of Exploration for Generalization in Reinforcement Learning_ (NeurIPS 2023)](https://proceedings.neurips.cc/paper_files/paper/2023/file/2a4310c4fd24bd336aa2f64f93cb5d39-Paper-Conference.pdf)

[2] [Contextual-Grid v1 paper-reconciliation record](2026-09-05-contextual-grid-paper-reconciliation.md)
