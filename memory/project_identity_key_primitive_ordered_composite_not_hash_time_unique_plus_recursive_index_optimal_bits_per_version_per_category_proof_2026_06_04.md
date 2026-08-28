---
name: identity-key-primitive-ordered-composite-not-hash-per-version-per-category-2026-06-04
description: "Identity/keys are ORDERED COMPOSITE keys (not content-hashes) — time-ordered crypto-unique bits + recursively-extensible index bits, optimal bit-encoding that differs PER CATEGORY; proof is per id-version × per category"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron, correcting/specifying the identity-key primitive (floor #2):

> "we are not really doing hashes for most of our keys, we are doing index
> lookups. you can prove it with hashes but we have time-ordered crypto unique
> bits plus index bits based order where the index can be recursively extending —
> we have an optimal bit-use pattern for our keys. like an optimal bit encoding
> pattern and the bits can be different per category. we are going to have to have
> proof per id version and category within that version likely."

**Keys are ORDERED COMPOSITE keys, NOT content-hashes:**
- **time-ordered crypto-unique bits** — a monotonic, unique prefix; this IS the
  clock/versionstamp embedded INTO the key, so the key itself carries global
  order. (Identity and clock are not separate — the key embeds the clock.)
- **+ index bits in order, recursively extensible** — hierarchical/nested
  subspaces; a prefix you keep extending deeper (FoundationDB tuple/subspace
  shape; DV2.0 hub→sub-key at the key level).
- **optimal bit-encoding pattern** — dense, no wasted bits; round-trip bijective.
- **bits differ PER CATEGORY** — each category has its own bit layout.

**Lookups are ORDERED INDEX lookups (range scans), NOT hash point-lookups** —
this PRESERVES order, which is exactly why the curve/history works (range-scan a
time-ordered log; a hash destroys order). Hashes are a PROOF TECHNIQUE ("you can
prove it with hashes") but not the actual key mechanism.

**Proof is a MATRIX: per id-version × per category-within-version.** Not one
monolithic identity proof — each (version, category) has its own optimal bit
layout = its own spec to prove. Per-cell proof obligations: uniqueness (the
crypto-unique bits), total + time-ordering (prefix order = clock order),
recursive index extensibility (prefix preserved under extension), optimal
bit-use (round-trip bijection / no waste). Same "smallest scope, one cell at a
time" discipline as the rest of the floor.

**238-BIT KEYS, MANY TYPES, F# UoM-GUARDED** (Aaron 2026-06-04): "we can have
many different 238-bit key types, it's set up that way, but we need proof per key
type and probably something like F# UoM to make sure we don't try to run code for
the wrong key types or prove things with the wrong key types." So:
- keys are **128 bits** wide (CONFIRMED in code: BitLayout.fs TotalBits=128,
  UInt128 codec; V1 = Version5|Timestamp48ms|Chromosome5|rsvd|Category4|Firefly1|
  Authority5|Persona8|Momentum8|Location8|rsvd|Randomness32). **Many key TYPES**
  partition that bit-space. (CORRECTION: an earlier note said "238 bits" — a slip
  recorded without checking the code; it is 128. Timestamp48 = the embedded clock.)
  Math leg ALREADY substantially proven (Canonical.Tests.fs: unpack∘pack=id
  bijection + injectivity + env-invariance + id-order=timestamp-order/key-embeds-
  clock) + 4-lang byte-lock. Open: rolling-monadic encoding, UoM-per-type guard,
  per-version/category cells, ECC key types (after-core).
- **proof per key type** (the matrix cell = key-type, within version × category).
- **F# units-of-measure as a static category guard** — measure-tag each key type
  so the compiler REJECTS cross-category mixing in CODE *and* prevents applying a
  proof scoped to one key type against another. UoM-as-phantom/category-tag on the
  key wrapper (the fsharp-uom anchor). Type-level enforcement of the per-key-type
  proof matrix: wrong-key-type code won't compile; wrong-key-type proof won't typecheck.

**4-BIT ROLLING ENCODING — 15+1-hole vs 16+null monad-propagation rule** (Aaron
2026-06-04): the recursively-extensible index rolls in **4-bit nibbles**, two
bit-optimal absence schemes:
- **16+null (monadic) — BIT-OPTIMAL** (Aaron correction 2026-06-04): all 16 codes
  payload; null/termination handled by a structure ONCE (out-of-band, amortized),
  NOT per nibble. No recurring waste over recursion. Absence is a MONAD
  (Option/Maybe; propagates via bind).
- **15+1 hole — NOT bit-optimal**: reserves 1-of-16 as an in-band HOLE on EVERY
  nibble (~3.9 usable bits/4), so waste COMPOUNDS with each recursive extension.
  Self-terminating/prefix-free but pays a code per roll. (Rhymes TriBoolean's
  third state.)
The "monad propagation rule" = how absence COMPOSES through the rolling extension
(in-band hole vs monadic null) — null-as-value vs null-as-monad at 4-bit grain.
The MONADIC scheme is the bit-optimal one (terminate once, not every recursion) —
THIS is what keeps "many small key types" cheap. Composes
[[monad-propagation-pattern]] + TriBoolean + the recursive index.
(Correction: an earlier note wrongly called both schemes bit-optimal.)

Status: ZetaId has 4-lang byte-lock (validated); per-key-type (× version × category)
math-leg proofs + the UoM guard are open. Composes [[project_clock_primitive_foundationdb_versionstamp...]]
(key embeds clock) + DV2.0 hub/satellite + fsharp-uom + [[project_proven_event_store_one_primitive_at_a_time...]].
