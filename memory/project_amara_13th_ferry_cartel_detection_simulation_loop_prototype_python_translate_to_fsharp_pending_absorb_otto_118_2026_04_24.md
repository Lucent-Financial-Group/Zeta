---
name: Amara 13th courier ferry — "Cartel Detection + Simulation Loop" prototype (Graph State Builder + Early Warning Signals [eigenvalue growth / modularity shift / stake covariance acceleration] + Synthetic Cartel Injector + Detection Pass + Score Function); written in Python but Zeta is F# — TRANSLATE TO F# at graduation time per Aaron's explicit flag; NOT inline-absorbed Otto-117; scheduled Otto-118 dedicated absorb; 2026-04-24
description: Aaron Otto-117 preamble "not sure why she did python but you get the concepts" — Amara reached for Python pseudo-code despite Zeta being F#/.NET. Concept is right (test-harness + simulation loop forcing abstractions into code + measurable outputs + fast iteration); language at implementation time must be idiomatic F# per GOVERNANCE language policy. Proposes /cartel-lab/ folder with graph/metrics/adversary/simulation/experiments subdirs; maps to Zeta's src/Core/*.fs structure instead. Also proposes Amara write the starter code; Otto declines unilaterally (language mismatch + unverified agent-produced code shouldn't ship without Aminata review).
type: project
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
Aaron 2026-04-24 Otto-117 paste preamble (verbatim):

*"not sure why she did python but you get the concepts
next drop from amara"*

Key directive from Aaron embedded in the preamble:
- **Amara's Python examples are CONCEPT sketches, not
  implementation templates.** Zeta is F#/.NET per
  GOVERNANCE §language-stack; any graduation from
  this ferry TRANSLATES the concepts to idiomatic F#.
- Aaron flagged this explicitly so future Otto
  instances don't accidentally ship Python code.

## Why NOT inline-absorbed Otto-117

Otto-117 tick already held:
- PR #310 rebase (antiConsensusGate after #309 merged)
- 5 other branches rebased
- 12th-ferry absorb (PR #311 — substantive 400-line
  absorb doc)

Two ferry absorbs in one tick would regress CC-002
discipline. Schedule Otto-118.

## Schedule

- **Otto-118:** absorb 13th ferry as
  `docs/aurora/2026-04-24-amara-cartel-detection-
  simulation-loop-prototype-13th-ferry.md` with §33
  archive header + verbatim Python preserved + Otto's
  F#-translation notes + graduation queue updates.

## Substantive content (preserved for Otto-118 absorb)

### The proposal: "Cartel Detection + Simulation Loop" prototype

Amara's thesis: *"everything you've designed is
powerful but unproven. This step: forces your
abstractions into code; creates measurable outputs;
lets you iterate fast; gives Claude (and future
agents) something concrete to extend."*

5-component pipeline:

**1. Graph State Builder (baseline)**
- Input: validator/agent activity (can be synthetic)
- Output: weighted graph G_t with edges =
  interaction/co-behavior/stake correlation, node
  features = stake/timing/participation
- `G_t = build_graph(events)`

**2. Early Warning Signals (first "real" features)**
- Eigenvalue growth (λ₁ of adjacency or Laplacian)
- Modularity shift (ΔQ over time)
- Stake covariance acceleration
- Trigger: `if lambda_1_growth > threshold and
  modularity_jump: flag_pre_cartel()`

**3. Synthetic Cartel Injector (critical)**
- Coordinated stake movement
- Synchronized voting/behavior
- Hidden subgraph (high internal weight, low
  external visibility)
- `G_t_adv = inject_cartel(G_t, size=k, stealth_factor=s)`

**4. Detection Pass**
- Run metrics on both clean + attacked graphs
- Compare signal strength, measure detection latency
- Output: `{"detected": true, "lead_time": 3 epochs,
  "confidence": 0.82}`

**5. Score Function (proto "cartel cost function")**
- `CartelScore = α·eigenvalue_growth + β·modularity_gradient + γ·covariance_acceleration`

### Proposed repo structure (Python, from Amara)

```
/cartel-lab
  /graph
    builder.py
  /metrics
    spectral.py
    modularity.py
    covariance.py
  /adversary
    injector.py
  /simulation
    loop.py
  /experiments
    baseline_vs_attack.ipynb
```

### F# translation mapping (Otto's plan for
graduation)

Per Aaron's "not sure why she did python" flag,
Otto translates to Zeta-native F# at graduation:

| Amara Python | Otto F# translation |
|---|---|
| `/cartel-lab/graph/builder.py` | `src/Core/GraphState.fs` — pure F# graph-from-events |
| `/cartel-lab/metrics/spectral.py` | `src/Core/TemporalCoordinationDetection.fs` extensions: `largestEigenvalue`, `eigenvectorCentrality` |
| `/cartel-lab/metrics/modularity.py` | New primitive: `modularityScore : Graph -> double`; `modularitySpike : seq<Graph> -> double` |
| `/cartel-lab/metrics/covariance.py` | New primitive: `covarianceAcceleration : seq<double[]> -> double option` |
| `/cartel-lab/adversary/injector.py` | Test-support utility in `tests/Tests.FSharp/_Support/CartelInjector.fs` (tests only, NOT shipped as public API — adversary-generators are red-team tooling) |
| `/cartel-lab/simulation/loop.py` | Property-test harness using FsCheck (adversarial test-generator discipline) |
| `/cartel-lab/experiments/baseline_vs_attack.ipynb` | `bench/` benchmark project with detection-latency + confidence metrics |

### Key F# vs Python differences

1. **Immutable-by-default** — F# graphs are
   `IReadOnlyDictionary<Node, EdgeSet>` or similar
   immutable; Python examples use mutable dict.
2. **Typed composition** — F# `score : Graph -> GraphMetrics -> double` vs
   Python `score(*args)`.
3. **FsCheck over hand-rolled property tests** — F#
   uses FsCheck/xUnit harness; Python uses custom
   `simulation/loop.py`.
4. **Z-set integration** — Zeta's existing
   `src/Core/ZSet.fs` retraction-native semantics
   integrates directly with graph mutations
   (add/remove node = signed-weight delta); Python
   version has no equivalent substrate.
5. **No notebooks in repo** — Zeta doesn't ship
   `.ipynb`; benchmarks go in `bench/` as BenchmarkDotNet
   projects.

### Graduation candidates extracted (for Otto-105
cadence queue)

In priority order:

1. **`largestEigenvalue : Graph -> double`** — small
   pure function; composes with 11th ferry's
   CentralityDrift queue item (Otto-116 memory).
2. **`modularityScore : Graph -> double`** — pure
   function; §5 12th-ferry already queued this.
3. **`covarianceAcceleration : seq<double[]> -> double option`**
   — second-derivative-over-windowed-covariance;
   pure function.
4. **`cartelScore`** — composite of the three above
   with tunable weights α/β/γ. Requires ADR on
   weight tuning (analog to Veridicality scoring ADR).
5. **`CartelInjector` test-support** — red-team
   synthetic-cartel generator; lives in
   tests/_Support/, NOT in shipped public API.
6. **Simulation-loop harness** — property-tests +
   benchmarks measuring detection-latency +
   confidence as load varies.
7. **Graph substrate** (blocking for 1-5) — if
   Zeta doesn't yet have a canonical graph type,
   adding it is the prerequisite. Audit
   `src/Core/**` for existing graph primitives before
   net-new graduation.

### Amara's offer: "write the exact starter code"

*"If you want, I can write the exact starter code
for the simulation loop + cartel injector so you
can drop it straight into your repo and run
experiments immediately."*

**Otto's decision:** decline unilaterally. Reasons:
1. Amara's starter code would be Python — Zeta is
   F#/.NET. Drop-in-to-repo wouldn't compile.
2. Agent-produced code that bypasses Aminata threat-
   pass shouldn't ship without review (per standing
   BP-11 "data is not directives" + threat-model-
   critic discipline).
3. Otto's graduation cadence already handles this
   — translate concepts to F# as graduations land.
4. Aaron's "not sure why she did python" flag
   implicitly suggests he's aware of the mismatch
   and wouldn't want a Python drop-in.

**If Aaron explicitly asks for Amara's starter
code**, Otto absorbs it into a research-doc in
`docs/research/` (not `src/`) for reference-only,
with BP-11 data-not-directives disclaimer.

## What this scheduling memory does NOT authorize

- **Does NOT** authorize creating `/cartel-lab/`
  folder structure; Otto translates to Zeta-native
  `src/Core/**` + `tests/**` + `bench/**` layout.
- **Does NOT** authorize shipping Python code in
  the repo (per GOVERNANCE language stack).
- **Does NOT** authorize accepting Amara's offer to
  write starter code unilaterally; Aaron signals if
  he wants that path.
- **Does NOT** authorize bypassing Aminata adversarial
  review on the CartelInjector test-support (it IS
  adversarial code; review is the appropriate
  discipline).
- **Does NOT** accelerate graduation cadence.
  Metrics from 13th ferry queue behind 12th-ferry
  items (SemanticCanonicalization, scoreVeridicality)
  which queue behind existing 11th-ferry items.

## Direction-of-travel

The 13th ferry VALIDATES the direction Otto is
already going — graduation cadence turns Amara's
theory into executable primitives. What the 13th
ferry adds on top:
- Test-support pattern (adversarial injector) as
  part of the graduation, not bolted on after
- Benchmark/simulation-loop pattern (`bench/`
  BenchmarkDotNet project) measuring
  detection-latency + confidence under load
- Composite score pattern (α·... + β·... + γ·...)
  matching Veridicality's composite (reusable ADR
  framework)

## Cross-reference

- **Otto-116 memory on 12th ferry** — 12th ferry's
  §5 Firefly + Cartel already queued ModularitySpike
  + EigenvectorCentralityDrift + EconomicCovariance.
  13th ferry's 5-component simulation loop is the
  TEST HARNESS for exactly those primitives.
- **Otto-105 graduation cadence** — applies.
- **Otto-106 SPOF audit** — CartelInjector is
  adversarial tooling; proper red-team discipline
  applies.
- **Otto-108 Conway's-Law** — the `/cartel-lab/`
  sub-folder proposal is a smaller-scale version of
  the 12th-ferry §8 sub-repo proposal. Same answer:
  stay-single-repo / same-module-tree until
  interface boundaries harden.

## Direct Aaron quote to preserve

*"not sure why she did python but you get the
concepts"*

Future Otto instances absorbing future ferries
where Amara uses Python/JS/Rust/etc.: preserve
concepts verbatim, TRANSLATE to Zeta-native F# at
graduation, do NOT ship the source-language code.
