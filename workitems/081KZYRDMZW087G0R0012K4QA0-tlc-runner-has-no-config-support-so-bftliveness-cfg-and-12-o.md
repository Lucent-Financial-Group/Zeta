---
id: 081KZYRDMZW087G0R0012K4QA0
type: bug
state: backlog
priority: P2
slug: tlc-runner-has-no-config-support-so-bftliveness-cfg-and-12-o
title: "TLC runner has no -config support, so BftLiveness.cfg and 12 other configs are ungated"
created: 2026-08-13T23:48:19.580Z
depends_on: []
composes_with: []
---

# TLC runner has no -config support, so BftLiveness.cfg and 12 other configs are ungated

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081KZYRDMZW087G0R0012K4QA0-*.md` glob. -->

## What

`tests/Tests.FSharp/Formal/Tlc.Runner.Tests.fs` shells out as `tlc2.TLC SpecName` with **no
config argument**. TLC therefore resolves `SpecName.cfg` and nothing else. Every non-default
`.cfg` under `src/Core.TLA/specs/` is never executed by CI.

## Why it matters

This is the "a check that did not run must never look like a check that passed" defect, same
class as #10429 (612 TS test files exist, ~95 run).

**`BftLiveness.cfg`** is the sharpest instance. `BftConsensus.cfg` carries a confident
falsification table dated 2026-08-11 — `ConditionalTermination` HOLDS, 4,665,495 states, 11min
14s, plus two recorded mutation refutations. All of it ran **once, by hand**. A reader of that
file has no way to know none of it re-runs, and a regression in `BftConsensus.tla` liveness
would land green.

The 2026-08-13 collateral round added 15 more configs of which **12 are ungated**: the R1/R2/R3
regimes for `QuorumCollateral`, its threshold config, both `Deterrence` liveness runs, four
reachability witnesses, and the three `WagerSolvency` negative configs. Their results are
recorded in
`docs/research/2026-08-13-soraya-bft-collateral-routing-slashing-tension-phase-cancellation.md`
sections 3 and 5 and nowhere else.

## Fix

1. Give `runTlcUnlocked` an optional config name; pass `-config NAME.cfg` when present.
2. Add `assertSpecValidWithConfig specName cfgName`.
3. Add `assertSpecViolates specName cfgName` for the EXPECT-VIOLATION probes — these must FAIL
   the build when TLC reports no error, since a witness that stops firing means the model has
   stopped modelling anything.
4. Wire `BftLiveness.cfg` and the 12 configs above.

Not bundled into the round that found it: this touches a shared harness that roughly 30 specs
depend on, and the liveness runs are minutes-long, so the CI-time budget needs its own decision.

## Related gap, same file

`toolchainReady()` skips TLC on CI unless the runner is Linux x64 and not `ubuntu-slim`. That is
reasonable de-duplication, but the entire TLA+ gate then rests on one leg of the matrix. If that
leg is dropped or renamed, every TLC check silently stops and every test still passes. Worth a
guard that asserts the TLC leg actually ran at least once per CI run.
