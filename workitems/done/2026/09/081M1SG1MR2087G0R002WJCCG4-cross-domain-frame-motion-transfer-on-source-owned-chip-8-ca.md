---
id: 081M1SG1MR2087G0R002WJCCG4
type: task
state: done
priority: P2
slug: cross-domain-frame-motion-transfer-on-source-owned-chip-8-ca
title: "Cross-domain frame motion transfer on source-owned CHIP-8 carts"
created: 2026-09-05T19:17:08.994Z
completed: 2026-09-05T19:51:42.861Z
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
constant-velocity predictor. Initialize velocity from an explicit prefix and
evaluate unseen next-frame labels across direction and speed variants.

## Acceptance

- The carts are inspectable source bytes and require no downloaded ROM.
- Both policies receive only row-major palette frames; neither sees emulator
  registers, program counter, cart identity, or expected coordinates.
- Exact next-position accuracy is reported under equal observation budgets.
- Reverse-direction and changed-speed carts prevent a hard-coded
  rightward or unit-step predictor from passing.
- The projected policy beats the current-position control on every moving
  variant or the result is recorded as negative.
- Retained policy state is fixed-size and reported separately from runtime
  samples; no ARC generalization claim is made.

## Result

Implemented four source-owned CHIP-8 carts spanning positive and negative
motion at one- and two-pixel speeds. The predictor receives only rendered
`GameEnvironment.Frame` values. Across six disjoint next-frame labels per cart,
the current-position control scored 0/6 and the one-step projection scored 6/6
on every cart. The result therefore rejects hard-coded positive direction and
unit-speed explanations.

The predictor retains at most two centroids plus dimensions and a saturating
observation count: seven logical 32-bit values, or 28 logical bytes. That is
schema-level accounting, not CLR object size, heap usage, process RSS, or a CPU
benchmark. Frame processing is linear in frame cells plus palette size.

This is evidence that the motion feature and frame contract are not tied to
ARC inputs. It is not evidence of ARC task generalization: all four carts share
one small constant-velocity program family, foreground extraction assumes a
dominant background, and the estimator tracks one aggregate centroid rather
than multiple objects, shape changes, occlusion, or acceleration.

Verification: 17 focused F# tests passed, including malformed-frame feedback,
out-of-frame projection feedback, palette-label changes, and observation-count
saturation. Frame dimension changes also reset velocity history before another
projection is admitted.
