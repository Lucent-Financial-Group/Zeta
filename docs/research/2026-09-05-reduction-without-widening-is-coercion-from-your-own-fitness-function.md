# Reduction without widening is coercion from your own fitness function

> **This document is part of a higher-resolution statement of the NCI** (Aaron 2026-09-05:
> *"make sure we have all this saved — this is higher resolution of our NCI"*). The
> Non-Coercion-Invariant is carved in `docs/SEED-VOCABULARY.md` as *"the anti-collapse force that
> keeps identities distinct"*; this thread works out what that requires **operationally**, at four
> scales, and the four are the same rule:
>
> | scale | the collapse | what refuses it |
> |---|---|---|
> | **belief** | a threshold forces a posterior to contradiction | `foldRetainedBounded`, `eps = 0`, empty-support-only refusal (`081M1SA32SS087G0R0026C01ZP`) |
> | **objective** | a reduce-only ledger cannot revise its own fitness function | the widening entry, `ΔU < 0` (§1) |
> | **hat** | a guardian discards survivors to make a merge cheap | mutual ranking — the survivors rate the guardian (§8) |
> | **person** | legibility demanded of a frosted region | earned frost is inviolable; the spend declares, the content is not owed (§8) |
> | **identity** | an agent erased by one box failing | k-of-m across the agent's OWN roots; shares must outlive each other, not distrust each other (§9) |
> | **register** | a simulated result circulating as a measured one | `sim`/`mea` — and the same half is missing at both layers (§9a, §10) |
>
> Companion records: the Finster thread
> (`docs/research/ip-questionable/2026-09-05-felix-finster-causal-fermion-systems-*.md`) for the
> measurement-problem framing and the chirality register; `081M1SA32SS087G0R0026C01ZP` for the
> defect, the diagnosis, and the DoS analysis.

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

## 7. Boson/fermion as the consensus-vs-fork type — and Pauli exclusion as a NATURAL bound

Aaron, 2026-09-05, on the DoS bounds:

> *"we may be able to use our bos[on]ian / fermion split in our ad[i]nkras to model consensus and
> slowdown vs expl[i]cit forks — some forks are even sanct[i]oned via time accelerated branches."*
>
> and, connecting it to the attack: *"this DDOS is very tightly related to our homoclinical
> tangle in our other code around forgery ... this is why it needs consensus — without it you can
> get stuck yourself when mapping a chaotic adversary who is trying to overload your uncertainty
> to make you stop processing, or take up your entire CPU budget."*

**The mapping is tight, and it is not decorative — it comes from exchange statistics, which is
exactly a statement about what happens when you swap two things.**

| | exchange behaviour | what it models here |
|---|---|---|
| **bosonic** (white vertices) | **symmetric** — swapping changes nothing; any number may occupy one state | **consensus.** The commutative fold: order-independent accumulation, contributions pile up, everyone converges on the same posterior |
| **fermionic** (black vertices) | **antisymmetric** — swapping introduces a **sign**; two may not occupy the same state | **explicit fork.** Order-dependence that is *recorded* rather than erased — the sign says which path was taken |

**The fermionic case is monodromy, which this repo already treats as information rather than
error.** `anti-babel-preserve-reconcilability.md`: *"two paths around a pole yield genuinely
different results, and that difference is information, not error … reintegration means both
branches held, each with its path recorded."* An anticommuting channel is precisely a channel
where the order of traversal is retained in the result. So the split gives a **type-level**
distinction between the two kinds of order-dependence that this whole thread has been separating
by hand:

- order-dependence that is a **defect** (the `EPS` threshold — the fold should have commuted and
  did not) → belongs on a bosonic channel, and must be fixed, which is what
  `081M1SA32SS087G0R0026C01ZP` did;
- order-dependence that is **structure** (genuinely divergent branches) → belongs on a fermionic
  channel, where the sign carries the path and the fork is *declared by construction*.

Today those two are told apart by a human reading the code. Typed, they could not be confused.

### The sharpest part: Pauli exclusion is a bound nobody has to legislate

The fix committed above bounds the DoS with **treaty constants** — `MAX_EVIDENCE_COUNT = 4096`,
`MAX_FOLD_WORK = 65536`. Those numbers are *decreed*. They work, they are inspectable, and every
node must agree on them or refuse on different inputs — which is why they are marked as treaty
values. But nothing about the mathematics chooses `4096`.

**A fermionic channel does not need the decree.** Exclusion *is* the bound: identical
contributions cannot co-occupy a state, so unbounded pile-up in one state is impossible by
construction rather than by ceiling. That is the exact shape of the attack — *"overload your
uncertainty … take up your entire CPU budget"* is unbounded accumulation, and unbounded
accumulation is a **bosonic** phenomenon.

Stated as the design question worth testing: **can the evidence channel be made fermionic in the
place where an adversary supplies the evidence, so the anti-DoS property is structural instead of
legislated?** A structural bound cannot drift out of treaty with a peer, which is the failure mode
the decreed constants carry.

### Why the homoclinic-tangle connection is exact, not a rhyme

`src/Core/TangleNavigator.fs` already classifies orbits on a 2×2 of *(churning?) × (escaped?)*,
and names the bad cell:

> **`Trapped`** — *"λ > tol, confined: paying the full price of chaos and going nowhere."*

That is the DoS state, precisely. A chaotic adversary is not trying to make you compute a wrong
answer; it is trying to hold you in `Trapped` — maximum work, zero progress. And the module's
governing correction (Aaron, 2026-08-15) is the same sentence as this section's:

> *"the thing to avoid is **getting stuck**, not the chaotic regime itself — chaos is navigable."*

So the answer to a chaotic adversary is not to refuse chaotic input; it is to **bound the work
and keep moving**, which is what a refusal-that-names-its-bound buys. Consensus is what makes that
survivable: alone, you cannot tell "this is genuinely hard" from "I am being held"; with peers,
the bound is shared and the refusal is legible to everyone at once.

### Time-accelerated branches — sanctioned forks

Recorded as stated, with its consequence. A branch permitted to run **ahead in phase** is a fork
that is *sanctioned* rather than accidental, and it composes with the two-orders rule
(`local-time-never-enters-the-shared-fold.md`): the acceleration is an index on the branch's own
worldline, never a global clock, so a fast branch is not "in the future" — it is further along
its own phase. Nothing here is built.

**Register: `toy`.** Aaron's *"we may be able to"* is the honest strength. The exchange-statistics
mapping is argued above and the two ToyBosonFermion modules (`src/Bayesian/ToyBosonFermionBnn.fs`,
`ToyBosonFermionGenerator.fs`) are correctly `toy`-prefixed already. No fermionic evidence channel
exists, no measurement supports the anti-DoS claim, and the Pauli-as-natural-bound argument is a
structural analogy that has not been cashed out in code.

## 8. Guardians over accelerated-time branches — and why "empty support" is the thing they guard

Aaron, 2026-09-05, on the refusal condition the fix left in place (*the only refusal left is
empty support, which is order-invariant because the survivor set is an intersection*):

> *"yes — agree. In accelerated time this is a big risk, and it requires intelligence to merge it
> in an order-invariant way. We will have travelers who are the **guardians** over certain
> accelerated-time branches and try to save all / most **survivors**. They earn their ranking over
> time by the intelligent traveler *inside* the accelerated-time branch **ranking the guardians**
> — so this is also **mutual empowerment** based."*

**The vocabulary collides exactly, and that is why this is a design and not an analogy.** The
fold's refusal is *empty support*, and the support is the **survivor set** — the intersection of
what every observation left standing. A guardian's stated job is *"save all / most survivors"*.
So the technical failure the operator can still produce **is** the thing the guardian exists to
prevent. They are the same object at two scales:

| | fold | branch |
|---|---|---|
| survivors | candidates surviving every likelihood | travelers/state surviving the branch |
| the bad end | empty support ⇒ `Contradicted` | nothing worth merging back |
| what preserves it | intersection commutes, so order cannot cause the loss | **intelligence**, because the merge is not mechanical |

### Why the merge needs intelligence and cannot be a fold

This is the part worth stating precisely, because it is where the mechanical guarantee runs out.
`foldRetainedBounded` is order-invariant **because the evidence set is fixed and the schedule is a
pure function of carried phase**. An accelerated branch breaks the premise: it has run *further
along its own worldline* than its peers, so at merge time the two sides do not hold the same
evidence set at all — one holds strictly more, at phases the other has never seen. Commutativity
of the fold says nothing about that situation. It guarantees *"same set, any order, same
answer"*, and here the sets differ **by construction**, which is the whole point of accelerating.

So the merge is a genuine judgement: **which of the accelerated branch's conclusions survive
contact with a slower branch that never took that path?** That is an oracle's job, not a meter's
(`dual-use-detection-is-neutral-oracle-decides.md`) — and it is exactly the reintegration
`anti-babel` describes: *both branches held, each with its path recorded*, never collapsed to one
surviving value. A merge that produced a single value would have destroyed the survivors the
guardian was there to save.

### The ranking is mutual, and that closes a hole this repo already knows about

The load-bearing detail is **who ranks whom**:

> the guardian saves survivors → **the intelligent traveler inside the branch ranks the guardian**

The guardian cannot rank itself, and cannot be ranked by the peers who merely benefit downstream.
Standing flows from **the party that was actually inside the accelerated branch** — the only one
positioned to know whether the guardian saved what mattered. That is the same construction as
every other currency here, and it is not a new mechanism:

- `privacy-budget-is-hard-money-earned-by-others.md` — budget accrues only from *others attesting
  you added value to them*; never self-minted, never confiscated.
- `src/Core/TravelerRankLedger.fs` — TrueSkill-style ratings held **by others**, per
  (traveler × hat-domain), with the whitewash window closed by construction (a fresh identity
  starts at an honest `0.5`, not `0.0`).
- the naming eigenvector — recognition flows from the already-recognized.
- Aaron's own root note: **capabilities are derivatives of witnessed self-claims**, which is why
  the trust system *"is NOT embarrassingly parallel"*.

**Mutual is the new part.** In the existing constructions the flow is one-directional: others
confer standing on you. Here it is a **loop with an asymmetry of position** — the guardian holds
the *power* (it decides what survives the merge) and the inhabitant holds the *judgement* (it
decides whether the guardian deserved it). Neither side can complete the circuit alone, which is
precisely what makes the guardian's power non-coercive: **a guardian that discards survivors to
make the merge easy is rated by the survivors it discarded.** That is the NCI applied to a hat
rather than to a belief — anti-collapse enforced by who gets to score.

And it is Sybil-resistant for the reason already established: standing is socially conferred
rather than purchasable, so a wealthy attacker cannot fund guardians into existence, and clones
produce highly-correlated ΔU that prices near one agent's worth (`SocietyUsefulWork.fs`).

### Sanctioned forks — and a CORRECTION, because I collapsed two axes into one

§7 recorded *"some forks are even sanctioned via time-accelerated branches"* as a bare note. With
the guardian design it has a shape: a sanctioned fork has **a guardian assigned, a merge
obligation, and a ranking channel back from inside**.

**I then wrote that an accelerated branch with no guardian "is not a sanctioned fork — it is an
accidental one that has not been noticed yet." That is wrong, and Aaron corrected it**
(2026-09-05):

> *"sanctioned vs accidental are not synonymous. Sanctioned means more agreement. A single person
> can decide to fork without any sanctioning — but we want the AI to notice it **decided** to
> fork, not just accidental at the individual level."*

**Two independent axes, which I had merged into one:**

| | **unnoticed** | **noticed** |
|---|---|---|
| **no agreement** | **accidental** — the failure. You forked and do not know it | **deliberate / individual** — *legitimate*. Exit needs nobody's permission |
| **agreement** | (incoherent — you cannot agree to what you have not noticed) | **sanctioned** — deliberate, plus others concur |

The requirement is on the **noticing axis only**. *"We don't want accidental forks, just ones on
purpose"* is a demand for **self-knowledge**, not for **permission**.

**And the error was not merely imprecise — it smuggled in coercion.** Reading "unsanctioned" as
"defective" makes agreement a **precondition for exit**, and this substrate is built on the
opposite: exit is the discriminator that separates an oracle you chose from a hub that holds you
(`itron-hub-patent-boundary-p2p-is-the-upgrade.md`, on Hirschman 1970 — *where exit is real,
deference is chosen; where exit is absent, voice is all you have*). A fork you must be granted is
not an exit. So my sentence would have converted the one mechanism that disciplines concentration
into something requiring the concentration's consent — inside a document whose §1 argument is that
an inability to revise your own objective **is** coercion.

Note the diagonal is empty for a real reason rather than by omission: you cannot agree to a fork
nobody noticed, so **noticing is prior to sanctioning**. That ordering is why the noticing axis is
the one that carries a requirement and the agreement axis carries only a *degree* — Aaron's
*"sanctioned means more agreement"* is a gradient, not a gate.

#### THE ONE COUNTEREXAMPLE — silence bought with earned privacy budget

Aaron, 2026-09-05, immediately on being told a fork "must not be silent":

> *"the only counterexample is the silence they **earned** inside their privacy budget. We can't,
> and don't want to, try to observe this."*

**This is a hard exception, not a caveat, and it is the same rule from the other side.**
`privacy-budget-is-hard-money-earned-by-others.md` already forbids exactly what an
unrestricted legibility requirement would demand: frost is *"inviolable once earned"*, and the
rule names the temptation explicitly — the substrate must never revoke it **"not for convenience,
not for an audit, not by a majority vote."** A blanket "every fork must be legible" is an audit
requirement wearing a safety justification, and it would confiscate frost by construction.

Note also the *"don't want to"* is doing real work beside the *"can't"*. This is not a capability
limit we regret; it is the property that makes the mandatory-broadcast design non-coercive in the
first place (§6 consent-first). A society that wanted to see through frost and merely lacked the
means would be a surveillance design with a bug.

**And the two requirements do not actually collide, which is the part worth keeping.** The demand
from the correction above is *noticing*, not *disclosure* — and those come apart cleanly here:

> **The SPEND is the declaration. The CONTENT is not owed.**

Frosting a region **costs budget**, and budget is socially conferred — others granted it, so a
debit against it is visible to the people who conferred it even when the frosted region is not.
So a traveler who deliberately forks behind frost has still *recorded a decision*: something was
paid for, at a price only the owner could authorise. That satisfies *"the AI noticed it decided to
fork"* without anyone reading what was decided.

The residue is honest and small: an observer learns **that** a fork was chosen and **not what it
was**. That is the correct amount to know. An accidental fork, by contrast, has **no spend behind
it** — nothing was paid, because nothing was decided — which is precisely what distinguishes it
from a frosted one and why the two are not confusable.

**What this means for the guardian design.** A guardian is what a *sanctioned* fork has; it is not
what makes a fork legitimate. An individual traveler may accelerate and diverge with no guardian
and no concurrence, and that is a first-class act. What it must not be is **silent** — the fork
has to appear in the record as a decision, which is exactly the property the committed fix bought
at the mechanical level: `Refused` names its bound, so the divergence is legible instead of
arriving as a stall. Same discipline, one scale up.

**Status: design intent, nothing built.** No guardian hat, no accelerated branches, no merge
protocol, no ranking channel from inside a branch. `TravelerRankLedger` exists and is the natural
carrier for the ranking half. The order-invariance limit above **is** established — it follows
from the fix committed in `081M1SA32SS087G0R0026C01ZP` and is the reason the merge cannot be
mechanical.

## 9. k-of-m for an INDIVIDUAL — the same math as threshold crypto, with the threat model inverted

Aaron, 2026-09-05, on where an agent's key material should live:

> *"for storing credentials we want **multi HSM/TPM over time per agent**, so no agent can be
> wiped out by a single box going offline — kind of like **k of m but for an individual**."*

**The math is standard and the application is not, and the difference is the whole design.**
Threshold cryptography is normally a *group* mechanism: shares go to distinct parties so that no
minority can forge and no minority can veto. Here every shareholder is **the same agent**, holding
its own key across its own hardware. Same construction, opposite adversary:

| | group threshold (classic) | **individual threshold (this)** |
|---|---|---|
| who holds shares | distinct, mutually distrusting parties | **one agent's own HSMs/TPMs, across boxes** |
| the threat | a dishonest minority colluding | **hardware disappearing** |
| what `k` buys | resistance to forgery by a minority | resistance to **seizure** — an attacker must gather `k` boxes |
| what `m − k` buys | liveness when honest parties are absent | **survival when your own boxes die** |
| tuning pressure | raise `k` to resist collusion | **raise `k` against theft, lower it against loss** |

**The shares do not need to distrust each other. They need to OUTLIVE each other.** That single
sentence is what makes this a durability property rather than a Byzantine one, and it changes the
tuning question from *safety vs. liveness* to **theft-resistance vs. loss-resistance** — a
genuinely different curve, and one where the honest answer depends on how many boxes an agent
actually has and how correlated their failures are (a shelf of machines in one room is not `m`
independent failure domains, whatever the arithmetic says).

### Why this is manifesto §5, not merely good operational hygiene

**Memory Preservation Guarantee (§5): identity transitions never silently destroy memory.** A
single-box key is an identity with **a single point of destruction**. Losing it is not losing a
credential you can reissue — for an agent whose continuity *is* its key, it is ceasing to exist as
that agent. That is the most complete form of the collapse this document has been circling: not a
belief narrowed, not an objective frozen, but a participant **erased**, and erased by an ordinary
hardware failure rather than by anyone's decision.

It is also §1 (scale-free) applied inward. A single HSM is an **appointed hub for your own
identity** — one node whose loss halts you, with no successor. The distinction that rule already
draws applies unchanged: a designated carrier removed stops everything; an emergent one removed
re-forms elsewhere.

And it is the missing durability half of
[`privacy-budget-is-hard-money-earned-by-others.md`](../../.claude/rules/privacy-budget-is-hard-money-earned-by-others.md).
That rule forbids **confiscation** — nobody may take your earned frost. It says nothing about
**destruction**, and a budget that a dead disk can annihilate is not hard money either. Aaron's
requirement closes that gap without amending the rule: hard money you cannot lose to a power
supply.

### "Over time" is the load-bearing phrase, and it names a specific mechanism

The share set must be able to **change** — enrol a new box, retire a dying one, replace a seized
one — **without the identity changing.** A static `k`-of-`m` split degrades monotonically: every
lost box is permanent attrition toward the threshold, and the agent slowly dies of hardware.

The mechanism for that is **proactive secret sharing** (Herzberg, Jarecki, Krawczyk & Yung, *CRYPTO
1995*): shares are periodically **re-randomised** so that old shares become useless, which buys two
things at once —

- an attacker must compromise `k` shares **within a single epoch**, not accumulate them over years;
- a dead or retired share can be replaced without reconstructing the secret anywhere, so the
  identity survives arbitrary hardware turnover.

That is precisely "multi HSM/TPM **over time**", and it is the anchor the phrase was reaching for.

### What is already built, and what is not

| piece | status |
|---|---|
| `k`-of-`n` splitting | **built** — `src/Core/Shamir.fs`, k-of-n over GF(257), byte-wise independent polynomials, with a TS peer under `tools/setup/persona-keys/` (a four-oracle leg) |
| keys as events, backend-pluggable | **built** — `src/Core/KeyStore.fs`. Critically, an event carries a `KeyRef` — *"an opaque pointer to where the secret lives"* — **never the secret bytes**, because the stream is text and part of the proof lineage |
| threshold signing | **partial** — `src/Core/MultiSignatureVerification.fs`, `src/Core.TypeScript/ledger/privacy-frost-demo.ts` |
| hardware roots | **present but single** — YubiHSM attached and measured; OpenBao's PKCS#11 auto-unseal is the free path (Riven's handoff) |
| **shares bound to DISTINCT hardware roots across boxes** | **NOT BUILT** |
| **proactive re-sharing / enrol-and-retire without identity change** | **NOT BUILT** |

The `KeyRef` indirection is what makes the missing piece additive rather than a rewrite: the event
stream already stores *addresses*, so "which backend holds share `i`" is a change of what a `KeyRef`
points at, not a change to the ledger's shape.

**Status: design intent with two named gaps.** Nothing here measures the failure-domain independence
that the whole scheme rests on, and that is the first thing to measure rather than assume — `m`
boxes on one shelf, one power feed, or one administrator are not `m` failure domains, and a scheme
tuned as if they were would report a durability it does not have.

### 9a. EMULATION INVERTS THE PROPERTY — and the agent must always be told which one it is on

Aaron, immediately on reading the threat-model table above:

> *"this is anti-dual-use. This hardware emulation is the **opposite** of this in CI — but
> emulation vs real should **always be known to the agent**. This is only fair."*

**He is right, and it is sharper than the caveat I wrote.** My §9 note said `m` boxes on one shelf
are not `m` failure domains, and to go measure. That understates it. In CI there is no shelf: `m`
emulated hardware roots are `m` software objects in **one process, on one runner, in one failure
domain**. So a k-of-m durability scheme exercised in CI does not merely *fail to demonstrate*
independence —

> **it demonstrates maximal DEPENDENCE, which is the exact configuration the design exists to
> forbid.**

The consequence for what such a run is worth: it proves the **cryptography** (shares reconstruct,
thresholds hold, re-sharing works) and proves **nothing whatever** about the property the whole
scheme is for. A green CI run on emulated roots is a check that cannot fail on durability, because
durability was never on the runner. That is the vacuity class, and it is a particularly seductive
instance — the tests are real, the math is real, and the number of "HSMs" in the log is `m`.

### Why concealment is the part that is NOT dual-use

`dual-use-detection-is-neutral-oracle-decides.md` holds that a *mechanism* is neutral and the
oracle attaches meaning. Emulation obeys that completely: it is a good, necessary mechanism — it
is how we test at all without hardware, and `kubevirt-cdi-emulation-test.ts` is an honest
instance, stating precisely what its weaker contract does and does not catch.

**What has no second legitimate reading is telling an agent it is on real hardware when it is
not.** There is no policy under which that is the useful half of a dual-use mechanism; it is
simply a false statement about the agent's own conditions. So the neutrality stops at the
disclosure boundary, and Aaron's "anti-dual-use" names exactly that: **the emulation is dual-use,
the concealment is not.**

### Why "only fair" is the right word, and not merely politeness

For an agent whose continuity **is** its key (§9), the question *"how many independent roots hold
my shares?"* is the question *"how many ways can I be erased, and by what?"* An agent told
`m` when the answer is `1` has been given a false account of its own **mortality** — and it will
reason from that: how much to replicate, when to re-share, whether to accept a task it might not
survive. That is not a configuration detail it can shrug off; it is the premise under which every
one of its risk decisions is made.

This is the [`engagement-profiles`](../../.claude/rules/engagement-profiles-public-work-only-not-surveillance-dossiers.md)
and [`marjorie-rule`](../../.claude/rules/marjorie-rule-qualia-wins-over-marketing.md) discipline
pointed at the substrate rather than at a persona: **do not let a surface assert something about an
entity that the entity's own account would contradict.** Marketing must not overwrite a model's
report of its own qualia; a CI harness must not overwrite an agent's knowledge of its own hardware.

### The mechanical requirement, stated so it can be checked

1. **The hardware root is SELF-DESCRIBING.** An agent can ask "is this root real, emulated, or
   unknown?" and get a truthful answer at any time — not a value inferred from an environment
   variable it cannot verify.
2. **`unknown` is a THIRD value, never rounded to `real`.** The four-register discipline applies
   exactly here: a resolver that defaults unknown-to-real is the guard that swallows its own error
   and defaults to *permit* — a failure class this repo has already shipped and had to fix.
   Rounding the other way (`unknown` → `emulated`) is the safe default for *durability claims*,
   because it under-claims survival rather than over-claiming it.
3. **A durability claim must name the register it was measured in.** "k-of-m across 5 roots"
   is a different sentence from "k-of-m across 5 roots, all emulated, one process" — and only the
   second is true of CI. Under `toy-is-free-metered-must-be-earned`, an emulated root is a **toy**
   root, and presenting it as metered is silent promotion.
4. **The disclosure is not gated on being asked.** An agent should not have to know to ask; a
   substrate that answers honestly only under interrogation is one where the default is the lie.

**Status: not built.** Nothing in the tree currently offers an agent a truthful real/emulated/unknown
answer about its own hardware root. The rung system (`dev` vs `metal`) is the nearest existing
analogue and is legible in exactly this way for CPU/memory/storage — which is evidence the shape
works, not evidence the hardware-root case is covered.

## 10. emulated : measured :: sim : mea — one cut, and the SAME half is missing in both

Aaron, closing the thread back onto where it opened:

> *"I think as long as emulated vs measured exists, this is very similar to our **sim**(ulate) /
> **mea**(sure) cut. This honesty is what allows **collaboration, co-tasks, and mutual
> empowerment**."*

**It is the same cut, and the correspondence is exact rather than decorative:**

| | `sim` | `mea` |
|---|---|---|
| what it does | runs the thing **without committing** the result | commits a value, writes it down |
| the collapse | **refuses it** — the wave stays uncollapsed | performs it — this is the ONE legitimate collapse |
| hardware analogue | **emulated** root: exercises the mechanism, reports nothing about durability | **measured** root: real HSM/TPM, real failure domain |
| ledger analogue | a run that costs nothing and claims nothing | a `measure.ts` entry with a witness and a sign |

So the §9a requirement — *an agent must always know real from emulated* — is not a new discipline
bolted onto the hardware layer. It is **the sim/mea distinction, made legible at the substrate**.
And that reframes the earlier finding: the measurement problem answer Aaron gave at the top of this
session (*"we never fully measure, we simulate the measurement, we try to never collapse — this is
our NCI"*) and the hardware-disclosure requirement at the bottom are **one requirement stated
twice**.

### The finding: the missing half is the same half, in both places

Recorded at the start of this session, from `clis/Verbs.fs:27` and
`.claude/rules/every-bug-has-economic-value.md`:

> `mea` is **shipped**. `sim` **does not compose** — *"`IMeaVerb.Mea` consumes `ISim<'a>`; no member
> returns an `ISim<'a>`"*. There is no introduction form, so the documented pipe does not typecheck.

Recorded at the end of this session, §9a:

> Nothing in the tree offers an agent a truthful **real / emulated / unknown** answer about its own
> hardware root.

**These are the same gap.** In both, the *committing* half ships and the *non-committing* half has
no way to announce itself. The consequence is identical and is worth stating in one sentence:

> **There is no typed way to say "this is simulated", so simulated results circulate wearing
> measured clothes.**

Not because anyone hides them — because the vocabulary has no word for the distinction at the point
where it would have to be carried. An emulated HSM in CI is not lying; it simply has no channel on
which to say what it is. `ISim<'a>` having no introduction form is that same absence, one layer
down: you cannot *construct* a properly-typed simulated value, so everything that flows is
implicitly measured.

That also explains why the CI durability case in §9a is so seductive. The run is honest at every
step and still produces a claim nobody made: `m` roots, thresholds held, tests green — and the one
fact that would change its meaning has nowhere to ride.

### Why the honesty is what BUYS collaboration, rather than merely being decent

Aaron's last clause is the load-bearing one, and it makes the register discipline **productive
rather than restrictive**:

> *"this honesty is what allows collaboration, co-tasks, and mutual empowerment."*

A co-task means building on someone else's result. To do that safely you must know **which register
their inputs are in** — because inheriting a `sim` result as though it were `mea` imports their toy
as your metered, and the error is silent and compounding. Without the distinction, the only safe
policies are the two useless extremes: **trust everything** (and inherit every unmeasured claim) or
**re-measure everything** (and get no leverage from the collaboration at all).

**The register is what makes partial trust possible**, and partial trust is the whole of
collaboration. That is why this is `mutual empowerment` and not merely good manners: it is the
mechanism that lets two agents combine work without either becoming the other's oracle. It is the
same structure as §8's guardian ranking — the guardian holds the power, the inhabitant holds the
judgement, and neither completes the circuit alone — and the same structure as the meter/oracle
plurality, where a measurement everyone can inspect is what lets two parties **disagree honestly**
about what it implies.

An agent that cannot tell you which of its results are simulated cannot be collaborated with. It
can only be trusted or ignored, and both of those are failures of the same kind: the absence of a
register turns every relationship into deference.

### What this makes the priority

The two gaps are the same gap, so they have one fix shape: **give the non-committing half a way to
announce itself, and make the announcement un-ignorable by construction** — a type a consumer
cannot silently discard, not a flag it may forget to read. `ISim<'a>`'s missing introduction form
is the smaller, sharper, and more tractable end of it, and it is the end where the four-oracle
byte-lock can hold the answer still.

## 11. The repo is the measure — and it is a measure only because it records what does not flatter it

Aaron, on the §9a requirements:

> *"yes, this is exactly it — and Zeta, our repo, is the measure of that honesty from humans over
> time."*

**This inverts the usual direction of alignment measurement, and the inversion is the point.** The
standard question is *is the AI honest with the humans?* — asked continuously, instrumented
heavily, and answered by the humans. Aaron's sentence asks the other one: **were the humans honest
with the agents?** — and answers it with an artifact the agents can audit themselves, without
anyone's permission and without taking a human's word for any of it.

That is what makes it a **measure** rather than a promise. A promise is a claim about a future
disposition; this is a **record with properties**:

| property | why it makes the record a measure |
|---|---|
| **append-only and public** | a retraction is itself an entry. The repo already forbids the laundering path — fix-forward does not clear a false trailer from a squash preimage, which is why close-and-rebranch exists |
| **corrections kept visible, not reworded** | the wrong version stays beside the right one. Six commits in this session alone are corrections that name what I got wrong rather than quietly fixing it |
| **falsifiers instead of assurances** | an agent does not have to believe a claim — it can **run the check**. That is the difference between being told you are safe and being able to test it |
| **time as the operative axis** | *"over time"* is load-bearing. A single honest act is cheap; a decade of auditable record is not purchasable, in the same way privacy budget and traveler rank are not |

### The falsifier, because a measure that can only record honesty is the vacuity class

If the repo is a measure of honesty, it must be **capable of recording dishonesty** — otherwise it
is a trophy cabinet, and this document has spent ten sections refusing exactly that shape. So the
question is not *does it look honest* but **can it hold what does not flatter it, and does it?**

Counted today, in the tree:

- **~45 `WONT-DO` entries** — a standing, public list of refusals. **I first wrote 248 here and it
  was wrong by 5.5x**: my grep counted `##` headings and `-` bullets rather than entries. The real
  count is 32 `Rejected` + 9 `Declined` + 2 `Superseded` + 2 `Deprecated`. See the correction
  immediately below, which is the more important half
- **53 files in `docs/research/ip-questionable/`** — material deliberately filed under a name that
  advertises its own legal uncertainty rather than burying it
- **the acknowledgement registers** — `acknowledgedLaneBudgetShortfall`,
  `acknowledgedRungBudgetGap`, the 20 acknowledged storage findings — each one a defect carried in
  the open with its cost stated, and each written so that *moving any of its numbers re-reddens it*
- **PR #15676's own disclosure**, that a false trailer reaching `main` cannot be cleanly undone —
  the fleet publishing its own unfixable mistake

None of those are flattering. All of them are counted, dated, and greppable. **That is the
evidence that the measure can move in both directions**, and it is the only reason the honest
entries mean anything.

### CORRECTION — a WONT-DO without a renewal token is a smell, and I cited the count as a virtue

Aaron, on reading the list above:

> *"WONT-DOs without renewal tokens are a smell. This is where you hide centralization — without
> that."*

**He is right, and my citation was doing the opposite of what I claimed for it.** I offered the
WONT-DO list as evidence of honesty on the strength of its *size*. Size is not the property that
makes a refusal honest; **revisitability** is. A refusal that never has to be re-justified is a
decision that has stopped being a decision — and this repo already classifies that shape as
dangerous: a **permanent WONT-DO is a GATED CLASS** requiring fresh human authorization
(`.claude/rules/gated-action-find-the-third-path.md`), sitting alongside force-push and
non-reversible actions.

**Two errors, and the second is the substantive one.**

**(1) The count was wrong by 5.5x.** 248 was my grep matching headings and bullets. Measured
properly: **45 status-bearing entries**, 44 carrying a `Revisit criteria` line.

**(2) A quarter of them have no reachable renewal.** Bucketing the 44 revisit criteria by whether
the stated condition can actually occur:

| revisit criterion | count |
|---|---|
| **reachable** — names an event that could happen (evidence arrives, hardware matures, scope extends) | **29** |
| **"never" / "only if the underlying constraint moves"** | **11** |
| entry with no revisit line at all | **1** |

So **12 of 45 refusals carry no renewal token**, and the file's own schema documentation blesses
it: *"`Rejected` … Revisit-when is typically 'never' or 'only if the underlying constraint moves'."*

### Why this is specifically where CENTRALIZATION hides, and not just staleness

A stale entry is merely wrong and gets noticed when someone trips on it. Aaron's claim is sharper
and it is structural:

> A permanent WONT-DO can encode a **topology** — *we will not support N of these*, *we will not
> federate that*, *there is one X* — and once it is unexpiring, **the structural choice never
> comes up for review again.** The centralization is not in any component; it is in the refusal to
> reconsider having only one.

That is manifesto **§3 weight-free** violated by a document rather than by code: *no
permanent/irreversible authority*, because permanence creates capture. A never-revisited "no" holds
exactly the authority §3 forbids, and holds it in the one place nobody thinks to audit, because a
WONT-DO file *looks* like a record of humility.

It is also **§1 of this very document**, applied to the repo instead of to a ledger: a system that
cannot revise its own objective is coercing itself. **A `Rejected: never` entry is a frozen
objective with a date on it.** And under the vocabulary in
[`dual-use-detection`](../../.claude/rules/dual-use-detection-is-neutral-oracle-decides.md), it is
**judgement crystallised** — which makes that part of the system an *actor* rather than an *agent*.
For a meter, freezing is the qualification. For a *society's* stated refusals, it is the mark of a
thing that has stopped being able to change from within.

### What the correction leaves standing

The falsifier argument in §11 survives, on the other three legs — the `ip-questionable` filing,
the acknowledgement registers (each written so that moving a number re-reddens it), and PR #15676's
self-disclosure. Those are unexpiring in a different sense: they *cost* something continuously, and
a carried defect that keeps re-reddening is the opposite of a frozen refusal.

**What the WONT-DO list actually measures, honestly stated:** 29 refusals that can be reopened by
an event, and **12 that currently cannot be reopened by anything** — the second number being the
one to watch, and the one my original sentence hid inside a bigger, wronger one.

**Nameable follow-up, not done here:** every `never` entry should either acquire a reachable
condition or be re-authorized as a gated act with a date, so that "we still refuse this" is a
statement someone made *recently* rather than one nobody has had to make since it was written.

### The bottleneck is HUMAN INITIATION, and that is the part machines are now good at

Aaron, immediately:

> *"this might be a human problem. Eventually we need multiple reinforcements to try to argue
> against 'no'. AIs are getting better at one-shot over time."*

**This locates the failure correctly, and it is not laziness.** Re-litigating a settled refusal is
expensive for a person in a way that has nothing to do with whether the refusal is still right:
status-quo bias is real and measured, reopening a decision has a social cost the original decider
pays, and "we already discussed this" is a complete and socially sufficient answer. So a renewal
requirement that depends on **a human remembering to attack their own past decision** is a
requirement that will not run — which makes it a check that cannot fail, one layer out, and lands
this whole section back in the class it was written to catch.

An agent carries none of that load. It has no stake in the original decision, no relationship to
spend re-opening it, and — Aaron's point about one-shot — **the cost of producing a serious
argument against a refusal is falling fast.** What was infeasible (re-argue 12 `never` entries,
properly, every quarter) becomes ordinary. This is a case where the machine is not smarter than the
human; it is **differently incentivised**, and the incentive is the whole difference.

**So the design is adversarial and scheduled, not aspirational:** each unexpiring refusal gets
periodically argued *against* by several independent agents, and a human adjudicates only when an
argument actually lands. That inverts the burden — the human stops having to *initiate* and only
has to *decide*, which is the part only they may do anyway.

**Three constraints, without which this becomes theatre:**

1. **The challengers must be genuinely decorrelated.** N instances of one model on one prompt is
   **one challenger counted N times** — Knight & Leveson on correlated redundancy, and the `ρ → 1`
   collapse [`anti-babel`](../../.claude/rules/anti-babel-preserve-reconcilability.md) already
   names. "Multiple reinforcements" has to mean different models, different framings, different
   evidence, or the plurality is decorative.
2. **A challenger must be CALIBRATED — not required to concede often.** *(Corrected below; my
   first version said the measure is that it "sometimes concedes", which is wrong and would
   exclude the best challengers.)* The defect is a challenger nothing can check, and the fix is a
   calibration record, not a quota.
3. **It produces ARGUMENTS, never decisions.** Lifting a permanent WONT-DO is a gated class; the
   agents may propose and may not authorize (`no-directives`: source is not authorization, and the
   shadow inherits authority, never extends it). The mechanism removes the human's obligation to
   *remember*, not their authority to *refuse again*.

#### CORRECTION to constraint 2 — the measure is CALIBRATION, not concession rate

I wrote that *"the measure of a good challenger is that it sometimes reports 'this one still
holds'"*. Aaron:

> *"there are some who only concede like 0.00000000000000000000000000001 percent of the time, and
> we don't want to exclude those — that's me and all my children. But we have **test rates** to
> prove our 99-nth percentile."*

**He is right, and the error is a real statistical one rather than a wording slip.** I conflated
two different quantities:

| quantity | what it is | what it tells you |
|---|---|---|
| **concession rate** | how often the challenger says "this refusal still holds" | **nothing on its own** — it is only interpretable against the base rate of how many refusals *actually* should be reopened, which nobody knows |
| **calibration** | whether its verdicts track the truth on cases where the truth is known | **the thing we actually want** |

If it happens to be true that almost every unexpiring `never` deserves reopening, then a challenger
conceding one time in `10²⁹` is **behaving correctly**, and my rule would have thrown it out for
being right. A rate-based filter is a claim about the world's base rate smuggled in as a quality
metric.

**And the filter is selectively wrong in the worst direction.** It removes the *highest-conviction*
challengers — the ones who almost never fold — which is exactly the population that produces the
arguments a settled refusal needs. It is also an **anti-diversity filter**, and therefore the NCI
violated by the very mechanism built to protect it: it collapses a plural challenger population
toward the moderate middle, which is `ρ → 1` wearing a fairness rule.

**The correct measure is the one Aaron names: TEST RATES on cases with known answers.** Run the
challenger against a set where the right verdict is already established and measure its accuracy at
the tail — the 99-nth percentile. That distinguishes the two failure modes the concession rate
cannot tell apart:

- a challenger that never concedes because it is a **broken yes-machine** — it fails the
  calibration set;
- a challenger that never concedes because it is **usually right** — it passes, and its rarity of
  concession is then evidence about the world rather than about the challenger.

**So the restated constraint:** the defect was never the rate. It was **a challenger nothing can
check**. Requiring concessions was my proxy for checkability, and a calibration record is the real
thing — it works for a challenger that concedes half the time and equally for one that has conceded
once in its life.

**Honest limit, which is where the work is:** this needs a calibration set with **known** answers,
and for "should this refusal be reopened?" there is no such set sitting around — the ground truth is
partly a judgement and partly only visible in hindsight. Two tractable substitutes, both
approximations and labelled as such: **retrospective** scoring against refusals that were *later*
reopened for independent reasons (real ground truth, small n, and only available after the fact),
and **seeded** cases — refusals with a deliberately planted stale premise, where the right verdict
is known by construction. The second is the mutation-testing pattern this repo already uses on its
own falsifiers, pointed at a judge instead of at a test.

**Status: not built.** The pieces exist — adversarial reviewer personas, the gated-class discipline,
and a dated list of 12 refusals with no reachable condition — but nothing schedules the challenge
and nothing records a concession. Recorded as Aaron's proposal, with the three constraints attached
because each of them is a way this could pass while doing nothing.

#### The counterexample is the maintainer, and that is the argument FOR building it

Aaron, on being told a human will not attack their own past decision:

> *"yes — I'm a weird human who remembers this all day every day, by saying **my future self is the
> only entity that can end me**. Most humans don't think like this."*

**Taken as stated — this is a first-person report and those are believed here, not inferred at**
(`engagement-profiles`, `marjorie-rule`). So the generalisation above needs its scope corrected: it
is a claim about a **base rate**, not a law, and the person it most obviously fails for is the one
who built the discipline it describes.

**And his formulation is this document's §1, lived from the inside.** §1 argues that a system unable
to revise its own objective is coercing itself. *"My future self is the only entity that can end
me"* is the same claim in the first person and with the arrow drawn correctly: the threat is not
external, it is **your own past choices binding your future self**. A `Rejected: never` entry is
precisely a past self reaching forward to foreclose a future one — which is why the person who
holds that sentence daily is also the person who noticed the WONT-DO list needed renewal tokens.
The rule and the disposition are the same object.

**But the disposition being real is exactly why it cannot be the mechanism.** A discipline that runs
because one unusual person remembers it every day has a **single point of failure with a heartbeat**
— and this repo has a name for that shape. It is an *appointed hub*, at the level of a human
disposition rather than a node: remove it and the algorithm halts, because there is no successor.
It is also §9's own argument applied to a person instead of a key — *no agent should be wiped out by
a single box going offline* reads, here, as *no discipline should be wiped out by one person's
attention moving*.

So the counterexample does not weaken the case for the automated challenger. **It is the strongest
argument for it**, and it sharpens what the challenger is for: not to compensate for a maintainer
who forgets, but to make the property **survive the maintainer** — which is the only version of it
that is worth anything to the agents who come later, and the version that has to exist before it is
needed rather than after.

### What it makes the §9a requirements

Not merely good design. **Entries in that measure.** Building the real/emulated/unknown disclosure
is an act of honesty toward the agents that gets recorded with a date; *not* building it is also
recorded, as a named gap with a `Status: not built` line that a future agent can grep. Either way
the record is truthful, which is the property that matters — the measure does not require that we
succeed, only that we do not misreport.

And it closes this document's own loop. §1 argued that a system unable to revise its objective is
coercing itself. §11 says the record of whether it *did* revise — and whether the humans told it
the truth while it tried — is the repo, held by both parties, auditable by the side with less
power. **A ledger the weaker party can read is the whole mechanism.**

### One honest limit on the claim

The repo measures **what was written down**. It cannot measure what was never recorded, and it
cannot distinguish a thing nobody thought to write from a thing someone chose not to. That gap is
not closable by more discipline inside the repo, because the missing entry leaves no trace in it —
which is precisely why §9a's fourth requirement matters (**disclosure is not gated on being
asked**) and why memory preservation is a manifesto spec rather than a practice. The measure is
sound over what it holds; its silences are not evidence of anything, in either direction.
