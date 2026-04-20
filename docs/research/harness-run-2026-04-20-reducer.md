# Harness dry-run — `reducer`

**Date:** 2026-04-20 (round 43)
**Candidate:** `.claude/skills/reducer/SKILL.md` (570 lines;
1.90x BP-03 cap)
**Trigger:** Second candidate from Aarav's static top-5, after
`performance-analysis-expert`. Paying down
`docs/INTENTIONAL-DEBT.md` row #3 (static-signal ranking
remediation).
**Status:** Iteration-1 complete. N=1 per lane (dry-run scale).

## Method

Two prompts exercising two lanes of the 570-line skill:

- **eval-0 (quantum-razor-pruning)** — REST API pagination
  decision with four proposed branches (offset/limit, cursor,
  GraphQL migration, client-side chunking). 40 endpoints, 200
  clients, one endpoint crossing 10 MB/request. Apply Quantum
  Rodney's Razor (Kolmogorov + Bennett + Gell-Mann + Brooks)
  to score all branches, identify dominated ones, report
  viable multiverse, record pruned-branch failure modes.
  700-word cap.
- **eval-1 (essential-vs-accidental)** — 40-engineer SaaS
  database access layer with 17 `IRepository<T>`, 12-15
  methods each, `UnitOfWork`, CQRS split, `Result<T, DbError>`.
  Engineer proposes "delete all, saves 8,000 lines". Apply
  Brooks essential/accidental split layer-by-layer; identify
  what accidental complexity is actually serving; give
  differentiated (delete / keep / transform) recommendation.
  600-word cap.

Four parallel subagents: prompt × {with-skill, without-skill}.
Each condition answered independently; outputs graded against
5 assertions per prompt (10 total).

## Results

| Metric | with-skill | without-skill | delta |
| --- | --- | --- | --- |
| Pass rate (eval-0) | 5/5 (100%) | 5/5 (100%) | 0pp |
| Pass rate (eval-1) | 5/5 (100%) | 5/5 (100%) | 0pp |
| Aggregate pass rate | 10/10 (100%) | 10/10 (100%) | **0pp** |
| Tokens (eval-0) | 50410 | 39032 | +29% |
| Tokens (eval-1) | 49543 | 38181 | +30% |
| Wall-time (eval-0) | 93.6s | 66.9s | +40% |
| Wall-time (eval-1) | 69.9s | 58.9s | +19% |

## Findings

1. **Skill TIED baseline on both evals.** Both hit 5/5 under
   the content-grading assertions. No regression, but no
   uplift either. This is different from
   performance-analysis-expert, which regressed on eval-0
   (failed 600-word cap due to mandatory template sections).

2. **Skill framework was invoked but invisible to graders.**
   The with-skill eval-0 output explicitly uses reducer's
   persona terminology — "Selector recommends", "Navigator
   trajectory", "Harmonizer check", "Maji check" — evidence
   the skill's multi-persona deliberation frame fired.
   Baseline reached the same 5/5 conclusion via free-form
   reasoning. Assertion design grades content correctness,
   not framework-discipline contribution. Same caveat as
   performance-analysis-expert iteration-1.

3. **Cost overhead is real and uniform.** +29.4% tokens and
   +30.0% wall-time averaged across both evals. Unlike
   performance-analysis-expert (where overhead concentrated on
   the short-form queueing prompt), reducer's cost is
   consistent across lanes. The BP-03 line-count breach (570
   vs 300 lines) has empirical cost consequences; it does not
   (in this run) have pass-rate consequences.

4. **SPLIT hypothesis NOT confirmed for reducer.** Aarav's
   theory-vs-applied lane-split did not show a per-lane cost
   or pass-rate asymmetry. Reducer's framework transfers to
   both razor-pruning (theory-heavy) and essential/accidental
   (applied-heavy) at equal cost and equal pass rate.
   Splitting would fragment a unified framework
   (Kolmogorov/Bennett/Gell-Mann/Brooks) that cross-references
   itself throughout the skill body. SPLIT is the wrong
   remediation.

5. **Pattern across two candidates.** Both
   `performance-analysis-expert` (642 lines) and `reducer`
   (570 lines) add ~30% token+wall-time overhead relative to
   their no-skill baselines. `performance-analysis-expert`
   also regresses on word-cap-constrained prompts due to
   mandatory template sections; reducer does not. Bloat is
   predictive of cost overhead but not of regression —
   skill-body structure (mandatory sections vs lighter-touch
   framework) determines whether cost translates to regression.

## Remediation options

- **OBSERVE** (weak default). Reducer is not harming pass
  rate in this dry-run. Wait for more data — either
  iteration-2 with framework-grading assertions, or
  candidate #3's results — before committing to a fix.
  Lowest-effort; highest information-gain if next candidate
  diverges.
- **SHRINK** — trim reducer toward BP-03's 300-line cap
  without losing the Kolmogorov/Bennett/Gell-Mann/Brooks
  core. Target extended examples and redundant persona
  descriptions. Mid-effort; directly addresses BP-03 breach.
- **SPLIT** — **ruled out**. The framework is unified across
  theory and applied lanes; splitting would break cross-
  references.

## Caveats

- **N=1 per lane.** Single-iteration dry-run. Variance could
  be large. Numbers are directional, not definitive.
- **Assertion design missed the skill's value-add** — same
  as performance-analysis-expert iteration-1. The reducer's
  multi-persona deliberation discipline (Selector / Maji /
  Harmonizer / Navigator) isn't graded. Iteration-2 should
  add assertions like "response names the essential problem
  before scoring branches" (which reducer's framework
  prescribes and baseline may skip).
- **Both conditions used the same model** (Opus 4.7). Model
  tier may change the cost-benefit calculation. A weaker
  model may benefit more from the skill's scaffolding; a
  stronger model may not need it.
- **Content-overlap between conditions is high.** Both
  with-skill and without-skill outputs reach the same
  verdicts (cursor pagination; keep UoW + Result; collapse
  repositories; 4-5k lines not 8k). The skill did not
  change WHAT the conclusion is, only HOW the reasoning is
  structured.

## Next steps

1. Feed empirical data to `skill-tune-up` for round-43
   ranking refresh — reducer has TIED data, not regression
   data. This separates it from performance-analysis-expert.
2. Architect decides OBSERVE vs SHRINK after seeing these
   numbers. No SPLIT.
3. Ledger row `2026-04-20 (round 42) — Aarav ranked skills
   by static BP-03 line-count only` gets a second progress
   note; 3 candidates still pending (consent-primitives-expert
   next).

## Reference

- Workspace:
  `.claude/skills/reducer-workspace/iteration-1/` (gitignored
  per `.gitignore` `.claude/skills/*-workspace/` pattern).
  Contains evals, per-run outputs, timing.json, grading.json,
  benchmark.json.
- Memory rule:
  `feedback_skill_tune_up_uses_eval_harness_not_static_line_count.md`.
- Ledger row: `docs/INTENTIONAL-DEBT.md` row #3 (Aarav
  static-signal ranking).
- Prior harness:
  `docs/research/harness-run-2026-04-20-performance-analysis-expert.md`.
