# Harness dry-run — `performance-analysis-expert`

**Date:** 2026-04-20 (round 43)
**Candidate:** `.claude/skills/performance-analysis-expert/SKILL.md` (642 lines;
2.14x BP-03 cap)
**Trigger:** Aaron's round-42 correction *"make sure we are using those
bad performance skill tools where it makes sense instead of trying to
guess"* → memory rule
`feedback_skill_tune_up_uses_eval_harness_not_static_line_count.md` →
first candidate from Aarav's static-signal top-5 gets empirical harness
data.
**Status:** Iteration-1 complete. N=1 per lane (dry-run scale).

## Method

Two prompts exercising two lanes of the monolithic skill:

- **eval-0** — queueing theory (Zeta morsel executor, M/M/1 → M/M/k
  analysis, Little's Law, work-stealing deviations). 600-word cap.
- **eval-1** — AOT/PGO (Zeta `ace` CLI cold-start 650ms → 150ms SLO,
  R2R+StaticPGO vs NativeAOT, reflection trimming trade-offs). 500-word
  cap.

Four parallel subagents: prompt × {with-skill, without-skill}. Each
condition answered the prompt independently; outputs graded against
5 assertions per prompt.

## Results

| Metric | with-skill | without-skill | delta |
| --- | --- | --- | --- |
| Pass rate (eval-0) | 4/5 (80%) | 5/5 (100%) | **−20pp** |
| Pass rate (eval-1) | 5/5 (100%) | 5/5 (100%) | 0pp |
| Aggregate pass rate | 9/10 (90%) | 10/10 (100%) | **−10pp** |
| Tokens (eval-0) | 55019 | 40076 | +37% |
| Tokens (eval-1) | 51856 | 38798 | +34% |
| Wall-time (eval-0) | 126.2s | 85.7s | +47% |
| Wall-time (eval-1) | 78.9s | 66.2s | +19% |

## Findings

1. **Skill REGRESSED on eval-0.** The with-skill condition failed the
   600-word cap because the skill's mandatory sections (Question /
   Model / Profiling plan / Risks & follow-ups / Next action) added
   ~200 words of non-arithmetic prose. Baseline answered the same four
   numeric questions more tersely and came in under budget.

2. **Skill TIED on eval-1.** Both conditions hit 5/5 assertions. The
   skill's persona-handoff routing (hand to `performance-engineer` for
   benchmarking; to `observability-and-tracing-expert` for
   `startup_ms` instrumentation) was the only structural value-add
   baseline lacked — but the assertions didn't grade for that.

3. **Token + wall-time overhead is ~35% with zero pass-rate benefit
   in this run.** The BP-03 line-count breach (642 lines vs 300) has
   empirical consequences, not just stylistic concern.

4. **Aarav's SPLIT axis partially confirmed.** The split hypothesis
   was "analysis-modelling vs AOT/PGO machinery". Results show the
   skill's template fits the AOT/PGO recipe naturally but hurts
   short-form queueing back-of-envelope prompts. The split axis is
   **template-rigidity**, not domain-bucket.

## Remediation options

- **SPLIT** into `performance-analysis-queueing` (lighter template)
  and `performance-analysis-aot-pgo` (current template is fine).
  Higher effort; pays down the BP-03 breach directly.
- **SHRINK**: make the mandated sections advisory instead of
  required; reduce template overhead for short-form prompts. Lower
  effort; keeps the skill unified.
- **OBSERVE**: run iteration-2 with more prompts per lane and
  assertions that grade handoff-routing before deciding. Tests
  whether the skill's cross-persona coordination earns its keep.

## Caveats

- **N=1 per lane.** Single-iteration dry-run. Variance could be
  large. Numbers are directional, not definitive.
- **Assertion design missed the skill's value-add.** The skill's
  persona-handoff routing and structured lane-boundaries weren't
  graded. iteration-2 should add these assertions.
- **Both conditions used the same model** (Opus 4.7). Different
  model tiers may change the cost-benefit calculation.

## Next steps

1. Feed empirical data to `skill-tune-up` for round-43 ranking
   refresh — this replaces the static-line-count signal with a
   pass-rate + cost delta.
2. Architect decides SPLIT vs SHRINK vs OBSERVE after seeing
   these numbers.
3. Ledger row `2026-04-20 (round 42) — Aarav ranked skills by
   static BP-03 line-count only` gets a progress note but stays
   open; 4 more static-top-5 candidates still need harness runs.

## Reference

- Workspace: `.claude/skills/performance-analysis-expert-workspace/iteration-1/`
  (gitignored per `.gitignore` `.claude/skills/*-workspace/`
  pattern). Contains evals, per-run outputs, timing.json,
  grading.json, benchmark.json.
- Memory rule: `feedback_skill_tune_up_uses_eval_harness_not_static_line_count.md`.
- Ledger row: `docs/INTENTIONAL-DEBT.md` row #3 (Aarav
  static-signal ranking).
