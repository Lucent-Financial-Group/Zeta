---
id: B-0181
priority: P1
status: closed
title: Fix SpineMergeInvariants.tla counterexample (closed — Cascade downstream-room precondition + state constraint; B1 → A CI registration landed)
tier: formal-verification
effort: M
ask: Otto 2026-05-03 verify-then-claim sweep (#1397) — running TLC on `SpineMergeInvariants` produces a TTrace dump, indicating counterexample / invariant violation. Sibling failure to B-0179 SpineAsyncProtocol but at deeper depth.
created: 2026-05-03
last_updated: 2026-05-03
depends_on: []
composes_with: [docs/research/2026-05-03-math-proofs-honest-assessment.md, docs/research/proof-tool-coverage.md, B-0179, B-0180, B-0184]
tags: [tla-plus, formal-verification, spine-merge, balanced-spine, counterexample, b1, math-proofs-assessment, verify-then-claim, closed]
---

# Fix SpineMergeInvariants.tla counterexample

## Symptom

Running `java -cp tools/tla/tla2tools.jar tlc2.TLC -workers 4 -config tools/tla/specs/SpineMergeInvariants.cfg tools/tla/specs/SpineMergeInvariants.tla` produces a TTrace dump:

```
Trace exploration spec path: tools/tla/specs/SpineMergeInvariants_TTrace_<ts>.tla
The depth of the complete state graph search is 17.
Finished in 00s
```

TLC dumps a trace file when it finds an invariant violation. The depth-17 termination suggests TLC explored 17 transitions before finding the violation — deeper than the SpineAsyncProtocol failure (depth 9), which may indicate the violation is more subtle (further from initial state, requires more interleaving to manifest).

## Investigation needed

1. Read the TTrace file to identify which invariant fails at the depth-17 state
2. Determine the failure class:
   - **Spec bug**: spec models the LSM-spine merge protocol incorrectly
   - **Invariant over-specification**: invariant asks for a property the merge protocol doesn't actually guarantee
   - **Real bug found**: the invariant is correct but the modeled protocol violates it; this would indicate a bug in `BalancedSpine.fs` itself
3. The third class is the most interesting — TLA+ found a real concurrency bug. If that's the case, file as a P0/P1 in BUGS.md instead of treating it as a spec-fix.

## Composes with

- B-0179 (SpineAsyncProtocol counterexample — sibling B1 issue)
- B-0180 (CircuitRegistration config bug — sibling B1 issue, smallest fix)
- `src/Core/BalancedSpine.fs` — the production code this spec models
- Closure of B1 → A in the math-proofs honest assessment requires all 3 sibling fixes

## Why P1 (after investigation)

Failure class: **spec under-specification**, not real BalancedSpine.fs bug. The original `Cascade(i)` action checked only `levels[i] >= Cap(i)` — it could fire with no constraint on level i+1, even when level i+1 was already at the cap-overshoot boundary. Real LSM cascades chain synchronously: if level i+1 is full, level i+1 must drain first before level i can dump. The spec failed to model this constraint, allowing TLC to find a 16-step trace where Cascade(0) fires 5 times in a row, accumulating level 1 to 10 > 2*Cap(1) = 8.

Promoted P2 → P1 because the same spec-pattern (under-specified action with insufficient preconditions) was found in B-0184 (Spine.als) — same author-time class, two-tool surface.

## What landed

1. **Spec fix** (`tools/tla/specs/SpineMergeInvariants.tla`): added `levels[i+1] + levels[i] <= 2 * Cap(i+1)` precondition to `Cascade(i)` — mirrors the synchronous cascade chain in BalancedSpine.fs
2. **Liveness fairness**: added `\A i \in 0..(MaxLevel - 1): WF_vars(Cascade(i))` so cascades eventually fire for the LivDrained property
3. **State constraints**: `StateBound` (totalInserted ≤ 30) + `PendingBound` (Len(pendingIn) ≤ 4) keep TLC's BFS tractable; with bounded constants MaxLevel=2, MaxBatchSize=1, the bounded-model check completes in under a second with 400 distinct states explored at depth 45
4. **Both invariants now checked**: cfg lists `INVARIANT InvCap` AND `INVARIANT InvMass` (mass-conservation was previously declared in the THEOREM but not enabled in the cfg)
5. **F# CI registration**: `[<Fact>] TLC validates SpineMergeInvariants` added to `tests/Tests.FSharp/Formal/Tlc.Runner.Tests.fs`
6. **TLC runtime artifacts**: `tools/tla/specs/states/` + `tools/tla/specs/*_TTrace_*.{tla,bin}` added to `.gitignore`

## Verification

```bash
cd tools/tla/specs
java -cp ../tla2tools.jar tlc2.TLC SpineMergeInvariants
# Model checking completed. No error has been found.
# 871 states generated, 400 distinct states found, 0 states left on queue.
# The depth of the complete state graph search is 45.
```

## Composes with

- B-0179 (SpineAsyncProtocol counterexample — sibling B1 issue, closed via #1411 with CHECK_DEADLOCK FALSE fix)
- B-0180 (CircuitRegistration config bug — sibling B1 issue, closed via #1401 with `Safety` operator addition)
- B-0184 (Spine.als spec bug — same author-time pattern: under-specified action with insufficient preconditions; closed via #1415 with `fact` + `run` + bitwidth fix)
- `src/Core/BalancedSpine.fs` — the production code this spec models; the synchronous-cascade behavior the spec now correctly captures
