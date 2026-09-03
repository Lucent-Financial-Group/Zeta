# Claim - task-arc-rung-c-environment-seam

- **Session ID:** codex/260903-arc-c
- **Harness:** codex
- **Claimed at:** 2026-09-03T20:24:10Z
- **ETA:** 2026-09-04T00:24:10Z
- **Scope:** Implement workitem 081M0QRP9KX087G0R0039EGV67 as a source-owned cross-emulator environment seam with CHIP-8 and ARC adapters.
- **Durable target:** `src/Core`, `src/Arc.Python`, focused tests, and PR to `main`
- **Platform mirror:** none

## Notes

Rungs A and B are complete. Current Core already uses `ISimulationEnvironment`
for deterministic time and entropy, so the implementation will preserve the
rung-C behavior without overloading that existing name.
