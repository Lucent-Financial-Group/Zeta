---
name: serialization-strategy-yaml-json-text-default-cbor-junction-points-only-2026-06-04
description: "YAML/JSON (text) is the standard git serialization; CBOR (binary) is NOT routinely checked in — only a few golden vectors at verification junction points, to preserve binary capability so we don't corner into text-only"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron: "we want to use yaml [or json] for our standard serialization;
cbor is not to be checked into git often — it's for when we have git alternatives
in the future, and we want to make sure we don't draw ourselves into a text corner
without binary support. We basically only need a few cbors checked in at junction
points for verification; all config and other files will be text based in git."

**The strategy:**
- **YAML / JSON (text) = the STANDARD git serialization.** All config + checked-in
  files are text-based in git. YAML is the default storage format.
- **CBOR (binary) = capability-preservation, NOT routine storage.** Its purpose is
  to ensure the architecture isn't cornered into text-only — binary support stays
  first-class for **future git-alternative / binary backends**. Only a **FEW CBOR
  golden vectors checked in, at junction points, for byte-lock verification**
  (proving the binary path is correct), never as bulk storage.

**Implications for the "4-ser" PROVEN leg:**
- It is NOT "check in 4 formats everywhere." It's: **YAML is the default storage
  format**; CBOR is proven at a few verification junctions so binary capability is
  preserved; JSON is interop; XML where a schema demands it.
- So the **YAML encoder (B-1011) is the priority** (it's the standard format we
  actually store in), not just one-of-four. CBOR = junction-point golden vectors
  only (DynamicValue already has its CBOR seed = the binary junction).
- Don't text-corner: keep the binary serialization path real + verified even
  though git (text-oriented) is today's backend.

Composes B-1011 (serializer roster) + DynamicValue CBOR seed (the binary junction)
+ interfaces-are-the-asset (the data shape is the asset; formats are codecs over it).
