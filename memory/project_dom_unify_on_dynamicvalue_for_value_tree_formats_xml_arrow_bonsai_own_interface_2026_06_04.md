---
name: dom-unify-on-dynamicvalue-value-tree-xml-arrow-bonsai-own-interface-2026-06-04
description: "DOM decision — UNIFY on DynamicValue for value-tree serializers (JSON/CBOR/YAML), no feature loss; XML/Arrow/Bonsai keep their own interface (same rigor) because they have features a value tree can't capture"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron: "do we keep per-format DOMs or unify on DynamicValue? I think
unify unless there are real edge cases where we lose a feature for some file types."

**Decision: UNIFY on DynamicValue for the value-tree serializers (JSON / CBOR /
YAML).** Every codec produces/consumes DynamicValue directly; retire the separate
`YamlValue` DOM. No feature loss — DynamicValue is the 8-type common core
(Null/Bool/Int/Float/String/Bytes/Array/Object): CBOR maps directly, JSON is a
subset, and our YAML SUBSET already drops comments/anchors/tags at the reader, so
`YamlValue` carried nothing extra. Win: "all formats agree" becomes
structural-by-construction (no bridge to drift); the format-agreement matrix is
trivial (one value, codecs are just edges).

**Real edge cases — keep their OWN interface (the "same rigor, different
interfaces" rule):**
- **XML** — attributes vs elements, namespaces, mixed content, ordering: a value
  tree needs a convention (`@attr` / `#text`) or a richer node. Decide at XML build.
- **Arrow** — columnar schema + typed columns + dict encoding (a batch of typed
  columns, not a single value tree).
- **Bonsai** — expression-tree / reactive.
- (Bytes: YAML's text subset has no byte type → base64-string convention or CBOR.)

**Next phase (refactor):** point the YAML reader + encoder at DynamicValue across
all 4 oracles (F#/TS/C#/Rust), retire `YamlValue` + the test-only
DynamicValue↔YamlValue bridge. Detail in B-1011. Composes interfaces-are-the-asset
(DynamicValue/data = the asset) + [[project_serializers_make_or_break...]] doctrine.
