# Claim - task-frame-signals-cross-domain

- **Session ID:** 8af0dfd7-b6fc-4382-806e-f41c1969ad47
- **Harness:** codex
- **Claimed at:** 2026-09-06T03:12:11Z
- **ETA:** 2026-09-06T05:00:00Z
- **Scope:** Add deterministic color, edge, normalized-shape, and frame-delta signals over `GameEnvironment.Frame`.
- **Durable target:** `src/Core/FrameSignals.fs`, focused F# tests, and work item `081M1TB7K9F087G0R001FMKH0M`
- **Platform mirror:** none

## Notes

This is the language-neutral rendered-frame layer between the existing F#
motion baseline and the existing Python ARC scene-prior implementation. It
does not expose game identity, hidden emulator state, or reference answers.
