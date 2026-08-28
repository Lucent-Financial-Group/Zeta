---
name: serializers-make-or-break-equal-rigor-agreement-matrix-2026-06-04
description: "Serializers are make-or-break / most-tested surface; EVERY serializer (JSON/CBOR/YAML/XML/Arrow/Bonsai) gets equal rigor (canonical+cross-lang+round-trip); full format-agreement matrix (every pair commutes); YAML is the storage of record; Arrow/Bonsai = same rigor, different interfaces"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron (across several messages): serializers are our **most-tested
surface** and **make-or-break** — "it doesn't matter how good our CBOR byte-lock
is if we store everything in YAML."

**The doctrine (detail in B-1011):**
- **Every serializer = SAME rigor**: JSON, CBOR, **YAML**, XML, **Arrow**, Bonsai,
  any future binary — canonical (deterministic) + cross-language agreement + self
  round-trip. No format is second-class.
- **YAML especially** — it's the **standard storage of record** (text in git), so
  it needs as much rigor as CBOR's byte-lock, NOT just round-trip. (This corrects
  my earlier "YAML only needs round-trip" lean.)
- **Storage strategy:** YAML/JSON text in git = the store; CBOR binary = capability
  + a few junction-point golden vectors (don't text-corner; for future
  git-alternative backends). [[project_serialization_strategy_yaml_json_text...]]
- **Same rigor, DIFFERENT interfaces:** base text/binary serializers share one
  interface (value↔bytes/text); **Arrow (columnar batch) + Bonsai (expr-tree /
  reactive)** have their OWN hexagonal ports — held to the same bar. (So "Arrow"
  isn't a separate leg; it's a serializer in the matrix with its own interface.)
- **Format-agreement MATRIX = the owed test surface:** every format-pair tested at
  byte level (canonical) or ≥ parse level — each round-trips itself AND converting
  BETWEEN any two loses nothing; all paths commute on the common value
  (DynamicValue = the treaty all codecs target).

**Hexagonal proof-scoping (Aaron 2026-06-04):** when we pull in a 3rd party we do
NOT adopt or prove their ENTIRE interface — we prove OUR narrow hexagonal port
*over* them (we control the contract). Proof burden = our port's behavior (e.g.
"our YAML port: encode/decode YamlValue↔text per our contract"), the lib is just
an adapter behind it; their full API surface is irrelevant. Bounds the proof
surface for any dependency. Sharpens bcl-interface-boundary + interfaces-are-the-asset.

**Hexagonal option (Aaron):** can wrap an external lib behind our port and replace
later — BUT cross-language AGREEMENT needs OUR canonical encoder (external libs
won't byte-agree), so for the byte/canonical bar the impl must be ours; external
libs are fine as differential oracles (YamlDotNet already is) + for decode.

Status: F# canonical YAML encoder WIP in Otto's clone (round-trip 3/6 — block
nesting + escape inverse vs the parser still buggy; not landed). Cross-lang YAML +
the matrix + Arrow-as-serializer = larger owed work. Composes B-1011 +
interfaces-are-the-asset + culture-invariant + bcl-interface-boundary (own the port).
