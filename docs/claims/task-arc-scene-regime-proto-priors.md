# Claim - task-arc-scene-regime-proto-priors

- **Session ID:** codex/20260904-arc-priors
- **Harness:** codex
- **Claimed at:** 2026-09-04T21:20:00Z
- **ETA:** 2026-09-04T23:30:00Z
- **Scope:** Implement grid-only ARC scene-regime proto-senses for color, shape, density, and motion, then expose a calibrated coordinate prior without engine-state access.
- **Durable target:** `src/Arc.Python/zeta_arc/`, its tests and recordings, work-item `081M1Q4HPX1087G0R000HTJGNF`, and a GitHub pull request.
- **Platform mirror:** GitHub pull request.

## Notes

- The existing `ClickPolicy` remains the measured control until a held-out comparison earns promotion.
- Fingerprints describe reusable scene regimes, not exact levels or frame replays.
- Temporal signals distinguish translation, recoloring, shape change, split/merge, and appearance/disappearance.
