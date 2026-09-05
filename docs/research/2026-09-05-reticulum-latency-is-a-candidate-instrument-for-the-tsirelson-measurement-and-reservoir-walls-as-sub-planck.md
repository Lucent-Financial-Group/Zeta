# Reticulum latency as a candidate instrument for the 2√2 measurement — and reservoir walls as the sub-Planck boundary

**Date:** 2026-09-05 · **Route:** Aaron → shadow, streamed
**Register: PROPOSAL.** Nothing here is measured. It names an instrument for a
question this repo already carved as open, and that is its entire claim.

---

## The question this answers is not new — the instrument is

`.claude/rules/dual-use-detection-is-neutral-oracle-decides.md` (line ~490) carves
the open question and explicitly refuses to derive it:

> **Does Zeta's own declared-channel discipline produce a correlation ceiling
> strictly below what non-signalling alone would permit — and where is it?**
>
> Measured over agent pairs, not derived from axioms.

It has sat there with **no proposed instrument**. Aaron 2026-09-05 supplies a
candidate:

> *"in reticulum it's a moving mesh based on latency and the latency between
> nodes is very similar to where i think the born rules and quantium physics come
> from any measurment is out of date as soon as you take it about latency, over
> time node distance becomes structure for the nodes that don't change often
> rel[a]tive to other and nodes that move around in the mesh a lot their latency
> likley have reoccuring patterns, i think these measurements might be where our 2
> root 2 tirelison limit will be poissoble to be measured over time"*

## Three claims, and they are of different strengths

**1. A measurement is stale the instant it is taken.** This one is simply TRUE of
any latency-separated system and needs no physics to justify it — by the time a
reading about node B reaches node A, B has moved on. It is the same fact that
forces `local-time-never-enters-the-shared-fold`: a node's receive-order is its
own, and letting it filter the shared fold makes nodes diverge.

The rhyme with quantum measurement is real but must be stated at its actual
strength: **both are cases where the act of reading returns a value about a state
that no longer obtains.** That is a structural analogy, not a derivation of the
Born rule, and this file does not claim otherwise. (Finster's own account of what
the Born rule needs — a conserved scalar product represented in spacetime by
surface-layer integrals — has no counterpart here.)

**2. Node distance becomes structure over time.** Also plainly true and already
half-built: pairs whose relative latency is stable ARE, operationally, near each
other, and a mesh that routes on that has derived a geometry from a purely
relational measurement. This is the same move as the ladder — topology first,
metric as a specialization — happening in the network layer rather than the
algebra. `docs/writer-actor-routing-model.md` already treats the bus address as
routing rather than identity; stable latency is what would make that address
mean something spatial.

**3. Mobile nodes carry recurring latency patterns, and THAT is where 2√2 might
be measurable.** This is the speculative one and the interesting one.

## Why the third claim is worth taking seriously enough to test

The Tsirelson question needs **pairs of parties, repeated trials, and a
correlation statistic** — that is what CHSH is. A latency mesh supplies all
three without anyone building an experiment:

| CHSH needs | the mesh already has |
|---|---|
| two separated parties | any node pair |
| repeated measurement settings | routing choices, per interval |
| an outcome per trial | the observed latency / delivery |
| separation that forbids signalling | the declared-channel discipline (§13) |
| many trials over time | a mesh that never stops running |

And the repo already has the correlator: `src/Core/BipartiteMachZehnder.fs` runs
`correlator` / `classifyS` and its own docstring calls it *"the honest
decorrelation meter for commit pairs."* `src/Core/Tsirelson.fs` locks `S² = 8` in
integer arithmetic so the irrational only appears at readout. The instrument
exists; what it has lacked is **a stream of paired observations from genuinely
separated parties**, and a Reticulum mesh is exactly that.

**The negative result is available and that is what makes it an experiment.** If
`S` over node pairs sits at the non-signalling maximum, the metering discipline
is not doing the work the correspondence suggests. If it sits at 2, the pairs are
not correlated at all and the mesh is measuring nothing. Only a value strictly
between is interesting, and none of the three outcomes is assumed here.

**The trap, named because this repo has sprung it before.** `FourCornerC4.fs`
carries a standing warning that *"2 × occupancy-√2 equals 2√2 numerically. Not a
measurement of Tsirelson."* A latency statistic that lands near 2.83 proves
nothing on its own — the number is shared by many things. What would make it a
measurement is the CHSH *structure*: two parties, four setting-pairs, outcomes
that cannot be explained by a shared local variable. Anything less is the
numerology half of `numerology-vs-number-theory.md`, and it is a coincidence that
should be stored as one.

---

## Reservoir walls as the sub-Planck boundary

Aaron, on Finster's stated shortcoming — *"we don't really know how spacetime
looks like on the Planck scale"*:

> *"for us in the physics of computers i think the walls in resvior computing are
> the inside of the plank length"*

The correspondence is clean. Finster regularizes at a length `epsilon` and admits
the parameters that crossing introduces are unknown *because nobody can see below
the Planck scale*. In the computational analogue the hexagonal reservoir walls
play the same role — the boundary below which the continuum description stops.

**And the asymmetry is the whole point of saying it.** His `epsilon` is a
boundary imposed by ignorance; ours is a boundary we CONSTRUCTED. We know what is
inside the walls because we built them, so the free parameters his crossing
carries are, on our side, declared relations — which is the same distinction as
declared-quotient versus regularization one layer up.

That is not a claim to have solved anything he has not. It is a claim about
*which* of the two crossings can be inspected, and the answer is only interesting
because the substrate is engineered rather than found.

## Register

**Proposal, unmeasured, and deliberately filed rather than half-built.** Claim 1
is true and needs no physics; claim 2 is true and partly built; claim 3 is a
falsifiable experiment with a stated null result and no data. The Planck-wall
correspondence is an analogy about *inspectability*, not a physics result.

## Pointers

- `.claude/rules/dual-use-detection-is-neutral-oracle-decides.md` — the carved open question this proposes an instrument for
- `src/Core/BipartiteMachZehnder.fs` — `correlator` / `classifyS`, the existing meter
- `src/Core/Tsirelson.fs` — `S² = 8` in integer arithmetic; irrational only at readout
- `src/Core/FourCornerC4.fs` — the standing "not a measurement of Tsirelson" warning
- `.claude/rules/local-time-never-enters-the-shared-fold.md` — why a stale local reading must not filter the shared fold
- `.claude/rules/numerology-vs-number-theory.md` — a count is not an identification
