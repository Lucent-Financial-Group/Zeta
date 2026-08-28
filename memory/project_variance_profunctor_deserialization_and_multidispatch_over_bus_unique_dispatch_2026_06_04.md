---
name: variance-profunctor-deserialization-and-multidispatch-over-bus-unique-dispatch-2026-06-04
description: "Aaron 2026-06-04: (1) in/out co/contra-variance must work during deserialization — native where supported (C# in/out), 'hacked in' elsewhere (F#/Rust/TS) via the principled form: covariance=Functor/map, contravariance=Contravariant/contramap, both=Profunctor/dimap; fromDynamic is inherently profunctorial (consumes wire=contravariant, produces typed value=covariant); variance = a per-type-param schema attribute propagated cross-language like nullability. (2) MULTI-dispatch (not just double) on the tuple of type signatures (CLOS/Julia multimethod), experimentally on any key (predicate dispatch) — a LAYER OVER the traveler-bus unique-dispatch (address routing); bus dispatches on identity/location, multimethod on type/shape = orthogonal axes (envelope⊥payload again)."
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron: "make sure in/out co/contra-variance works in languages that
support it or hack it in languages that don't, during deserialization; and
multi-dispatch not just double-dispatch based on type signature — experiment with
what we dispatch on; it's a layer over our unique dispatch for the traveler bus."

**1. Variance during deserialization = the bridge is a PROFUNCTOR.**
- Covariance (`out`, producer position) = **Functor** (`map`).
- Contravariance (`in`, consumer position) = **Contravariant functor** (`contramap`).
- Both = **Profunctor** (`dimap`).
- `fromDynamic` is *inherently* profunctorial: it **consumes** the wire (contravariant
  in input) and **produces** the typed value (covariant in output). Runtime
  polymorphic type-swap ([[dynamicvalue-open-base-type-structs-are-lenses-unknowns-roundtrip-version-independent-2026-06-04]])
  must be variance-CORRECT: `out T` accepts a subtype, `in T` a supertype.
- **"Hack it in" has a principled form:** languages without declaration-site variance
  (F#, Rust, TS structural) emulate it with `map`/`contramap`/`dimap` combinators that
  witness the variance explicitly during deserialization; C# gets it native via
  `in`/`out`. So no ad-hoc hack — it's the functor/profunctor encoding.
- **Variance = a per-type-param SCHEMA attribute propagated cross-language**, exactly
  like nullability/required
  ([[serializer-schema-layer-never-collapse-nullable-default-required-optional-protobuf-2nd-binary-2026-06-04]]):
  schema says `in`/`out`/invariant; each language honors natively or via combinators.

**2. MULTI-dispatch as a layer OVER the traveler-bus unique-dispatch.** Two layers,
orthogonal axes:
- **Bus unique-dispatch** = routing by unique identity/address (traveler-bus /
  Reticulum, after the 128-bit ZetaId) — the *where* (endpoint/stream/actor).
- **Multi-dispatch layer on top** = select the HANDLER by the **tuple of runtime type
  signatures** (CLOS/Julia multimethod), generalizing visitor's double-dispatch (the
  degenerate 2-arg case) to N args. "Experiment with what we dispatch on" =
  **predicate dispatch**: the dispatch key isn't fixed to types — type sig + variance
  + schema modifiers + arbitrary payload predicates.
- They COMPOSE because they dispatch on orthogonal axes: bus on *address*
  (identity/location), multimethod on *type signature* (shape) — the same
  envelope⊥payload / routing≠value separation as
  [[multiplexedwebsockets-transport-primitive-multiplexing-orthogonal-to-dynamicvalue-2026-06-04]],
  now at the dispatch layer.

**Predicate PUSH-DOWN (Aaron 2026-06-04):** the predicate-dispatch layer doesn't
filter after delivery — it can push the predicate DOWN to the transport/store so
filtering happens at the source. **Git:** predicate match over the git event-store
fold. **NATS / JetStream:** filter-subjects + subject/header filtering = broker-side
push-down (consumer declares its predicate, broker only delivers matches). = the
database "predicate pushdown" optimization applied to the bus — filter-at-source, not
deliver-then-filter — scale-free (less data moves) — and makes **NATS a concrete
traveler-bus implementation candidate** alongside Reticulum. The dispatch predicate
and the push-down predicate are the SAME predicate: push it down where the transport
supports it, fall back to in-process multi-dispatch where it doesn't — one logical
layer, two execution sites. (Composes the earlier "bus repos over rx joins".)

**Beacon anchors:** variance soundness — Cardelli / Liskov (substitutability);
profunctors / dimap — category theory (functor + contravariant functor); multiple
dispatch — CLOS multimethods, Julia; predicate dispatch — Ernst/Kaplan/Chambers
"Predicate Dispatching" (1998); predicate pushdown — database query optimization;
NATS subject-filtering / JetStream consumer filter-subjects. Status: design direction
/ experiment ("we can experiment here"), not yet a built spec — verify-stage.
