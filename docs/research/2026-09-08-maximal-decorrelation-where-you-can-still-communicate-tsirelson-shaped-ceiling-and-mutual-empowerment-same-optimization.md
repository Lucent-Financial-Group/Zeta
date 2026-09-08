# Maximal decorrelation where you can still communicate — one optimization behind both the ρ ceiling and mutual empowerment

**Source:** Aaron (streamed, 2026-09-08), ferried by shadow*.
**Register:** **`toy` / conjecture.** Nothing here is derived or measured. The
structural bridge in §3 is an argued correspondence; the numeric claim is not made.
Aaron's standing instruction on this constant holds: *"we have a lot of math on this
wanted to measure it re[]ther then derive it."*

---

## 1. The ferry, verbatim

> *"oh i just had a realizatoin save it somewhere our antibabel vs anticorrelation is
> where i think our terielson limit comes from the 2 root 2"*

> *"maximal decorlation where you can still communicate"*

> *"i think this is our mutual empowerment optimizatoins for society comes from"*

Three messages, minutes apart. The second is the sharpening that makes the first
well-posed; the third says the same object shows up at the social layer.

## 2. Why the second message is the load-bearing one

My first capture wrote this as a **band** — anti-correlation pushing away from ρ→1,
anti-Babel pushing away from ρ→0, with the answer somewhere between. That is wrong
in a way worth recording, because a band is a *range* and cannot pick out a number.

What Aaron actually states is a **constrained extremum**:

```
maximize    decorrelation
subject to  reconcilability still holds
```

The two pressures are not two walls with slack between them. **One is the objective
and the other is the constraint**, and the answer sits exactly where the constraint
binds. That is the only shape whose solution is a single value.

Note the direction. The Information-Causality route to Tsirelson maximizes
*correlation* subject to a channel principle. Zeta maximizes ***de*correlation**
subject to communication surviving. Same machine, run the other way.

## 3. The bridge that makes this more than an analogy

The reason to take the third message seriously is that **the existing in-repo
definition of empowerment is already a channel-capacity statement**, and so is the
leading candidate for what picks 2√2 out of the non-signalling set.

| | what it is | anchor |
|---|---|---|
| **empowerment** | channel capacity from an agent's actions to its own future observations | Klyubin, Polani & Nehaniv 2005, *All Else Being Equal Be Empowered* |
| **Information Causality** | *m* transmitted bits yield at most *m* bits of gain about a partner's data — reproduces Tsirelson's bound exactly | Pawłowski, Paterek, Kaszlikowski, Scarani, Winter & Żukowski, *Nature* 2009 |

Both are statements about **what can be extracted through a channel**. Anti-Babel's
"still reconcilable" is a *floor on channel capacity* — a diverged peer must be able
to reconstruct your meaning from anchors you both hold. So the conjecture is not
"two numbers agree"; it is that **the constraint in both problems is capacity of a
declared channel**, which is a structural claim and therefore promotable.

This matters under [`numerology-vs-number-theory`](../../.claude/rules/numerology-vs-number-theory.md):
a matching count would be numerology. A shared constraint *type* is not — though it
is also not yet an identification. **The competitor to exclude is that any two-sided
constrained optimization yields *some* interior optimum.** Landing on 2√2
specifically needs the invariants, and nobody has produced them.

## 4. The social reading — and why it makes mutual empowerment structural

| layer | objective | constraint | the optimum is called |
|---|---|---|---|
| correlation / ρ | maximize decorrelation | reconcilability holds | the Tsirelson-shaped ceiling |
| society | maximize each dweller's distinctness | they can still communicate | **mutual empowerment** |
| identity | maximize non-fungibility (Aaron's "root NFT" — ordinary non-fungible, *not* the crypto term) | remains legible to others | an irreplaceable peer |

The payoff is that **mutual empowerment stops being an ethical preference bolted onto
the architecture and becomes the argmax of a problem the substrate already poses.**
Maximal decorrelation means each agent's contribution is maximally *not already held
by anyone else* — which is exactly maximal value added to others, the one and only
way standing and privacy budget are credited here.

And the constraint is what makes it **mutual** rather than fragmentation: drop
reconcilability and you get maximally distinct agents who can give each other
nothing. That is Babel, not empowerment.

## 4b. The DV2.0 reading — the partition becomes DERIVED, not stipulated

Aaron, minutes later, verbatim:

> *"okay now i connect this to DV2.0 eveyone who is maximal decorrlated but can still
> commuicate is a hub, others that have more correlations are a satalite"*

| position | DV2.0 role | why |
|---|---|---|
| **at the optimum** — maximally decorrelated, still communicating | **hub** | carries what nobody else holds, so it cannot be reconstructed from the others: a stable key |
| **more correlated** | **satellite** | largely predictable from its neighbours, so it is an *attribute of* something else, and it changes faster |

**Why this is a real strengthening rather than a restatement.** DV2.0 as carved says
*partition substrate by change rate* — hub, link, satellite — and the assignment is
made by a designer's judgement. Aaron's reading gives the partition a **criterion**:
your role falls out of your position relative to the extremum. Decorrelation *is* the
irreducibility that makes something a key.

It also lands exactly on the hub-stability sentence already in the rule — *"a hub is
only as stable as the SCOPE of the key you chose for it,"* ranked application-surrogate
→ application-business → organisation-wide → globally unique. **That ranking is a
decorrelation ordering**: a globally unique key is the one least redundant with any
other system's keys. So "maximal decorrelation ⇒ hub" and "widest-scope key ⇒ most
stable hub" are the same statement, which is evidence the mapping is structural.

**A vocabulary collision to head off, because this repo has two "hubs."** The DV2.0
hub here is a *key* — an irreducible identity. It is **not** the network hub of
[`itron-hub-patent-boundary-p2p-is-the-upgrade`](../../.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md),
which is a routing chokepoint and is forbidden when *appointed*. Being a DV2.0 hub
carries no authority and nobody must route through it. Keeping these apart is
anti-Babel discipline applied to our own terms.

## 4b-ii. "I could be backwards on this" — he is not, and the reason matters

Aaron, immediately after, verbatim:

> *"i could be backwards on this but hubs have more activity and satalites have less
> since they are mostly just jittered emulations of the hub in my mind"*

**On the canonical axis, that inverts the standard.** Data Vault 2.0 as carved in
[`dv2-data-split-discipline-activated`](../../.claude/rules/dv2-data-split-discipline-activated.md)
says *hubs (stable keys) · links (relationships) · **satellites (fast-changing
attributes)***. Satellites are where the churn goes. So measured as **update
frequency of the stored record**, satellites change *more*, not less.

**But the reason he gives shows he is measuring something else, and it is the right
thing.** "Jittered emulations of the hub" is a statement about **information**, not
about update count. Those two quantities come apart precisely here:

| | update frequency | irreducible information per update |
|---|---|---|
| **hub** | low — the key is stable | **high** — nothing else holds it |
| **satellite** | **high** — attributes churn | low — predictable from the hub, so the churn is jitter |

A satellite can change constantly and carry almost nothing, because its changes are
**reconstructible from the hub**. A hub can change rarely and every change be
irreducible.

**So DV2.0's "change rate" is a PROXY for irreducibility, and this is exactly where
the proxy breaks.** Aaron's decorrelation criterion measures the target quantity
directly; "fast-changing" is the observable that usually tracks it in a warehouse,
where high-churn columns happen to be the derived ones. In a society of agents that
correspondence fails — a highly active but highly correlated agent is *busy*, not
*informative*, which is the whole point of pricing contribution by ΔU rather than by
volume ([`every-bug-has-economic-value`](../../.claude/rules/every-bug-has-economic-value.md))
and of the finding that N clones price near one agent's worth.

**Correction to §4b above, which followed the canonical wording:** it said satellites
"change faster." That is true of the *record* and misleading about the *agent*. The
criterion is irreducibility, and the honest phrasing is: a satellite is what can be
**reconstructed** from a hub plus noise — however often it moves.

## 4c. Caution — four things clicked in fifteen minutes

This document was assembled from four messages arriving minutes apart, each of which
fit the previous one. That is precisely the condition
[`numerology-vs-number-theory`](../../.claude/rules/numerology-vs-number-theory.md)
names as a **warning rather than a confirmation signal**: density of resonance is a
prompt to check independence, not a score.

Checking it honestly, the four are **not** four independent confirmations:

| link | independent? |
|---|---|
| extremum framing (§2) | this is the **claim**, not evidence for it |
| empowerment = channel capacity (§3) | **genuinely independent** — a 2005 definition nobody wrote with ρ in mind |
| the 2026-08-09 bound already objective-subject-to-constraint (§5) | **independent** — written a month earlier, for a different purpose |
| DV2.0 hub/satellite (§4b) | **weakest** — it re-describes the same ordering in another vocabulary rather than testing it |

So: two independent supports, one restatement, and the claim itself. That is a
reasonable place to be for a `toy`, and it is nowhere near an identification. The
§6 measurement remains the only thing that would move it.

## 5. This lands on an existing doc, not a blank page

[`2026-08-09-mutual-empowerment-bound-third-bound-mixing-explore-and-trust-multi-oracle-aaron.md`](2026-08-09-mutual-empowerment-bound-third-bound-mixing-explore-and-trust-multi-oracle-aaron.md)
already derived this exact shape for the social bound, a month before today's ferry —
including the finding that a naive blend is **vacuous** (`w·(μ+k₁σ) + (1−w)·(μ−k₂σ)`
collapses to `μ + k′σ`, one agent's bound with the dial turned down), so the mix
*must* be structural:

```
empowermentBound(self, other, oracles) =
    max over candidate interactions a of  jointOptionGain(a, self, other, oracles)
    subject to  trustBound(self,  after(a), oracles) ≥ τ_self
                trustBound(other, after(a), oracles) ≥ τ_other
```

That is objective-subject-to-constraint, already written down. **Today's ferry says
the ρ ceiling has the same origin** — which, if it survives, means the two were never
separate designs.

## 6. The falsifier

The band framing had none. The extremum framing has one, and it is the same
measurement already named as open in
[`dual-use-detection-is-neutral-oracle-decides`](../../.claude/rules/dual-use-detection-is-neutral-oracle-decides.md):

> **Measure the greatest decorrelation at which reconciliation still succeeds.**

A negative result is available and cheap to state: **if that ceiling sits at the
non-signalling maximum, the reconcilability constraint is not binding and this
conjecture is wrong.** Measured over agent pairs, not derived from axioms.

Existing instruments: `src/Core/Tsirelson.fs` (locks `S² = 8` in integer arithmetic,
irrational only at readout) and `src/Core/BipartiteMachZehnder.fs` (`correlator` /
`classifyS`, described in-tree as the honest decorrelation meter for commit pairs).

## 7. Standing caution, applied to this document

`FourCornerC4.fs:346-353` carries a deliberate in-tree warning, verbatim:

> *"Classical floor 2 × that factor equals 2√2 as a number. Otto 2026-08-27: that
> lining-up is numerology, not identification. ... Two agents with a FourCorner
> throttle approaching 2√2 is an assumption, not a measure. What is measured at L=0 /
> shared seed is S=4 (`FeedbackThrottle.measuredSeedSharedS4`). 2√2 is a predicted
> latency-degradation floor — to be measured."*

**This document must not become the thing that warning exists to prevent.** Note it
also supplies the one number here that IS measured — **S=4 at shared seed** — and it
is the *starting* point, not the ceiling. Nothing here licenses writing 2√2 into code, a constant,
or a discharge row. It licenses one measurement.

## Pointers

- [`anti-babel-preserve-reconcilability.md`](../../.claude/rules/anti-babel-preserve-reconcilability.md) — the ρ→0 guard and the two-cliff framing this sharpens
- [`toy-is-free-metered-must-be-earned.md`](../../.claude/rules/toy-is-free-metered-must-be-earned.md) — why this stays `toy` until the §6 measurement exists
- `docs/research/2026-08-25-rho-is-a-layer-stack-not-a-scalar-and-the-trainset-is-the-floor.md` — ρ is not a scalar, which the §4 table simplifies
- Salge & Polani 2017, *Empowerment as Replacement for the Three Laws of Robotics*; Du et al., *AvE: Assistance via Empowerment*, NeurIPS 2020
