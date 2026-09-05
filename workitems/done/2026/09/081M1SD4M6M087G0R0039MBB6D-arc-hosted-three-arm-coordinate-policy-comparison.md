---
id: 081M1SD4M6M087G0R0039MBB6D
type: task
state: done
priority: P2
slug: arc-hosted-three-arm-coordinate-policy-comparison
title: "ARC hosted three-arm coordinate policy comparison"
created: 2026-09-05T18:26:21.012Z
completed: 2026-09-05T18:58:17.757Z
depends_on: []
composes_with: []
---

# ARC hosted three-arm coordinate policy comparison

Compare centroid, observed scene feedback, and one-step motion projection on
one immutable hosted roster with the same seed and action ceiling.

## Acceptance

- The predicted policy is explicit and does not replace the centroid default.
- All three arms reuse one roster snapshot and report pairwise signed deltas.
- The workflow renderer recognizes the new transcript version and fails closed
  on an empty or wholly failed hosted roster.
- Source-owned tests exercise all three policies without a credential or network.

## Result

Implemented a three-arm comparison over one immutable hosted roster and seed:
centroid control, observed scene feedback, and one-step projected scene
feedback. The report records pairwise score/action deltas plus deterministic
policy-work receipts and explicitly sampled runtime measurements. The hosted
workflow renders the versioned report and rejects an empty or wholly failed
roster. Source-owned tests cover all three arms without credentials or network
access.

The first hosted run completed successfully on 2026-09-05:
<https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33987454478>.
All three arms played the same 26-environment roster. Centroid, observed scene
feedback, and predicted scene feedback each cleared 4 levels. Mean environment
scores were 0.0136, 0.0147, and 0.0147 respectively. Thus scene feedback beat
the centroid control by 0.0011 in this run, while one-step prediction added no
score over observed feedback.

The two scene policies each made 1,040 decisions and received 8,519,680 cells,
versus 1,447 decisions and 11,853,824 cells for centroid. Predicted feedback
retained 207,916 canonical JSON bytes across decisions with a 16,003-byte peak;
observed feedback retained 207,864 bytes with a 16,001-byte peak. Prediction
therefore added 52 cumulative retained bytes and 2 peak bytes without measured
quality gain. The single-process runtime samples are not confidence intervals,
and the 200-action ceiling makes these scores unsuitable for leaderboard
comparison.
