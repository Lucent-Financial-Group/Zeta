# Operator composition — snapping LEGO blocks into a pipeline

**Subject:** zeta
**Level:** applied (default) + theoretical (opt-in)
**Audience:** contributors building / reading Zeta
pipelines

**Prerequisites:**

- `subjects/zeta/zset-basics/` (Z-sets are what operators
  consume and produce)
- `subjects/zeta/retraction-intuition/` (operators must
  preserve retraction for IVM to work)

**Next suggested:** `subjects/zeta/semiring-basics/`
(forthcoming — pluggable algebras behind operators)

---

## The anchor — snapping LEGO blocks

A LEGO block has a fixed set of studs on top and a fixed
set of sockets on the bottom. Any block can snap onto any
other block *because the interface is standardised*. You
don't re-engineer the studs each time; you rely on them
being compatible.

A **Zeta operator** is a LEGO block for data pipelines.
Its *studs* are the input Z-sets (and shapes) it accepts;
its *sockets* are the output Z-sets it produces. Because
every operator consumes Z-sets and emits Z-sets, any
operator can snap downstream of any other — provided the
types match.

**Composition is the act of snapping blocks together.**
A pipeline is a stack of blocks; the stack computes the
same thing each time the input changes, because the
algebra guarantees the composition.

---

## Applied track — when / how / why composition matters

### Why it matters

In a retraction-native world, building pipelines *by
composition* (rather than one big hand-written query)
has three practical benefits:

1. **Each block is testable in isolation.** A `filter`
   block can be unit-tested on tiny inputs, without
   spinning up the full pipeline.
2. **Retraction flows through automatically.** If every
   block is retraction-preserving (per the prerequisite
   module), the whole stack is retraction-preserving
   by composition.
3. **Swaps are cheap.** If you need to replace a
   `count` block with a `sum` block, the socket above
   and stud below stay the same; only the middle
   changes.

This is the difference between a LEGO set and a carved
wooden model. Both can look the same; only one is
reconfigurable.

### The core operators — what snaps to what

Zeta ships a small core that covers most pipelines:

| Operator | What it does | Input | Output |
|---|---|---|---|
| `D` (delta) | Extract the change (insertions + retractions) from a Z-set stream | Z-set(t) | ΔZ-set(t) |
| `I` (integral) | Reconstruct state by accumulating changes | ΔZ-set(t) | Z-set(t) |
| `z⁻¹` (delay) | Hold last-tick value; one-step lookback | Z-set(t) | Z-set(t-1) |
| `H` (hierarchy) | Nest one pipeline inside another | ZSet-of-pipelines | Composed pipeline |
| `filter` | Keep only entries satisfying a predicate | Z-set(t) | Z-set(t) |
| `map` | Transform keys via a function | Z-set(t) | Z-set(t) |
| `count` | Sum weights to a scalar | Z-set(t) | ℤ |

Each input-type matches the previous operator's output-
type. Snap them.

### How to use composition in Zeta

A common pattern — "count the running total of apples
sold today, with retractions applied":

```fsharp
// Pipeline composition (conceptually):
input
|> filter (fun k -> k.category = "fruit")
|> filter (fun k -> k.name = "apple")
|> count
|> I  // integrate over time
```

Each `|>` is a LEGO snap. Each step's output Z-set
becomes the next step's input Z-set. No hand-written
glue code; the type-checker enforces the sockets line
up.

**When retraction arrives**, each block forwards the
negative weight through. The `count` stays exact; the
`I` integrates over time correctly; the whole pipeline
"just works."

### Why composition — compared to alternatives

| Alternative | Problem |
|---|---|
| One big hand-written SQL query | Hard to test parts; impossible to swap a subsection; no guarantee about retraction semantics |
| Monolithic procedural code | Same as above, with less declarative reasoning available |
| Lambda architecture (speed + batch layers) | Maintains two separate pipelines that must agree; consistency bugs on their own |
| ETL pipeline frameworks | Composition is present but often retraction-unaware; stateful transforms need explicit re-processing logic |

Composition wins when (a) the operators are algebraically
well-defined, (b) retraction semantics are preserved by
each, and (c) you want pipeline fragments to be
swappable. Zeta is built for exactly this case.

### How to tell if your composition is right

Three self-check questions:

1. **Does each block's output type match the next
   block's input type?** The F# compiler catches this.
   If you hit a type error, the blocks don't snap —
   fix the mismatch; don't bolt on glue.
2. **Is each block retraction-preserving?** Check the
   operator's documentation; if "retract-safe" is
   absent or qualified, your pipeline needs explicit
   care.
3. **Would you be comfortable swapping any one block
   for its replacement?** If yes, the composition is
   honouring LEGO-style modularity. If you'd have to
   rewrite surrounding code, something is coupled
   that shouldn't be.

---

## Prerequisites check (self-assessment gate)

Before the next module, you should be able to answer:

- Why does the `|>` pipeline operator in F# work as a
  composition mechanism for Zeta operators? (Hint: each
  operator's output type is what the next one consumes.)
- Give an example pipeline where `filter` comes *before*
  `count`. Give an example where `map` comes *after*
  `count`. Why do the positions matter?
- What happens downstream when an operator in the middle
  of a pipeline receives a retraction (negative-weight
  entry)? Do the downstream operators need to know they
  received a retraction, or does it "just flow"?

---

## Theoretical track — opt-in (for learners who really care)

*If applied is enough, stop here. The below is for those
going deep.*

### Operators as categorical arrows

In category-theoretic terms, a Zeta operator `Q : ZSet K
→ ZSet L` is an arrow in a category whose objects are
Z-set types. Composition `Q_2 ∘ Q_1` is arrow
composition. The LEGO anchor is literally categorical:
the *studs* and *sockets* are the types, the *blocks* are
the arrows, and *snapping* is composition.

### The DBSP operator signatures

From Budiu et al. VLDB 2023 §2:

- `D : Stream<ZSet K> → Stream<ZSet K>` (pointwise delta)
- `I : Stream<ZSet K> → Stream<ZSet K>` (pointwise
  cumulative integral)
- `z⁻¹ : Stream<ZSet K> → Stream<ZSet K>` (one-step
  delay)
- `lift(f) : Stream<ZSet K> → Stream<ZSet L>` where
  `f : ZSet K → ZSet L` is a function (the point-lift)
- Bilinear operator / join: `⋈ : Stream<ZSet K> ×
  Stream<ZSet L> → Stream<ZSet (K × L)>`

These compose via arrow composition. The DBSP paper
proves several identities that let us *rewrite* a
composition into an equivalent, often cheaper form — the
basis of Zeta's query-plan optimiser.

### Key identities

- **D ∘ I = I ∘ D = id** (integral and delta invert each
  other; the algebra's fundamental theorem)
- **D ∘ (Q_1 ∘ Q_2) = (D ∘ Q_1) ∘ Q_2** if `Q_2` is
  time-invariant (delta distributes through composition
  under mild conditions)
- **I ∘ (Q_1 + Q_2) = (I ∘ Q_1) + (I ∘ Q_2)** (integral
  is linear)

These identities enable incremental maintenance: given a
query `Q = Q_n ∘ ... ∘ Q_1`, its incremental version is
`D ∘ Q ∘ I`, which (by the identities) can be rewritten
into a form whose work-per-tick is proportional to the
change size, not the state size.

### Where composition fails

Not every Zeta operator composes trivially. Specifically:

1. **Non-z-linear operators** (per the retraction-
   intuition module): composing them may break
   retraction-preservation. Zeta flags these; compose
   with explicit care.
2. **Stateful operators with side channels** (e.g., some
   sketches that track auxiliary state): composition is
   sound only if the composition respects the
   operator's state semantics.
3. **Typing across semirings**: the same shape of
   operator may not compose when applied over different
   semirings; see the semiring-basics module
   (forthcoming) for the parameterised picture.

### Hierarchical composition (`H`)

The `H` operator composes pipelines as values — one
pipeline becomes an element of another's input Z-set. This
is how Zeta handles nested aggregations, group-by-of-
group-by, and recursive queries. The theoretical
treatment is in:

- `openspec/specs/circuit-recursion/spec.md`
- `openspec/specs/retraction-safe-recursion/spec.md`

### Theoretical prerequisites (if going deeper)

- Category theory — arrows, composition, functors,
  natural transformations
- Stream algebra — time-indexed values, lift / delay /
  integral / delta as stream operators
- DBSP paper — Budiu et al. VLDB 2023 is the primary
  reference

---

## Composes with

- `subjects/zeta/zset-basics/` — inputs and outputs
- `subjects/zeta/retraction-intuition/` — each block
  must preserve retraction for the composition to
  preserve retraction
- `docs/ALIGNMENT.md` HC-2 — retraction-native
  operations contract
- `docs/TECH-RADAR.md` — DBSP operator algebra Adopt
- `docs/ARCHITECTURE.md` §operator-algebra — full
  architectural treatment
- `src/Core/Circuit.fs` — reference implementation of
  composition
- `src/Core/NestedCircuit.fs` — hierarchical
  composition (H operator)
- `openspec/specs/operator-algebra/spec.md` — formal
  spec of the composable operator substrate
- `openspec/specs/circuit-recursion/spec.md` — recursive
  composition

---

## Module-level discipline audit (bidirectional-alignment)

- **AI → human**: does this module help the AI explain
  operator composition clearly to a new contributor?
  YES — LEGO anchor, operator-table + type-match rule,
  F# pipeline example, alternative-comparison table,
  self-check gate.
- **Human → AI**: does this module help a human
  contributor understand what the AI treats as
  operator composition (semantically + categorically)?
  YES — arrows-in-a-category framing, DBSP identities,
  H operator nested-composition surfaced, where-
  composition-fails called out explicitly.

**Module passes both directions.**

---

## Attribution

Otto (loop-agent PM hat) authored v0. Third Craft module
(after zset-basics + retraction-intuition). Content
accuracy review: future Soraya (formal-verification) for
categorical + stream-algebra passes; Hiroshi (complexity-
theory) for incremental-maintenance analysis; Kira
(harsh-critic) for normal code-accuracy pass.
