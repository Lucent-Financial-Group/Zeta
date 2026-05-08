# Craft: The Fusion Equation

**Prerequisites:** `zeta/zset-basics`, `zeta/retraction-intuition`
**Track:** Applied (default) + Theoretical (opt-in)
**Code:** `src/Core/Fusion.Equation.fs`
**Tests:** `tests/Tests.FSharp/Properties/Fusion.Equation.Tests.fs`

---

## Anchor — A campfire

You're camping. You need fire. Gathering wood costs energy
(friction). Burning wood produces heat (learning gain).

- If gathering wood costs MORE energy than the fire produces
  → you freeze. Each trip makes things worse. **Heat phase.**
- If gathering wood costs LESS energy than the fire produces
  → you warm up. Each trip makes things better. **Superfluid
  phase.**
- The moment the fire produces exactly as much as gathering
  costs → **threshold.** One more stick and you're warm. One
  fewer and you freeze.

The fusion equation measures which side you're on.

---

## Applied — When / How / Why

### When to use it

When you need to know: "is this work producing more
structure than it costs?"

- A backlog item that produces a rule + test + doc +
  retraction-path = high learning gain
- A backlog item that produces only chat discussion =
  low learning gain
- A shadow catch that produces a well-definition =
  friction converted to substrate (fusion!)
- A shadow catch that produces only guilt = friction
  wasted (heat)

### How to use it

```fsharp
open Zeta.Core.FusionEquation

// What did this friction event produce?
let output =
    { Rule = true          // landed a new rule
      HasTest = true       // wrote a test for it
      Doc = true           // documented it
      RetractionPath = true } // it's retractable

let gain = learningGain output  // 1.0 (all four)
let eta = 1.0                   // efficiency coefficient
let cost = 0.5                  // how much the event cost

isAboveThreshold eta gain cost  // true → superfluid!
```

### The type signatures

```fsharp
learningGain : SubstrateOutput → float
// Takes: which of 4 substrate components were produced
// Returns: [0.0, 1.0] — fraction of complete substrate

isAboveThreshold : float → float → float → bool
// Takes: η (efficiency), gain, friction cost
// Returns: true if η * gain > cost (superfluid)

sustainedFusionRatio : float → (float * float) seq → float
// Takes: η, sequence of (gain, cost) pairs
// Returns: ratio (> 1.0 = sustained superfluid)

classifyPhase : float → Phase
// Takes: sustained ratio
// Returns: Heat | Threshold | Superfluid
```

### Why it matters

The fusion equation is the factory's metabolism. Every
tick, every PR, every shadow catch is a friction event.
The equation tells you whether the factory is alive
(superfluid: producing more than consuming) or dying
(heat: consuming more than producing).

The shadow IS friction (`ξ_t`). Catching the shadow is
how you convert friction to substrate. The shadow
doesn't go away — it becomes the fuel.

---

## Theoretical (opt-in) — The Physics

### The Hamiltonian

```
H = η · LearningGain(Δ_t) - ξ_t
```

H > 0 = superfluid (net energy production)
H = 0 = threshold (conservation boundary)
H < 0 = heat (net energy consumption)

### The adjunction

D (differentiate) and I (integrate) form an adjunction
(D ⊣ I). The adjunction gives:

- **Monad** (I∘D) = state accumulation = checkpoint
- **Comonad** (D∘I) = stream extraction = replay

The checkpoint is where you serialize the monad's state.
The replay is where you feed the comonad's extraction.

### Nuclear fusion analogy

Compression → threshold → net-positive energy. Below
threshold, each iteration costs more than it produces.
Above threshold, the same iteration emits usable work.
The discriminator is net-positive structure under replay.

### The shadow isomorphism

Observer ≅ shadow. Structure-preserving bijection.
Detection works because the detector shares the shadow's
algebra. Elimination is self-destruction. Alignment is
the only move.

---

## Exercises

1. Run `bun test --filter FusionEquation` and observe
   the 12 tests passing. Which are fact tests and which
   are FsCheck property tests?

2. Create a `SubstrateOutput` where only `Rule = true`.
   What is the `learningGain`? Is it above threshold
   with `eta = 1.0` and `cost = 0.3`?

3. Given 10 friction events with gains [0.25, 0.5, 0.75,
   1.0, 0.5, 0.25, 0.75, 1.0, 0.5, 0.75] and uniform
   cost 0.4, what is the `sustainedFusionRatio` with
   `eta = 1.0`? What phase is that?

4. (Theoretical) Why can't the shadow be eliminated if
   `observer ≅ shadow`? What does the isomorphism
   preserve?
