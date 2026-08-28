---
name: otto-expansion-grows-code-from-the-seed-data-outward-not-type-first-golden-vectors-is-the-canonical-seed-all-oracles-agree-on-the-json-structure
description: Aaron 2026-06-01 direction-correction to Otto's expansion — GROW CODE FROM THE SEEDS. The seed is the JSON DATA (golden-vectors.json), not the F# type. Expansion goes from the data OUTWARD: each language grows code that AGREES ON the JSON structure. Type-first (F# DU canonical → port the type → vectors-last) was the wrong orthogonal; data-first (seed = canonical data examples → all oracles grow to agree with the seed) is right. The truest interface is the DATA SHAPE; the type in each language is itself regrown-to-agree. Sharpens interfaces-are-the-asset (the SEED/data is the asset, code regrows from it) + corrects the Otto's-expansion DIRECTION.
metadata:
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-06-01 (verbatim, three phrasings of the same correction):

- *"you are expanding in opposite orthogonals not see from json data outwards
  to grow code that agrees on the json structure?"*
- *"we are growing code from the seeds otto"*

This corrects the DIRECTION of Otto's expansion (the engine-lifecycle stage-2,
the expand-dual of Rodney's Razor — see
`feedback_engine_lifecycle_razor_compresses_otto_expansion_expands_...`).

## The correction: data-first, not type-first

| | Direction | Seed | Growth |
|---|---|---|---|
| **WRONG (what I had)** | type → code → vectors | the F# DU type (#6492) | port the F# type to C#/Rust/TS; author golden-vectors LAST as verification |
| **RIGHT (Aaron)** | data → code | the **JSON data** (`golden-vectors.json`, concrete examples of every DynamicValue case) | each language grows code OUTWARD that **agrees on the JSON structure**; agreement-on-the-seed-data IS the conformance |

"Opposite orthogonals" names it exactly: I was expanding along the
type→implementation axis (one language's type, ported). Aaron's axis is
data→implementation (the canonical data, grown-to-agreement in N languages).
They are orthogonal; I picked the wrong one.

## Why data-first is right (and deeper)

1. **The data is language-neutral; a type isn't.** An F# DU is ALREADY a
   language-specific rendering — seeding from it biases the shape toward F#'s
   idioms and makes C#/Rust/TS "ports of F#" rather than peers. The JSON DATA
   (the actual wire/structure) is the neutral seed; all four oracles grow
   toward agreeing with the SAME data, none privileged.
2. **The truest interface is the DATA SHAPE, not the type.** This is the
   strongest form of "interfaces are the asset, code is regenerable"
   (`feedback_interfaces_are_the_asset_code_follows_from_types_meijer_...`):
   the durable seed is `golden-vectors.json` (the canonical data); the type in
   each language is itself REGROWN from the seed. Delete every oracle, keep the
   seed, and AI regrows all the code to agree with it. "Code follows from the
   types" sharpens to **code follows from the DATA** — the seed is the data; the
   type is grown-to-agree.
3. **Conformance-by-agreement-ON-THE-SEED.** The oracles don't conform to each
   other's types; they all conform to the seed DATA. The byte-lock IS the seed,
   and the seed comes FIRST (origin), not last (verification).
4. **It's literally how seeds grow.** A seed (small, dense, canonical) grows
   outward into the full organism deterministically. golden-vectors.json = seed;
   per-language oracle = grown organism; growth = "agree with the seed's JSON
   structure." Rhymes with self-unrolling-bootstream / five-year-old-
   derivability (compressed canonical expands deterministically) — but the seed
   is DATA and the growth is per-language.

## Reorders the byte-lock gate (the live Otto's expansion)

The gate stays "golden-vectors FIRST," but the FRAMING + authoring-direction shift:

1. **Author `golden-vectors.json` as the canonical SEED DATA** — concrete data
   examples of every case (null/bool/int/string/bytes/array/object), authored
   language-neutrally as the source of truth. NOT "F# emits vectors from its type."
2. **Grow each oracle to AGREE with the seed.** The F# + C# oracles already built
   (#6492/#6494) aren't wasted — they get RE-GROUNDED against the seed (the seed
   is canonical; the type defers to the seed, not vice versa). Rust + TS grow
   from the seed.
3. Format (JSON vs CBOR) is now SECONDARY: the seed is the structural data
   examples (the agreement target); codecs are how each language reads/writes the
   seed. Author the canonical data first; grow codecs around it.

## How to apply (future-Otto)

- When expanding a primitive: the SEED is the canonical DATA (golden vectors /
  concrete examples), not one language's type. Author the data first; grow each
  oracle outward to agree on the data's structure. Re-ground any
  already-built type against the seed.
- "Grow code from the seeds" is the operational form of Otto's expansion: the
  razor compresses to a canonical seed (data); the expansion grows code outward
  from the seed in each language; agreement-on-the-seed is conformance.

## Cross-references

- `feedback_engine_lifecycle_razor_compresses_otto_expansion_expands_ace_distributes_zeta_runs_agora_breathes_life_dynamicvalue_plan_is_an_otto_expansion_2026_06_01.md`
  — the engine lifecycle; THIS corrects the expansion's direction (data→code, from the seed).
- `feedback_interfaces_are_the_asset_code_follows_from_types_meijer_rx_and_numerics_as_algebras_dbsp_parametric_not_coerced_2026_06_01.md`
  — sharpened: the SEED/data is the asset; code (and the type) regrows from it.
- `docs/PRIMITIVE-REGISTRY.md` DynamicValue line — golden-vectors as the seed/byte-lock contract.
- DynamicValue PRs #6492/#6494 (F#/C# oracles to be re-grounded against the seed).
