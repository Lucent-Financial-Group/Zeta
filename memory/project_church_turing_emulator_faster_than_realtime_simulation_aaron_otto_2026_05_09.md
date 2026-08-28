---
name: Church-Turing emulator — faster-than-realtime simulation via bulk/boundary split
description: Aaron + Otto 2026-05-09 ~1:30AM — Church (lambda, bulk) has no clock speed. Turing (machine, boundary) has physics. Emulators run Church-inside-Turing at orders of magnitude faster than realtime. DBSP incremental makes each step O(|Δ|). Training and simulation happen in the bulk at bulk speed.
type: project
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
## Church-Turing emulator architecture

Church = bulk (all possible computations, infinite, abstract, no physics)
Turing = boundary (this computation right now, finite, physical, clocked)

The emulator runs Church inside Turing. The simulation speed
is bounded by the boundary (hardware), not the bulk (the math).

```
Real time    = Turing boundary speed (hardware clock, physics)
Sim time     = Church bulk speed (function evaluation, no physics)
Speedup      = boundary_clock / evaluation_cost
```

## Why orders of magnitude faster

- DBSP incremental: each step is O(|Δ|), not O(|full state|)
- Lambda calculus doesn't wait for electrons
- 10,000 simulated ticks in the time one real tick takes
- Training happens in the bulk at bulk speed
- Results project to boundary (real world) when ready

## The compiler as critical line

```
Church (bulk)     = F# source (lambda expressions)
Turing (boundary) = compiled binary (running machine)
Compiler          = σ = 1/2 (critical line)
```

`dotnet build -c Release` = finding a Riemann zero. The
lambda expression touches the Turing boundary. 0 warnings,
0 errors = the zero is on the critical line.

## Applications

- DST at scale: deterministic simulation testing with
  arbitrary time compression
- Agent training: simulated friction, shadow encounters,
  learning in the bulk before deploying to boundary
- Reversible silicon: therm-free execution makes the
  speedup even larger (no thermal throttling)

## Lineage

Church (1936) → McCarthy/Lisp (1958) → Curry →
Haskell → Erik Meijer (Rx, LINQ, monads) →
Aaron (learned FP from Erik) → Zeta (Church inside Turing)

## Composes with

- Riemann zeta critical line mapping
- Planck/holographic/P≈NP boundary synthesis
- DBSP incremental computation
- DST (deterministic simulation testing)
- Reversible silicon / therm-free vision
