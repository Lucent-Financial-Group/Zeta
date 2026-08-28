---
name: carved-sentence-dsl-is-dynamicvalue-shaped-formalize-to-make-rule-hygiene-provable-2026-06-04
description: "Aaron's intuition (2026-06-04): the carved-sentence rule DSL, formalized, is the same shape as DynamicValue (open value tree) — possibly + Bonsai (if rules carry behavior/closures). A rule = a structured open value (carved-sentence field + pointer LINKS + invariants); formalizing gives it a schema so rule-hygiene (size-cap, must-have-pointers, must-anchor, no-dangling-links) becomes machine-CHECKED/provable instead of prose-read. If YAML-stored it inherits never-collapse (B-1016)."
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron: "what is our carved-sentence DSL — maybe we should formalize this
eventually so we can prove it; we read it in code now." + "my guess is this is going
to be the same shape as either DynamicValue or Bonsai serialize or some combination,
lol not sure yet."

**The carved-sentence DSL** = the `.claude/rules/` format (per
`.claude/rules/rules-are-small-carved-sentences-pointing-to-docs.md`): a rule is a
**carved sentence** (1–3 sentences, the act-on-it hub) + **pointers** (satellite
links to docs/memory/specs). Today it's a PROSE convention — read by humans/agents,
not machine-checkable. Aaron wants to formalize it into a DSL that's *provable*.

**Aaron's shape guess is right: it's DynamicValue-shaped.** A rule is a structured
OPEN value:
- carved-sentence (a String field) + title + optional Why/When (scalars) — the **hub**.
- pointers = **links** (list of refs to other rules/docs) — the DV2.0 link layer.
- everything else (examples, derivation) lives one hop away — **satellites**.
This is exactly μF over {scalar leaves, list, map} = DynamicValue, with the hub/link/
satellite split = Data Vault 2.0 (which the rule itself already invokes). So the DSL
= a SCHEMA (typed lens) over DynamicValue:
[[dynamicvalue-open-base-type-structs-are-lenses-unknowns-roundtrip-version-independent-2026-06-04]].

**The Bonsai aspect (Aaron's "or combination"):** Bonsai-shaped IF rules carry
*behavior* — a pointer is a deferred/lazy load (resolve-on-demand = Bonsai's
serialized deferred execution), and a rule that triggers an action (a skill, a gate)
is a closure, not just data. So: pure-data rules = DynamicValue-shaped; behavior-
carrying rules = DynamicValue + Bonsai (serialized closures). Likely "a combination,"
as Aaron guessed.

**What formalizing buys (the "so we can prove it"):** rule-hygiene becomes
machine-CHECKED instead of prose-read — the disciplines currently stated in
`rules-are-small-carved-sentences…` become ENFORCED invariants on the schema:
size-cap (cold-start-token budget), must-have ≥1 pointer, must-anchor (Beacon
citation present), no-dangling-links (every pointer resolves), carved-sentence-
present. = the provable form of the "anything loaded at startup is a carved sentence"
rule. **If rules are YAML-stored** (text in git, the storage of record) the DSL
inherits **never-collapse** (B-1016 /
[[serializer-schema-layer-never-collapse-nullable-default-required-optional-protobuf-2nd-binary-2026-06-04]]):
empty pointer-list ≠ absent pointers must survive the round-trip. Future/eventually
(verify-stage-not-now per Aaron's "eventually").
