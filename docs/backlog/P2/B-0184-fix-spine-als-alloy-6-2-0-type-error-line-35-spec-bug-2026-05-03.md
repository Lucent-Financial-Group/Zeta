---
id: B-0184
priority: P2
status: open
title: Fix Spine.als spec bug — Alloy 6.2.0 type-check failure at line 35 col 25 (sum-vs-all comprehension confusion)
tier: formal-verification
effort: M
ask: Otto 2026-05-03 — surfaced via B-0183 Phase 1 TS wrapper (#1413) after fixing AlloyRunner.java's stale A4Options.SatSolver API. Once Alloy actually compiles + runs against current alloy.jar v6.2.0, Spine.als fails type-check. The F# AlloyRunnerTests had been silently no-op'ing this (compile-failure → toolchainReady=false → silent-skip).
created: 2026-05-03
last_updated: 2026-05-03
depends_on: []
composes_with: [B-0183, docs/research/2026-05-03-math-proofs-honest-assessment.md, tools/alloy/specs/Spine.als]
tags: [alloy, formal-verification, spec-bug, type-check, latent-bug-surfaced, b2-followup]
---

# Fix Spine.als — Alloy 6.2.0 type error at line 35 col 25

## Symptom

Running Alloy on `tools/alloy/specs/Spine.als` (with current
`alloy.jar` v6.2.0 + the post-#1413 fixed `AlloyRunner.java`):

```
Type error in tools/alloy/specs/Spine.als at line 35 column 25:
This must be an integer expression.
Instead, it has the following possible type(s):
{PrimitiveBoolean}
```

## Source line

```
33: pred SizeDoubling [maxCap : Int] {
34:   all l : Level |
35:     sum b : l.batches | b.size <= mul[2, cap[l.level, maxCap]]
36: }
```

The Alloy parser reads `sum b : l.batches | <body>` where `<body>`
must be an integer expression. But `b.size <= mul[...]` is a Boolean
comparison, not an integer.

## Likely intent

The author probably meant one of:

1. `all b : l.batches | b.size <= mul[2, cap[l.level, maxCap]]`
   (universal quantification — every batch's size <= bound)
2. `(sum b : l.batches | b.size) <= mul[2, cap[l.level, maxCap]]`
   (sum of all batch sizes <= bound)

Option 1 is consistent with the comment "every batch at level i has
size ≤ 2 * cap(i-1)". The current `sum` syntax is likely a typo /
bit-rot from an older Alloy version.

## Latent-bug-surface lineage

This bug existed in the spec but was NEVER actually verified
because:

1. `AlloyRunner.java:38` referenced `A4Options.SatSolver.SAT4J`
   (no longer in alloy.jar v6.2.0)
2. `compileRunnerIfNeeded()` returned false on compile failure
3. `toolchainReady()` returned false
4. F# `assertSpecValid` silently no-op'd
5. xunit reported all Alloy tests as PASSED

Same silent-skip class as the cache-clobber bug + the docs/<Spec>
spec-path bug. Surfaced when #1413's TS wrapper failed loudly on
the compile failure, leading to the AlloyRunner.java fix, which
exposed this latent spec bug.

## Fix path

1. Read Spine.als end-to-end to confirm the intent of the
   SizeDoubling predicate
2. Replace `sum b : l.batches | <body>` with `all b : l.batches |
   <body>` (Option 1 above) OR `(sum b : l.batches | b.size) <=
   <body>` (Option 2)
3. Re-run TLC + Alloy locally; verify clean
4. If Option 1: also check whether SizeDoubling is used in any
   `check` / `run` command — semantic change should preserve those

## Why P2

Pre-existing latent failure surfaced post-cleanup. Doesn't block
any current production workflow (the spec was never actually
running). Closes the silent-skip hangover from the AlloyRunner.java
chain.

## Composes with

- B-0183 (TS wrapper migration; #1413 surfaced this)
- B-0183 Phase 3 retirement of F# Alloy tests — Spine.als fix
  needs to land before retirement so the TS wrapper passes
- math-proofs honest assessment B2 grade (currently A; this row is
  the honest follow-up to keep that grade defensible)
