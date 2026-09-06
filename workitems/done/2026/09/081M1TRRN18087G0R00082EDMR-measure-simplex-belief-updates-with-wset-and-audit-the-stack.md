---
id: 081M1TRRN18087G0R00082EDMR
type: task
state: done
priority: P2
slug: measure-simplex-belief-updates-with-wset-and-audit-the-stack
title: "Measure Simplex belief updates with WSet and audit the stack correspondences"
created: 2026-09-06T07:08:45.992Z
completed: 2026-09-06T07:38:35.860Z
depends_on: []
composes_with: []
---

# Measure Simplex belief updates with WSet and audit the stack correspondences

## Scope

Follow the Simplex handoff with a runnable finite-process comparison and an
architecture-spanning review of the named correspondences. This item does not
claim to implement all six research experiments or reproduce trained transformers.

## Acceptance

- Existing WSet predicts published finite processes and matches independent formulas.
- Signed-coordinate positive and negative controls are executable.
- Counterexamples preserve sequence order and expose marginal information loss.
- Numeric entropy receipts distinguish expected loss from sample-path uncertainty.
- A research-grade response records verdicts, limits, and the remaining experiments.

## Result

Implementation and reproduction commands are indexed by
`src/Research.FSharp/README.md`. The correspondence review is
`docs/research/2026-09-06-simplex-wset-comparison-and-stack-verdicts.md`, also
linked from the original handoff. Seven regression cases cover the finite experiment.

## Validation and host limitation

- Focused regression suite: 7 passed, 0 skipped.
- Full solution tests and all 16 preflight lint/typecheck legs passed locally.
- Normal Release build eventually passed with 0 warnings and 0 errors, after two
  failed attempts: MSB4166 premature workers, then MSB6006 exit 134 in Bayesian.Tests.
- A forced isolated rebuild of Bayesian.Tests also passed without changing optimization:
  `dotnet build tests/Bayesian.Tests/Bayesian.Tests.fsproj -c Release -m:1 --no-restore -t:Rebuild -p:BuildProjectReferences=false`.
- The 03:34:38 local macOS report records SIGABRT through
  `FailFastIfCorruptingStateException`, `SfiInitWorker`, and `HandleHardwareException`.
  Raw crash data stays off git. No new root cause is inferred from this stack.
- Prior host memory-fault disposition: `081KYYQ831108QG0R001FJJ9XK`, completed 2026-08-28.
  Whether this host was repaired since that diagnosis is unknown at this writing.
  A successful retry is not a hardware fix; independent CI reproduction is required.
- `dotnet format --verify-no-changes --no-restore` exited 0 (its formatter excludes F#);
  the repository F# lint also passed. No optimizer or GC workaround was added.
