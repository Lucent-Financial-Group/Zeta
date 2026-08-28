---
name: dynamicvalue-extraction-ready-low-ripple-confirmed-namespace-decision-pending-2026-06-04
description: "Greenlit DynamicValue extraction is execution-ready: confirmed low-ripple (src/Core/DynamicValue.fs self-contained, nothing else in Core references it). One open DESIGN decision before executing — namespace: keep Zeta.Core (transparent, zero-API-change) vs move to Zeta.Core.FSharp.DynamicValue (per-lang convention, ripples to all consumers). Deferred from autonomous tick — Aaron's call."
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 autonomous tick. De-risked the greenlit DynamicValue unification
extraction (see [[dynamicvalue-is-value-functor-fixpoint-codecs-bridges-are-folds-2026-06-04]]
and the DOM-unify decision). **Execution-ready findings:**

- **Low-ripple CONFIRMED.** `src/Core/DynamicValue.fs` (compile pos 31) is
  self-contained: only `open System.Collections.Immutable`; defines its OWN
  `EncodeError`/`DecodeError` (lines 144/154) + JSON/CBOR codecs in-file; does NOT
  use `Codec.fs`. **Nothing else in `src/Core/` references `DynamicValue`** (grep:
  only Core.fsproj + generated XML). So it lifts out cleanly.
- **Mechanics:** new project `src/Core.FSharp.DynamicValue` (mirror
  `src/Core.FSharp.Yaml/*.fsproj`: net10.0, TreatWarningsAsErrors, zero-dep);
  move the one file; remove line 31 from `src/Core/Core.fsproj`; add to the .sln;
  Core references the new project (transitive re-export keeps consumers working).
  Siblings already exist: `src/Core.CSharp.DynamicValue`, `src/Core.Rust.DynamicValue`
  (the F#-embedded-in-Core was the anomaly).
- **Gate:** build `-c Release` (0 warnings) + `dotnet test` green in clone BEFORE push.

**OPEN DESIGN DECISION (Aaron's call — why I deferred executing on the tick):**
the moved file's **namespace**:
- (A) keep `namespace Zeta.Core` → transparent, ZERO public-API change, consumers
  doing `open Zeta.Core` unaffected; assembly≠namespace (internal-only oddity).
- (B) move to `namespace Zeta.Core.FSharp.DynamicValue` → matches C#/Rust per-lang
  convention but RIPPLES to every consumer (e.g. `DynamicValueYamlBridgeTests`
  `open Zeta.Core`) — a public-API change.
Shaping public API + pushing to shared main unattended = the wait-for-human class.

After extraction (next phases, also greenlit): retire `YamlValue`, point the YAML
codec at DynamicValue, implement the loss-first-class bridges with the extra-data
residual ([[dynamicvalue-open-base-type-structs-are-lenses-unknowns-roundtrip-version-independent-2026-06-04]]).
"One oracle per tick" — F# is oracle 1.
