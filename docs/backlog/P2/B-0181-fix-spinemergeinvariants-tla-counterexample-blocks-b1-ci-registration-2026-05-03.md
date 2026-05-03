---
id: B-0181
priority: P2
status: open
title: Fix SpineMergeInvariants.tla counterexample (blocks B1 → A CI registration; depth-17 trace dump on TLC run)
tier: formal-verification
effort: M
ask: Otto 2026-05-03 verify-then-claim sweep (#1397) — running TLC on `SpineMergeInvariants` produces a TTrace dump at depth 17, indicating counterexample / invariant violation. Sibling failure to B-0179 SpineAsyncProtocol but at deeper depth, which may indicate the violation is more subtle (further from initial state).
created: 2026-05-03
last_updated: 2026-05-03
depends_on: []
composes_with: [docs/research/2026-05-03-math-proofs-honest-assessment.md, docs/research/proof-tool-coverage.md, B-0179, B-0180]
tags: [tla-plus, formal-verification, spine-merge, balanced-spine, counterexample, b1, math-proofs-assessment, verify-then-claim]
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

## Why P2

Pre-existing failure surfaced by verify-then-claim sweep, not a new regression. The actual blast radius depends on the failure class — if it's a "real bug found" case, escalate to BUGS.md P0 immediately. If it's spec-bug or over-specification, P2 is right.

## After the fix (or escalation)

If spec-bug or over-specification:

1. Fix the spec / invariant
2. Verify locally — TLC clean "No error has been found"
3. Add `[<Fact>] TLC validates SpineMergeInvariants` to `tests/Tests.FSharp/Formal/Tlc.Runner.Tests.fs`
4. Add registry row to `docs/research/verification-registry.md`

If real bug found:

1. File P0/P1 BUGS.md entry referencing this spec + the TTrace
2. Land the production-code fix
3. Verify spec passes after fix
4. Then land the CI registration as above
