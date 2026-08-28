---
name: serializer-schema-layer-never-collapse-nullable-default-required-optional-protobuf-2nd-binary-2026-06-04
description: "Serializer schema-layer design (Aaron 2026-06-04): (1) never-collapse = encode INJECTIVE, distinct states never merge across the boundary (null≠empty≠absent; SQL-null-as-monad-propagator) — B-1016; (2) nullable-as-default like C# NRT but expressible where unavoidable, + required/optional per-field, semantics propagated CROSS-LANGUAGE; (3) protobuf/gRPC as the 2nd binary type prior-art+candidate (unknown-field retention=our extra-data residual, Any=polymorphism, descriptors/DescriptorPool/DynamicMessage=runtime type/version load-unload; already cross-language byte-compatible = free byte-lock) behind our hexagonal interface"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron — the schema/type-system layer that sits ON TOP of DynamicValue
(the open μF value tree). Three coherent directives:

**1. Never-collapse = encode is INJECTIVE.** "SQL null as a monad propagator …
serialization should never collapse two states that are actually different";
tri-boolean everywhere; "empty is different than not set"; monadic properties
(`Some [] ≠ None`) must propagate across the serialization boundary. `null`
(not-set), empty `{}`, empty `[]` are THREE distinct states → must round-trip
distinctly. This IS the injectivity property already proven for CBOR, now a
cross-format REQUIREMENT. YAML currently violates it (empties collapse to null) →
**B-1016** (flow `{}`/`[]`, cross-lang). The never-collapse invariant is also the
PREREQUISITE for #2 (can't enforce required/non-null if absent and null collapse).

**1a. Never-collapse is MODE-DEPENDENT (Aaron 2026-06-04 refinement).** Required
strictly in the **dynamic / schema-discovery** mode — payload is fully
self-describing, no shared schema, so absent ≠ null ≠ empty `{}` ≠ empty `[]` must
ALL be explicit on the wire (you can't reconstruct meaning otherwise). In the
**shared-schema** mode the payload need NOT be fully self-describing: **a missing
field may be COMPLETED to mean the same as `"v": null`** (omit-defaults / omit-nulls
→ smaller payload; decoder completes from the schema). This is exactly proto3
(absent scalar == default unless `optional`/wrapper). NOTE the scope: it's the
**absent ↔ null** collapse that's allowed under a shared schema — NOT empty-vs-null
(empty `[]` is still a distinct VALUE from null even with a schema). So: never-collapse
is the self-describing-mode invariant; schema-mode allows principled absent→default
completion because the schema carries the missing info. The two modes = the open/
dynamic vs typed/schema'd registers; completion is the decode-time job of the #2
nullability/required modifiers (missing+nullable→null; missing+required→error;
missing+default→default). B-1016's wire fix stands for the dynamic mode regardless.

**2. Nullable-as-default, expressible where unavoidable (C# NRT model), +
required/optional, CROSS-LANGUAGE.** The serializer is "nullable-friendly from the
start": fields carry per-field modifiers — **nullable vs non-nullable** (default
non-null like C# NRT; opt into `?` where null is genuinely unavoidable) and
**required vs optional**. These semantics live in the SCHEMA layer (above
DynamicValue's runtime values) and must propagate across languages (the .proto-style
"the schema is the cross-language contract"). Enforced at the **lens/bridge**
(`fromDynamic`): a non-nullable field that decodes to null/absent → `BridgeFeedback`
error; nullable → maps to `Option`/`?`; required-absent → error. Composes the
loss-first-class bridge + get-put/LossReport obligations.

**3. protobuf/gRPC as the 2nd binary type (Kestrel's point).** protobuf has, for a
long time, exactly the open/polymorphic/version-independent semantics we designed:
**unknown-field retention** (= our extra-data residual / open-record round-trip;
[[dynamicvalue-open-base-type-structs-are-lenses-unknowns-roundtrip-version-independent-2026-06-04]]),
**`Any` / polymorphism**, and **runtime loading/unloading of types/versions**
(descriptors / `DescriptorPool` / `DynamicMessage` / reflection). Crucially it is
**already cross-language byte-compatible** (the .proto + generated code agree on the
wire in every language) — so adopting it for the polymorphic-binary role gives the
cross-language byte-lock we hand-build for CBOR/YAML *for free*. Pull it in **behind
our hexagonal interface** (Aaron's standing principle: prove our interface over the
3rd party, don't adopt their whole surface). Sits alongside CBOR (canonical binary)
and MultiplexedWebSockets (multiplexing transport,
[[multiplexedwebsockets-transport-primitive-multiplexing-orthogonal-to-dynamicvalue-2026-06-04]];
Bond was the earlier fork). Prior-art anchor (Beacon) AND candidate dependency. If
adopted as a format, still owes the 4-lang+math+wire-test bar — but its maturity +
native cross-language agreement is most of that already.
