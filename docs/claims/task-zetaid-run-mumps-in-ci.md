# Claim - task-zetaid-run-mumps-in-ci

- **Session ID:** grok-20260814T162250Z-3c91
- **Harness:** grok
- **Claimed at:** 2026-08-14T16:22:50Z
- **ETA:** 2026-08-14T17:30:00Z
- **Scope:** Execute `mumps_zeta_id.m` in the existing CI path (no new workflow).
- **Durable target:** `tests/cross-verification/zeta-id/mumps-runtime.ts`, `run-mumps.ts`, existing `cross-verify` job
- **Platform mirror:** follow-on to merged PR #10632 (Gap 2 compare-only)

## Notes

Gap 2 gated the committed JSON. This slice actually runs the `.m` packer so a
layout edit in the routine cannot hide behind a stale file. Extends the
existing `cross-verify` job and the TS suite. No new workflow (factory:
extend the existing trajectory).
