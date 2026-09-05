---
id: 081M1SD4M7B087G0R000DS5N5N
type: task
state: done
priority: P2
slug: arc-anti-leakage-and-resource-efficiency-contract
title: "ARC anti-leakage and resource efficiency contract"
created: 2026-09-05T18:26:21.035Z
completed: 2026-09-05T18:58:17.785Z
depends_on: []
composes_with: []
---

# ARC anti-leakage and resource efficiency contract

Make the ARC policy's allowed information and deterministic resource cost
auditable alongside its score.

## Acceptance

- A hostile review distinguishes observed-grid inputs, published scoring data,
  game-scoped memory, and prohibited solution or level-specific information.
- A source-owned contract test proves the coordinate policy cannot receive
  references, engine score, level identity, or target metadata through its port.
- Hosted reports include deterministic policy work, peak live state, and
  canonical persistent-state byte counts; they do not label proxies as measured
  CPU or resident memory.
- A benchmark can compare score/actions against those costs before an
  optimization is accepted.

## Result

Added a policy decorator that counts decisions, observations, received grid
cells, retained-state leaves, and canonical retained-state bytes without
exposing game identity, score, reference answers, or target metadata to the
coordinate policy. Hosted reports separately sample process CPU time, wall
time, Python heap peak, and report size; the report states that one sample is
not a confidence interval. The adversarial audit documents that repeated use
of public ARC games is task-set adaptation, that the three-arm run is not an
official competition submission, and that no generalization claim is earned by
these measurements. Removing duplicate retained frames cut the observed
policy's canonical retained state by 62.0% on the source-owned control while
preserving its action and score; sampled heap peak did not improve.
