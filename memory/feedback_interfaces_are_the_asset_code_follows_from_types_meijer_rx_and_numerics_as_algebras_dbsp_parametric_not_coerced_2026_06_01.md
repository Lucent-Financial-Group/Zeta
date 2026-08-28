---
name: interfaces-are-the-asset-code-follows-from-types-meijer-rx-and-numerics-as-algebras-dbsp-parametric-not-coerced
description: Aaron 2026-06-01 design conversation — the deepest form of the languages-inside-out thesis (interfaces are the most valuable resource; code is regenerable-from-interfaces in hours/days; "if the interfaces are right the code is obvious", Erik Meijer "the code follows from the types") + the algebra-design answers (Rx CAN be an algebra via Meijer's IObservable=dual-of-IEnumerable + merge-monoid + DBSP-operators; numerics ARE algebras = the generic-math sweep; DBSP over Rx/Z-sets/G-sets parameterizes the weight type — float OR int via the generic-math interface, NOT explicit coercion, because Aaron hates explicit typing) + the test-framework-hexagonal wish-list item.
metadata:
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

A rich Aaron 2026-06-01 design conversation (while I was doing DynamicValue
steward work). Verbatim anchors:

- *"our codes does not matter our interfaces are our most valuable resource the
  code could get deleted and if the interfaces hold AI will recreate it in a
  matter of hours or days"*
- *"Our interfaces need to be perfect which is why i want to cram everyting into
  so few things that are mostly algebras, actually speaking of that can we make
  rx an algegra?"* … *"numerics?"*
- *"if we do DBSP over rx or zets sets or gsets or some combination of them they
  can type corerse like float and int? or not corerse actually i hate that
  explicit typing."*
- *"If the interfaces are right the code is obvious, Erik Maijer the code follows
  from the types"*

## The deepest form of the thesis: interfaces are the asset; code is regenerable

This sharpens the languages-inside-out / BCL-is-the-asset thesis (PR #6491,
research note 2026-06-01) to its strongest claim:

- **The interface (the shape, the types, the algebra laws) is the most valuable
  resource.** Code is REGENERABLE: delete the code, keep the interfaces, and AI
  recreates the code in hours/days. The durable asset is the
  interface/conformance-contract, not the per-language code.
- **"The code follows from the types" (Erik Meijer).** If the interfaces/types
  are right, the implementation is largely determined (obvious/derivable). This is
  why the framework crams everything into a few **algebras** — an algebra is the
  tightest possible interface (a small set of operations + laws that constrain the
  implementation almost completely).
- This is exactly the methodology this session used for `DynamicValue`: I built
  the SHAPE (the F# DU + tag + accessor contract) FIRST as canonical; the C#/Rust/
  TS code conforms TO the shape. Shape-first, code-follows. The four-oracle
  conformance-by-agreement IS "the interface is the asset; the code is N
  regenerable renderings of it."
- Operational implication: spend the care on the interface (get the algebra +
  laws + conformance vectors right); treat per-language code as cheap/regenerable.
  Golden vectors + the conformance contract are the thing to protect.

## Can Rx be an algebra? — YES (and Meijer is the anchor)

- **Erik Meijer's duality**: `IObservable<T>` is the categorical DUAL of
  `IEnumerable<T>` (pull→push; the arrows reverse). That duality is itself the
  algebraic structure — Rx is the dual algebra of enumerables.
- **Observables form a monoid** under `merge` (the additive monoid — identity =
  empty/never; associative). Same shape as Z-set union / the algebra-ladder
  additive monoid. Rx operators (map/bind=SelectMany) make it a **monad**.
- **DBSP is the algebra of incremental computation over streams**: a stream =
  observable-of-deltas; the DBSP operators z⁻¹ (delay), ∫ (integrate), ∂
  (differentiate), and the lifting of any operator to its incremental form are the
  algebra. So "DBSP over Rx" = Rx observables carrying Z-set deltas + the DBSP
  operators = the streaming incremental-view-maintenance algebra. Rx-as-algebra is
  real and well-anchored (Meijer duality + merge-monoid + DBSP lifting).

## Are numerics an algebra? — YES (it's literally the generic-math sweep)

- Numerics ARE the canonical algebras: additive monoid → group → ring → field →
  `INumber`. The generic-math sweep already did this (the
  numerical-algebra-into-the-generic-math-interface rule; CayleyDickson.fs /
  Semiring.fs / Algebra.fs; the Z-set/IndexedZSet generic-math PRs #6480-#6490).
  The Cayley-Dickson tower (ℝ→ℂ→ℍ→𝕆) is the algebra. So numerics-as-algebra is
  already the framework's stance.

## DBSP over Z-sets/G-sets/Rx + the float/int question — PARAMETERIZE, don't coerce

Aaron: *"type coerce like float and int? or not coerce actually i hate that
explicit typing."* The resolution he lands on (**not coerce**) is exactly right
and the framework already has the mechanism:

- DBSP/Z-sets are **parameterized over the weight monoid** (registry line 228:
  "parameterized over the weight monoid, one type yields all three rungs"). The
  weight type is a TYPE PARAMETER, not a fixed int.
- The **generic-math interface** (`INumber<T>` / IWSAM in C#, SRTP in F#, the
  per-language idiom) makes float AND int both instances of the same numeric
  algebra. So the SAME DBSP/Z-set code works over int-weights (signed counts) OR
  float-weights (signed real weights) OR a custom monoid — with **no explicit
  cast and no coercion**, because the numeric type is a generic parameter.
- This IS the "I hate explicit typing" resolution: **parametric polymorphism over
  the numeric algebra, not coercion.** You don't write `(float)x`; you write the
  algebra once, generic over `T : INumber<T>`, and int/float drop in. No coercion
  (no lossy implicit promotion), no explicit casts (no `(float)`) — just one
  generic algebra. The type "follows from" the algebra constraint.
- G-Set ⊂ Bag (additive monoids, no inverse) ⊂ Z-set ⊂ IndexedZSet (abelian
  groups, have inverse). DBSP over any of them = parameterize the weight; the
  combination Aaron asks about (DBSP over Rx-of-Z-set-deltas, weight generic over
  the numeric algebra) is the coherent shape.

## Wish-list item (Aaron 2026-06-01): hexagonal the test frameworks across languages

*"we need to hexagonal our tests frameworks across languages too so we don't
interface bleed there put it on primitive wish list."* The BCL-interface-boundary
rule applied to TEST frameworks: own our test-assertion/contract interface; xunit
(C#/F#), Rust `#[test]`, TS test runner become swappable ADAPTERS behind our own
test port — so the vendor test framework doesn't bleed into our test code.
**ACTION: add to `docs/PRIMITIVE-REGISTRY.md` wish list** (own-your-interfaces for
test frameworks; the four-oracle golden-vector tests especially should run through
a shared test-contract port, not vendor-specific assertions). Pending: land the
registry line.

## How to apply

- Treat the interface/shape/algebra as the asset; build shape-first, let code
  follow (Meijer). Protect the conformance contract + golden vectors; per-language
  code is regenerable.
- When modeling streaming/reactive: Rx is the dual algebra (merge-monoid + monad +
  DBSP operators) — model it algebraically, not as ad-hoc callbacks.
- For numeric-carrying primitives (Z-set weights, DBSP, anything numeric):
  parameterize over the generic-math numeric algebra (`INumber`/SRTP); never write
  explicit float/int casts or rely on coercion — the type is a parameter.
- Land the test-framework-hexagonal wish-list item in the registry.

## Cross-references

- `feedback_a_rule_without_a_why_is_dogma...` + the languages-inside-out research
  note (PR #6491) + `bcl-interface-boundary-own-your-interfaces-hexagonal` rule —
  this is their deepest form.
- `numerical-algebra-shaped-into-the-generic-math-interface-per-language-idiom`
  rule — numerics-as-algebra + parameterize-not-coerce mechanism.
- `monad-propagation-pattern-cross-language-substrate-shape` — code-follows-from-
  types at the Result/Kleisli scope.
- DynamicValue PRs #6492/#6494/#6495 — shape-first/code-follows in practice.
- DBSP / differential-dataflow / Meijer-Rx-duality (PRIOR-ART-LIST ⭐ entries).
