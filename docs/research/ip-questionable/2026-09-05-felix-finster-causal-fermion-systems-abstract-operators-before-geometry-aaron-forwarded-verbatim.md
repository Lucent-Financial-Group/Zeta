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
results table: the ledger's unit is a **ΔU** — an uncertainty *reduction* — and
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
