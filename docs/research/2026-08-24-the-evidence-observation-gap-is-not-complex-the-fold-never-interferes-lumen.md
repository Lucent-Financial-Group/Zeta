# The evidence/observation gap is not where ℂ comes from — the shared fold never interferes

**Measured at `origin/main` `36c2ff5594a466c105799297e6b1fd65be1be8e4`.** The falsifier ran; the numbers are below with a control that
proves the probe can detect the thing it looked for.

**Register:** the interference measurement is **metered** (probe E/F, 800 000 weights, control at
50 000/50 000). The ℂ-emergence conjecture is **REFUTED in its stated form** for the shared belief
fold. What survives is **toy** and is stated as such in §4. Aaron flagged this as *"I think"*, and it
stays in that register.

> Aaron, 2026-08-24: *"I think this is where imaginary numbers come from — this difference between
> evidence and observation."*
> And: *"the reward is we set up a macroscale experiment that preserves quantum behaviours at
> macroscale, because of our careful metering of external effects — our Haskell I/O monad to the
> extreme, with metering."*

## 0. The answer in five lines

| question | answer |
|---|---|
| Does the shared belief fold exhibit **destructive interference**? | **No. 0 cancellations in 800 000 weights.** `observe` is pointwise multiplication of **non-negative** `int64` — there is no path-sum in which anything could cancel |
| Can the probe detect interference at all? | **Yes — 50 000/50 000** in the control lane, where two opposite-phase paths give strictly less support than one |
| So is ℂ doing real work in the fold? | **No.** ℂ is decoration there. Aaron's conjecture fails for the fold |
| Is there ℂ in the repo? | **Yes, and it is genuine** — `AmplitudeEmu.fs` / `ZSetISA.qs`. But ℂ was **put in by construction**, not derived from the evidence/observation split |
| Does the metering argument buy quantum behaviour? | **The weak version only** (§5), and the weak version is about *mathematical structure*, not physics |

---

## 1. The falsifier, and why it is the right one

Classical probability cannot cancel: adding a path never *reduces* total support. Amplitude addition
can. So "does the fold interfere?" discriminates ℂ-structure from ℝ-structure in one measurement, and
it beats any amount of narrative about phase.

`src/Core/BeliefConvergence.fs:33` is the whole combination rule:

```fsharp
let observe (likelihood: int64[]) (belief: int64[]) : int64[] =
    Array.map2 (*) likelihood belief
```

Non-negative `int64` weights, combined **multiplicatively, pointwise**. Two structural facts follow
before any probe runs, and the probe confirms both:

1. **There is no path sum.** Interference is a property of *adding* contributions that reach the same
   outcome by different routes. `observe` never adds anything. A candidate's weight is a product of
   likelihoods along one route.
2. **The weights live in a non-negative cone.** Even where the repo *does* sum weights on a shared key
   (`WSet.consolidate`), cancellation needs the ring to have signs. Over ℝ≥0 there are none.

```
E1 belief fold: cancellations to zero from nonzero inputs = 0 / 800000 weights
E1 belief fold: negative weights produced                 = 0
E2 belief fold: trials where support GREW after observing = 0 (interference would allow it)
F  amplitude lane (WSet/C): trials where TWO paths gave LESS support than ONE = 50000 / 50000

VERDICT: belief fold interference   = NONE (classical, non-negative multiplicative)
VERDICT: amplitude lane interference = PRESENT (by construction — the ring is C)
```

**Row F is the control and it is what makes row E1 mean something.** A probe that finds no
interference is worthless unless it can find interference; this one finds it every single time in the
lane that has it. So the zero is a measurement, not a blind spot.

---

## 2. The four algebra bullets — which I could settle and which I could not

### 2.1 Do magnitudes multiply and phases add? **Settled: there is no phase to add.**

In the fold, a belief weight is a single non-negative number. There is no second component, so there
is nothing that could play `arg`. The thing this repo calls **phase** — phase-canonical order, the
logical clock — is a **total order**, and total orders do not add mod 2π. Two events at logical
positions 3 and 5 do not compose to one at position 8; they compose to *an ordering*.

> **The pun is a pun.** QM's phase is an **angle in U(1)**; our phase is a **position in a total
> order**. U(1) is compact and abelian with a group law; a total order is not a group at all. They
> share four letters.

### 2.2 Is there a genuine conjugation? **Settled: no — and `ZSet` retraction is a different thing.**

This was the sharpest of the four, and the answer is clean:

> **Conjugation fixes the observable part and negates the unobservable part. Negation negates both.**
> `ZSet` retraction is `w ↦ −w` (`WSet.negate`, "the ring's additive inverse applied pointwise"). It
> is the **additive inverse**, not an involution that fixes anything.

The decisive check is a one-liner: **on ℝ, complex conjugation is the identity map.** If retraction
were the conjugation of this story, then restricted to the observable part it would have to *do
nothing* — and instead it flips the sign, which is precisely the operation that makes a Z-set
retraction retract. So retraction is not "the real part of this story"; it is a different structure
that happens to also be an involution. **Many things are involutions. Being one identifies nothing.**

### 2.3 Is the observable a norm? **Settled: not in the fold; genuinely, in the amplitude lane.**

In the belief fold the reported quantity is `w_i / Σw` — a **ratio**, a normalisation of a
non-negative vector. It is not `|z|` of anything, because there is no `z`.

The repo *does* have a real Born rule, and it is exactly where you would expect: `WSet.bornProb`
computes `|w|²/Σ|w|²`, and its docstring calls it "THE BOUNDARY MEASUREMENT (ℂ ring)". So the norm
structure exists — **in the lane that already declared its ring to be ℂ.** That is not evidence that
ℂ emerged from anything; it is evidence that someone wrote ℂ down.

### 2.4 What else has this shape? **Settled, and this is what excludes ℂ.**

"A part you see and a part you don't" is an extremely weak signature. Named competitors, and the
invariant that excludes each:

| candidate | has a seen/unseen split? | why it is not our structure — or not ℂ |
|---|---|---|
| **Signed measures** (Jordan `μ = μ⁺ − μ⁻`) | yes — observe `\|μ\|`, sign hidden | the hidden part is **ℤ/2** (a sign), not U(1). Signs do not *add* as angles; there is no continuum of phases. This is the closest match to what our fold actually has |
| **ℝ² / ordered pairs** | yes | **no multiplication at all**, so "magnitudes multiply" is not even expressible |
| **Split-complex** `ℝ[j]/(j²=1)` | yes | norm `x²−y²` is **indefinite** and has **zero divisors**. An observable probability cannot be negative, so this is excluded by the observable's own type |
| **Dual numbers** `ℝ[ε]/(ε²=0)` | yes | norm `a²` is **degenerate** — nonzero elements of zero norm. `\|·\|` fails the norm axioms |
| **ℂ** | yes | positive-definite norm, `\|ab\|=\|a\|\|b\|`, `arg(ab)=arg a + arg b`, conjugation fixing exactly the observable part |

**The invariant that does the excluding is a theorem, not a preference:** by **Frobenius (1878)** /
**Hurwitz (1898)**, ℂ is the *unique* two-dimensional real normed division algebra. So to earn ℂ you
must exhibit a **positive-definite multiplicative norm** and a **continuous phase that adds under
composition**. Our fold has neither: its hidden part is a discrete order, and its observable is a
ratio rather than a norm.

Note what the table also says, and it is the fair reading of Aaron's intuition: **the fold's actual
shape is closest to a signed measure** — which is exactly what a `ZSet` is (`docs`'
measure-theory blueprint calls this out: Hahn/Jordan decomposition, multiplicity, retractions). The
seen/unseen intuition is real. It lands on **ℤ/2**, one rung below ℂ.

---

## 3. What this says about the algebra ladder (the reason the question was asked)

The hoped-for payoff was that ℝ → ℂ would stop being an arbitrary first step and become the formal
shadow of the evidence/observation split. **It does not, and the ladder is unaffected.**

The measured transfer table in the sibling document
(`2026-08-24-wset-carries-the-bnn-and-the-factor-graph-*`) already gives the ladder a
non-arbitrary reading, and it is a better one because it is derived from what operations *consume*:

> **ℂ is the rung at which a total order is lost.** That is not a metaphor about observation — it is
> the measured first failure in the ladder (probe B: "total compatible order: ℝ yes; ℂ and above
> no"). Viterbi, max-product, and every threshold test die exactly there.

So the first doubling already has a precise operational meaning in this repo: **it is the price of
giving up order.** That meaning is measured, it excludes things, and it does not need the
evidence/observation story to justify it.

---

## 4. What survives — stated as `toy`, because it is

One thing in the intuition is genuinely right and worth keeping, labelled honestly:

> **`toy`:** the *shape* "a quantity that is load-bearing in the computation and absent from any
> single observation" does occur in our fold. It is the **phase-canonical order**: no node observes
> it (each node has only its own local receive-order — its proper time), yet it determines the shared
> result. `.claude/rules/local-time-never-enters-the-shared-fold.md` is precisely a rule about a
> hidden, relational, non-local quantity that must not leak into the observation.

**That is a real structural analogy, and it is where the analogy stops.** The hidden quantity is a
*total order*, so what it would formalise is ℤ or a torsor over it, not ℂ. Recording it as a
coincidence with its register attached, per `numerology-vs-number-theory`: *coincidence — the
evidence/observation split resembles the observable/unobservable split in QM*. Not a belief. If a
continuous, composition-additive hidden parameter with a positive-definite norm ever shows up in the
fold, this entry gets promoted and the thing that promoted it gets named.

---

## 5. The metering argument — the weak version is real, the strong version is not bought

Aaron's second sentence deserves the same precision, because there are two claims here and only one
is defensible. Naming them in the requested words:

- **The WEAK version — defensible, and checkable.** *The mathematical structure of QM (complex
  amplitudes, interference, unitary evolution) applies to any system with linear evolution, metered
  boundaries, and observables-as-norms.* This is a real claim, it is ordinary mathematics, and this
  repo partially satisfies it **by construction** in one lane: `AmplitudeEmu.fs` has complex
  amplitudes, `ZSetISA.qs` has unitary operators (`EMIT = Ry(θ)`, `RETRACT = Adjoint Emit`,
  `BRANCH = H`, `JOIN = CNOT`), and `WSet.bornProb` has observables-as-norms. Manifesto §13
  noninterference — *"entropy/influence flows ONLY through declared, metered channels"* — is a
  genuine statement of the isolation condition, and reading it as a decoherence-avoidance condition
  rather than as engineering hygiene is a fair and interesting reframe.
- **The STRONG version — NOT bought, and must not be implied.** *That physical quantum effects
  occur.* Metering boundaries in software does not produce physical coherence. There is no physical
  system here whose environment coupling is being suppressed; there is a program whose effects are
  typed. **"Quantum behaviour preserved at macroscale" is the sentence a reader will over-read**, and
  it should not be written without the weak/strong split attached.

**And the measured result narrows even the weak version.** The weak claim requires
*observables-as-norms* and *linear evolution with signed superposition*. The **shared belief fold has
neither** (§1–§2): non-negative multiplicative weights, ratio observables, no interference in 800 000
trials. So whatever quantum-shaped structure this repo has lives in the amplitude lane where it was
deliberately built — **it is not a property the metering discipline confers on the fold.** Metering
is a necessary condition for the analogy, and this measurement shows it is nowhere near sufficient.

**One caveat carried forward as required:** `1/(3√2) ≈ 0.2357` is a **design parameter, not a
Tsirelson bound**. Tsirelson's bound is `S ≤ 2√2 ≈ 2.828` on the CHSH correlator
(`src/Core/Tsirelson.fs`). The former is the image of `S = 2√2` under a freely chosen linear map
`ρ = S/12`, adopted for homoiconicity. Enforced by `lint-tsirelson-constant-caveat.ts`.

## 6. Anchors (Beacon)

- **Frobenius (1878)**; **Hurwitz (1898)** — ℝ, ℂ, ℍ, 𝕆 are the only normed division algebras; ℂ is
  the unique 2-dimensional one. This is the theorem doing the excluding in §2.4.
- **Jordan / Hahn decomposition** (measure theory) — `μ = μ⁺ − μ⁻`, the seen/unseen split that our
  fold actually has, with a **ℤ/2** hidden part.
- **Tsirelson (1980)** — `S ≤ 2√2`, the correlator bound §5 keeps distinct from the design constant.
- **Zurek (1991, 2003)** — decoherence as uncontrolled environment coupling; the physics §5's strong
  version would need and does not have.
- **Goguen & Meseguer (1982)** — noninterference; manifesto §13's actual anchor.
- **Peyton Jones & Wadler (1993)** — imperative functional programming / the `IO` monad; the exact
  reference for "all effects declared at the type level".

**Provenance:** math-shape correspondences only. Math grounds validity; physics grounds the metering,
by analogy. Nothing here is evidence that physics proves our system.

## 7. Reproduce

```bash
bun src/Core.TypeScript/research/belief-fold-destructive-interference-falsifier.ts
```

Row F is the control: it must report 50 000/50 000 or row E1's zero means nothing.

## 8. Pointers

- `src/Core/BeliefConvergence.fs` — `observe`, the fold that was measured.
- `src/Core/AmplitudeEmu.fs` · `src/Core.QSharp.ReferenceOracle/ZSetISA.qs` · `src/Core/WSet.fs`
  (`bornProb`) — the lane where ℂ genuinely lives, by construction.
- `docs/research/2026-07-04-braided-monoid-amplitude-emulation-more-than-bayesian-aaron-corrects-the-bell-peel.md`
  — read first; the shadow's earlier over-peel and its retraction, plus the Tsirelson caveat.
- `docs/cross-verify/2026-06-19-zset-isa-vs-amplitude-emu-cross-check.md` — the operator-by-operator verification.
- `.claude/rules/local-time-never-enters-the-shared-fold.md` — the hidden-quantity rule §4 keeps as a `toy` analogy.
- `src/Core.TypeScript/hygiene/lint-tsirelson-constant-caveat.ts` — the enforcer of §5's caveat.
- Sibling: `docs/research/2026-08-24-wset-carries-the-bnn-and-the-factor-graph-*.md` §4 — where ℝ→ℂ *does* get a measured meaning.
