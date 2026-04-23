# Z-sets — the tally counter with a minus sign

**Subject:** zeta
**Level:** applied (default) + theoretical (opt-in)
**Audience:** new contributors / library consumers /
anyone evaluating Zeta
**Prerequisites:** none — this is an entry module
**Next suggested:** `subjects/zeta/retraction-intuition/`
(forthcoming)

---

## The anchor — a market-stall tally counter

Imagine you're running a small market stall. You have a
mechanical tally counter — a little device that clicks a
number up when you push the button:

```
[click] 1
[click] 2
[click] 3
```

Every apple you sell, you click the counter once. At the
end of the day, the counter tells you how many you sold.

**But a customer returns an apple.** Now what?

Most counters can't click *down*. You'd have to remember
to subtract. That's error-prone — if you forget even once,
your count is wrong forever.

A **Z-set** is a tally counter that *can click down*. Every
item can have a positive count (we have this many) or a
negative count (we owe this many / customer returned
this many).

That's the whole idea. **A Z-set is a tally counter with
a minus sign.**

---

## Applied track — when / how / why to use Z-sets

### When to reach for a Z-set

Use a Z-set when you have:

- **Lots of items** where you need exact counts
- **Changes that can go both ways** (insertions *and*
  returns / retractions)
- **A need to combine counts from multiple places** without
  double-counting or losing returns

Examples from the real world:

| Situation | Why Z-set fits |
|---|---|
| Tracking inventory with returns | Clicks up on restock, down on return; running total always correct |
| Tracking dashboard metrics that can be revised | Click down on a bad record, click up on the corrected record |
| Combining results from two data pipelines | Just add the counters; positives and negatives cancel correctly |
| Incremental view maintenance (IVM) | Insert = click up; delete = click down; the view stays up to date without recomputing from scratch |

### How to use Z-sets in Zeta

In Zeta, a Z-set is the data structure your operators
read from and write to. Two common operations:

**Insert** — "one more of this item":

```fsharp
// F# (reference)
let zs = ZSet.ofSeq [ "apple", 1; "banana", 2 ]
// zs now has: apple=1, banana=2
```

**Retract** — "one less of this item":

```fsharp
let zs2 = ZSet.ofSeq [ "apple", -1 ]
// zs2 now has: apple=-1   (the negative is the "clicking down")
```

When you **add** two Z-sets together, the counts combine:

```fsharp
ZSet.add zs zs2
// result: apple=0, banana=2
// The apple's +1 and -1 cancelled cleanly — no more apples.
```

Items with count zero are effectively gone. No ceremony,
no "delete this row" — just arithmetic.

### Why Z-sets (instead of something else)

| Alternative | Problem |
|---|---|
| Plain list of items | No counts; have to track repetition manually |
| Plain dictionary `key → count` | Can't represent "we owe N" cleanly; deletion is ad-hoc |
| SQL table with rows | Deletion is a different operation; retractions not first-class |
| Probabilistic counter | Can't retract; counts drift over time |

Z-sets win when retraction has to be exact and first-
class. They're the right tool for anything that reads as
"we can take it back."

---

## Prerequisites check (self-assessment gate)

Before the next module, you should be able to answer:

- What does it mean for an item to have a **negative**
  Z-set count?
- When two Z-sets are added, what happens to an item that
  has `+3` in one and `-3` in the other?
- Name one situation where a plain tally counter (no minus
  sign) would fail and a Z-set would succeed.

If those are clear, proceed to
`subjects/zeta/retraction-intuition/` when it lands.

---

## Theoretical track — opt-in (for learners who really care)

*If applied is enough for you, stop reading here. The
below is for those going deep.*

### The algebra

A Z-set over a key type `K` is formally a function
`K → ℤ` (key to signed integer) with finite support —
only finitely many keys map to non-zero values.

Let `ZSet K = { f : K → ℤ | |{k : f(k) ≠ 0}| is finite }`.

Two operations:

- **Addition** is pointwise: `(f + g)(k) = f(k) + g(k)`.
- **Scalar negation** is pointwise: `(-f)(k) = -f(k)`.

These turn `ZSet K` into an **abelian group**:

- Associative: `(f + g) + h = f + (g + h)`
- Commutative: `f + g = g + f`
- Identity: the zero function (`0(k) = 0 ∀k`)
- Inverse: `f + (-f) = 0`

### The signed-integer-semiring connection

Z-sets specifically use the **signed integer ring
(ℤ, +, ×, 0, 1)** as their coefficient semiring. Other
semirings produce other multiset-like structures:

- **Counting semiring (ℕ, +, ×, 0, 1)**: multiset with
  non-negative counts (no retraction)
- **Boolean semiring (𝔹, ∨, ∧, ⊥, ⊤)**: plain set
  (presence only)
- **Tropical semiring (ℝ∪{+∞}, min, +, +∞, 0)**: shortest-
  path tabulation
- **Provenance semiring** (Green-Karvounarakis-Tannen
  2007): tracks WHICH input tuples contributed

Zeta's retraction-native property comes specifically from
**ℤ being a ring, not just a semiring** — the additive
inverse property is what "retraction" structurally means.

See the research memory on semiring-parameterised Zeta
(Green-Karvounarakis-Tannen PODS 2007 lineage) for the
full algebra.

### The runtime shape

In Zeta's F# reference implementation (`src/Core/ZSet.fs`):

- `ZSet<'K> = Dictionary<'K, int>` conceptually
- `ofSeq : seq<'K * int> → ZSet<'K>` (plain-tuple,
  sample-friendly per `memory/CURRENT-aaron.md` §6)
- `ofPairs : seq<struct ('K * int)> → ZSet<'K>` (struct-
  tuple, zero-alloc, production)
- `add : ZSet<'K> → ZSet<'K> → ZSet<'K>` (pointwise sum)
- `neg : ZSet<'K> → ZSet<'K>` (pointwise negation)
- Storage: columnar via Apache Arrow for IPC /
  persistence

### Proof sketch — why retraction-native IVM works

For a monotone query `Q` over Z-sets:

```
Q(A + B) = Q(A) + Q(B) + Δ(A, B)
```

where `Δ(A, B)` is a "cross-term" capturing how the
shared keys interact. For linear queries (`count`, `sum`),
`Δ` is zero; `Q` distributes over `+`. This is why
retraction flows through query pipelines losslessly.

Full treatment in the DBSP paper (Budiu et al. VLDB 2023)
+ `docs/ARCHITECTURE.md` §operator-algebra.

### Theoretical prerequisites (if you're going deeper)

- Abstract algebra — abelian groups, rings, semirings
- Category theory basics — pointwise-function semantics
- Incremental computation — fixpoints, semi-naïve
  evaluation

These become their own theoretical-track Craft modules
if demand surfaces. Backwards-chain from this one.

---

## Composes with

- `memory/CURRENT-aaron.md` §5 — F# as reference
  implementation
- `memory/CURRENT-aaron.md` §6 — sample style: plain-
  tuple `ZSet.ofSeq` for readability
- `docs/ALIGNMENT.md` HC-2 — retraction-native
  operations as alignment clause
- `docs/TECH-RADAR.md` — "DBSP operator algebra (D, I,
  z⁻¹, H)" is Adopt; Z-sets are the substrate those
  operators read/write
- `src/Core/ZSet.fs` — reference implementation
- Per-user memory
  `project_semiring_parameterized_zeta_regime_change_one_algebra_to_map_others_2026_04_22.md`
  — the regime-level "one algebra, pluggable semirings"
  framing

## Attribution

Otto (loop-agent PM hat) authored the v0 applied +
theoretical treatment. Content accuracy review: future
Kira / Hiroshi / Soraya passes on theoretical-track
algebra.

## Module-level discipline audit (bidirectional-alignment)

Per the yin/yang alignment discipline, every Craft module
audits both directions:

- **AI → human**: does this module help the AI explain
  Z-sets clearly to a new maintainer / adopter? YES —
  plain-English anchor + incremental examples + opt-in
  depth.
- **Human → AI**: does this module help a human maintainer
  understand what the AI treats as a Z-set (semantically +
  algebraically)? YES — Zeta's F# types + runtime shape +
  the signed-ring distinction are made explicit.

**Module passes both directions** — composes with the
mutual-alignment contract.
