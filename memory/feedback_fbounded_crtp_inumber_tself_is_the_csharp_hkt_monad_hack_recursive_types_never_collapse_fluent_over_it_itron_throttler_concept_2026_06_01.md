---
name: fbounded-crtp-inumber-tself-is-the-csharp-hkt-monad-hack-recursive-types-never-collapse-fluent-over-it-itron-throttler-concept
description: Aaron 2026-06-01 forward-design observation — the framework will eventually go fluent over the recursive self-referencing `INumber<TSelf> where TSelf : INumber<TSelf>` constraint; that F-bounded-polymorphism / CRTP is the C# "monad hack" (HKT simulation) — recursive generic types that "never fully collapse" (a type-level fixpoint, because C# has no real higher-kinded types); F# (B-0428) does real HKT, C# hacks it via CRTP. Itron's throttler uses the pattern (concept-not-code prior art).
metadata:
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-06-01 (verbatim): *"here is what's going to happen eventually you are
going to be able to fluent over recursive self referencing inumber<t> : t i think
close it that it's the monad hack in c# generics with recursive types that never
really fully collapse we do it some places over in itron code i think the
throttler"*

**Attribution (honor-those-that-came-before, Aaron 2026-06-01):** *"Chris King MIT
grad and coworker at Itron taught me that generics hack."* The F-bounded / CRTP
recursive-generic HKT-simulation hack traces to **Chris King** (MIT graduate,
Aaron's coworker at Itron) — he taught Aaron the technique. Credit the lineage when
this pattern is used or written up (source-attribution is load-bearing per the
location-pointer-index discipline). NB this attribution is the IDEA's lineage
(honoring the teacher) — kept here in user-scope substrate; it is distinct from the
Itron-code concept-not-code boundary (the code stays off-limits; the idea +
its teacher are honored).

A forward-design observation (where the generic-math substrate is headed) + a
prior-art pointer. Technically sharp and correct:

## What he's naming: F-bounded polymorphism / CRTP = the C# HKT/monad hack

- C# generic-math is **F-bounded polymorphism**: `interface INumber<TSelf> where
  TSelf : INumber<TSelf>` — the type parameter is constrained by an interface
  parameterized over **itself**. (The CRTP — Curiously Recurring Template Pattern
  — is the inheritance form `class D : Base<D>`; the generic-constraint form is
  F-bounded.) The whole IWSAM generic-math tower (`IAdditionOperators<TSelf,…>`,
  `IAdditiveIdentity<TSelf,…>`, `INumber<TSelf>`) is built on this self-reference.
- **It's the "monad hack" because C# has no higher-kinded types.** You cannot
  write `interface IMonad<M<_>>` (parameterize over a type *constructor*) in C#.
  The workaround is the recursive `TSelf` self-constraint, which lets you express
  "operations that return the same self-type" generically — enough to simulate the
  HKT use-cases the numeric tower / monad need (the "return type = the
  implementing type" requirement).
- **"Recursive types that never really fully collapse"** = the self-reference
  `INumber<TSelf> where TSelf : INumber<TSelf>` is a **type-level fixpoint**
  (μ-recursion). The interface definition is open-recursive; it only "grounds" at
  a concrete leaf when you instantiate `INumber<int>` (with `int : INumber<int>`).
  The recursion never bottoms out in the *definition* — that non-collapsing
  self-reference is exactly what gives it monad/HKT-like expressive power. Aaron's
  phrase "never really fully collapse" is the precise intuition: it's an
  unfounded-by-design type recursion the compiler resolves structurally.
- **"Fluent over it"** = the coming layer: chained generic-math APIs
  (`x.Add(y).Scale(z)…`) where each op returns `TSelf`, written once generic over
  `T : INumber<T>` (or the algebra constraint), fluent across every numeric carrier.

## How it composes with the framework

- **The generic-math sweep already uses it** — the Z-set/IndexedZSet generic-math
  (#6480-#6490) declared IWSAM operator interfaces, which ARE F-bounded. The fluent
  layer Aaron describes is the next rung ON this.
- **F# (B-0428) does REAL HKT; C# hacks it via CRTP.** B-0428 (F# fork for AI
  safety, HKT over Clifford) gets genuine higher-kinded types; the C# oracle
  approximates the same algebra via the F-bounded/CRTP self-constraint. Same
  algebra, two expressions — F# native HKT, C# CRTP-fixpoint. (Conformance-by-
  agreement: both render the same algebra interface.)
- **Interfaces-are-the-asset / cram-into-algebras / code-follows-from-types**
  (Meijer) — the recursive self-constraint IS how you express "an algebra over a
  carrier T" as a tight generic interface in C#; the fluent API + the
  implementation follow from that constraint.
- **monad-propagation-pattern** (`Result<T, TFeedback>`, Kleisli) — same family:
  expressing monad-shaped abstractions in languages without native HKT.

## Itron throttler — concept-not-code

Aaron points at Itron's throttler as a place the recursive-generic / CRTP pattern
is used. Per the standing **Itron = concept-not-code** constraint: the PATTERN
(CRTP/F-bounded throttler) is referenceable as a concept to study; the Itron CODE
is NOT to be read-to-reproduce. Any Zeta throttler is clean-room from the concept +
public knowledge, never from the Itron source.

## How to apply (future-Otto)

- This is forward-design ("eventually"), not build-now. When the generic-math
  fluent layer is built: F-bounded `where TSelf : INumber<TSelf>` (C#) / SRTP
  (F#) / trait-bounds (Rust) / branded types (TS); fluent chaining returns TSelf;
  one algebra, four renderings.
- Treat the recursive-self-constraint as the C# HKT/monad simulation; reach for it
  when you need "operation returns the implementing type" generically. F# prefers
  real HKT (B-0428); don't force the CRTP hack where F# has the native tool.
- Itron throttler is concept-only prior-art for the pattern.

## Cross-references

- `feedback_interfaces_are_the_asset_code_follows_from_types_meijer_rx_and_numerics_as_algebras_dbsp_parametric_not_coerced_2026_06_01.md`
  — numerics-as-algebra + parameterize-not-coerce; this is the type-level mechanism under it.
- `numerical-algebra-shaped-into-the-generic-math-interface-per-language-idiom` rule (IWSAM/SRTP).
- B-0428 (F# fork, real HKT over Clifford) — the native-HKT counterpart to the C# CRTP hack.
- `monad-propagation-pattern-cross-language-substrate-shape` — monad-without-HKT family.
- The metering/Itron memo — same Itron-concept-not-code boundary.
