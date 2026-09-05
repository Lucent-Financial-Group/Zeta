---
id: 081M1SG1MR2087G0R002WJCCG4
type: task
state: in-progress
priority: P2
slug: cross-domain-frame-motion-transfer-on-source-owned-chip-8-ca
title: "Cross-domain frame motion transfer on source-owned CHIP-8 carts"
created: 2026-09-05T19:17:08.994Z
depends_on: []
composes_with: []
---

# Cross-domain frame motion transfer on source-owned CHIP-8 carts

## Problem

An improvement measured only on public ARC games can be benchmark-specific
adaptation. We need a non-ARC test that exercises the same visual distinction
without importing ARC identifiers, reference answers, or per-game policy
configuration.

## Smallest Slice

Run source-owned CHIP-8 motion carts through the existing immutable emulator and
`GameEnvironment.Frame`. Compare a current-position control with a one-step
constant-velocity predictor. Train only on an explicit prefix and evaluate on a
disjoint suffix plus held-out direction and speed variants.

## Acceptance

- The carts are inspectable source bytes and require no downloaded ROM.
- Both policies receive only row-major palette frames; neither sees emulator
  registers, program counter, cart identity, or expected coordinates.
- Exact next-position accuracy is reported under equal observation budgets.
- Held-out reverse-direction and changed-speed carts prevent a hard-coded
  rightward or unit-step predictor from passing.
- The projected policy beats the current-position control on every moving
  variant or the result is recorded as negative.
- Retained policy state is fixed-size and reported separately from runtime
  samples; no ARC generalization claim is made.
