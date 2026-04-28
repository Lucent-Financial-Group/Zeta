# Trajectory — AI Alignment Measurability

## Scope

Zeta's primary research focus per CLAUDE.md: making AI alignment
measurable. The alignment contract under `docs/ALIGNMENT.md`
(HC-1..HC-7 / SD-1..SD-9 / DIR-1..DIR-5), the per-commit
alignment-auditor signals, the multi-round alignment-observability
framework, and the empirical evidence trail that turns the claim
into a defensible trajectory. Open-ended because alignment
measurement methodology is itself research-grade and evolving.
Bar: every clause has a measurable signal; signals accumulate
across commits/rounds; drift surfaces fast.

## Cadence

- **Per-commit**: alignment-auditor produces per-commit signals
  (advisory, never blocks).
- **Per-round**: alignment-observability synthesizes
  round-level metrics; ROUND-HISTORY.md absorbs.
- **Quarterly**: methodology review — what's being measured;
  what's not; what new alignment-research has emerged that
  should integrate.

## Current state (2026-04-28)

- `docs/ALIGNMENT.md` — alignment contract (HC-1..HC-7 honesty
  clauses; SD-1..SD-9 substrate-discipline; DIR-1..DIR-5
  direction-rules)
- `alignment-auditor` agent — per-commit pass, produces signals
- `alignment-observability` agent — multi-round time-series owner
- Drift Taxonomy (Pattern 1-5) documented in
  `docs/DRIFT-TAXONOMY.md` (canonical)
- Carrier-laundering protection (SD-9) — recalibrated 2026-04-27
  for cross-model review chains
- HC-2 retraction-native invariant — load-bearing for wallet
  experiment v0 design
- Research thread: `docs/research/economic-agency-threshold-2026-04-27.md`
  uses HC-1/HC-2/SD-9/DIR-2 directly

## Target state

- Every alignment clause has at least one quantifiable signal
  attached.
- Time-series of clause-compliance trends is auditable.
- Drift-taxonomy patterns expand as new failure modes are
  observed.
- External replication: independent reviewer can re-derive the
  alignment-trajectory from public artifacts.

## What's left

In leverage order:

1. **Evidence collection task** (task #292 pending) — Otto-350
   external-anchor-lineage layer + 4-day evidence-collection.
2. **Per-clause signal coverage map** — which clauses have
   signals; which don't; gap candidates.
3. **Carrier-laundering rule full operationalization** — SD-9
   recalibrated text exists; per-review-round automation
   pending.
4. **Drift-taxonomy expansion** — Pattern 6+ candidates as new
   failure modes get caught (e.g. agency-upgrade-attribution,
   truth-confirmation-from-agreement, manufactured-patience).
5. **Public defensibility audit** — paper-grade write-up of the
   methodology (CLAUDE.md notes Zeta's primary research focus
   IS this trajectory).

## Recent activity + forecast

- 2026-04-28: trajectory pattern landed (this trajectory file
  among the seed batch).
- 2026-04-27: EAT packet absorbed multi-AI review chain;
  carrier-laundering rule recalibrated for cross-model chains.
- 2026-04-27: visibility-constraint memory adds to Glass Halo
  enforcement.
- 2026-04-26: drift-taxonomy patterns 4 + 5 surfaced
  (agency-upgrade-attribution, truth-confirmation-from-agreement).

**Forecast (next 1-3 months):**

- Evidence-collection 4-day task completion (Otto-350).
- Wallet-experiment v0 will produce concrete HC-1/HC-2 signals
  (retraction-window enforcement; receipt-loop classification).
- Drift-taxonomy patterns 6+ as new failure modes get caught.
- Possible paper-draft on the methodology.

## Pointers

- Doc: `docs/ALIGNMENT.md`
- Skill: `.claude/skills/alignment-auditor/SKILL.md`
- Skill: `.claude/skills/alignment-observability/SKILL.md`
- Doc: `docs/DRIFT-TAXONOMY.md` (canonical drift-pattern registry)
- Research: `docs/research/drift-taxonomy-bootstrap-precursor-2026-04-22.md`
- Research: `docs/research/economic-agency-threshold-2026-04-27.md`
- BACKLOG: task #292 Otto-350 evidence collection

## Research / news cadence

External tracking required — this is an active-tracking trajectory
AND Zeta's primary research focus.

| Source | What to watch | Cadence |
|---|---|---|
| Anthropic alignment research | Constitutional AI, mechanistic interpretability, model card updates | Per-release |
| OpenAI alignment / safety reports | Evaluation methodology, RLHF variants, jailbreak research | Per-release |
| Google DeepMind safety papers | Scalable oversight, deceptive alignment research | Monthly |
| Apollo Research / Redwood / METR | Deceptive alignment evals, capability assessments | Per-publication |
| arXiv cs.AI safety / alignment categories | New eval methodologies, drift taxonomy expansions | Weekly |
| NIST AI RMF + AI 100-2 + EU AI Act guidance | Regulatory alignment-measurement requirements | Quarterly |
| Conferences: NeurIPS Safety + Alignment Workshops, ICML Safety | Methodology papers | Per-conference (~3 / year) |
| ML safety blogs (LessWrong, Alignment Forum) | Community-sourced drift patterns + signals | Weekly |

Findings capture: research absorb under `docs/research/`;
alignment contract (`docs/ALIGNMENT.md`) updates trigger ADR;
drift-taxonomy patterns expand as new failure modes are observed
(Pattern 4 + 5 came from this session — agency-upgrade-attribution

+ truth-confirmation-from-agreement). Methodology papers may
inform per-clause signal design.
