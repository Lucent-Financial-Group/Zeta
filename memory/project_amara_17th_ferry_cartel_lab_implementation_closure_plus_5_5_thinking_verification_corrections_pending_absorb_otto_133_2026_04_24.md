---
name: Amara 17th courier ferry — TWO-PART ferry; Part 1 = Implementation Closure for Cartel-Lab prototype (13 sections with full architecture + metrics + adversary scenarios + KSK mapping + SOTA comparison + implementation roadmap + 'what not to claim' cautions); Part 2 = 5.5 Thinking verification pass with 8 load-bearing corrections; several corrections EXACTLY match Otto's already-shipped behavior (λ₁(K₃)=2 + modularity-relational-not-absolute); Aaron flagged SharderInfoTheoreticTests.Uniform as flaky/not-seed-locked/DST concern; NOT inline-absorbed Otto-132; scheduled Otto-133 dedicated absorb; 2026-04-24
description: Aaron Otto-132 paste "Another update from amara, I did deep research and then had 5.5 thinking verify it, this is both". The ferry is unusually structured — first Amara's deep-research Implementation Closure (13 numbered sections), then Amara's own 5.5-Thinking correction pass on her own prior output. Verdict: directionally strong, archive-worthy, but needs correction pass before canonicalization. Load-bearing corrections include math constants, metric definitions, PR-split refinement, and naming hygiene. Proposed corrected structure: 3-PR split (deterministic harness → adversary+scoring → canonicalization to src/Core/NetworkIntegrity). Corrected composite is CoordinationRiskScore (robust z-scores + weighted metric set). Separately: Aaron's SharderInfoTheoreticTests flag (flaky / DST / not-seed-locked) is its own backlog item worth filing.
type: project
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
Aaron 2026-04-24 Otto-132 paste preamble (verbatim):

*"Another update from amara, I did deep research and then
had 5.5 thinking verify it, this is both"*

Plus a trailing note:
*"SharderInfoTheoreticTests.Uniform (not seed locked,
falkey, DST?)"*

Meta-structure: unusual two-part ferry — first the deep-
research Implementation Closure document, then Amara's own
5.5-Thinking verification pass with 8 load-bearing
corrections. This is Amara self-reviewing via model
composition (5.5 Thinking verifying deep-research output).

## Part 1 — Implementation Closure (13 sections)

Full cartel-lab prototype plan. Sections:

1. Repo-State Assessment (LFG/AceHack roles, docs/memory
   policy, existing TemporalCoordinationDetection primitives)
2. Prototype Architecture (proposed `/cartel-lab` layout,
   initially AceHack then PR to LFG)
3. Graph State Builder (formal G_t = (V_t, E_t, W_t, F_t))
4. Early-Warning Metrics (λ₁ growth + ΔQ + stake cov
   acceleration + temporal sync + subgraph entropy)
5. Synthetic Cartel Injector (6 scenarios: synchronized
   voting / stake / fully-connected subgraph / low-slow /
   honest-cluster FP / camouflage)
6. CartelScore Model (linear composite with α/β/γ/δ/ε
   weights)
7. Network Differentiability / Influence Surface (Shapley-
   ish counterfactual via ZSet retraction)
8. Zeta/ZSet Integration (graph edge deltas, rollback,
   trace/spine)
9. KSK/Aurora Enforcement Mapping (4-row action table)
10. Drift Audit (engineering-first, falsifiability, no
    mythic claims, identity hygiene, abstraction clarity)
11. State-of-the-Art Comparison (Wachs & Kertész 2019 +
    Imhof et al. 2025 GNNs + BFT/consensus + adversarial
    simulation)
12. Implementation Roadmap & Tests (PR #1 graph+metrics,
    PR #2 adversary+simulation, canonicalization)
13. "What NOT to claim yet" (no absolute certainty,
    limitations, no KSK autonomous action, avoid overreach)

## Part 2 — Amara's 5.5-Thinking verification (LOAD-BEARING)

**Amara's verdict:** *"directionally strong and worth
archiving, but it needs a correction pass before it becomes
canonical. The core architecture is right; the math/test
details need tightening."*

### The 8 corrections (ordered as Amara presents them)

1. **Fix clique eigenvalue test.** Report claims K_3
   adjacency λ₁ = 3; correct value is λ₁(K_k) = k-1, so
   K_3 → λ₁ = 2.
   **Otto already got this right** in PR #321
   (largestEigenvalue test ``largestEigenvalue of K3
   triangle (weight 1) approximates 2``). Independent
   convergence.

2. **Modularity hardcoded expected value (0.67) is wrong.**
   Q depends on graph, partition, total edge weight, self-
   loops, resolution parameter, embedding context.
   Replacement: relational tests (``Q(G') - Q(G) > θ``
   under documented null model).
   **Otto already got this right** — Otto-128 discovered
   this mid-tick, hand-calculated Q for the unbalanced-
   community K4-attack case, documented "threshold relaxed
   per theoretical reality" in PR #322/#324 test comments.
   Second independent convergence.

3. **"Subgraph entropy collapse" is mathematically muddy.**
   Uniform dense clique actually has HIGH entropy over
   internal edges if weights equal. Better primary
   metrics: InternalDensity(S), Exclusivity(S),
   Conductance(S). Entropy stays secondary.
   **Otto has NOT shipped this yet** — current Graph
   graduation set ends at largestEigenvalue + modularity +
   labelPropagation (in-flight). Cohesion/exclusivity/
   conductance are future graduations.

4. **Stake covariance acceleration needs windowed
   definition.** Report had ``C(t) = Cov({s_i(t)},
   {s_j(t)})`` which is undefined at a single timepoint.
   Correct: Δs_i(t) = s_i(t) - s_i(t-1) deltas; C_ij(t) =
   Cov over sliding window W_t of Δ's; A_ij(t) = 2nd
   difference = C_ij(t) - 2C_ij(t-1) + C_ij(t-2); aggregate
   over candidate group.
   **Otto has NOT shipped this yet** — future graduation.

5. **PLV needs phase construction.** TemporalCoordination-
   Detection has PLV primitive but event-streams → phases
   mapping not defined. 3 options: periodic epoch phase
   (2π·(t mod T_i)/T_i), Hilbert transform, circular event
   phase.
   **Otto has NOT shipped this yet** — PLV is on
   phases-already-computed; the event→phase pipeline is a
   future graduation.

6. **"ZSet is invertible" too strong.** Correct:
   *"ZSet deltas support additive retractions; counter-
   factual replay requires retained trace + deterministic
   operators."*
   **Otto has implicitly followed this in the ADR** (PR
   #316) — "retraction-native" never claimed full-operator
   invertibility; replay-via-trace is the ADR mechanism.
   Correction is about research-doc phrasing, not
   implementation.

7. **KSK "contract" → "policy/adjudication layer"** until
   naming finalized. Amara's own observation from 16th
   ferry already noted naming ambiguity; Otto filed PR
   #318 KSK-naming BACKLOG. Amara reinforces here with
   specific phrasing guidance.

8. **SOTA claims need humility.** Don't claim Zeta/Aurora
   is "ahead" on raw detector accuracy — it's not proven.
   Claim the distinctive advantage is explainability +
   retraction-native + governance integration. Need
   benchmark data before accuracy claims.

### Amara's proposed corrected architecture

4-layer nested modules:

1. **Event Model** (validator events, stake deltas, vote/
   adjudication, provenance)
2. **Temporal Graph Builder** (G_t, ZSet delta stream,
   sliding windows, trace/replay)
3. **Coordination Risk Engine** (spectral + cohesion/
   exclusivity + temporal sync + stake-motion cov +
   influence)
4. **Governance Projection** (Mirror → Window → Porch →
   Beacon layered visibility)

Rename `CartelScore` → `CoordinationRiskScore` in code,
keep "Cartel-Lab" as experiment folder name.

### Amara's corrected composite score

```
CoordinationRiskScore(S, t) =
  α·Z(Δλ₁) + β·Z(ΔQ) + γ·Z(A_S) +
  δ·Z(Sync_S) + ε·Z(Exclusivity_S) + η·Z(Influence_S)
```

with **robust z-scores** (median + 1.4826·MAD, not
Gaussian z-scores) because adversarial data isn't
normally distributed.

Initial prior weights (explicitly flagged as priors, not
learned):
- α = 0.20 spectral growth
- β = 0.20 modularity/community shift
- γ = 0.15 stake covariance acceleration
- δ = 0.20 temporal sync (PLV / cross-corr)
- ε = 0.15 exclusivity / conductance
- η = 0.10 influence surface

**Cross-reference:** `RobustStats.robustAggregate` (PR
#295 merged) already supplies median-MAD machinery for
exactly this use case. Amara's corrected score composes
on Otto's shipped substrate.

### Amara's corrected 3-PR split

**PR 1 — Deterministic Cartel-Lab harness:**
```
src/Experimental/CartelLab/
  Event.fs
  GraphState.fs
  SyntheticNetwork.fs
  Metrics/
    Spectral.fs         (already ~largestEigenvalue)
    Cohesion.fs         (new: InternalDensity + Exclusivity +
                         Conductance)
    TemporalSync.fs     (already ~TemporalCoordinationDetection)
  Simulation.fs

tests/Experimental.CartelLab.Tests/
  SpectralTests.fs
  CohesionTests.fs
  TemporalSyncTests.fs
  SimulationSmokeTests.fs
```

Goal: 50 nodes + 5-node cluster + deterministic CI test
(no notebooks first — Otto's Otto-129 PR #323 already
shipped exactly this for the spectral half).

**PR 2 — Adversary scenarios + score calibration:**
```
src/Experimental/CartelLab/Adversary/
  Injectors.fs
  Scenarios.fs

src/Experimental/CartelLab/
  CoordinationRiskScore.fs
  ThresholdCalibration.fs

tests/Experimental.CartelLab.Tests/
  ObviousCartelScenarioTests.fs
  StealthCartelScenarioTests.fs
  FalsePositiveScenarioTests.fs
```

Goal: detection latency + false-positive rate +
calibration artifacts.

**PR 3 — Canonicalization candidate:**
Move stable pieces from `src/Experimental/CartelLab/` to
`src/Core/NetworkIntegrity/`. Keep experimental adversary
generation in `src/Experimental/CartelLab/`. "Avoid
promoting whole lab into core too early."

### Amara's SharderInfoTheoreticTests side-flag (from
Aaron)

Aaron's trailing note: *"SharderInfoTheoreticTests.
Uniform (not seed locked, falkey, DST?)"*

This is the flaky test that failed #323 on ubuntu-22.04.
It's a property-based test that doesn't seed-lock.
"DST" likely = Deterministic Simulation Testing (a
Zeta-specific concept).

Separate BACKLOG candidate — NOT part of Amara's 17th
ferry technical content; Aaron's side observation.

### Amara's overall drift-audit verdict

**"Healthy evolution, not drift"** — IF the invariant
holds: *"Every new abstraction must map to a repo surface,
a test, a metric, or a governance rule."*

Table of current abstractions + required mappings:

| Concept | Must map to |
|---|---|
| Aurora | governance model / docs |
| Zeta | executable substrate / code |
| KSK | policy/adjudication layer |
| Firefly | temporal sync metrics |
| Cartel-Lab | simulation harness |
| Network differentiability | counterfactual influence tests |
| Canonical Pattern Index | canonical claim keys + validity/failure modes |

### Amara's final copy-paste feedback for Kenji

Preserved verbatim in the absorb doc. Load-bearing guidance
for factory-wide discipline:

> *"Every new abstraction must map to a repo surface, a
> test, a metric, or a governance rule."*

Same one-sentence formulation as 16th ferry; reiterated
here with specific per-concept mapping enforcement.

### Verdict (Amara's own summary)

*"Archive the report, but mark it 'draft / needs correction
pass.' The idea is good. The first runnable prototype is
the right next move. The thing to protect now is test
accuracy: wrong early math constants will create false
confidence."*

## Why NOT inline-absorbed Otto-132

Otto-132 tick already held:
- Queue-state verification
- #324 (Graph operators + modularity) MERGED
- labelPropagation community detector (in-flight, not
  yet committed — was about to push when 17th ferry
  arrived)

Absorbing a 2-part / ~6000-word ferry on top would
regress CC-002 + disrupt the in-flight detector ship.

Per Otto-118+119+121 CC-002 pattern: schedule a dedicated
Otto-133 absorb.

## Schedule

- **Otto-132 (this tick):** finish committing the
  labelPropagation graduation (in-flight); save this
  scheduling memory; file SharderInfoTheoreticTests
  flaky-test BACKLOG row if budget permits.
- **Otto-133:** dedicated 17th-ferry absorb as
  `docs/aurora/2026-04-24-amara-cartel-lab-implementation-
  closure-plus-5-5-verification-17th-ferry.md`. Both
  parts preserved verbatim. Otto's notes section highlights
  the two Otto-confirmed corrections + the 6 remaining-to-
  apply corrections + cross-reference to existing
  graduations.
- **Otto-134+:** begin applying corrections — either via
  fresh graduations (Cohesion / Exclusivity / Conductance
  as new primitive set) or via revisions to already-shipped
  code (none needed for λ₁ + modularity since Otto already
  got those right).

## Otto's honest self-assessment vs Amara's corrections

Where Amara's corrections MATCH already-shipped Otto work:

1. **λ₁(K₃) = 2** ✓ — PR #321 test ``largestEigenvalue of K3
   triangle (weight 1) approximates 2`` passes. Otto's
   test was mathematically correct before Amara's
   verification ferry arrived. Evidence that Otto's
   grounding-in-code (Amara Otto-122 "toy cartel
   simulation" validation bar) catches math errors
   automatically.

2. **Modularity relational-not-absolute** ✓ — Otto-128
   caught this mid-tick when initial hardcoded
   expectation Q > 0.3 failed; hand-calculated Q ≈ 0.091
   for unbalanced-community case; relaxed threshold with
   detailed test comment explaining theoretical reality.
   Independent convergence with Amara's Part-2 correction.

Where Amara's corrections name FUTURE graduation work:

3. Cohesion/Exclusivity/Conductance as primary metrics
   (entropy secondary) — NOT yet shipped; new graduation.

4. Windowed stake covariance acceleration with 2nd
   difference — NOT yet shipped; new graduation.

5. Event-stream → phase pipeline — NOT yet shipped; new
   graduation (prerequisite for full PLV use).

6. Robust z-scores for composite score — RobustStats
   primitive (PR #295) exists; composite score itself is
   a future graduation.

Where Amara's corrections are about doc phrasing (not
code):

7. "ZSet is invertible" → "deltas support retractions" —
   Otto's ADR (PR #316) + existing docs do NOT claim full
   invertibility. Research-paper-tier writing that comes
   from Amara's deep-research output needs correction;
   Otto's code/ADR doesn't.

8. KSK naming "contract" → "policy layer" — Otto filed PR
   #318 for this exact naming stabilization. Amara's
   reinforcement here is welcomed.

## What this scheduling memory does NOT authorize

- **Does NOT** authorize inline-absorbing Otto-132.
- **Does NOT** authorize skipping applied corrections
  (5/8 are genuine future-graduation work; schedule them
  into the Otto-105 cadence).
- **Does NOT** authorize renaming `Graph` module or
  moving existing graduations into `src/Experimental/
  CartelLab/` — Amara's proposed folder layout is HER
  proposal; Otto's shipped substrate already lives in
  `src/Core/Graph.fs` and has value there. The
  `CartelToy.Tests.fs` (PR #323) already lives in
  `tests/Simulation/` which is the Zeta-native
  equivalent of Amara's `/experiments/`.
- **Does NOT** adopt the full 3-PR split verbatim. Otto's
  actual cadence is small-graduation-per-tick, not
  bundle-into-large-PRs. Apply the CONTENT of each PR
  scope over multiple small ticks.
- **Does NOT** treat Amara's verification pass as
  ground-truth (BP-11: data-not-directives). Amara
  reviewed her own prior output; Otto independently
  verifies by running code + cross-checking math.

## Composition

- **16th ferry scheduling memory** (Amara GPT-5.5
  Thinking upgrade, KSK naming + Canonical Pattern Index
  actions) — this 17th ferry is the follow-up deep-dive
- **PR #317 + #319 + #321 + #324 + #323** — Graph
  substrate graduations where Amara's 8 corrections
  either already-match or name future-graduation work
- **Otto-121 Graph-tight-in-all-aspects memory** — design
  bar; unaffected by these corrections
- **Otto-122 theory-cathedral-warning + toy-cartel
  validation bar** — validation bar; already cleared per
  PR #323; Amara's 5.5-Thinking corrections pressure
  further refinement but don't invalidate the bar
- **Otto-108 Conway's-Law** — Amara's 3-PR split
  proposes moving to sub-experiments folder; Otto's
  Conway's-Law discipline says stay single-module-tree
  until interfaces harden. Otto-133 absorb will note the
  tension + keep existing layout.

## Direct quotes to preserve verbatim

Part 1 claim:
*"This plan ensures a rigorous, test-driven rollout of the
Cartel-Lab, fully aligned with Zeta/Aurora's engineering
and governance goals."*

Part 2 verdict:
*"Archive the report, but mark it 'draft / needs
correction pass.' The idea is good. The first runnable
prototype is the right next move. The thing to protect
now is test accuracy: wrong early math constants will
create false confidence."*

Invariant (reiterated in both 16th and 17th ferries):
*"Every new abstraction must map to a repo surface, a
test, a metric, or a governance rule."*
