# Harness dry-run — `consent-primitives-expert` (Aarav static #3)

**Date:** 2026-04-20
**Round:** 43
**Author:** Kenji (Architect) running the Anthropic
`plugin:skill-creator` eval harness on one of Aarav's
static-top-5 BP-03 candidates.
**Context:** `docs/INTENTIONAL-DEBT.md` row #3 — Aarav's
round-42 ranking used static line-count only; the human
maintainer's correction (`feedback_skill_tune_up_uses_eval_harness_not_static_line_count.md`)
requires empirical pass-rate + cost data before any action.

## Skill under review

- `.claude/skills/consent-primitives-expert/SKILL.md`
- 507 lines (1.69x the BP-03 300-line cap)
- Framework: consent modelled as a Z-set over grant/retract
  events; composition via meet-semilattice (`⊓`); GDPR
  Article 17 mapped to append-only event log + crypto-
  shredding.

## Eval design

Two prompts, each 5 assertions, both designed to grade
**content correctness**, not framework-naming discipline
— so the baseline can score 5/5 by reaching equivalent
answers via general knowledge without naming the Z-set /
meet-semilattice framework.

- **eval-0** (`scope-intersection-algebra`) — theory:
  define `⊓`, compute `A ⊓ B` for two concrete consents,
  state commutativity / associativity / identity,
  discuss non-properties, give an edge case.
  500-word cap.
- **eval-1** (`gdpr-audit-collision`) — applied: design
  an append-only substrate that reconciles GDPR Art. 17
  erasure with 7-year HIPAA-equivalent audit retention.
  Schema + effective-consent-at-T query + erasure
  mechanics + pseudonymisation + failure mode.
  600-word cap.

Four subagent runs total (2 evals × 2 configurations).

## Results

| metric                     | with_skill | without_skill | delta      |
|----------------------------|------------|---------------|------------|
| assertions passed / total  | 10 / 10    | 10 / 10       | **TIED**   |
| pass-rate                  | 100%       | 100%          | 0 pp       |
| mean tokens                | 48 275     | 39 521        | **+22.1%** |
| mean wall-time             | 76.8 s     | 73.4 s        | **+4.7%**  |

## What the content divergence tells us

Pass-rate is tied, but the outputs disagree in
interesting places:

### `scope-intersection-algebra`

Both configurations reach the same `A ⊓ B = ({marketing,
Tier-1-partners}, [2026-03-01, 2026-09-01))`. Both name
commutativity, associativity, identity element
(universal consent / `⊤` / `𝟙⊓`), idempotence (meet-
semilattice), and absence of inverses.

- **With-skill** explicitly frames `(C, ⊓, 𝟙⊓)` as a
  commutative monoid / meet-semilattice *lifted from the
  Z-set abelian group* backing consent history, and
  distinguishes "two identities, two operations — the
  ring-lift pattern in the skill". Edge case: *retracted
  purpose* inside A (naive set-intersection on
  declared-at-grant scopes leaks retracted purposes).
- **Without-skill** reaches a "bounded meet-semilattice"
  with `⊤` universal consent and `⊥` absorbing-bottom,
  and names the dual `⊔` as the unsafe alternative. Edge
  case: *non-overlapping windows* (W₁ ∩ W₂ = ∅ must
  collapse to `⊥`, not return a non-empty scope over an
  empty window).

The frameworks differ in where they look for failure.
Both catch *a* critical edge case; neither catches the
other's.

### `gdpr-audit-collision`

Both configurations propose append-only event logs,
hash-chained rows, crypto-shredded per-subject DEKs, and
a reduce/fold query for effective-consent-at-T. Both
explicitly argue this satisfies both regulatory regimes.

- **With-skill** uses `multiplicity IN (-1, +1)` and
  `SUM(multiplicity) > 0` — literally the Z-set
  is-element-present query. Failure mode: *PII leaking
  into `reason` free-text*. Mitigation: controlled-
  vocabulary enum + separate `reason_encrypted` column.
- **Without-skill** uses `event_kind` enum
  (`GRANT`/`WITHDRAW`/`SCOPE_CHANGE`/`ERASURE_REQUEST`)
  and `SELECT DISTINCT ON (purpose) ... ORDER BY
  valid_from DESC`. Failure mode: *re-identification via
  correlation with pre-erasure operational snapshots*.
  Mitigation: data-lineage catalog + rotating-salt HMAC
  + separation of duties.

Again: different blind spots. With-skill's failure mode
is framework-local (its own schema's `reason` field).
Without-skill's failure mode is systems-level (anything
downstream of the primary store — a harder problem,
arguably more important). Neither configuration catches
both.

## Pattern across three dry-runs

| skill (line count)           | pass-rate | token delta | wall delta |
|------------------------------|-----------|-------------|------------|
| performance-analysis-expert (642) | tied, regression risk | +35% | +35% |
| reducer (570)                | 10/10 vs 10/10 | +29% | +30% |
| consent-primitives-expert (507) | 10/10 vs 10/10 | +22% | +5%  |

Consistent signal: **on frontier-model baselines, large
(>500-line) expert-skill SKILL.md files do not improve
applied-theory or applied-systems pass-rate on
content-graded prompts**. They add 22–35% token
overhead and 5–35% wall-time overhead. Pass-rate delta
has been zero on six of six evals across three
candidates.

## What this says about BP-03 at the empirical level

BP-03 (300-line cap) was a static heuristic for
"probably too long". Three data points now show the
cost side is real (~20–35% tokens) but the benefit side
is weak on these prompt classes. **Pass-rate is the
wrong headline metric on its own** — the frontier
baseline is too strong for this eval design to
discriminate on correctness. The discriminating signal
is *output character* (which failure modes get named,
which frameworks get invoked, how the prose reads) — a
qualitative axis the harness benchmark does not score.

## Recommendation

**OBSERVE** for `consent-primitives-expert`. Not
SHRINK, not SPLIT, not RETIRE.

- OBSERVE, not SHRINK: unlike reducer (where unified
  framework argues against fragmentation) or
  performance-analysis-expert (where shrinking would
  remove the mandatory-sections overhead that caused
  the regression), `consent-primitives-expert`'s
  507 lines carry distinct technical content per
  section (Z-set algebra, GDPR mapping, cross-
  jurisdiction survey). Pruning risk is content-loss,
  not just terseness.
- OBSERVE, not RETIRE: the skill has real framework
  content (Z-set / meet-semilattice / ring-lift) that
  the baseline did not reach. It is not dead weight;
  it is underused in these particular evals.
- Decision point: if a real round-task invokes this
  skill, re-run with that prompt. If the skill's
  framework-naming pays off on a real workflow, keep
  it. If it continues to tie baseline on real work,
  revisit SHRINK.

## Next candidate

Two slots remain in Aarav's static-top-5. The fourth
candidate will be dispatched next round (or next
autonomous tick if the current round closes first).
The pattern established by three data points is enough
to downgrade BP-03 from "static alarm" to "empirical
probe trigger" for all remaining candidates: the fourth
and fifth runs become hypothesis-confirming rather than
exploratory.

## Artefacts

- Workspace: `.claude/skills/consent-primitives-expert-workspace/iteration-1/`
  (gitignored; local-only)
- Per-run `timing.json` + `grading.json` under each
  `eval-*/<config>/` directory
- Aggregate: `iteration-1/benchmark.json`
- This report: canonical summary for future rounds
- `docs/INTENTIONAL-DEBT.md` row #3 progress note #3
  records the landing
