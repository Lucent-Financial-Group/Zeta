---
name: canonical-xml-serializer-typed-element-4lang-bytelock-landed-2026-06-04
description: "Canonical XML codec for DynamicValue LANDED 2026-06-04, now TOTAL 8/8 (4th serializer, full rigor; commits 3089783e=6-shape, 4fa46e8d=Float/Bytes): typed-element form (<null/> <bool> <int> <str> <float> <bytes> <arr> <obj><e k=..>..</e></obj>), minified, char-ref escaping for whitespace, fixed-point canonicality, 4-lang byte-lock via golden-vectors-xml.json (47 vectors), never-collapse FREE via distinct element names (5 distinct empties), format-matrix + round-trip LAW + injectivity proven. Float=16-hex IEEE-754 f64 bits, Bytes=lowercase hex (reuse tagged-form carriers; bits-not-decimal is deliberate — decimal float text not 4-lang byte-lockable without shared Ryu)."
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Canonical XML codec for DynamicValue — 4th serializer (JSON/CBOR/YAML/XML), landed
2026-06-04 (commit 3089783e), same rigor as the others. B-1011 XML leg done.

**Canonical form — typed elements (the key choice):** `<null/>`,
`<bool>true</bool>`, `<int>DECIMAL</int>`, `<str>TEXT</str>`, `<arr>CHILD...</arr>`,
`<obj><e k="KEY">VALUE</e>...</obj>`. Minified (no insignificant whitespace), keys
keep insertion order. **Typed elements were chosen because they make the 6 shapes
unambiguous AND make never-collapse FREE: `<null/>`, `<arr></arr>`, `<obj></obj>`,
`<str></str>` are four distinct forms by construction** — no B-1016-style fix needed
(contrast YAML, where block style collapsed empties).

**Escaping (the subtle part — XML normalizes whitespace):** element TEXT escapes
`& < >` as entities and `\t \n \r` as CHAR-REFS (`&#9; &#10; &#13;`) — because XML
normalizes LITERAL whitespace in content/attributes (line-ending normalization +
attribute-value normalization), so whitespace must ride as char-refs to round-trip.
Attribute (key) escaping adds `"`→`&quot;`. **Representability boundary:** XML 1.0
forbids NUL + C0 controls other than `\t\n\r` even as char-refs, so such
strings/keys are NOT representable → encoder returns `Err(NotXmlRepresentable /
NonRepresentable)` (the XML analogue of Bytes-not-in-YAML; 1 golden vector excluded:
string-control-u0001).

**Coverage:** 6 shapes (null/bool/int/str/arr/obj), parity with JSON. **Float +
Bytes DEFERRED** (lock under CBOR) — but XML's typed `<float>`/`<bytes>` are a CLEAN
future extension (unambiguous, unlike JSON numbers), so the Float/Bytes XML extension
is low-risk when wanted (the only cross-lang hazard is float-formatting agreement —
reuse the YAML/CBOR convention already locked).

**Strictness:** decode is lenient-parse + a FIXED-POINT check
(`canonicalXml(parsed) == input` else `NonCanonical`) — same elegant pattern as the
JSON codec; rejects self-closing empties, `&#x9;` vs `&#9;`, insignificant
whitespace, leading-zero ints for free.

**Byte-lock treaty:** `src/Core.TypeScript/dynamic-value/golden-vectors-xml.json`
(30 vectors). TS reference (`xml.ts`) locked first; F#
(`DynamicValue.toCanonicalXml/fromCanonicalXml`), C# (`DynamicValuesXml.cs`), Rust
(`lib.rs`) all assert encode(value)==xml + decode(xml)==value byte-for-byte (ports
via subagents against the locked reference). F# adds FsCheck round-trip LAW +
injectivity property + the 4-format matrix commute (JSON+CBOR+YAML+XML). Composes
[[dynamicvalue-is-value-functor-fixpoint-codecs-bridges-are-folds-2026-06-04]].
