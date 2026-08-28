---
name: four-oracle-per-language-load-bearing-roles
description: "The 4-oracle languages have distinct load-bearing roles — TS=1st distribution, C#=2nd distribution, F#=math proofs, C#/Rust load-bearing at the consensus intersection; C#/Rust lag is EXPECTED not debt"
metadata: 
  node_type: memory
  type: project
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-06-03, two messages, on the 4-oracle (TS/F#/C#/Rust) primitive model:

> *"c# and rust will always naturally lag behind. ts is load bearing for
> distribution and fs is load bearing for math proofs, so cs and rs are only load
> bearing at the intersection of those two for 4-oracle bit-perfect / protocol-
> perfect consensus."*
>
> *"cs is our 2nd distribution after ts."*

**The per-language load-bearing model** (reconciling both messages):

| Lang | Primary load-bearing role |
|---|---|
| **TS** | **1st / primary distribution** (the distribution default) |
| **C#** | **2nd distribution** (after TS) **+** consensus intersection |
| **F#** | **math proofs** (the correctness / spec / canonical layer) |
| **Rust** | **consensus intersection** (bit-perfect / protocol-perfect; low-level oracle) |

All four together = the **4-oracle bit-perfect / protocol-perfect consensus** (the
golden-vectors byte-lock treaty; no runtime is king — the substrate is the
byte-agreement across them).

**C#/Rust "naturally lag" behind TS+F# — and that lag is EXPECTED, not debt.**
TS (distribution) and F# (proofs) carry the two primary axes; C#/Rust are
load-bearing specifically at the *intersection* (consensus) — C# additionally as
the 2nd distribution target. So a primitive being TS+F# first, with C#/Rust
catching up for the byte-lock, is the **designed cadence**, not a gap to alarm about.

**How to apply:**
- Don't characterize C#/Rust trailing TS+F# as "debt" or a "gap" in status reports
  (I made that error 2026-06-03 — called DynamicValue "3/4 missing C#" as a
  deficiency; it was both stale AND mis-framed: C# catching up is the expected
  cadence, and in that case C# had already landed).
- For a primitive to be **canonical** it still needs both axes (4-lang byte-lock +
  proof-from-seed) — but the *route* there is TS+F# lead, C#/Rust complete the
  consensus. Prioritize accordingly.
- F# is where the math-proof load lives (FsCheck/Z3/Lean cross-checks); TS is where
  distribution load lives; reach for C#/Rust work mainly to close the 4-oracle
  consensus (bit-/protocol-perfect byte-lock).

Composes with: `docs/PRIMITIVE-REGISTRY.md` (the per-primitive status view),
`docs/DECISIONS/2026-05-31-four-language-compiler-bft-...` (the BFT governance
model — compilers as independent non-Byzantine oracles), `m-acc-multi-oracle`
(no single language is source of truth), [[formal-proof-first...]] (F#=proof axis),
and the seed-first / golden-vectors-as-treaty substrate.
