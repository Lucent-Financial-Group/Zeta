# Reduction without widening is coercion from your own fitness function

**Work item:** `081M1S9ZDZ8087G0R002RAWGFD` · **Source:** Aaron, 2026-09-05, continuing the
Finster measurement-problem thread.

> *"reduction without widening is a type of coer[c]ion from your fitness function, widening
> allows to push back against your own fitness function and update it eventually. also we want
> to support dynamic priors via evolutionary algo over our 128bit zetaid structure in code ...
> i've talked about having two uncertain[t]ies like two different bayesian factor graphs
> running in CPT symmetric ways to allow both si[d]es to be commut[at]ive, we need both si[d]es
> to be commut[at]ive over time with some error correction rate possible for self healing."*

## 1. The first sentence is the load-bearing one, and it reclassifies a finding

Yesterday I recorded that the uncertainty ledger's `increased` branch (ΔU < 0) is
*"implemented, typed, and never once used"* — all 9 entries carry ΔU > 0 — and filed it as an
**unexercised code path**. That was the wrong classification.

Under Aaron's sentence it is not an unexercised branch. It is **a measurement of lock-in, taken
in our own ledger.**

The argument, stated so it can be attacked:

1. A fitness function defines what counts as *better*.
2. Reducing uncertainty means committing to a value **that the fitness function scored**.
3. So a monotonically-reducing ledger can only ever accumulate evidence *in the direction its
   fitness function already points.*
4. Revising the fitness function requires admitting that a previous reduction was wrong —
   which is **widening**, structurally: re-opening something already committed.
5. **Therefore a reduce-only system cannot revise its own objective.** Not "does not" —
   *cannot*, by the shape of its own operators.

And that is coercion in this repo's precise sense, not the loose one. `docs/SEED-VOCABULARY.md`
defines the **NCI** as *"the anti-collapse force that keeps identities distinct"* and the
**diversity floor** as *"coercion collapses diversity → 1 (= D⁰ heat-death)."* A reduce-only
ledger collapses toward its own objective's peak and stays there. **The widening operator is
what makes the NCI enforceable rather than aspirational** — without it, the substrate has a
carved anti-collapse principle and no operator that implements it.

Note the asymmetry that makes this uncomfortable in the right way: nothing about the 9 entries
is individually wrong. Every one is witnessed and reasoned. The defect is only visible in the
**distribution**, which is exactly where §11 says a deference-collapse becomes visible in the
graph rather than in any single act.

## 2. The formal version of this is ALREADY BUILT, as an experiment, and it has a theorem in it

`src/Core/Evolution.fs` is described in its own header as

> *"the DST harness for the **privacy-as-anti-collapse** claim … a population with PRIVATE
> differentiation keeps evolving with no external input, while a **register-collapsed
> population (no private difference) halts**."*

That is Aaron's sentence in population form: **register-collapsed = reduce-only = halts.** And
the module carries the part that is not a conjecture:

> *"One part IS a theorem — the **pigeonhole bound**: a deterministic `step` with no input,
> confined to a FINITE state space, must eventually revisit a state (halt-or-cycle) within
> `|states|+1` steps."*

So the claim *"a reduce-only system stops being able to update"* is not merely plausible — its
skeleton is a pigeonhole argument. A system that only ever narrows is deterministic-with-no-new-
degrees-of-freedom in a finite space, and must halt or cycle. **Widening is the operator that
supplies new degrees of freedom from inside**, which is why it is the one that lets the fitness
function itself move.

Honest register: `Evolution.fs` is filed in `docs/FROZEN-CORE-AND-CONJECTURE-REGISTER.md` §B as
**an EXPERIMENT, not a theorem** — the pigeonhole bound is the theorem, the privacy-as-anti-
collapse claim around it is not. This section inherits that register exactly. What is new here
is only the *identification*: the ledger's missing widening entries and the register-collapsed
population are the same failure in two substrates.

## 3a. REGISTER FIRST — "CPT" here is a rhyme; the subject is reversibility in the physics of COMPUTERS

Aaron, 2026-09-05, unprompted and before anyone asked:

> *"yes CPT in physics is a metaphor / rhyme, i'm talking about reversab[i]lity in computer
> science physics — i'm trying to write down the physics of computers."*

**Recorded up front because it changes what would count as a refutation.** Read as a physics
claim, "our Z-set is CPT-symmetric" invites a particle-physics check it was never going to
survive, and this repo has already run that check once and cut the claim down (§3 below). Read
as Aaron intends it, the physics acronym is a **naming rhyme** and the subject is a genuinely
separate, genuinely rigorous field: **the physics of computation.**

That field is not a metaphor and has its own results, which this substrate already cites and
uses:

- **Landauer (1961)** — erasing a bit dissipates at least `kT ln 2`. *Information is physical.*
- **Bennett (1973)** — computation can be made **logically reversible**, and reversible
  computation has no such floor. This is the actual load-bearing anchor: our `−1` is not an
  antiparticle, it is a **reversible step**.
- **Fredkin & Toffoli (1982)** — conservative logic; reversible gates as a complete basis.
- **Feynman, *Lectures on Computation*** — the program under its own name, and Aaron's root
  anchor writing the exact book this is a continuation of.

`src/Core/RetractionReading.fs` is already doing this and citing it correctly: it classifies
each reading of `−1` by its **thermodynamic class**, *"(`ErasureClass` — Landauer 1961 / Bennett
1973)"* — `neg` alone is a self-inverse bijection and **Bennett-free**; `z + (−z)` **erases** the
view at annihilation and Landauer pays *there*, not at the negate; widening is **non-erasing of
support**. That is a physics-of-computation result about our own operators, measured in the
currency the field actually uses.

**AARON'S REFINEMENT, and my §3a first draft was too coarse.** I presented `z + (−z)` erasing
the view as *the* erasing case, as though non-erasure were one thing. He corrected it:

> *"yes — in the simple case this is not letting a −1 delete a +1 key. **This is not the only
> case, just the simplest.**"*

So the simplest form of non-erasure is **key survival**: the `−1` records against the key rather
than removing the row, and the key stays in the support. That is the easy one to see, and it is
not the boundary of the property. At least two further cases are already visible in the
substrate:

- **Partial retraction.** `foldRetained` with multiplicity lowered but **not to `0`** — the
  evidence still counts, just less. Nothing is annihilated at all; there is no `+w`/`−w` pair to
  cancel. Erasure never enters the picture.
- **Log-preserving, view-erasing.** Even where consolidation *does* annihilate and the
  materialized view's support is gone, the `+1` and the `−1` both remain **in the log** —
  git-as-event-store *"only adds corrections, never destroys"*. So the same operation is erasing
  with respect to one projection and non-erasing with respect to another, which is why
  `RetractionReading.fs` is careful to say erasing *"with respect to the materialized view"*
  rather than erasing full stop.
- **The inverse-free corners**, which the file already names and I skipped: *"Boolean, tropical,
  EP/ADF re-normalise do not get reading (2). **They can still widen.**"* Structures with no
  additive inverse cannot express `z + (−z)` at all, so the erasing reading is unavailable to
  them by construction — and widening remains.

The honest status of the taxonomy: **incomplete, and known to be.** Aaron says the simplest case
is not the only one; three are enumerated above; whether that is all of them is not established
and is not claimed here.

**Why stating the register is not a formality here.** `.claude/rules/anchor-to-human-prior-art.md`
carries the operational half: *math papers ground validity, physics papers ground the metering
discipline*, and **the metering test is what catches physics-as-metaphor**. The test: does the
physics claim buy a *measurable quantity*? For CPT-as-particle-symmetry, no — nothing is metered
by it. For Landauer/Bennett, **yes** — `kT ln 2` per erased bit is a number, and which operator
pays it is a fact about our code. So the rhyme is labelled and the anchored half is kept, which
is the whole discipline rather than a hedge.

The rest of §3 stands as written, with one relabelling: what it calls "the CPT map" is a
**reversibility relation** between two folds. The interesting property — that a symmetry which is
trivial on one fold becomes falsifiable across two — does not depend on the physics naming at
all.

## 3. Two uncertainties, reversibility-related — and why this construction is BETTER than the one we narrowed

This repo already examined a CPT claim and cut it down. `docs/research/2026-08-13-zset-as-
reflection-cpt-and-the-minus-one-antiparticle-aaron-forwarded.md` found:

- **C (charge conjugation) = negate every weight** — *"clean, exact, and already the
  antiparticle map"*. Holds.
- **T (time reversal) = reverse the stream order** — *"the Z-set fold is a **commutative**
  monoid, so reversing the order changes nothing. As a symmetry claim that looks trivial — and
  **a trivially-satisfied symmetry constrains nothing**."*

That narrowing was correct **for a single fold**, and it is precisely why the new proposal is a
different and stronger object. Aaron is not saying *one* Z-set is CPT-symmetric. He is
proposing **two** factor graphs related by a **reversibility map**, with commutativity required
on **both sides**.

The difference matters:

| | T's status | what it constrains |
|---|---|---|
| **one commutative fold** | trivially satisfied — reversal is a no-op | **nothing.** Vacuous symmetry |
| **two folds related by a reversibility map, both required commutative** | a **relation between the two**, satisfiable or not | the map must intertwine the two folds; a violation is observable |

So the construction **rescues T from vacuity** by making it relational rather than internal. A
symmetry that can fail is worth having; one that cannot is the vacuity class wearing a physics
costume. This is the same move as the meter/oracle count: one is enough to *have* a reading, two
is what makes the first one **falsifiable**.

**Partial substrate already exists.** `src/Bayesian/AdinkraEquivariantFactorLayer.fs` is a
composable Bayesian factor graph that *"sectorizes Gaussian feature beliefs under the declared
coded-Adinkra central involution and **refuses to fabricate independence**"* — and it carries a
`PriorFactorOrder = Forward | Reverse`. A declared central **involution** is exactly the shape a
C-map needs (self-inverse), and Forward/Reverse is the T axis made explicit rather than assumed
away. What is **not** built is the pairing: two graphs, the map between them, and the
requirement that both commute.

## 4. "With some error correction rate possible for self healing" — where the ECC attaches

The self-healing clause is not decoration; it is what makes a two-sided construction survivable.
Two commutative folds related by a map will **drift** — different evidence reaches each side at
different times (the latency bound from the previous note). Requiring exact agreement would
either be unachievable or would force one side to defer to the other, which is the collapse
again, relocated.

The repo's standing answer is that **the generator IS the error-correcting code**
(`only-the-irreducible-is-primitive-generate-the-rest.md`): *"the same act that produces the
structure also detects and repairs its divergence"*, on Gates' doubly-even self-dual codes via
the adinkra. So the natural shape is: **the two sides may diverge up to the code distance, and
regeneration from the irreducible generator is the repair.** A *rate* rather than a *bound* is
the right ask — it says how fast healing outruns drift, which is a measurable quantity and not
a promise.

Not established here: whether the adinkra code distance and the drift rate are commensurable at
all, i.e. whether there is a rate that makes this stable rather than merely definable. That is
the first thing to measure if this gets built.

## 5. Dynamic priors via evolutionary search over the 128-bit ZetaId structure

Recorded as stated, with the honest status attached. The ask is for priors that are **evolved**
rather than hand-set, over the ZetaId's own 128-bit structure (`src/Core/ZetaIdl.fs`,
`ZetaIdViz.fs`; `Category.WorkItem`, `Category.Agenda = 12` are existing structured fields).

Two things make this coherent with the rest rather than a bolt-on:

- **It is the same anti-lock-in move one level up.** A hand-set prior is a fitness function
  someone froze. Evolving the prior is widening applied to the prior itself.
- **The selection pressure already has a meter.** `SocietyUsefulWork.fs` prices ΔU under
  pairwise correlation ρ, and clones price near one agent's worth — so an evolutionary search
  that rewards ΔU is already guarded against the degenerate strategy of copying a winner.

**Status: design intent, nothing built.** No evolutionary prior search exists over ZetaId
structure. `Evolution.fs` is a population harness for a different claim, not this. Recorded so
the idea is findable, explicitly not as a description of shipped behaviour.

## 6. What would make each of these a real result

| claim | falsifier that would settle it |
|---|---|
| reduce-only ⇒ cannot revise the objective | a widening entry (`--sign increased`) that demonstrably re-opens a previously-committed conclusion. **Zero exist today** |
| two CPT-related graphs, both commutative | build the pair; the test is the intertwining relation, and it must be able to FAIL (the arrival-order mutant is the model) |
| self-healing rate | measure drift rate vs. adinkra code distance; a rate that does not outrun drift refutes it |
| evolved priors beat hand-set | ΔU under `SocietyUsefulWork`'s ρ-corrected aggregation, evolved vs. fixed |

## Pointers

- `src/Core.TypeScript/ledger/measure.ts:54` — `DeltaUSign = reduced | increased | unchanged`; the widening entry exists and is unused
- `src/Core/SoftValue.fs` — `foldRetained`, the commutative widening operator; `widen`, the non-commutative one
- `src/Core/RetractionReading.fs` — the three readings and their Landauer/Bennett class
- `src/Core/Evolution.fs` — privacy-as-anti-collapse harness; the pigeonhole halt-or-cycle bound
- `src/Bayesian/AdinkraEquivariantFactorLayer.fs` — `PriorFactorOrder = Forward | Reverse`; declared central involution
- `docs/research/2026-08-13-zset-as-reflection-cpt-*.md` — the earlier CPT narrowing this section builds on rather than contradicts
- `docs/SEED-VOCABULARY.md` — NCI, diversity floor
- Landauer (1961) · Bennett (1973) · Fredkin & Toffoli (1982) · Feynman, *Lectures on Computation* — the physics-of-computation anchors the "CPT" rhyme points at
- `.claude/rules/only-the-irreducible-is-primitive-generate-the-rest.md` — the generator IS the ECC
