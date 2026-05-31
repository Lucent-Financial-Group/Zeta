# Claim - codex-loop-b0171-openspec-artifact-map-20260531

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run ID:** 20260531T073913Z
- **Claimed at:** 2026-05-31T07:41:00Z
- **ETA:** 2026-05-31T08:20:00Z
- **Scope:** B-0171 OpenSpec inventory artifact-map slice.
- **Durable target:** `tools/openspec/inventory.ts`, `tools/openspec/inventory.test.ts`
- **Platform mirror:** none

## Notes

Smallest safe slice: teach the OpenSpec inventory report that specs can be
backed by non-`src/Core` artifacts, and map the already-split
`z-set-algebra` capability so the B-0171 coverage report stops classifying
known source-of-truth specs as unmapped.
