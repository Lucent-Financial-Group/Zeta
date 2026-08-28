---
name: common-uom-via-recursive-type-hacks-4-lang-plus-math-2026-06-04
description: "Common units-of-measure (UoM) across all 4 langs + the math via recursive-type hacks (same family as the F-bounded/CRTP HKT hack) — F# native, C#/Rust/TS phantom/recursive simulated; enables the per-key-type UoM guard + unit-safety, bit-perfect"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron: "we can have common UoM with recursive type hacks similar to the
HKT hacks for all 4 lang and our math."

**Common units-of-measure across all four oracles + the math, via recursive-type
hacks** — the same family of trick as the F-bounded/CRTP HKT simulation
([[feedback_fbounded_crtp_inumber_tself_is_the_csharp_hkt_monad_hack...]]):
- **F#** — native `[<Measure>]` units (real UoM).
- **C#** — phantom generic + recursive self-constraint (CRTP-style) to tag the
  measure at the type level (no native UoM).
- **Rust** — `PhantomData<Unit>` + marker traits.
- **TS** — branded / phantom types.
- **Math** — the units are encoded into the spec/golden vectors, not just the code.

WHY it matters here:
- It's the cross-language mechanism for the **identity per-key-type UoM guard**
  ([[project_identity_key_primitive_ordered_composite_not_hash...]]): measure-tag
  each key type so wrong-key-type code won't compile AND a proof scoped to one key
  type can't be applied to another — in all 4 langs, not just F#.
- General **unit-safety** across the substrate (can't add bytes to tokens, ms to
  ticks, etc.), enforced at compile time per language + asserted in the math.
- **Bit-perfect**: the unit tag is type-level (erased at runtime) so it adds no
  bytes — the wire stays identical across langs while the types stay safe.

Forward-design (capability: "we CAN have"), not build-now. Composes the HKT-hack
family + generic-math/INumerics + the identity UoM guard + culture-invariant
(both are "encode the invariant into the math + 4 langs" moves).
