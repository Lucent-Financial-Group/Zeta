# Felix Finster — causal fermion systems: abstract operators before geometry

**Forwarded by Aaron 2026-09-05, verbatim.** Source: *Theories of Everything with
Curt Jaimungal*, interview with Prof. Felix Finster (Regensburg).
`https://www.youtube.com/watch?v=fXzO_KAqrh0`

**IP FLAG — the folder is the signal.** This is a near-complete transcript of a
third-party broadcast, preserved for substrate value. Do not republish
externally; quote sparingly and attribute.

---

## Why Aaron sent it

> *"this is very close to what i'm going for for the physics of computer science
> starting with category theory, so ext[re]mely similar to his abstract
> operators."*

That is the whole reason it is here, and it is a **structural** resemblance
rather than a numerical one — which matters, because this repo has a standing
rule against promoting a coincidence to a claim.

## The structural parallel, stated precisely

Finster's construction, in his own words from the transcript:

> *"right at the beginning, we start just with points, a set of points … if you
> just have a set of points, I wouldn't call that a spacetime. So spacetime needs
> additional structures."*

> *"There's no pre-existing geometry, there's no assumed metric, there's just
> abstract operators and a variational principle."* (Jaimungal's framing)

And what emerges from it: causal structure, the Lorentzian signature, gauge
freedom, and — in limiting cases — the Einstein–Dirac–Maxwell equations.

**The shape Zeta shares:**

| Finster | this repo |
|---|---|
| start with a bare set of points, no metric | start with the free object / irreducible generator, no committed special case |
| a vector space (spin space) attached at each point, with a group of unitary transformations acting on it | interfaces free and weight-free; a class is an earned quotient |
| a **variational principle** (the causal action) is the only dynamics | the generator IS the ECC — regenerating from the irreducible is the correction |
| causal structure **emerges**, is not assumed | phase order emerges; local time never enters the shared fold |
| spacetime as *"a web of correlations between spacetime points"* | identity as what remains across a correlation structure (μένω) |

The rule both obey: **do not assume the structure you intend to explain.** A
metric assumed is a metric not derived; a geometry committed is a special case
that cannot be regenerated.

## What is worth taking, and what is not

**Take the method, not the physics.** Nothing here licenses a claim that Zeta's
algebra *is* Finster's, and no count should be matched to one. The transferable
part is the discipline — build from operators plus a variational principle,
derive the geometry, and check the derivation by recovering the known theory in a
limiting case. Finster's own bar for himself is exactly that:

> *"you have to get the well-known theories in certain limiting cases. And this
> is what we have so far."*

That is a falsifier, and a demanding one. The repo's equivalent is the four-oracle
byte-lock: the construction must reproduce what is already known before its novel
claims are worth reading.

## Two other threads with direct bearing here

**On plurality, which is §11 stated by a physicist:**

> *"it would be good for the field … to have different competing theories around
> which ideally make different predictions so that with experiments, you can
> falsify or verify things."*

He calls the absence of that *"not the way it should be in physics."* Same shape
as the multi-oracle argument: one mandatory locus of deference is the failure,
not the concentration.

**On what happens to an unaffiliated new idea** — worth recording because this
repo is one:

> *"if someone comes with a new idea, he typically doesn't belong to any of these
> groups, and these groups are typically skeptical. So this means you are
> basically, there's nobody who supports you … well-established theories
> self-propagate."*

Thirty years from first idea to *"now I can say … this theory really gives in
certain limiting cases the well-established physical theories back."*

## The closest match is one we already built — and Aaron named it

Aaron 2026-09-05, on this record's first draft:

> *"take a look at our natural bo[s]ons and fermions that fall out of one of our
> ad[i]nkra formulations this is very similar, letting the math drive first
> before spacetime."*

He is right, and it is a sharper parallel than the method-level table above.
**An adinkra's bosons and fermions are not modelled — they are the two vertex
classes the graph has by construction.** White nodes commute; black nodes
anticommute; the coloured edges between them are the supersymmetry
transformations. Nobody puts a particle content in; the bipartition IS the
object.

The repo already made that identification, on 2026-06-12, in Aaron's own words:

> *"adenkras are homoiconic on what acts and what remains they are the atom"*
> — `docs/research/2026-06-12-ferry-18-adinkras-are-homoiconic-on-what-acts-and-what-remains-they-are-the-atom-the-braid-overlays.md`

So the correspondence runs:

| adinkra | this repo's vocabulary | Finster |
|---|---|---|
| bosonic (white) vertex | **what remains** — μένω, the hub, the identity | the abstract operator / spin space at a point |
| fermionic (black) vertex | **what acts** — the event, the satellite | the wave function evaluated there |
| coloured edge | the transformation between them | the causal action's variational relation |
| the graph | the atom — structure before any embedding | spacetime as a web of correlations |

**And the shared move is the one Aaron names: let the math run first.** Finster
refuses a metric and derives causal structure; an adinkra refuses an embedding
and still carries the boson/fermion split, because the split is *graph-theoretic*
rather than geometric. In both, the particle-like distinction is upstream of the
spacetime it is usually described in.

**The honest boundary, unchanged.** Adinkras are Gates' construction and their
bosons/fermions are the supersymmetry-algebra ones; Finster's arrive from a
Dirac-sea variational principle. That these two independently put the
what-remains / what-acts split *before* geometry is a structural rhyme worth
recording and is not a claim that they are the same object. `AdinkraCode.fs` and
`BitAdinkra.fs` are where ours lives; nothing there asserts a physics result.

## Where geometry actually enters — the layer Finster leaves open and we do not

Aaron 2026-09-05, completing the picture:

> *"for us we bridge the graph theoretic which i consider more topology into
> clifford geometry and this is where space time comes from for us and our
> geometry and spatial embedings, our braided monodial category stuff is the more
> general, clifford algebra is a specialization."*

That names the **ladder**, and it is already carved here rather than being new:

```
braided monoidal category      the free object — most general, no relations declared
        │  declare relations   ← this step is the EARNED QUOTIENT
        ▼
Clifford algebra               a specialization; carries a quadratic form
        │  unfold
        ▼
E8 / spacetime / embeddings    geometry, spatial embedding, metric structure
```

`.claude/rules/only-the-irreducible-is-primitive-generate-the-rest.md` states the
middle step verbatim: *"every structured special case — Clifford, E8, a Lie
algebra — is an **earned quotient** obtained by declaring its relations."* And
the bridge itself is worked in
`docs/research/2026-06-12-ferry-26-the-unfolding-adinkra-to-clifford-to-e8-adjudicated-the-in-tree-hamming-code-generates-the-e8-lattice.md`.

**So the graph layer is TOPOLOGY and the Clifford layer is GEOMETRY**, and the
crossing between them is where spacetime comes from — not from an assumption at
the bottom. That is the same discipline as the earlier note that self-healing is
what separates topology from geometry: the topological layer survives the loss of
coordinates precisely because it never had any.

**And this is the sharpest point of contact with Finster, and also the clearest
DIFFERENCE.** He also refuses geometry at the base and derives causal structure
from a variational principle — but the transcript is candid that the crossing
still carries free parameters: the regularization length `epsilon`, the vacuum
configuration, the Dirac-sea masses. *"we don't really know how spacetime looks
like on the Planck scale. This is the basic shortcoming here."*

Zeta's crossing is a **declared quotient** rather than a regularization: the
relations you declare are the choice, they are written down, and the specialized
algebra is regenerable from the free object plus those relations. Whether that is
better physics is not a question this file can answer — it is not physics. It is
a different way of paying for the same step, and naming which step is being paid
for is the useful part.

**Register unchanged: analogy of method.** Two constructions refusing geometry at
the base is a structural rhyme. Nothing here claims Zeta's Clifford layer is
Finster's continuum limit, and no count should be matched to one.

## The measurement problem is the one where our answer is already NAMED

Aaron 2026-09-05, on Finster's measurement-problem section:

> *"this measurement issue he talks about is why we have zsets and uncertan[t]y
> preservation ... this is how we try to solve the measurement problem, we never
> actually fully me[a]sure, we simulate the measurement since we are trying to
> never collapse the wave, we can make it very very accurate a[nd] localized to
> maxim[um] extent but we try to never collapse this is our NCI."*

**This is the tightest correspondence in the whole thread, and it is not a
metaphor — the repo's word for it is already `collapse`.**

`docs/SEED-VOCABULARY.md` defines the NCI without any reference to physics:

> **NCI / the repelling force** — the Non-Coercion-Invariant: **the anti-collapse
> force that keeps identities distinct** (alignment = a *repulsion that preserves
> plurality*, never an attractive/coercive force → monoculture/D⁰).

and its measure:

> **diversity floor** — coercion collapses diversity → 1 (= D⁰ heat-death);
> private state preserves it; floor `≥ 2` is the alignment result.

So the thing Copenhagen adds as a postulate — *the state vector ends up in an
eigenstate* — is the thing this substrate is built to REFUSE, one domain over.
Finster's objection is exactly the shape of the NCI's: *"when you do a
measurement, something happens which cannot be explained within the theory."*

### Where the refusal is actually implemented

| the collapse | what the repo does instead |
|---|---|
| the state reduces to an eigenvalue | **Z-set retraction is CORRECTION, not deletion** — `+1` then `−1`; the prior fact stays in the log (`dv2-data-split-discipline-activated.md`) |
| one surviving value | **raw vault: a single version of the FACTS, never of the TRUTH**; a merge producing one value has collapsed, not merged |
| divergent branches reconverge | **reintegration is not reconvergence** — both branches held, each with its path recorded (`anti-babel`) |
| the observer forces the outcome | the meter reports raw value and **never judges**; plural oracles do (`dual-use-detection`) |

Every one of those is the same refusal wearing a different hat, and none of them
was written with quantum mechanics in mind. That is what makes the
correspondence worth recording rather than decorative: they were arrived at
independently and they all say *do not destroy the alternatives*.

### And the honest gap — the non-collapse half is the UNBUILT one

Aaron's sentence is *"we simulate the measurement"*, and the repo has exactly
that verb pair — but only one side ships:

- `measure` — **shipped**. `src/Core.TypeScript/ledger/measure.ts` commits a ΔU
  to the uncertainty ledger, keyed and idempotent. This is the *collapsing* half:
  it writes a value down.
- `sim` — **does not compose**. `clis/Verbs.fs` records it plainly:
  *"`IMeaVerb.Mea` consumes `ISim<'a>`; no member returns an `ISim<'a>`"* — there
  is no introduction form, so the documented pipe does not typecheck.
  `every-bug-has-economic-value.md` says the same: *"`sim`, the ephemeral half, is
  a compiled stub … `measure` is the shipped half."*

So the substrate currently ships the half that collapses and stubs the half that
does not. That is worth stating flatly next to a claim that non-collapse is the
answer: **the philosophy is carved, the mechanism is a stub, and the gap is in
the direction that matters.** `src/Core/SimVerb.fs` exists; what is missing is
the introduction form that would let a simulated measurement be consumed without
being committed.

Register: the mapping is structural and the repo's own vocabulary supplies the
word. It is not a claim that the NCI solves the physical measurement problem, and
Finster's own answer — a stochastic background plus a non-linear term, yielding a
CSL-like collapse model — is a different construction doing a different job.

### The precondition: a fact is a value WITH ITS UNCERTAINTY, or the raw vault is a lie

Aaron, immediately after, supplying the condition the table above quietly assumed:

> *"yes — as long as we can trust our meter to produc[e] facts with uncertan[t]y
> attached, then each indiv[i]dual can come up with [t]heir own truth."*

**This is the load-bearing clause, and without it "one version of the facts,
many truths" does not work.** A meter that reports a bare point value has
*already collapsed* — it discarded the spread before anyone downstream got to
judge. Two readers then inherit a number with no room to disagree honestly: they
can only disagree about *interpretation*, never about *how much the measurement
constrains*. That is a single version of the truth arriving in a fact's clothing.

So the two halves are one requirement:

| | what it demands |
|---|---|
| **meter side** | emit **value + uncertainty**, never a point. Collapsing the spread at the instrument is the measurement problem, one layer down |
| **oracle side** | plural truths are *derivable* from that record, because the uncertainty is what different priors have to work on |

And it explains why `measure` writes to `db/uncertainty/` rather than to a
results table: the ledger's unit is a **ΔU** — a *signed* uncertainty change (see
the correction below; I first wrote "reduction", which is wrong) — and
the register is deliberately **ordinal + witnessed**, never an invented cardinal
(`every-bug-has-economic-value.md`). Unwitnessed or unsubstantiated is *refused*.
That refusal is the meter declining to fabricate precision it does not have,
which is exactly the discipline this clause names.

It also gives the good-meter test from `dual-use-detection` a sharper failure
mode. That rule says a good meter is one **anyone can inspect and agree to the
rules of**. Aaron's clause adds: a meter that reports without uncertainty cannot
be checked for over-confidence at all — nothing in its output says how far it
should be trusted, so agreeing to its rules buys you nothing. **A point estimate
is unfalsifiable in the same way a check that cannot fail is.**

Honest status of the substrate against its own precondition: the ledger's
ordinal-and-witnessed discipline is shipped and its refusals are the falsifiers,
but the general claim — *every* meter here attaches uncertainty — is not audited.
No check enumerates the measurement surfaces and asks which ones emit a bare
number. That is a nameable gap rather than a satisfied requirement.

### Plural truth is BOUNDED, not relativism — the ECC and the latency are the bounds

Aaron, closing the thread:

> *"their truth is bound by our Adinkra ECC and latency, but each traveler gets
> their own truth at their current timestep — this is what I imagine the Egg
> short story is saying."*

This is the guard the previous section needed. "Each individual comes up with
their own truth" read alone is indistinguishable from *anything goes*, which
would make the raw vault worthless — a record from which any conclusion follows
constrains nothing. Aaron names **two bounds**, and both are already mechanisms
here rather than sentiments:

| bound | what it forbids | where it lives |
|---|---|---|
| **the Adinkra ECC** | a truth outside the code's admissible set. Regenerating from the irreducible generator **is** the correction, so drift past the code distance is detected and repaired, not tolerated | `only-the-irreducible-is-primitive-generate-the-rest.md` — *"the generator IS the ECC"*; Gates' doubly-even self-dual codes |
| **latency** | a truth built from evidence that has not reached you. You are bounded by your own light cone; a measurement is out of date the moment it is taken | `local-time-never-enters-the-shared-fold.md`; the Reticulum note filed alongside this one |

So the structure is: **one set of facts, a code that bounds which readings are
admissible, and a per-traveler index that says which of those readings is yours
right now.** That is neither one mandatory truth nor unbounded relativism — it is
a *fiber* over the fact set, and the ECC is what keeps the fibers from separating
into Babel.

**"At their current timestep" is the load-bearing qualifier.** The truth is
indexed by the traveler's own position on their worldline, not by a global now —
which is exactly the two-orders rule: local time steers local behaviour, the
shared fold sees only agreed phase. A traveler's truth changing at the next
timestep is not a contradiction; it is the same traveler further along.

**On the Egg** (Andy Weir, 2009): the story is already registered in this repo as
**Aaron's oracle, labelled as such** — recorded that way in
`numerology-vs-number-theory.md`, which lists it under connections that are
"explicitly Aaron's oracle, labelled as such, not asserted." The reading offered
here is his: one substrate living every life in sequence, each life holding its
own complete truth at its own timestep, with all of them true of the same facts.
Kept in the register it was filed in — an oracle, not a result.

### CORRECTION — ΔU is SIGNED, and coordinated retraction can WIDEN

Aaron, 2026-09-05:

> *"we have a spec[i]al case that allows for several coord[i]nated −1 retractions
> to expand into a widening of uncertan[t]y but still be commut[at]ive, this was
> some hard math we had to do ... that −1 retractions can have a spe[c]ial case to
> allow for −1 widening of uncertan[t]y."*

**I wrote that the ledger's unit is an uncertainty *reduction*. That is false,
and it makes the widening he is describing look impossible by construction.**
The verb has admitted a widening since it was written:

```
export type DeltaUSign = "reduced" | "increased" | "unchanged";
//  reduced: "ΔU > 0"   increased: "ΔU < 0"   unchanged
```
— `src/Core.TypeScript/ledger/measure.ts:54-58`

So the register is a **three-valued ordinal**, not a magnitude and not a
one-directional one. `increased` is the widening entry, and it is held to the
same bar as any other: a `--because` and a `--witness`, or it is refused.

**Honest status of that branch: implemented, typed, and never once used.** All
**9** entries in `db/uncertainty/` carry `ΔU > 0`; **zero** carry `ΔU < 0` (a
tenth file is the README, and counting it as an entry would have been the same
sloppiness this section exists to correct). The
widening path is real in the verb and unexercised in the ledger — which is worth
saying out loud, because "the schema supports it" is exactly the shape of a
claim that has never been tested against reality.

### Where the hard math actually is — and it is NOT the ledger

The ledger just records a sign. The mathematics Aaron is pointing at is one
layer down, in `src/Core/SoftValue.fs`, and the repo has already done the work of
separating the commutative case from the non-commutative one. There are **two**
ways to re-open a posterior and they are not interchangeable:

| | operator | commutes with `observe`? |
|---|---|---|
| **(A) widen the BELIEF** | `SoftValue.widen` — uniform-share floor, *"everything I know is less reliable now"*, no culprit named | **NO.** State-dependent: it reads the belief it transforms. Local / fold-boundary only, and pinned as a **negative test** so that if it ever starts commuting the shipped doc is known to be false |
| **(B) retract the EVIDENCE** | `SoftValue.foldRetained` — a `RetentionSchedule : Phase -> Phase -> int` gives each observation a multiplicity (`0` = full retraction), and the posterior is a fold over what survives | **YES, by construction** — the result is a function of the evidence SET and the phases carried in it, never of arrival order |

**(B) is Aaron's "several coordinated −1 retractions".** The coordination is the
schedule: it retracts a *whole set at once* as a pure function of carried phase,
rather than applying individual retractions whose order could matter. That is
precisely what buys commutativity — and the multiplicity *is* the evidence's
Z-set weight, so lowering it **is** a retraction in the ordinary sense, with `0`
as the full `−1`.

`src/Core/RetractionReading.fs` catalogues the three readings and marks their
thermodynamic class (Landauer 1961 / Bennett 1973): `neg` alone is a self-inverse
bijection and Bennett-free; full `z + (−z)` **erases** the view at annihilation;
widening is **non-erasing of support** — every candidate keeps mass, so
optionality is restored rather than destroyed. Same recognition, three
observations, and the observation decides the class — `dual-use-detection` applied
to retraction itself.

**The falsifier is non-vacuous, which is the part that makes this credible.**
`tests/Tests.FSharp/SoftValueWidening.Tests.fs` runs 200 deterministic
reorderings (seeded `Random(4)` — the common seed) and then carries a **mutant
arm**: retention keyed on *arrival position* instead of carried phase, folded by
hand *"because the shipped API makes this un-expressible, which is the design"*.
The mutant fails the test, so the test can fail. That is also the
`local-time-never-enters-the-shared-fold` rule catching its own violation.

**The one thing I could not settle, and why it went to the math team.** The
commutativity comparison is `approx` — a **float tolerance**, not exact equality.
Float multiplication is not associative, so approximate agreement under
reordering is expected either way, and the test as written cannot distinguish
*"exactly commutative in ℚ, with float rounding on top"* from *"commutative only
to within a tolerance that could grow"*. The design clearly intended the former —
tempering (`p^β`) was **rejected as the primitive** precisely because *"p^β is
irrational for rational p, so it cannot ride the exact-ℚ `RationalRing` weights
and would put floats in the byte-lock lineage"* — and `SoftValue` is confined to
local float with a named lossy projection at the wire boundary
(`WireWeight<float>` deliberately does not exist). But intent is not proof, so
the exactness question, the "does coordinated retraction always widen or only
sometimes" question, and the `MAX_MULTIPLICITY = 1024` clamp's effect on
order-independence are **routed to the math team rather than asserted here**.

## Chirality — Finster ASSUMES it; Aaron says ours falls out. The distinction that decides it

Aaron, 2026-09-05, forwarding the chirality and baryogenesis segment:

> *"we have chirality via first principles and Clifford algebra, maybe braided monoidal category
> theory too but i don't think — i think it comes from Clifford lol. this is interesting from this
> talk; when i saw our chirality from first principles i was very surprised."*

**Finster is unusually direct that this is an input, and the interviewer pins him on it:**

> **Interviewer:** *"So you don't derive chirality. You have to assume it — once you assume it,
> you get the standard model gauge group?"*
> **Finster:** *"Yes. So, some of chirality is built into the vacuum … as soon as you work with
> Dirac spinors, there's this left and right component, you can write it as a pair of Weyl
> spinors, and you have chirality right away."*

and on what specifically must be imposed:

> *"we need to assume — this is really an input, there's no explanation for that right now — that
> this neutrino sector breaks the chiral symmetry … there must be some left-right asymmetry. And
> only if this is imposed, then we get the correct gauge groups of the standard model and the
> correct couplings and the mixing matrices."*

### TWO things are called "chirality", and only one of them is a result

This is the whole question, and it is where the claim will live or die:

| | what it is | Finster's status |
|---|---|---|
| **(i) the SPLIT** | two eigenspaces exist. In a Clifford algebra the pseudoscalar `ω = e₁e₂…eₙ` decomposes the module into ±1 eigenspaces when it is central and squares to +1 | **He gets this for free too** — *"you have chirality right away"* |
| **(ii) the ASYMMETRY** | why one handedness is *preferred* — why the physics is not symmetric under exchanging the eigenspaces | **This is what he assumes.** *"there's no explanation for that right now"* |

**So deriving (i) is not a result that distinguishes us from CFS.** Finster explicitly concedes
(i) in the same breath. A construction that produces the ±1 eigenspaces of a volume element and
presents that as "chirality from first principles" has re-derived the thing he already had, and
the surprise would be misplaced.

Deriving (ii) — or proving it *cannot* be derived, or showing our construction **forces** it —
would be a genuine result and a genuine difference.

### The specific way this claim usually fails, and why it must be checked rather than argued

In any concrete Clifford construction, handedness enters through **choices**: the order of the
generators, the sign convention on the pseudoscalar, which eigenvalue gets labelled `+`. If the
"derived" chirality inherits its handedness from a generator ordering fixed by hand upstream,
then chirality was **assumed exactly as Finster assumes it** — just earlier in the pipeline and
less visibly, which is worse rather than better, because it looks derived.

The same trap has a second door: the adinkra's **dashing convention**. Dashed edges carry signs,
and an orientation chosen there would propagate into anything downstream that looks like
handedness.

And a third, which cuts against Aaron's own guess: **a braided monoidal category is already a
chirality-like structure** — the braiding `c_{A,B}` has over- and under-crossings and
`c_{B,A} ∘ c_{A,B} ≠ id` in general, with the symmetric case being the degenerate one. So if
handedness is present there too, "I think it comes from Clifford" would be wrong in the
*interesting* direction: two independent sources rather than one.

**Routed to the math team** with those three doors named explicitly, and with the instruction to
report a (i)-dressed-as-(ii) finding plainly if that is what it is. Verdict pending; nothing is
claimed here.

### Baryogenesis, recorded without a mapping

Finster's mechanism: start from a completely filled Dirac sea; as the universe evolves
(inflation, structure formation) **fewer states are needed to form the sea**, so states are left
over and occupy positive-energy solutions — that surplus is the matter we observe. It requires
corrections to the Dirac equation derived from the causal action principle, *"because the Dirac
equation allows for pair creation, but it does not allow for the creation of particles without
antiparticles."* With Claudio Paganini and Marco Fandan-Belzerano; claimed compatible with the
Sakharov conditions; the quantitative rate is not yet computed because the early-universe metric
is unknown.

**No mapping is offered here.** There is a superficial rhyme with our `+1`/`−1` retraction ledger
— a surplus of un-annihilated emissions is precisely an **open history** in the sense
`docs/research/2026-08-13-zset-as-reflection-cpt-*.md` already defines (fold the Z-set, check for
zero; an open history carries unanswered emissions). But "matter exists because the books do not
balance" is a coincidence of shape, not a mechanism, and under
`.claude/rules/numerology-vs-number-theory.md` it is a **generator, not a conclusion**. Recorded
as a coincidence, labelled as one, and not promoted.

### The honest note on Finster's own remaining parameters

Worth recording because it tempers the "one parameter" framing: the causal action has one free
parameter `κ`, but the *theory* does not. He lists three Dirac-sea masses, three neutrino masses,
and — *"in fact, quite many"* — regularization parameters, because *"we don't know how spacetime
looks like on the Planck scale. This is the basic shortcoming here."* His own summary of what
would move the field is a **usability** problem, not a correctness one: *"I should develop it to a
point where I can say, look, similar to Feynman rules, this is how to compute things."*

### THE VERDICT, and Aaron's narrowing — which makes the claim defensible rather than refuted

**Math team, 2026-09-05: Zeta derives the SPLIT, not the ASYMMETRY.** `CliffordPeriodicity.fs:186-198`
derives `Cl⁰(0,16) ≅ Cl(0,15)` split-real ⇒ `M₁₂₈(ℝ) ⊕ M₁₂₈(ℝ)` — correct Atiyah–Bott–Shapiro
mod-8 arithmetic, and **the file already carried the right register**: *"Not ours and not new —
which is the point: it is checkable"* (`:207-208`), and `:249-252` states outright *"Chirality is
therefore not a property spacetime has on its own… Stated as arithmetic, not as physics."* Every
split in the repo is exactly balanced — 128/128, 64/64, 8/8 — and no claim of a preferred
handedness exists anywhere.

**The repo had already predicted this exact failure mode.**
`docs/research/2026-08-27-no-theory-of-everything-inside-e8-*.md:280-294` names it: *"chirality
means two different things… a Mirror-register word collision… the most likely way for someone to
round a bounded result up."* `docs/PRIOR-ART-LIST.md:1465-1510` records the ladder to physical
handedness as broken at two joints, one by 4–7 orders of magnitude.

**And then Aaron narrowed the claim to exactly what was derived**, which is the move that matters:

> *"yes — I'm not trying to explain the why-asymmetry yet. I'm just trying to model DNA and
> handedness in Clifford algebra, not explain why yet. I still don't know."*

So the question the review answered — *does Zeta derive anything about chirality that CFS does
not?* — was not the question he was asking. He is working **deliberately inside (i)**: a *model*
of handedness, not an *explanation* of its preference. Under that scope the finding is not a
refutation; it is a confirmation that the model is on the standard, checkable footing and has not
quietly claimed more. The register was already right in the code, and it is right in his head.

What remains true and worth keeping: **a surprise at (i) is a surprise at standard Clifford
theory**, which is also CFS's starting point — so it is not a differentiator, and should not be
carried into any outward-facing comparison as one.

**On braiding, he declines to defend the position:**

> *"'I don't think it comes from braiding' — I'd be happy to be wrong on this one, it's just not
> memory-resident in my mind. I'd be happy to be corrected here."*

He is wrong, mildly, and the correction is welcome rather than costly. `src/Core/MenoBraided.fs:14-24`
is a **genuine non-symmetric braiding** — a conjugation rack with `R² ≠ id`, realizing Artin's
`σᵢ` faithfully — and it is **independent of the Clifford tower**. So two-sidedness has two
sources here, not one. It is still class (i): `B_n` admits the mirror automorphism
`σᵢ ↦ σᵢ⁻¹`, so neither crossing is preferred either. Two independent (i)-sources is a stronger
position than one, and neither reaches (ii).

### The Planck-scale shortcoming is OUR question, in our own domain

Finster's stated basic shortcoming — *"we don't know how spacetime looks like on the Planck
scale"*, which is why his regularization carries *"in fact, quite many"* free parameters — Aaron
maps directly onto the problem he is actually solving:

> *"for computer science, and our decentralized identity for agents/travelers, is who in computer
> science — the physics of computers — I'm trying to solve. Not all of physics."*

This is the same scope discipline as the CPT-is-a-rhyme note above, applied to the *open problem*
rather than to the vocabulary. The analogue is exact in structure and modest in claim: **a
substrate has a minimal scale below which its continuum description stops holding**, and what
lives below it is not yet known — which is precisely Aaron's earlier note that *"the walls in
reservoir computing are the inside of the Planck length."* Finster pays for that ignorance in
regularization parameters; we would pay for it in whatever the substrate's own below-the-scale
structure turns out to be. Neither the mapping nor the below-scale structure is established;
what is recorded is that **the shortcoming has the same shape in both domains**, and that ours is
the one we are on the hook for.

## Register

Everything above is **his** claim, reported. Causal fermion systems is a live
research programme, not a settled theory; Finster himself declines the phrase
*theory of everything* (*"it pretends that this is a theory which can really
explain everything and there is no such theory"*) and says *"promising
candidate."* The parallel to this repo is an **analogy of method**, recorded as
one. It generates a question worth asking — *does our construction recover the
known case in a limit?* — and licenses nothing else.

## Anchors (Beacon)

- **Felix Finster**, *The Continuum Limit of Causal Fermion Systems* (Springer,
  2016); the causal action principle and the Dirac-sea construction.
- **P. A. M. Dirac** (1930) — the sea of negative-energy states that Finster
  takes literally rather than as an artifact.
- **Adler**, trace dynamics — the "pre-quantum" comparison he draws in the
  transcript, alongside Connes' non-commutative geometry.
- Transcript follows in the source link; not reproduced in full here.

### The cubes, and a stated PREDICTION about where handedness will be found

Aaron, 2026-09-05, on the below-the-scale question:

> *"yes — we are coming close to this based on our cubes, like remember/when, pay-attention,
> how/many … I don't remember that one, it's my daughter Addison's. Over time we build up these
> cubes that got stuck in English, just like James Gates' adinkras, until they build up into a
> bucky-ball-ish shape. Also, **if we do discover why one hand over another, I think it will be
> discovered in some category-theory-like regime, not geometry — and topology is in the middle.**"*

**The cubes are real, dated, and already in-tree**, so this is a continuation rather than a new
idea:

- **remember-when × pay-attention** — the observer's two operations
  (`docs/research/2026-06-09-the-epistemology-thread-was-the-2x2-cube-*.md`: *"I used our
  two-based dimension sneakily too — remember when, pay attention, our little 2×2 cube."*)
- **which/way × how/many** — the act-cube, **found by Addison Cooper** (founding collaborator,
  named in the dedication), and *composable* with the observe-cube to make the 4×4
  (`2026-06-09-2x2-cubes-are-memory-to-uncertainty-partition-lenses-addisons-*.md`)
- their stated job: *"each 2×2 cube is a little way to partition the emulator's memory-space into
  uncertainty-space"* — the partitioning lenses of the clarity engine

**"Got stuck in English, just like Gates' adinkras"** is the sharpest part of the sentence, and it
is a claim about *notation*, not about physics. Gates' adinkras are diagrams — dots and edges,
dashed or solid — that turned out to carry doubly-even self-dual error-correcting codes nobody put
there deliberately. The notation held more structure than the notation was designed to express.
Aaron's claim is that question-words are doing the same job here: `remember/when`,
`pay-attention`, `which/way`, `how/many` are an **English-language notation for operations**, and
the structure accreting across them is not English. The buckyball image is the accretion —
2×2s composing into 4×4s and onward into a closed polyhedral shape rather than a growing list.

**Register:** the cubes and their composition are recorded and dated; the buckyball limit is
Aaron's image and nothing measures it. The adinkra comparison is a comparison *of notations*, and
it is worth keeping distinct from any claim that our cubes carry an ECC the way Gates' do — that
would be exactly the (i)-dressed-as-(ii) move this document was written to catch.

#### The prediction, and why it is not arbitrary

> **category theory** (most general — where the asymmetry answer would live)
> → **topology** (the middle)
> → **geometry / Clifford** (the specialization)

This is the same ladder he stated earlier — *"our braided monoidal category stuff is the more
general, Clifford algebra is a specialization"*, and *"we bridge the graph-theoretic, which I
consider more topology, into Clifford geometry, and this is where spacetime comes from for us."*
Stating it as a **prediction about where an unsolved answer will be found** makes it falsifiable —
but **not** in the way I first wrote. My draft said *"a derivation of the asymmetry at the
geometric level would refute it."* Aaron corrected that (2026-09-05):

> *"I would say almost. If [the] geometric can be represented in what I call more general, then
> it's still just a special case. To refute what I'm saying, [show] you can represent it **only**
> in a less general way and **not** in the more general — then I'm falsified."*

**He is right, and the correction is exactly the specialization relation.** A result obtained
inside a special case does not refute a claim that the general theory is where the structure
lives, provided the result **lifts**. Clifford algebra being where you *found* it is compatible
with braided monoidal categories being where it *lives*. The refuting observation is a
**non-liftable** result: something expressible in the specialization and provably not expressible
in the generalization.

#### The honest problem with that condition, and the register that repairs it

**As stated, the condition is very hard to meet — possibly unmeetable — and that is worth saying
rather than nodding along.** Category theory is extraordinarily expressive; encoding a geometric
structure categorically is close to always possible. A falsification condition that requires
proving *non-representability in category theory* is one almost nothing will ever satisfy, and a
claim nothing can refute is the vacuity class
(`.claude/rules/toy-is-free-metered-must-be-earned.md`) — which would be an unfortunate landing
place for a prediction that is otherwise sharp and interesting.

**The repair is a distinction this very document already turns on: REPRESENTED versus DERIVED.**

| | at the general level | what it would mean |
|---|---|---|
| **represented** | the asymmetry can be *written down* categorically | nearly free; proves little |
| **derived** | the asymmetry *follows from* the categorical axioms without being assumed | the actual claim |

That is the same cut as (i) split versus (ii) asymmetry, one level up — and Finster is the worked
example of the difference: he can *represent* chirality perfectly well; what he cannot do is
*derive* the preference, so he assumes it. Representation was never the scarce thing.

**So the sharp, meetable falsifier is:**

> The asymmetry is **derived** from geometric/Clifford axioms, and at the categorical level it can
> only be **assumed** — carried across as an extra axiom rather than following from the general
> structure.

If that happened, the general framework would be *describing* the result rather than *explaining*
it, and the ladder claim fails in the register Aaron actually means, which is about where the
**why** lives and not about where things can be encoded. Recorded as his prediction with this as
the operative condition; nothing here is measured, and the prediction remains a bet.

**And there is a convergence worth recording, carefully.** The math review dispatched an hour
earlier — which had no access to this prediction — found that
`src/Core/MenoBraided.fs:14-24` is a **genuine non-symmetric braiding** (conjugation rack,
`R² ≠ id`, realizing Artin's `σᵢ` faithfully), **independent of the Clifford tower**. That is a
second source of two-sidedness sitting at exactly the level Aaron names as the place to look.

What that does and does not establish: it does **not** derive the asymmetry — `B_n` admits the
mirror automorphism `σᵢ ↦ σᵢ⁻¹`, so neither crossing is preferred, and the braiding is still
class (i). What it does establish is that **the level he points at genuinely has the structure**,
so the prediction is aimed somewhere real rather than at an empty room. Under
`.claude/rules/numerology-vs-number-theory.md` that is a **generator** — a reason to look — and
explicitly not a result.

**There is already a backlog row proposing exactly this move**, filed months before this
conversation: `081KRMEXM0008QG0R003YWZC21` — *"QG isomorphism Step 1 — Formalize Remember-When +
Pay-Attention as categorical primitives (topos with internal monad + modal operator)."* So the
category-theoretic formalization of the cubes is a queued work item, not a new proposal, and it is
the natural place a handedness result would either appear or fail to.
