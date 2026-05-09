---
slug: b0366-toffoli-zset-smallest-slice-2026-05-09
backlog-item: B-0366
claimed-at: 2026-05-09T19:10:00Z
claimed-by: otto (claude-sonnet-4-6)
scope: |
  Decompose B-0366 into atomic child rows.
  Implement B-0366.1: F# Toffoli gate type model for Z-set encoding
  with reversibility property tests (FsCheck).
branch: claim/b0366-toffoli-zset-smallest-slice-2026-05-09
---

# Claim: B-0366 — smallest safe slice

## Scope

1. Decompose B-0366 (FPGA Toffoli-gate Z-set test) into atomic child rows
2. Implement B-0366.1: F# type model of the Toffoli gate encoding for
   Z-set assert/retract, with FsCheck properties proving logical reversibility

## What is NOT in scope

- FPGA synthesis or hardware implementation
- Power measurement or physical experiments
- VHDL/Verilog generation
