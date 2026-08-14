---
id: 081M010W1BP087G0R002M2BNVW
type: bug
state: backlog
priority: P2
slug: heatsignature-ispressurekind-and-heatsignal-ofkind-disagree
title: "HeatSignature.isPressureKind and HeatSignal.ofKind disagree on kinds carrying both a forgetting and a pressure token"
created: 2026-08-14T20:54:28.470Z
depends_on: []
composes_with: []
---

# HeatSignature.isPressureKind and HeatSignal.ofKind disagree on kinds carrying both a forgetting and a pressure token

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M010W1BP087G0R002M2BNVW-*.md` glob. -->

**Filed, not fixed** — found while fixing the non-injective heat encoders
(081M00TYT8N087G0R003MPMRX9); out of that PR's path, so it is recorded rather than repaired.

## Two live classifiers of the same bit

`src/Core/Heat.fs` decides "is this kind pressure?" twice, by two different routes:

- `HeatSignature.isPressureKind` (`:32`) — `isBackpressureKind || isDeniedKind`, a direct
  substring test.
- `HeatSignal.ofKind` (`:81`) — an ordered `if/elif` chain that tests `isForgettingKind`
  **first**, then `HeatSignal.isPressure` (`:110`) reads pressure off the resulting signal.

A kind string carrying **both** a forgetting token and a pressure token takes the forgetting
branch, so the second route says "not pressure" while the first says "pressure".

## Measured, against the built `Zeta.Core.dll` (this branch)

```
kind                     | isPressureKind | ofKind          | isPressure(ofKind) | DISAGREE
backpressure             | true           | backpressure    | true               | false
forget-backpressure      | true           | forgotten       | false              | true
prune-rejected           | true           | forgotten       | false              | true
forgotten                | false          | forgotten       | false              | false
bounded-forget-denied    | true           | forgotten       | false              | true
rejected                 | true           | denied          | true               | false
```

3 of 6 probed kinds disagree.

## Why it matters

`TemperatureReadout.ofHeatSignature` (`src/Core/Heat.fs:274`) sets
`pressure = MaxPpm` iff `HeatSignal.ofSignature signature |> HeatSignal.isPressure`. It
therefore takes the route that answers **false** for a dual-token kind, so such a signature
reports **zero pressure** — and since `thermalPpm` is a `max`, the temperature can read
cold for a room that is under genuine backpressure. Same fail-dangerous direction as the
`temperatureBand(NaN) -> "cold"` defect fixed in 081M00TYT8N087G0R003MPMRX9.

## Liveness — surveyed, and it is LATENT (2026-08-14)

The enumeration this work-item asked for has been done. Every heat `Kind` literal that can
reach a classifier was extracted from the emitters
(`Heat.fs`, `WSetHeat.fs`, `MetaCart.fs`, `RoomAdmission.fs`, `RoomHorizon.fs`,
`RoomBoundary.fs`, `SoftEmu.fs`, `SchedulerShedHeat.fs`, `DarkHall*.fs`) plus
`heat-signals-treaty.json`, and both classifiers were **executed** over it:

```
LIVE corpus (32 kinds enumerated from the repo):  0 disagree
HYPOTHETICAL dual-token kinds (3 probed):         3 disagree
```

**No emitted kind carries both a forgetting and a pressure token**, so the divergence was
never reachable. Two composition sites were checked specifically because they *could* have
produced one:

- `WSetHeat.fs:142` composes `"wset." + WSetFunction + ".forgotten"`. `WSetFunction` is a
  closed set of nine literals (`negate`, `copy`, `mapKeys`, `apply`, `consolidate`, `discard`,
  `bornProb`, `plus`, `tensor`) — none contains a pressure token.
- `DarkHallScheduler.heatSignaturesOfRow` and `RoomBoundary.emitRefusalHeat` take `kind` as a
  parameter, but every caller supplies one of the enumerated literals.

So: **mechanism real, liveness refuted.** A latent trap, closed cheaply — which is the
outcome the finder's caution left room for, and the caution was right.

## Fixed 2026-08-14 — one classifier, not two agreeing ones

- **`HeatSignature.isPressureKind` DELETED.** `HeatSignal.isPressureKind` is now
  `kind |> ofKind |> isPressure` — derived from the single ordered chain, not recomputed
  beside it. Disagreement is no longer representable, because there is nothing to disagree
  with.
- Call sites retargeted: `DarkHallScheduler.fs:246,291`, `DarkHallRoomLoop.fs:165`.
- **Behaviour-preserving today**, and that is the measured fact above rather than a hope: the
  deleted disjunction and the surviving chain agree on all 32 live kinds.

### Falsifiers (both demonstrated failing)

- `tests/Tests.FSharp/DarkHallScheduler.Tests.fs` — *"the deleted substring disjunction and
  the single classifier agree on every emitted kind"*. It **recomputes the deleted
  disjunction locally** and compares, so it is not vacuous. Mutant: reordering the `ofKind`
  chain to test backpressure before forgetting → the test fails and **it is the only test in
  the suite that does** (53 others pass), which is the point.
- `src/Core.TypeScript/hygiene/lint-heat-kind-classifier-agreement.ts` — PART A refuses any
  emitted kind literal carrying both token classes (the ordered chain resolves those by branch
  position, not meaning, so the honest guard empties the input class); PART B refuses a second
  binding in `Heat.fs` that decides pressure from the raw substring probes. Token sets are
  **parsed out of `Heat.fs`** so the lint cannot drift from what it guards.

### The scan floor caught a blind instrument in the guard itself

The first version had an aggregate floor of 20 kinds. Disabling one of four extraction
patterns dropped the corpus 33 → 30 and the lint **still exited 0 and printed "OK"** — a
guard reporting clean while an entire extraction route had gone dark. Fixed with a
**per-pattern floor**: every named route must contribute ≥ 1 match. The mutant now exits 1
with `extraction route 'fsharp-emitter-inline' matched 0 times`. Recorded because the failure
was found by planting the mutant, not by reading the design.

## Related

- `081M00TNWM8087G0R0027ACGKY` (PR #10693) — make deferral-vs-destruction a **typed field**
  rather than a substring match. That remains the real repair; this work-item only removes
  the second classifier and empties the ambiguous input class. Substring classification of a
  load-bearing bit is still the underlying defect.
