---
title: Chris King Itron generics and interface-design lineage
date: 2026-05-07
scope: research-grade human-lineage anchor
source: Aaron maintainer statement in active Zeta session
operational_status: research-grade provenance, not current-state policy
---

## Chris King Itron Generics And Interface-Design Lineage

### Source Statement

Aaron named Chris King from Itron as a human anchor for his
deep generics and interface-design discipline. Aaron described
Chris as an MIT graduate who helped him design concurrent /
generic interfaces at Itron, taught him generics at a deep
level, and held him accountable to the principle that designs
and interfaces define the type.

Confidence boundary: this note preserves Aaron's attribution
and lineage claim. It does not independently verify Chris
King's biography or MIT affiliation.

### Why It Matters

This is the human apprenticeship substrate behind the type-first
thread that surfaced again in the 2026-05-07 durable-computation
work:

- `src/Core/Checkpoint.fs` landed interfaces first:
  `ICheckpointReader`, `ICheckpointWriter`,
  `ICheckpointable`, and `ICheckpointStore`.
- `docs/WELL-DEFINITIONS.md` sharpened Yoneda
  characterization: a type is known by observable behavior
  across all compositional contexts, not by its private story
  about itself.
- The durable-computation stack design decomposes by interface
  boundary: query serialization, replay, checkpointing, grain
  identity, and in-process dataflow.

The important lineage is not only "Chris taught Aaron generics."
It is "Chris held Aaron accountable to designs and interfaces."
That is a review relationship. The factory's reviewer roster is
a mechanized descendant of that discipline: define the type,
make the morphisms honest, then let implementations be forced by
the interface.

### Placement

This stays research-grade because it is named human provenance.
It can inform resume drafts, lineage notes, and future
architecture archaeology, but it should not become a normative
rule by itself without a separate promotion step.
