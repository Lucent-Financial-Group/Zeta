---
name: eve-protocol-v8-hidden-state-over-dynamicvalue-over-infinite-stream-shape-agreement-caching-2026-06-04
description: "Eve Protocol (B-0638 polymorphic-diplomacy primitive) defined by Aaron 2026-06-04: V8-hidden-class-style HIDDEN STATE over DynamicValue over an INFINITE STREAM — each timestep cached as a DynamicValue, each tick EVOLVES the DynamicValue (the monotone growing partial-tree / νF over μF), and it caches PREVIOUS AGREEMENTS OF SHAPE (negotiated shapes cached like V8 hidden classes / inline caches). Polymorphic deserialization diplomacy: parties incrementally agree on shapes and cache the agreements."
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron: "Eve protocol is basically **V8 hidden state over DynamicValue over
infinite stream** where **each timestep is cached as dynamic** and **each tick of the
stream evolves the DynamicValue**, and it's possible with Eve Protocol to **cache
previous agreements of shape**."

**Eve Protocol = B-0638**, the polymorphic-diplomacy / polymorphic-deserialization
primitive (named in `src/Core/DynamicValue.fs` doc as the Eve-Protocol primitive).
Aaron's crisp definition decomposes it onto the substrate built this session:

- **V8 hidden state** = V8's *hidden classes / shapes + inline caches*: V8 makes dynamic
  JS objects fast by INFERRING a stable hidden "shape" for objects and caching it, so
  repeated same-shape objects hit the cached shape. Eve Protocol applies that idea to
  DynamicValue: infer + cache the SHAPE of the evolving value.
- **over DynamicValue** = the open self-describing value tree (μF) is the carried value.
- **over an infinite stream** = νF; the value lives on a stream, not a one-shot payload.
- **each timestep cached as dynamic** = each tick's state is cached as a DynamicValue
  (the per-tick snapshot).
- **each tick evolves the DynamicValue** = the streaming **monotone growing partial-tree**
  (the Kestrel streaming-DynamicValue model: append-only, complete-per-closed-subtree,
  open-frontier-is-partial; νF of evolving μF). Each tick advances the value.
- **cache previous agreements of shape** = the diplomacy: parties incrementally NEGOTIATE
  and AGREE on shapes, and the agreed shapes are CACHED (like V8 hidden classes) so a
  re-seen shape is recognized/optimized rather than re-negotiated. This is the
  Rodney's-Razor isomorphism-collapse (one instance per shape + pointers) applied to
  *negotiated shapes between parties over time*.

**Where it sits:** Eve Protocol is the **streaming + shape-caching layer over the
DynamicValue carrier** — it composes the value-tree (DynamicValue, μF), the stream (νF),
the reflective Rx⇄DynamicValue loop (data can shape Rx via Bonsai/apply), and the
shape-agreement cache (isomorphism-collapse / V8-hidden-class). "Polymorphic diplomacy":
two ends of a stream don't need a fixed schema up front — they agree on shapes as the
stream evolves and cache the agreements, so the protocol is dynamic, self-describing,
and gets faster as shapes stabilize. Prior-art anchor (Beacon): V8 hidden classes /
inline caches (Self/Smalltalk maps lineage); shape-caching = the inline-cache idea.
Composes [[project_codecs_as_policy_parameterized_folds_add_ontology_to_value_tree_2026_06_04]]
(streaming/reflective) + [[project_rodneys_razor_formalized_...]] (shape isomorphism-
collapse) + the DynamicValue carrier. Status: definition captured (Aaron's framing); a
named primitive (B-0638) on the wish list, not yet built.
