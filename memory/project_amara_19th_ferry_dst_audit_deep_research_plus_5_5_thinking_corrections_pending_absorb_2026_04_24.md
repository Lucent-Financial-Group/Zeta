---
name: Amara 19th courier ferry — two-part DST audit drop: deep-research report on Zeta DST posture + her own 5.5-thinking correction pass (7 required corrections); DST grade B- (strong architecture, partial implementation); FoundationDB/TigerBeetle/Antithesis comparison validated; 6-PR revised roadmap (scanner+boundary → seed protocol → sharder reproduction → ISimulationDriver + VTS promotion → simulated filesystem → Cartel-Lab calibration under DST); tools/git/push-with-retry.sh flagged in retry audit; "don't widen sharder threshold casually" reinforces 18th-ferry correction #10; Cartel-Lab "DST-compliant" → "PR #323 seed-disciplined at toy level"; scheduled Otto-165+ dedicated absorb per CC-002; 2026-04-24
description: Aaron Otto-165 drop after Otto-164 closed the macOS-pricing verification. Two-part ferry matching 17th/18th pattern: (a) deep-research DST audit (~5000 words, 12 sections, 7-row entropy-source table, simulation-surface-coverage table, 10-row PR roadmap table, Mermaid CI + Gantt diagrams) + (b) Amara's 5.5-thinking correction pass (~1500 words, 7 required corrections, per-area grade table, revised 6-PR roadmap with titles, DST-held minimum bar + FoundationDB-grade DST candidate criteria). Core finding: Zeta DST posture is B- (strong architectural intent + partial implementation; blockers are disk-I/O interception, deterministic task scheduling, seed artifacts, swarm testing). Not inline-absorbed Otto-164 (CC-002; already landed PR #343 verification update); scheduled Otto-165+ for dedicated absorb.
type: project
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## Why not inline-absorbed this tick (Otto-164)

Otto-164 tick already landed:

- Updated PR #343 with Otto-164 pricing-verification
  outcome (macOS-NOT-free-for-public confirmed via
  primary GitHub docs source; directive declined;
  fork-only gating stays).

Adding a 19th-ferry full absorb on top regresses CC-002
(close-on-existing discipline). Scheduled Otto-165+ per
PR #196/#211/#219/#221/#235/#245/#259/#330/#337
prior-ferry precedent.

## Ferry structure — two parts

### Part 1: Deep-research DST audit (~5000 words, 12 sections)

Executive summary:

> *"DST is firmly understood and largely practiced"*
> (corrected in Part 2 to "firmly understood and
> partially implemented").

Twelve sections:

- **§1 DST Rulebook (Project Principles).** Cites
  `.claude/skills` DST guide rules: "no dependency
  lands on a main code path unless it can be
  deterministically simulation-tested." References
  FoundationDB + TigerBeetle lineage. Enumerates 12
  known entropy sources from the DST rulebook.
- **§2 Entropy-Source Scan (findings).** 12-row table;
  most flag "no direct usage in src/Core found" —
  except `DiskBackingStore` which bypasses simulation
  (BLOCKER). Network I/O marked HIGH (future). Other
  sources MEDIUM/LOW.
- **§3 Main-Path Dependency Audit.** No suspicious
  third-party deps found; only the `DiskBackingStore`
  as an impure component. Dependency gate rule
  reaffirmed.
- **§4 Simulation Surface Coverage.** 7-row table
  listing current implementation state + gaps per
  surface:
  - ChaosEnvironment: implemented (P0 — exists)
  - VirtualTimeScheduler: test-only, needs promotion
    to core (P1)
  - Simulated Filesystem: not implemented (P1 blocker)
  - Simulated Network: not implemented (P2 future)
  - Deterministic Task Scheduler RunAsync: partial (P1)
  - Fault Injection (Buggify): partial (P2)
  - Swarm/Stress Testing: not implemented (P2)
  Mermaid diagram of ChaosEnv + VT feeding into
  proposed `ISimulationDriver`.
- **§5 Retry Audit.** No generic retry utility in
  src/Core. Recommends policy (design doc + logging
  for any future retry addition).
- **§6 CI/Test Determinism & Flakiness.** Proposes 5
  test categories (deterministic unit / seeded
  property / statistical smoke / long-run sweeps /
  formal+model). Aligns with 18th-ferry Part 1 §C.
  Names the sharder flake as running example.
- **§7 Seed Discipline & Artifacts.** Every stochastic
  test must log seed. Artifacts live under
  `artifacts/coordination-risk/`. Aligns with 18th-
  ferry correction #9.
- **§8 Cartel-Lab / Coordination Risk DST Readiness.**
  PR #323 is Stage-1 toy detector; seeded and
  repeatable, but null-model + artifact-emission
  work needed before Stage-2+ promotion. Matches
  `docs/research/calibration-harness-stage2-design.md`
  (PR #342).
- **§9 KSK/Aurora Governance DST Readiness.** KSK
  decisions must be replayable. No auto-slashing.
  Oracle inputs recorded as events. Aligns with
  `docs/definitions/KSK.md`.
- **§10 DST Tradition & State-of-the-Art.** Cites
  FoundationDB Strange Loop 2014 talk; Antithesis
  blog; TigerBeetle team notes. Positions Zeta as
  "ahead in formalization, behind in implementation."
- **§11 PR Remediation Roadmap.** 10-row table with
  prioritized PRs, files, acceptance criteria,
  risk/notes, stage. **Top-5** (bolded): DST checklist
  + CI artifacts + VTS promotion + RunAsync +
  Simulated Filesystem. Mermaid gantt 2026-Q2..Q4.
- **§12 What Not To Claim Yet.** 5 caveats (no
  strong cartel-proof guarantees; no production
  readiness; no automatic enforcement; don't
  overstate stability; don't skip reproducibility).

### Part 2: Amara's 5.5-Thinking correction pass

Verdict: *"strong draft, not canonical yet."*

**Validated:** the core framing (DST = deterministic
simulated environment; seed discipline; Task.Run needs
special treatment because it queues to ThreadPool —
Microsoft docs confirm; GitHub Actions artifacts are
the correct output surface).

Validated references:

- FoundationDB Simulation docs: "deterministic
  simulation of a whole cluster in a single-threaded
  process"
- Microsoft `Task.Run` docs: queues to ThreadPool
  (hence DST needs `RunAsync` / `ISimulationDriver`)
- GitHub Actions artifacts: supports logs, test
  results, failures, stress-test output, coverage

**7 required corrections:**

1. **Downgrade "largely practiced" to "partially
   implemented."** Evidence in the report itself:
   `VirtualTimeScheduler` test-side, `DiskBackingStore`
   bypasses simulation, `RunAsync` incomplete.
2. **Don't claim entropy scan is complete unless
   there's a generated artifact.** Soften to "no
   additional entropy sources evidenced by this report;
   finding not canonical until backed by machine-
   generated scanner artifact." Propose
   `artifacts/dst/entropy-scan.json` + `-scan.txt` +
   `accepted-boundaries.md`.
3. **Fix the retry audit.** Flag
   `tools/git/push-with-retry.sh` as a named finding:
   acceptable ONLY if it records root-cause evidence,
   retry counts, error text, explicit external-
   boundary rationale; otherwise should become an
   investigation wrapper, not a blind retry wrapper.
4. **Don't widen sharder threshold casually.**
   Correct order:
   (1) capture failing seed,
   (2) reproduce locally,
   (3) determine deterministic-under-seed,
   (4) recalibrate via distribution/CI if mathematically
       too tight,
   (5) move broad sweep to nightly + keep fixed-seed
       PR smoke,
   (6) threshold adjustment last, with explanatory note.
   **Reinforces 18th-ferry correction #10** exactly.
5. **Split "DST-compliant" from "DST-ready."** Tighten:
   *"PR #323 is seed-disciplined at the toy-test level.
   Cartel-Lab is not DST-ready for promotion until null
   models, replay artifacts, deterministic calibration,
   and scenario sweeps are implemented."*
6. **Add exact acceptance criteria for "DST-held":**
   - All PR-gating stochastic tests use explicit seeds
   - Every failing stochastic test emits seed + params
   - Same seed produces same result locally + CI
   - Broad sweeps run nightly, not flaky PR gates
   - Main-path code has zero unreviewed entropy-source
     hits
   - File/network/time/random/task-scheduling boundaries
     are either simulated or marked accepted external
     boundaries

   And **FoundationDB-grade DST candidate:**
   - Simulated filesystem
   - Simulated network
   - Deterministic task scheduler
   - Fault injection / buggify surface
   - Swarm runner
   - Replay artifact storage
   - Failure minimization / shrinking
   - Reproducible end-to-end scenario from one seed
7. Implicitly: replace Medium references with stronger
   sources; add explicit acceptance criteria per PR.

### Per-area grade table (Part 2)

Current DST posture: **B-** (strong architectural
intent, partial implementation).

| Area                          | Grade | Reason                                                      |
|-------------------------------|-------|-------------------------------------------------------------|
| DST philosophy / docs         | A-    | Rule is clear + aligned with FoundationDB/TigerBeetle       |
| Seeded core environment       | B     | ChaosEnvironment exists, not all surfaces route through it  |
| Virtual time                  | B-    | Exists, but test-side rather than unified core driver       |
| Filesystem simulation         | D     | Known blocker: real disk path not intercepted               |
| Network simulation            | D/NA  | Future multi-node work, not yet present                     |
| Deterministic task scheduling | C-    | RunAsync abstraction needed; ambient ThreadPool risk        |
| CI seed artifacts             | C     | Good plan, not fully landed                                 |
| Cartel-Lab DST readiness      | C+    | Toy seed discipline exists; calibration artifacts missing   |
| KSK/Aurora DST readiness      | C     | Advisory-only is correct; replayable inputs still need design |

### Revised 6-PR roadmap (titles locked, reordered)

- **PR 1** — `tools/dst/entropy-scan.*` +
  `docs/DST-COMPLIANCE.md` +
  `docs/DST-ACCEPTED-BOUNDARIES.md` + CI workflow.
  Acceptance: CI emits scan JSON; every finding
  classified BLOCKER/HIGH/MEDIUM/LOW/ACCEPTED_BOUNDARY;
  accepted boundaries require rationale.
- **PR 2** — Seed protocol + artifacts
  (`tests/_Support/Seed.fs`; CI uploads
  `artifacts/dst/failing-seeds.txt`,
  `seed-results.csv`; replay command documented).
- **PR 3** — Fix sharder flake by reproduction (not
  threshold guessing). Acceptance: failing seed
  captured; fixed-seed PR gate OR broad sweep moved
  nightly; threshold change only with distribution
  evidence.
- **PR 4** — Promote VirtualTimeScheduler +
  define `ISimulationDriver`. Acceptance: existing
  VT tests still pass; new `ISimulationDriver`
  exposes Scheduler, FileSystem placeholder,
  Network placeholder, RunAsync placeholder.
- **PR 5** — Simulated filesystem boundary
  (`src/Core/SimulationFs.fs`, wire `DiskBackingStore`
  through it). Acceptance: DiskBackingStore doesn't
  write directly on main-simulation path; same seed
  replays read/write/failure sequence.
- **PR 6** — Cartel-Lab calibration under DST. Lands
  at `src/Experimental/CartelLab/` (aligns with
  `docs/research/calibration-harness-stage2-design.md`
  PR #342). Acceptance: null models + attack
  scenarios seeded; JSON/CSV artifacts emitted;
  fixed-seed PR smoke + nightly broad sweep.

## Composition with prior substrate

- **`docs/research/calibration-harness-stage2-design.md`**
  (PR #342) — this ferry's revised PR 6 matches the
  design doc's Stage-2 scope (null models + seed
  replay + artifact layout). Align before landing.
- **`docs/research/test-classification.md`** (PR #339)
  — this ferry's §6 test categories map 1:1 onto the
  5-category taxonomy already shipped.
- **18th-ferry correction #10** — this ferry's
  correction #4 reinforces verbatim (sharder —
  measure before widen).
- **18th-ferry correction #6** — PR #340 shipped
  PLV mean phase offset; this ferry doesn't touch
  PLV specifically but validates the general
  "two-output primitive" principle for DST-replayable
  metrics.
- **18th-ferry correction #9** — artifact-output
  layout. This ferry proposes `artifacts/dst/...` as
  a parallel directory to `artifacts/coordination-
  risk/...` — both under the same top-level
  `artifacts/` prefix.
- **`.claude/skills` DST guide** — ferry references
  the existing factory DST skill as the
  authoritative rulebook. Ferry corrections feed
  back into potential skill updates via
  `skill-creator` workflow.
- **FACTORY-HYGIENE row #51** — cross-platform parity
  audit's "detect-only until enforcement viable"
  pattern is directly analogous to this ferry's
  "scanner + accepted-boundary registry" before
  enforcement. Same hygiene-history discipline
  applies.
- **Otto-105 graduation cadence** — the 6-PR roadmap
  maps to one graduation per tick at factory pace,
  not a single monolithic landing.
- **Otto-73 retraction-native-by-design** — DST
  replayability composes with retraction: every
  replay-from-seed is itself a retraction of any
  prior run's state. Future graduation candidate:
  integrate seed-replay as a retraction operation
  over the global test-state.

## Otto's notes on operationalization path

### Immediate-alignment observations

Some elements ALREADY shipped or in flight this
session:

- **Test classification** (§6 → PR #339). Shipped.
- **CoordinationRisk artifact layout** (§7 →
  `docs/research/calibration-harness-stage2-design.md`
  §7, PR #342). Design shipped.
- **Cartel-Lab stage discipline** (§8 → 18th-ferry
  promotion ladder). Shipped as design doc.
- **KSK advisory-only framing** (§9 →
  `docs/definitions/KSK.md` PR #336). Shipped.

Four of the 12 sections have shipped substrate.

### Six corrections queued as future graduations

1. **DST entropy-scanner + accepted-boundary registry**
   — PR 1 of the revised roadmap. Lands as a new tool
   + a new policy doc + a new workflow. Small-Medium.
2. **Seed protocol + CI artifacts** — PR 2. Small
   (test-support module) + Medium (workflow).
3. **Sharder reproduction-before-widening** — PR 3.
   Small (capture seed) + tick to triage.
4. **`ISimulationDriver` + VTS promotion to core** —
   PR 4. Medium. Touches core runtime; may require
   careful backward-compat.
5. **Simulated filesystem** — PR 5. Large.
   DiskBackingStore rewrite + `ISimulatedFs` design.
6. **Cartel-Lab calibration DST** — PR 6.
   Medium, aligns with `calibration-harness-stage2-
   design.md` (PR #342 already landed).

### Two additional items flagged

- **Retry-audit finding on `tools/git/push-with-retry
  .sh`.** Named as a required doc update: either
  confirm external-boundary exception with rationale,
  or convert to investigation-wrapper. Small.
- **DST-held + FoundationDB-grade bars.** Document in
  a new `docs/DST-COMPLIANCE.md` or
  `docs/DST-READINESS.md`. Small.

## Scheduling — Otto-165+

Otto-165+ dedicated absorb as
`docs/aurora/2026-04-24-amara-dst-audit-deep-research-
plus-5-5-corrections-19th-ferry.md` with:

- §33 archive-header (Scope / Attribution /
  Operational status / Non-fusion disclaimer)
- Both parts verbatim preserved
- Otto's notes on the already-shipped
  substrate (4 sections of §1-§12 already aligned
  with shipped PRs)
- 6-PR roadmap landing sequence
- Cross-references to PRs #323, #327, #330, #333,
  #336, #339, #340, #342, `docs/definitions/KSK.md`,
  `docs/research/calibration-harness-stage2-design.md`,
  `docs/research/test-classification.md`

Landing candidates from the 7 corrections (not
commitments):

1. **DST entropy-scanner** (PR 1 revised roadmap) — S-M
2. **Seed-protocol + CI artifacts** (PR 2) — S + M
3. **Sharder reproduction** (PR 3) — S, blocks on
   running reproducing script
4. **ISimulationDriver design doc** — precedes
   PR 4 implementation; S docs-only
5. **Simulated-filesystem design doc** — precedes
   PR 5 implementation; S docs-only
6. **push-with-retry.sh audit** — S

Otto-105 cadence chooses one per tick. Docs-only
items are first (they unblock implementation work
without piling PRs on a saturated queue).

## What this scheduling memory does NOT authorize

- **Does NOT** inline-absorb Otto-164 tick. CC-002
  discipline stands.
- **Does NOT** widen the sharder threshold. 18th-
  ferry #10 + this ferry #4 both say measure first.
- **Does NOT** authorize automatic KSK enforcement.
  §9 + all prior ferries reaffirm advisory-only.
- **Does NOT** promote Cartel-Lab to Core without
  Stage-4 evidence. §8 explicit; promotion ladder in
  18th-ferry (also #342 design doc) already locks
  this.
- **Does NOT** override Otto-105 cadence. 6 PRs land
  across multiple ticks, one graduation per tick.
- **Does NOT** treat the deep-research report as
  canonical. Per Part 2: "strong draft, not canonical
  until the 7 corrections land." Absorb doc preserves
  as draft.
- **Does NOT** authorize adopting the ferry's grade
  (B-) as an external claim. It's Amara's internal
  assessment; Otto reports it in the absorb doc as
  "Amara's assessment" not as a factory-certified
  grade.
- **Does NOT** authorize shipping any of the 7
  corrections same-tick as absorb. Absorb is doc-
  only; corrections are follow-up graduations.

## Direct Amara quotes to preserve verbatim

Corrected status (Part 2):

> *"DST is firmly understood and partially implemented.
> Core design has the right shape, but full DST
> compliance is blocked by missing disk I/O
> interception, missing network interception,
> incomplete deterministic task scheduling, and
> incomplete swarm/seed-artifact infrastructure."*

Cartel-Lab readiness (Part 2):

> *"PR #323 is seed-disciplined at the toy-test level.
> Cartel-Lab is not DST-ready for promotion until null
> models, replay artifacts, deterministic calibration,
> and scenario sweeps are implemented."*

Bottom line (Part 2):

> *"archive it as a draft audit, not a canonical
> compliance report. The highest-value correction is
> to make the audit itself reproducible: scanner
> output, accepted-boundary registry, seed artifacts,
> and replay commands. That makes DST not just a
> philosophy but a self-verifying repo discipline."*
