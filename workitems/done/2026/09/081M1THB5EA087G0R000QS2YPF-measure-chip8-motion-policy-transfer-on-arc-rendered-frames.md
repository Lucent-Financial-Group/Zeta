---
id: 081M1THB5EA087G0R000QS2YPF
type: task
state: done
priority: P2
slug: measure-chip8-motion-policy-transfer-on-arc-rendered-frames
title: "Measure CHIP8 motion policy transfer on ARC rendered frames"
created: 2026-09-06T04:59:04.010Z
completed: 2026-09-06T05:17:05.844Z
depends_on: []
composes_with: []
---

# Measure CHIP8 motion policy transfer on ARC rendered frames

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1THB5EA087G0R000QS2YPF-*.md` glob. -->

## Scope

Select observed-position or one-step motion from source-owned CHIP-8 cart
frames, then measure that fixed choice on unseen ARC-format rendered frames.
The transfer boundary receives pixels and the selected policy only; it receives
no level identifier, engine state, answer, score, or ARC credential.

## Acceptance

- The source cohort contains multiple directions and speeds from hand-authored
  CHIP-8 carts.
- The target cohort applies palette relabelings and geometric symmetries to a
  source-owned ARC environment.
- The report includes the observed-position control, transferred one-step
  policy, direction-change failures, and switched-mover counterexamples.
- Training state has a constant logical-byte bound independent of frame count.
- F# and Python tests reproduce one checked-in measurement artifact.

## Non-goals

This does not train on hosted ARC environments, promote a hosted policy, or
claim leaderboard comparability. It measures one narrow visual-motion transfer
and preserves the cases where that transfer fails.

## Evidence

- Four hand-authored CHIP-8 carts: one-step projection 24/24, observed-position
  control 0/24, selected by a typed equal-cohort comparison.
- Constant-size source state: 28 logical bytes after 32 training frames.
- Transformed ARC-format target frames: transferred policy 32/40 versus 0/40
  for the observed-position control.
- Failure cohorts: 0/8 direction changes and 0/8 switched-mover cases.
- Focused tests: 22 F# frame tests and 31 Python scene-prior tests passed.
- Full preflight: 18/18 checks passed, including Release build and tests.
