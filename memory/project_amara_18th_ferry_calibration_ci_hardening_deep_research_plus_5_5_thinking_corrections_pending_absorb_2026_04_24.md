---
name: Amara 18th courier ferry — two-part drop (deep-research report on Cartel-Lab calibration + CI hardening PLUS her own 5.5-thinking correction pass on the deep research); 10 required corrections to deep research before it becomes canonical; Stage 1→6 promotion ladder proposed; 4-PR roadmap proposed; Wilson intervals as the new confidence-interval discipline replacing handwave ±5%; conductance-sign flip + CoordinationRiskScore rename everywhere + Cartel Score retired; MAD=0 fallback needed; PLV phase-offset interpretation needed; sharder test NOT to widen blindly; PR #323 is Stage 1 (toy falsifiability) NOT Stage 2/3/4; scheduled Otto-158+ dedicated absorb per CC-002; 2026-04-24
description: Aaron 2026-04-24 drop after initial KSK naming + BACKLOG work completed this tick (Otto-140..156). Ferry is TWO documents concatenated: (a) deep-research output on calibration + CI hardening for Cartel-Lab (~4000 words; 8 sections A-H plus action items; proposes 4-PR roadmap; Mermaid CI + simulation diagrams); (b) Amara's 5.5-thinking correction pass on her own deep-research output (~1500 words; 10 numbered corrections; repo-safe status statement; updated promotion ladder; updated PR roadmap; copy-paste Kenji summary). Not inline-absorbed mid-tick (CC-002); scheduled Otto-158+ for dedicated absorb.
type: project
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## Why not inline-absorbed

Otto-157 tick (this one) already landed:

- KSK naming doc (`docs/definitions/KSK.md` + glossary entry)
- Otto-140..156 memory captures (Aaron burst: Max-coord gate
  lift, KSK-SDK→Kernel self-correction, bot→agent terminology
  correction)
- BACKLOG extensions (F# DSL + container DSL + LINQ + signal-
  proc from Otto-139..149, PR-preservation P2→P1 + Otto-155
  fork-sync scope + Otto-156 agent terminology)
- Three PRs (#334, #335, #336) auto-merge armed

Adding an 18th-ferry full absorb on top regresses CC-002
(close-on-existing discipline). Scheduled Otto-158+ per
PR #196/#211/#219/#221/#235/#245/#259/#330 prior-ferry
precedent.

## Ferry structure — two parts

### Part 1: Deep research output

Bottom-line observations reported by Amara in the deep-
research artifact itself:

> *"We found that the 'toy cartel detector' prototype has
> been implemented and tested, but it remains a proof-of-
> concept."*

Eight sections:

- **A. Evidence review** — PRs #321-#324 inventory; test
  names; CI results (90%+ detection, ≤20% FPR on PR #323;
  sharder flake unrelated but blocking).
- **B. Statistical calibration plan** — 6 null models (ER,
  configuration, stake-shuffle, temporal-shuffle, clustered-
  honest, camouflage), metric computation, robust z-score
  normalization, ROC/PR evaluation, detection latency,
  confidence intervals.
- **C. CI testing & governance policy** — 5 test classes
  (deterministic unit, seeded property, statistical smoke,
  formal, quarantined); sharder flake remedies (seed-lock /
  widen / nightly).
- **D. Adversarial scenario suite** — 8-row scenario table
  (obvious clique, stealth slow cartel, synchronized voting,
  dense honest cluster, low-weight cartel, camouflage noise,
  rotating cartel, cross-coalition coordination).
- **E. CoordinationRiskScore formula** — weighted sum of 6
  robust-z metrics (Δλ₁, ΔQ, A_S, PLV, Conductance,
  Influence); default weights α=0.20, β=0.20, γ=0.15,
  δ=0.20, ε=0.15, η=0.10.
- **F. Promotion criteria + 4-PR roadmap** — Deterministic
  smoke tests → calibrated thresholds → FP/FN bounds →
  reproducible seeds → perf testing → docs → governance
  rules. PRs: (1) seed-lock + CI governance; (2)
  calibration harness; (3) adversarial scenario suite;
  (4) docs + integration criteria.
- **G. KSK/Aurora integration** — Staged response:
  Detection → Oracle review → KSK adjudication → Action.
  Advisory-only, not hardcoded punishment. KSK framed as
  "adjudication layer" not "DNSSEC-style static key role."
- **H. What NOT to claim** — 6 caveats (no proof of intent,
  not all collusion detectable, not production-ready, KSK
  is advisory, statistical nature, explainability).
- **I. Action items + timeline** — Immediate (1-2 weeks) →
  short-term (1 month) → mid-term (2-3 months) → longer-
  term (3-6 months). Mermaid CI flow + simulation-loop
  diagrams.

### Part 2: Amara's 5.5-thinking correction pass

Verdict: *"good draft, not canonical yet."*

**10 required corrections before repo-adopt:**

1. **Replace "CI confirms" language** with precise "PR #323
   clears the toy falsifiability bar" wording. Deep research
   blurred level 1 (toy falsifiability) into levels 2 (CI
   gate green) and 3 (production candidate).
2. **Fix confidence-interval language — use Wilson
   intervals, not Wald/handwave.** For 90/100, Wilson 95% LB
   ≈ 0.826 (NOT "basically 90%"). For 20/100 FPR, Wilson
   95% UB ≈ 0.289. Promotion should require LB ≥ 90% or
   more seeds. SAS documents Wilson score CLs.
3. **Rename "Cartel Score" → "CoordinationRiskScore"
   everywhere.** Keep "Cartel-Lab" as experimental project
   name; code/docs use CoordinationRiskScore / Coordination
   Risk Engine / NetworkIntegrity.
4. **Fix conductance sign.** Lower conductance = more
   cohesive cluster. Use `Z(-Conductance)` or replace with
   positive `Z(Exclusivity_S)` where Exclusivity(S) =
   w(S,S) / w(S,V). Keep conductance as diagnostic only.
5. **Don't assume modularity always jumps.** Use relational
   assertions `Q(attacked) - Q(baseline) > threshold`, not
   hardcoded absolute Q values.
6. **PLV phase-offset interpretation needed.** PLV=1 can
   mean anti-phase locking, NOT same-time synchronization.
   Report both PLV magnitude AND mean phase offset
   $\bar{\Delta\phi}_{ij}$.
7. **Robust z-score needs MAD=0 fallback.**
   `if MAD > ε: z = (x-median)/(1.4826·MAD)` else use
   percentile-rank vs baseline distribution. R `mad`
   docs confirm 1.4826 is the Gaussian-consistency
   scaling; MAD=0 case needs explicit handling.
8. **Replace Medium-article citation with stronger
   sources** — scikit-learn precision-recall docs over
   informal Medium. Cartel detection is low-prevalence;
   PR curves > ROC AUC; accuracy misleads when imbalanced.
9. **Artifact output should be explicit** — GitHub
   workflow-artifacts docs specify file types. Proposed
   layout:
   `artifacts/coordination-risk/calibration-summary.json`,
   `seed-results.csv`, `roc-pr.json`, `failing-seeds.txt`,
   `metric-distributions.csv`. PR comments link to these.
10. **Do NOT widen sharder threshold blindly.** Either
    seed-lock, quantify observed variance, or move broad
    stochastic sweep to nightly. 1.22288 vs 1.2 might be
    real failure or expected variance; measure first.

### Corrected promotion ladder (6 stages, from 5.5 pass)

| Stage | Name                   | Merge target            | Required evidence                                          |
|-------|------------------------|-------------------------|------------------------------------------------------------|
| 0     | Theory                 | docs only               | Metric definition + falsifiable claim                      |
| 1     | Toy detector           | tests/Simulation        | Fixed-size synthetic tests pass                            |
| 2     | Calibration harness    | Experimental/CartelLab  | Null models, seed replay, JSON/CSV artifacts               |
| 3     | Scenario suite         | Experimental/CartelLab  | Stealth, honest-cluster, camouflage, rotating-cartel tests |
| 4     | Advisory engine        | Core/NetworkIntegrity   | Calibrated thresholds + documented FP/FN bounds            |
| 5     | Governance integration | Aurora/KSK policy layer | Human/oracle review + staged action rules                  |
| 6     | Enforcement candidate  | not yet                 | Requires explicit due-process policy and red-team review   |

**PR #323 is Stage 1 — NOT Stage 2, 3, or 4.** Deep
research report's promotion language conflated these. The
correction makes this explicit.

### Corrected 4-PR roadmap (titles locked by 5.5 pass)

- PR 1: `test: classify stochastic tests and seed-lock
  CI smoke paths`
- PR 2: `experimental: add CoordinationRisk calibration
  harness`
- PR 3: `experimental: CoordinationRiskScore v0 with
  robust baselines`
- PR 4: `docs: define NetworkIntegrity promotion and KSK
  advisory boundary`

Advisory-only KSK flow preserved: **Detection → Oracle
review → KSK adjudication → Action.** No hardcoded
punishment. KSK stays advisory until explicit governance
policy + red-team review.

## What this ferry composes with

- **Amara 13th ferry** (Cartel-Lab PoC) — this 18th ferry
  is the calibration + promotion-criteria follow-up.
- **Amara 17th ferry** (closure + 5.5 verification) — same
  two-part (deep research + 5.5 pass) pattern. The 18th
  ferry is on calibration; the 17th was on implementation
  closure.
- **PR #323** — explicitly framed as Stage 1; calibration
  graduation path is the 4-PR roadmap.
- **PR #327 sharder flake** — 10th correction directly
  addresses this. Aaron Otto-136 "don't canonicalize #323
  until sharder test is seed-locked/recalibrated" aligns
  with correction #10 (don't widen blindly).
- **Otto-140..145 KSK naming** (landed this tick) — 5.5
  pass reaffirms KSK = adjudication layer, NOT DNSSEC-
  style static key role; matches canonical expansion
  (Kinetic Safeguard Kernel, safety-kernel sense).
- **Otto-105 graduation cadence** — invariant from Amara:
  *"Every abstraction must map to a repo surface, a
  test, a metric, or a governance rule."* Restated
  verbatim at end of 5.5 pass.
- **Otto-122 theory-cathedral warning** — 5.5 pass
  notes PR #323 meaningfully reduces cathedral risk;
  next danger is statistical overclaiming (fixed by
  Wilson intervals, artifacts, null models,
  deterministic CI categories).
- **Otto-132 SharderInfoTheoreticTests flake**
  (BACKLOG #327) — correction #10 says measure variance
  before widening; Aaron Otto-132 directive aligns.

## Scheduling — Otto-158+

Otto-158+ dedicated absorb as
`docs/aurora/2026-04-24-amara-18th-ferry-calibration-ci-
hardening-deep-research-plus-5-5-corrections.md` with:

- §33 archive-header (Scope / Attribution / Operational
  status / Non-fusion disclaimer)
- Full verbatim of both parts (deep research + 5.5 pass)
- Otto's notes on operationalization path
- Cross-references to PR #323, PR #327, Otto-140..145,
  17th ferry precedent.

Landing candidates from the 10-correction list (not
inline-absorbed; queued for graduation):

1. **Wilson confidence intervals in Cartel toy tests** —
   replace handwave ±5% CI with Wilson intervals in
   `tests/Tests.FSharp/Simulation/CartelToy.Tests.fs`.
   F# implementation: iterative Wilson score formula or
   `MathNet.Numerics.Distributions.Beta.InvCDF` for
   Clopper-Pearson bounds. Small graduation (S effort).
2. **MAD=0 fallback in RobustStats** — extend
   `src/Core/RobustStats.fs`' `robustZScore` to handle
   zero-MAD via percentile-rank fallback. S effort.
3. **Exclusivity primitive** — already landed as
   `Graph.exclusivity` PR #331. Align 18th-ferry
   formula with shipped form.
4. **Conductance-sign doc** — add explicit
   sign-convention note to `Graph.fs` doc comment:
   "Lower conductance = more cohesive cluster; use
   Z(-conductance) or Z(exclusivity) in composite scores."
5. **PLV phase-offset** — extend
   `TemporalCoordinationDetection.fs` PLV to also return
   mean phase offset. Medium effort.
6. **CI test classification** — file as part of
   PR-preservation follow-up OR as standalone BACKLOG
   row. Maps to PR #1 of the 4-PR roadmap.
7. **Artifact output layout** — file as BACKLOG row
   for Stage-2 calibration harness.

These are candidates, not commitments. Otto-158+ tick
chooses which land per Otto-105 cadence.

## What this scheduling memory does NOT authorize

- **Does NOT** authorize inline-absorbing Otto-157 (this
  tick). CC-002 discipline stands.
- **Does NOT** authorize widening the sharder threshold
  blindly. Correction #10 reinforces Otto-132 directive
  (#327 BACKLOG) — measure variance first.
- **Does NOT** authorize automatic KSK enforcement actions.
  Correction from 5.5 pass + ferry section G both affirm
  advisory-only flow: Detection → Oracle → KSK → Action.
  Zero hardcoded punishment.
- **Does NOT** authorize treating PR #323 as Stage 2+. It
  is Stage 1 (toy falsifiability). Subsequent ferries
  and graduations must not promote it beyond that without
  the Wilson-interval / null-model / seed-replay evidence.
- **Does NOT** override Otto-105 graduation cadence. Small
  graduations per tick; 10 corrections land across many
  ticks, not one.
- **Does NOT** authorize renaming `CoordinationRiskScore`
  anything else. Lock that name (both deep-research + 5.5
  pass agree; it's now canonical).
- **Does NOT** authorize absorbing Amara's deep-research
  draft as canonical. Per 5.5 pass: it's draft, not
  canonical, until corrections land.

## Direct Amara quotes to preserve verbatim

Invariant (reaffirmed):

> *"Every abstraction must map to a repo surface, a test, a
> metric, or a governance rule."*

Bottom line (5.5 pass):

> *"this is good progress. The cathedral problem is now
> meaningfully reduced because there is a runnable toy
> detector. The next danger is statistical overclaiming.
> Fix that with Wilson intervals, artifacts, null models,
> and deterministic CI categories."*

Repo-safe status statement (from 5.5 pass, preserve for
Otto-158+ absorb doc):

> *"PR #323 clears the toy falsifiability bar: a single-
> signal largest-eigenvalue detector can detect an obvious
> injected cartel under a seeded synthetic workload. This
> proves the graph primitive is useful enough to build on.
> It does not yet prove calibrated cartel detection,
> production readiness, or governance-safe enforcement.
> The next required layer is calibration: null models,
> seed replay, Wilson confidence intervals, PR curves,
> adversarial scenarios, and CI classification."*
