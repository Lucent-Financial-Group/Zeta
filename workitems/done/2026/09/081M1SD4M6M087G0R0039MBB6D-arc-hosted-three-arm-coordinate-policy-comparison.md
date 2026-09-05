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
access. A hosted run remains required before making any ARC performance claim.
