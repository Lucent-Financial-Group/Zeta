---
name: dynamicvalue-open-base-type-structs-are-lenses-unknowns-roundtrip-version-independent-2026-06-04
description: "DynamicValue (μF) is an OPEN superset; a typed struct is a LENS that projects known fields, unknowns round-trip in the extra-data region (forward/backward compat, no compile-time version lock, runtime polymorphic type-swap); the extra-data region IS the cross-cutting metadata channel (trace/span/baggage/scope/uncertainty/claim+auth) — lossy-bridge residual = that channel; claim-in-baggage = no-directives source≠authorization"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron, three messages, one design (combining MultiplexedWebSockets
extensible/extra-data with DynamicValue polymorphism — see
[[multiplexedwebsockets-transport-primitive-multiplexing-orthogonal-to-dynamicvalue-2026-06-04]]):
1. "combine the extra-data / extensible parts into context/span/tracing/uncertainty/
   structured-logging/scope/claim/auth/other passing"
2. "our base data type is generic and different structs can sit on it even if the
   type didn't define it — it can polymorphic round-trip in the extra data"
3. "everything becomes runtime decodable and unloadable when versions change, so
   data objects are not compile-stuck to versions at runtime — they runtime-swap
   based on polymorphic deserialization"

**The design — DynamicValue (μF) is an OPEN superset; a typed struct is a LENS:**
- A compiled struct **projects out the subset of fields it knows**; everything it
  doesn't define stays in the **extra-data / extensible region** of the same
  DynamicValue. (Open records / row polymorphism / protobuf unknown-field retention.)
- **Round-trip preserves unknowns:** `toDynamic (fromDynamic dv) ⊇ dv` — known
  fields merged back with the residual the type never understood. That's the lens
  **get-put law**; Postel's robustness made provable.
- **Not compile-stuck to a schema version:** decode against the open tree at
  runtime, a newer/older version's extra fields survive untouched, and you can
  **runtime-swap the concrete type** via polymorphic deserialization without losing
  data. Version skew → lossless carry, not a break. ("runtime decodable/unloadable
  when versions change.")

**The extra-data region IS the cross-cutting metadata channel:**
context · span/tracing · uncertainty · structured-logging scope · **claim/auth** ·
"other passing." = W3C Trace-Context / OpenTelemetry **baggage** / gRPC-metadata
pattern: metadata propagates ALONGSIDE the value without the value's type knowing.
- **claim/auth in baggage = the [[no-directives]] separation**: the *claim*
  (source) rides in extra-data; *authorization* stays gated. Source travels,
  authority doesn't.
- **uncertainty in baggage** = confidence / proven-vs-asserted propagates with the
  value (ties labeling-confidence).

**Math grounding (extends docs/serializer-recursion-schemes.md):** the lossy
bridge's `LossReport`/residual **IS the extra-data channel** — that's *why* loss was
first-class. A typed view = a **lens/prism** into DynamicValue (get-put / put-get
laws); "round-trip preserves unknowns" is the provable obligation. Lossless typed
view over an open type = a lens whose residual is empty only when the value has no
extra fields. Composes
[[dynamicvalue-is-value-functor-fixpoint-codecs-bridges-are-folds-2026-06-04]]
(folds) + the loss-first-class bridge API + interfaces-are-the-asset (the open data
shape is the asset; types are lenses regrown over it).

**Sequencing (Aaron 2026-06-04):** "we can grow into schema-evolution / versioned /
zero-downtime proofs AFTER we get these primitives done." This open/lens design is
the FOUNDATION; zero-downtime versioned schema-evolution proofs are an EXPAND-stage
growth on top of it — NOT now. The lens law (round-trip-preserves-unknowns) is the
exact lemma those future proofs stand on, so nailing the primitive now is the down
payment. Honors current-phase=verify-not-expand: build the primitive + its laws;
defer the evolution proofs.
