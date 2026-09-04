# Claim - task-arc-rung-e-coordinate-heatmap

- **Session ID:** codex/0904-runge
- **Harness:** codex
- **Claimed at:** 2026-09-04T18:39:11Z
- **ETA:** 2026-09-04T22:00:00Z
- **Scope:** Implement ARC rung E as a normalized pre-action ACTION6 coordinate distribution rendered over the recorded frame and bound to the following committed click.
- **Durable target:** `src/Arc.Python/`, `src/apps/twitch-ai/`, focused tests, and workitem `081M0QRPMZ5087G0R000D33Q8M`.
- **Platform mirror:** GitHub pull request.

## Notes

- The `COMMON_SEED` prerequisite already ships on current `origin/main`.
- The display must consume a source-produced distribution; it must not fabricate probability mass in the browser.
- Parser laws will require normalized, unique in-bounds coordinates and require the selected forecast point to equal the next recorded ACTION6 commit.
