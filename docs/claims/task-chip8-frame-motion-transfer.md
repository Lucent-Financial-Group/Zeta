# Claim - task-chip8-frame-motion-transfer

- **Session ID:** codex/0905b31c
- **Harness:** codex
- **Claimed at:** 2026-09-05T19:18:00Z
- **ETA:** 2026-09-05T22:00:00Z
- **Scope:** Add source-owned CHIP-8 motion carts and a frame-only current-versus-projected transfer benchmark.
- **Durable target:** `src/Core/`, F# tests, and work item 081M1SG1MR2087G0R002WJCCG4.
- **Platform mirror:** GitHub pull request.

## Exit

- Exact held-out next-position accuracy compares both policies under equal
  budgets on forward, reverse, and changed-speed carts.
- No ARC identity or emulator internals enter the predictor boundary.
- The workitem records the measured result, including a negative result if the
  projected policy does not win.
