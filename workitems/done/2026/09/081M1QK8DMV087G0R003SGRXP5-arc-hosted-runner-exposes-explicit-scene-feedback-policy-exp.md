---
id: 081M1QK8DMV087G0R003SGRXP5
type: task
state: done
priority: P2
slug: arc-hosted-runner-exposes-explicit-scene-feedback-policy-exp
title: "ARC hosted runner exposes explicit scene-feedback policy experiment"
created: 2026-09-05T01:34:47.963Z
depends_on: []
composes_with: []
---

# ARC hosted runner exposes explicit scene-feedback policy experiment

The hosted ARC runner currently constructs `LayeredAgent()` internally, so the
scene-feedback coordinate policy can only be exercised by tests that assemble
the agent themselves. Expose the policy choice at the hosted boundary without
changing the default or claiming results from an unavailable hosted API.

Acceptance:

- the hosted runner owns an explicit, typed coordinate-policy selection;
- centroid remains the default and scene feedback requires an explicit choice;
- each environment result and roster summary identify the policy that ran;
- the CLI exposes the selector only for hosted runs;
- source-owned engine tests exercise both selections through the hosted loop;
- a live hosted score is reported only when `ARC_API_KEY` is available.

## Completion

- `HostedCoordinatePolicy` keeps `centroid` as the default and makes
  `scene-feedback` an explicit selection.
- The runner constructs one game-fingerprint-scoped agent per environment and
  records the policy on summaries, successes, and failures.
- Both policies clear the source-owned `ZetaClickTarget` through the complete
  hosted loop in one action.
- An offline CLI run with the experimental selector clears all three
  source-owned `ZetaChase` levels and reports score `0.354`; because that game
  exposes keyboard actions, this proves routing and provenance, not coordinate
  policy superiority.
- The pre-existing comparability text now distinguishes budgets below the
  largest published baseline from budgets that merely cover that floor.
- The machine had no `ARC_API_KEY`, so no hosted-environment score was claimed.
- Verification: 176 ARC tests, Python Ruff/format/mypy, and all 18 full
  preflight checks passed.
