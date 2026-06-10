# universal/number — Universal Number Interface

> **Universal Number Interface** — a universal SHAPE applicable to all `/travelers` and all `/persona`.
> The "universal number" (unum = **u**niversal **num**ber, Gustafson): one interface every number type
> answers, so resolution/precision accounting (`Resolution`) and algebra ride any number — IEEE
> `float`/`double`/`Half`, `Int128`/`decimal`, posits, and our **TriBoolean (middle-out) Float**.

Carrier: .NET **generic math** — `System.Numerics.INumberBase<'T>` / `IFloatingPointIeee754<'T>`
(the operator interfaces) — the algebra sibling of [`universal/algebra`](algebra.md) (`ISemiring`).

## What we're making: a BigFloat (not bigint) (Aaron 2026-06-10)

> Aaron: "so what we are making is like **bigfloat instead of bigint**."

.NET ships `System.Numerics.BigInteger` (arbitrary-precision **integer**) but **no BigFloat**. That gap
is what we fill: an **arbitrary-precision FLOAT** — the float analog of `bigint`. `bigint` grows integer
digits without bound; our number grows **resolution/precision** without bound (the "need more bits"
detection), and — the **unum twist `bigint` lacks** — it **tracks its own resolution** (knows when it
needs more bits, and when it's maxed at current precision; the `Resolution` primitive). The built
instance is the **TriBoolean middle-out Float** (self-describing, digital-qubit `measure`).

Prior art (Beacon): **MPFR** (the canonical arbitrary-precision-float C library) · GMP `mpf` · Java
`BigDecimal` · Python `mpmath` / `decimal` · Boost.Multiprecision. We are not inventing arbitrary
precision — we add **self-resolution-tracking** (unum) on a **middle-out self-describing** layout.

## Honest scope — NOT concrete yet (Aaron 2026-06-10)

- **No Zeta type implements `INumberBase` today.** The generic-math interfaces are only *constrained
  on* in `GSet`/`ZSet`/`Bag`; nothing in Core *implements* them. So the universal-number interface is
  conceptual, not yet carried.
- **Deliberate tension, not an oversight.** `src/Core/DynamicValueNumeric.fs` chose **Result-typed,
  decline-don't-coerce** arithmetic (a partial ring made total via `Result`) — which *cannot* be
  `INumberBase` (that demands **total** operators returning the element type). The DynamicValue leaves
  stay Result-typed on purpose.
- **The concrete carrier should be the TriBoolean Float.** It is a real number with total arithmetic
  (`src/Core.{FSharp,CSharp,Rust}.TriBoolean/Float*`, proven 4/4) and carries its own resolution
  (trits + `measure`). Making *it* implement the .NET operator interfaces would make the universal
  number concrete without touching the Result-typed DynamicValue leaves. The `Resolution<'T>` primitive
  (physics-of-floats doc) is generic over this interface.

## Pointers

- [`universal/algebra.md`](algebra.md) (`ISemiring` — the algebra sibling) · [`universal/README.md`](README.md).
- `src/Core.FSharp.TriBoolean/Float.fs` (the built middle-out number — candidate concrete carrier).
- `docs/research/2026-06-10-physics-of-floats-room-boundary-is-a-bit-budget-...` (Resolution / unum / the bit budget).
- Gustafson unum/posit (universal number) · .NET generic math (`INumberBase`/`IFloatingPointIeee754`).
