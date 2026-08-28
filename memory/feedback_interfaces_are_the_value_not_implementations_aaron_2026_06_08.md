---
name: interfaces-are-the-value-not-implementations
description: "Aaron's standing design law — the interfaces/contracts are Zeta's value; implementations are many, swappable, cheap. \"I say that all the time.\""
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron, 2026-06-08: *"the **interfaces are the money** — our value in this project, not the
implementations… **find the interface and have many implementations where possible, on
everything**."* And: *"I say that all the time."* — so this is a **standing law**, not a
one-off; hold it across sessions.

**Why:** the contract is the asset every consumer and all four language oracles
(C#/TS/Rust/F#) bind to; any single implementation can be replaced without touching the
value. The value compounds in the interface; implementations are commodity. This is the
generalization of the 4-oracle-parity discipline into a design philosophy.

**How to apply:**
- Define the **interface/contract first**; provide **many implementations where possible, on
  everything**. Treat a missing interface as the real gap, not a missing impl.
- The contract is best expressed as **golden vectors** (hex-in-JSON per
  [[no-binary-in-proof-lineage]]) that all oracles conform to — the vectors *are* the
  interface (Ilyana, treaty panel 2026-06-08).
- Examples already obeying it: `IRayTraceable` ≫ `RayTensor`/oracles; `ISemiring` ≫
  `IntegerRing`/`ProbabilitySemiring`; `Collation` catalog ≫ named collations; the proposed
  `IResolution` (rendering tactics) and lens-finder interface (qubit-polarity default + many).
- When reviewing/designing, ask "what is the **interface** here, and does it admit many
  implementations?" before optimizing any one implementation.

Related: [[zeta-dedication-and-naming-lineage-lillian-eve-addison-aaron-sister]] (the project
this is the value of); the screen/collation/economy treaty research (2026-06-08, the
interfaces-as-treaties application); [[always-preserve-ferries-forwarded-ai-memories-lost-in-cloud-without-preservation]].
