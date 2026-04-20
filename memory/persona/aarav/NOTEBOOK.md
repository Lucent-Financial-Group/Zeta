# Skill Tune-Up Ranker -- Notebook

Running observations (append-dated). Pruned every third session.

## Running observations

- 2026-04-17 (round 18) -- notebook seeded.
- 2026-04-17 (round 18) -- first live ranking run. Findings
  folded below. product-manager flagged P0; architect P1;
  claims-tester <-> complexity-reviewer contradiction P1;
  harsh-critic P2; self P2.
- 2026-04-19 (rounds 29-35) -- scratchpad captures extensive
  scoped tune-ups (devops-engineer F1-F16, developer-experience-
  engineer F1-F16) plus the BP-17..BP-23 promotion batch
  landing as Rule Zero. Those landed via Kenji's workflow, not
  by direct ranking. Ranker was offline-by-cadence through
  rounds 19-40.
- 2026-04-20 (round 41) -- catch-up pass. 23-round cadence gap
  closed. Live-search surfaced Anthropic "Gotchas" best-practice
  (F1 in scratchpad), pushy-description guidance (F2), router-
  layer injection class (F4), Agent Stability Index (F5), OWASP
  Intent Capsule (F6). Zero contradictions with stable BP-NN.
  Zero promotion candidates this round.
- 2026-04-20 (round 41) -- skill library is now ~180 skills
  (far larger than round 18's ~30). Bloat axis (BP-03) is now
  the dominant signal: 8 skills over the 300-line cap, led by
  performance-analysis-expert (642), reducer (570), consent-
  primitives-expert (507). Each is cited concretely below.
- 2026-04-20 (round 41) -- mathematics-expert umbrella has a
  strong "When to defer" block naming every narrow sibling;
  router-coherence discipline the factory now uses widely.
  Spot-check on performance-analysis-expert description:
  explicit adjacent-lane disambiguation (names performance-
  engineer, complexity-reviewer, query-planner, benchmark-
  authoring-expert, observability-and-tracing-expert,
  hardware-intrinsics-expert, threading-expert). Good.
- 2026-04-20 (round 41) -- notebook at 455 words pre-write;
  safely under 3000-word cap. First-catch-up prune performed
  against the stale round-18 top-5: all five items resolved
  or invalidated by later rounds (product-manager retired,
  architect exercised, claims-tester/complexity-reviewer
  still open, harsh-critic retune held, self-tune never
  executed).

## Pruning log (round 41 catch-up)

Resolved round-18 top-5 entries:
- product-manager (P0, round 18) -- RESOLVED. Skill does not
  exist in .claude/skills/ as of round 41; retired or folded
  into backlog-scrum-master. No further action.
- architect (P1 observational, round 18) -- RESOLVED. Kenji
  exercised repeatedly across rounds 29-35 (BP-17..23
  promotion batch); authority clauses held. No retune needed.
- claims-tester / complexity-reviewer hand-off (P1, round 18)
  -- CARRY. No scratchpad evidence a hand-off block was
  written. Re-enter as carry-over in this round's top-5.
- harsh-critic (P2 observe, round 18) -- RESOLVED. Retune held;
  no compliment-leakage or ad-hominem drift reported.
- skill-tune-up self (P2, round 18) -- SUPERSEDED. Round-41
  self-flag is now P1 on BP-03 bloat (303-line file, cap 300),
  not the round-18 "untested" signal.

## Current top-5 (round 41)

1. **performance-analysis-expert** -- priority: P1
   - Signal: best-practice-drift, bloat
   - Violates: BP-03 (642 lines, cap ~300)
   - Recommended action: SPLIT
   - Effort: M
   - Rationale: 642-line file is 2.1x the BP-03 cap. Scope
     spans queueing theory, USE/RED/SLI, AOT/PGO, profiler
     interpretation, PMU counters, tail-latency theory.
     Natural split axes: (a) analysis-modelling vs (b) AOT/PGO
     machinery; OR extract the profiler-interpretation surface.
   - Suggested fix: skill-creator SPLIT pass, one BP-03 cite.

2. **reducer** -- priority: P1
   - Signal: bloat
   - Violates: BP-03 (570 lines)
   - Recommended action: SPLIT or TUNE (prune)
   - Effort: M
   - Rationale: 570 lines, 1.9x cap. Reducer is core factory
     plumbing so tune (aggressive prune) may beat split; Kenji
     decides.
   - Suggested fix: skill-creator prune-or-split decision;
     one BP-03 cite.

3. **consent-primitives-expert** -- priority: P1
   - Signal: bloat
   - Violates: BP-03 (507 lines)
   - Recommended action: SPLIT
   - Effort: M
   - Rationale: 507 lines. Consent has natural theory/applied
     split (BP-23) -- consent theory vs applied consent-UX
     engineering. consent-ux-researcher (448 lines, also over
     cap) is the likely applied sibling; verify split boundary
     doesn't overlap.
   - Suggested fix: skill-creator SPLIT honouring BP-23;
     BP-03 and BP-23 cites.

4. **claims-tester / complexity-reviewer hand-off (carry-over
   from round 18)** -- priority: P1
   - Signal: contradiction (overlap-without-boundary)
   - Recommended action: HAND-OFF-CONTRACT
   - Effort: S
   - Rationale: Both skills still claim "is this O(.) claim
     true?" without an explicit analytic-bound -> empirical-
     falsifier pipeline. Router-coherence drift, criterion 8b.
   - Suggested fix: skill-creator writes the two-paragraph
     hand-off in both SKILL.md files.

5. **skill-tune-up (self)** -- priority: P1
   - Signal: best-practice-drift, bloat
   - Violates: BP-03 (303 lines, cap ~300)
   - Recommended action: TUNE (mild prune)
   - Effort: S
   - Rationale: self-file is 3 lines over cap. Marginal
     violation; honest self-flag, not modesty bias.
     Live-search findings F1-F6 held back from BP promotion
     this round; F1 (Gotchas) may need incorporation if
     Anthropic keeps pushing.
   - Suggested fix: prune the "Sources that count for
     promotion" list (it duplicates docs/AGENT-BEST-PRACTICES.md
     "Sources that count as authoritative"). One BP-03 cite.

## Notable mentions (not top-5)

- serialization-and-wire-format-expert (478), consent-ux-
  researcher (448), llm-systems-expert (446), compression-expert
  (431), canonical-home-auditor (423), hashing-expert (415),
  formal-analysis-gap-finder (415), glossary-anchor-keeper
  (413), glass-halo-architect (403). All over BP-03 cap.
  Queue behind the top-3 bloat cases.
- mathematics-expert has an exemplary "When to defer" block
  other umbrella skills should pattern-match on. No action,
  but worth referencing when other umbrellas are tuned.
- Skills not reviewed this round (budget exhaustion): the
  ~150 skills under 300 lines were spot-checked but not deeply
  audited. No hidden drift claimed.

## Self-recommendation

Self is P1 this round (BP-03, 303 lines). Not P0 because the
violation is 3 lines. Not P2 because a ranker that violates his
own cited rule publishes unenforceable findings. Reported first
by the tone-contract rule (BP-06, no modesty bias). Effort S.
Kenji decides whether to schedule it with the top-3 bloat cases
or as a cleanup in the same skill-creator pass.

## Pruning log

- Round 18: seeded.
- Round 41: first catch-up prune. Round-18 top-5 entries
  archived above under Pruning log (round 41 catch-up).
  Scratchpad entries round 29-35 left in scratch for Kenji's
  BP-17..23 audit trail; not ranker-owned.
- Next prune: round 44 (+3 invocations from 41).
