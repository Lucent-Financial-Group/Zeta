---
id: 081M1RZH5JD087G0R0008V63WQ
type: task
state: done
priority: P2
slug: arc-hosted-sweep-compares-coordinate-policies-with-one-expli
title: "ARC hosted sweep compares coordinate policies with one explicit dispatch"
created: 2026-09-05T14:28:31.949Z
depends_on: []
composes_with: []
---

# ARC hosted sweep compares coordinate policies with one explicit dispatch

The keyed main sweep currently measures only the centroid default. Add a paired
experiment that preserves both complete sweep records and computes signed
scene-feedback-minus-centroid deltas under the same seed and action ceiling.

Acceptance:

- comparison orchestration lives under `src/Arc.Python`, not in shell glue;
- the pair uses the same roster, seed, environment limit, and action ceiling;
- output retains both source sweeps and reports signed level/score/failure deltas;
- ordinary main pushes keep the existing single centroid sweep;
- an explicit `workflow_dispatch` input selects the paired keyed experiment;
- the dispatch fails loudly if either policy sees or plays zero environments;
- after merge, dispatch the comparison and report the measured result without
  claiming that a truncated 200-action ceiling is leaderboard-comparable.

Completion:

- `compare_coordinate_policies` snapshots and reuses one sorted roster;
- CLI and workflow dispatch expose the paired run without changing the normal
  main-push centroid sweep;
- both full reports and signed scene-feedback-minus-centroid deltas are emitted;
- both reports are independently rejected when they see or play zero rows;
- 177 ARC tests, repository Python lint, `actionlint`, offline paired execution,
  and full `bun run preflight` pass on the refreshed branch;
- the post-merge keyed dispatch remains the final operational verification.
