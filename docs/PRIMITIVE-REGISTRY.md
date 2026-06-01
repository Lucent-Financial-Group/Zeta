# Cross-Language Primitive Registry

The stable-ish primitives we implement in **all four oracle languages** —
**TypeScript** (the distribution default), **F#**, **C#**, **Rust** — and the
consensus mechanism that says each one is _right_.

Per [`m-acc-multi-oracle`](../.claude/rules/m-acc-multi-oracle-end-user-moral-invariants.md):
no single language is the source of truth. Each language's compiler is an
**independent, non-Byzantine oracle** — _the compilers don't lie_ — so a primitive
that compiles + agrees across all four is right **by construction**
(governance model: [`docs/DECISIONS/2026-05-31-four-language-compiler-bft-...`](DECISIONS/2026-05-31-four-language-compiler-bft-governance-axes-per-artifact-gate-golden-vectors-oracle-tiebreak.md)).

This file is the **living list** Aaron asked for — the API-doc of what we can build
on. The work that fills the gaps is tracked by
[B-0959](backlog/P1/B-0959-zeta-sovereign-distributed-db-and-agent-loop-master-checklist-one-git-native-zset-substrate-aaron-otto-2026-05-31.md)
(master checklist); this file is the _status view_ over it.

## Consensus tiers

A primitive's trust is only as strong as how its four implementations are checked
to agree. Three tiers, strongest first:

| Tier  | Name                                     | What it means                                                                                                                                                                                                                 |
| ----- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **golden-vector byte-consensus**         | All implementations run a **shared fixture** and produce **byte-identical** output; a harness diffs them and fails on any mismatch. The strongest tier — disagreement is impossible to miss.                                  |
| **2** | **compiler-parity + per-language tests** | Each language **independently reimplements** the primitive and its own tests pass. "The compilers don't lie" — parity is proven by independent reconstruction, but there is not (yet) a shared byte fixture diffing all four. |
| **3** | **implemented (no cross-verify yet)**    | Present in a language, but no parity check binds it to the others.                                                                                                                                                            |
| —     | **absent**                               | Not implemented in that language.                                                                                                                                                                                             |

Cells below use ✅ (present) / ⚠️ (partial — see note) / ❌ (absent).

## Tier-1/2 — the stable base (4-oracle)

| Primitive                                                                         | TS  | F#  | C#  | Rust | Consensus                                                                                    | Locations                                                                                                                                                  |
| --------------------------------------------------------------------------------- | --- | --- | --- | ---- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ZetaId** — 128-bit content/structure-addressed id (Category enum incl. `Bus=6`) | ✅  | ✅  | ✅  | ✅   | **Tier 1** — 12-vector byte-consensus, 4-way `compare.ts` (TS≡F#≡C#≡Rust)                    | `src/Core.{TypeScript/zeta-id,FSharp.ZetaId,CSharp.ZetaId,Rust.ZetaId}/`; fixture `tests/cross-verification/zeta-id/` (B-0679, B-0681, B-0682)             |
| **Observe loop** — `observe`/`simulate`/`fold`/`replay` event algebra             | ✅  | ✅  | ✅  | ✅   | **Tier 1/2** — shared `golden-vectors.json` (Rust verifies against it; F#/C# crates present) | `src/Core.{FSharp,CSharp,Rust}.Observe/`, `tools/observe/`; fixture `tools/observe/golden-vectors.json` (B-0867.27)                                        |
| **TriBoolean** — digital qubit (true/false/middle)                                | ✅  | ✅  | ✅  | ✅   | **Tier 2** — compiler-parity + per-lang tests                                                | `src/Core.{TypeScript,FSharp,CSharp,Rust}.TriBoolean/`; tests `tests/Tests.{CSharp,FSharp}/TriBoolean/` (B-0944)                                           |
| **TriBoolean float** — "middle-out" self-describing float                         | ✅  | ✅  | ✅  | ✅   | **Tier 2** — per-lang tests; **v0 spec** (evolving)                                          | `…TriBoolean/{Float.fs,TriFloat.cs,float.rs}`, `src/Core.TypeScript/tri-boolean-float/`; specs `docs/research/2026-05-3{0,1}-tri-boolean-float-*` (B-0944) |

## In-progress — the base sweep (the gaps we're closing)

These are the building blocks for the **common observe loop + sovereign DB**; the
sweep order is **ZetaId → algebra ladder → bus**.

| Primitive                                                          | TS  | F#  | C#  | Rust | Note                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------ | --- | --- | --- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G-Set** — grow-only set CRDT                                     | ✅  | ✅  | ❌  | ✅   | TS `src/Core.TypeScript/g-set/` (+ `golden-vectors.json` fixture); F# `src/Core/GSet.fs`; Rust `src/Core.Rust.Algebra/src/gset.rs` (#6360, merged; cross-verified vs the fixture). Needs C# → then Tier-1.                                                                                                              |
| **Bag / multiset** — non-negative-weight multiset                  | ❌  | ⚠️  | ❌  | ❌   | The **missing middle rung**. Only implicit-in-Z-set in F# today; no named type anywhere. Cheapest gap.                                                                                                                                                                                                                  |
| **Z-set** — signed-weight, retraction-native set (DBSP)            | ❌  | ✅  | ⚠️  | ❌   | F# `src/Core/ZSet.fs` (+`IndexedZSet.fs`); C# is a binding→F# (`ZetaCircuitBuilder`). Needs native TS + Rust.                                                                                                                                                                                                           |
| **Bus (git-native)** — ZetaId-keyed G-Set of envelopes, no-PR      | ✅  | ❌  | ❌  | ❌   | `tools/agent-bus/` (B-0954, #6283/#6327). The wire is JSON-on-git, so cross-lang = a thin read/write/merge per language (each needs ZetaId first).                                                                                                                                                                      |
| **Rx-Observable / Z-set delta-stream** — push-based reactive layer | ⚠️  | ⚠️  | ⚠️  | ❌   | The reactive layer **over** Z-set: an Rx query _is_ a Z-set delta-stream (B-0959 §3). Rx.NET / `FSharp.Control.Reactive` exist per-lang (`rx-expert` skill, B-0640); not yet a unified cross-lang primitive. **CALM** (Consistency As Logical Monotonicity) is the law that makes the monotone slice coordination-free. |

## Candidate — BCL-like platform primitives (pull in slowly)

Some primitives every runtime already provides — **JSON**, **UTF-8**, and other
BCL/std-level facilities. We treat them as cross-registry primitives too, but
**pull them in slowly**: rely on one only once we've verified a _good, consistent
interface across all four_ we can depend on (per
[`bcl-interface-boundary-own-your-interfaces-hexagonal`](../.claude/rules/bcl-interface-boundary-own-your-interfaces-hexagonal.md)
— depend on BCL/std interfaces; wrap anything 3rd-party behind our own port; the
de-facto-standard exception, e.g. `serde`, only when both provenance-signed AND
widely-relied-on).

**"A good interface across all four" is a higher bar than "all four have it"**
(Aaron 2026-06-01) — three requirements, all of which must hold before we rely on a
BCL-like primitive:

1. **Cross-compatible** — the four implementations interoperate on the wire (JSON
   written by TS parses identically in Rust; a UTF-8 string round-trips byte-for-byte
   across all four). Same bar as the algebra primitives' golden-vector consensus.
2. **One common surface + idioms** — our interface exposes the primitive's features
   _the same way_ in every language, so a dev moving across the four doesn't relearn
   JSON (or UTF-8, or …) four times. We **own the surface** (the port); we do not
   re-export four different vendor APIs (per the hexagonal rule above).
3. **Still idiomatic per language** — each binding feels native and uses language
   features (F# computation expressions, C# `System.Text.Json` source-gen, Rust
   traits, TS structural types). The common surface is a shared _shape_, not a
   lowest-common-denominator wrapper that fights every language.

The tension (common-surface **and** idiomatic) resolves the way the algebra primitives
already do: a shared interface + golden-vector cross-checks, with idiomatic
per-language adapters underneath. "Pull in slowly" = land a primitive in this tier
only once all three hold.

| Primitive | TS                     | F#                          | C#                          | Rust                                                                                                         | Note — what "a good interface across all four" means here                                                                                                                                                                                                                                                                                                          |
| --------- | ---------------------- | --------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UTF-8** | native (`TextEncoder`) | `System.Text.Encoding.UTF8` | `System.Text.Encoding.UTF8` | `str`/`String` (native)                                                                                      | All four have it; UTF-8 has no endianness, so the cross-lang concern is **string ordering/comparison consistency**, not byte order — TS/.NET sort on UTF-16 code-units, Rust on UTF-8 bytes, which diverge once you move beyond ASCII/BMP. They agree for ASCII/BMP (what the g-set comparator + ZetaId hex already rely on); verify before depending beyond that. |
| **JSON**  | native `JSON`          | `System.Text.Json`          | `System.Text.Json`          | our `ZetaJsonParser` (zero-dep, `src/Core.Rust.Observe/src/json.rs`) + `serde_json` adapter behind a feature | Rust std has **no** JSON, so the cross-lang primitive is _our JSON port_ (the hexagonal interface), not one library. Stabilize the port shape across all four (number precision, key order, escaping) before declaring it registry-stable.                                                                                                                         |

**Other BCL-like candidates — data / codec** (Aaron 2026-06-01: "for sure yes", pull
in slowly): **base64**, **SHA-256** hashing, **big integers**, **regex**, and
**time/clock** — the last is a load-bearing **DST primitive** (deterministic simulation
needs a seedable/controllable clock, not wall-clock; F# is already well ahead here).
Each lands only after the four-way interface is verified — not on first use.

**Further-out — concurrency / runtime / IO primitives** (Aaron 2026-06-01, naming them
for the map): **channels** + **pipelines** (`System.Threading.Channels` /
`System.IO.Pipelines`), **concurrent dictionary**, **work-stealing / `ActionBlock`-like**
dataflow, an **async runtime** (Tokio in Rust; the TPL/`Task` scheduler in .NET; the
event loop in JS), **TCP/UDP sockets**, and eventually a **server side** (ASP.NET-class
HTTP). These are a harder cross-language-surface problem than the data/codec primitives —
the concurrency models diverge sharply (Tokio vs .NET `Task` vs the JS event loop) — so
they come later and need extra care to find a common surface that stays idiomatic in each
runtime. Listed now so they're on the map; the same three-requirement bar applies.

## The algebra ladder (why three of the gaps are one build)

```
G-Set   ⊂   Bag / multiset   ⊂   Z-set
weights {0,1}    weights ℕ          weights ℤ (retraction-native)
```

Each rung is the next by widening the weight codomain. Built **once per language,
parameterized over the weight monoid**, one type yields all three rungs — so the
G-Set / Bag / Z-set gaps collapse into a single ladder build per language.

## How to use / maintain this file

- **Building on the base?** Use the Tier-1/2 table. Tier 1 (ZetaId) is byte-safe to
  depend on across machines + languages. Tier 2 is reimplementation-verified.
- **Landed a primitive in a new language?** Add/flip its cell, name the location,
  and state the consensus tier honestly (don't claim Tier 1 without a shared
  byte-diff harness — implement the fixture + `compare` first).
- **Promotion gate to Tier 1**: a shared golden-vector fixture + an N-way `compare`
  harness that fails non-zero on mismatch (the `tests/cross-verification/zeta-id/`
  pattern is the template).

_Last updated: 2026-06-01 — ZetaId reached Tier-1 4-oracle consensus (B-0679); G-Set
gained its Rust rung (#6360, now 3/4, C# → Tier-1); added the BCL-like candidate tier
(JSON, UTF-8 — pull in slowly once the four-way interface is verified)._
