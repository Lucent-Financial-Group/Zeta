# Mutual empowerment is measured by decorrelation; its degenerate cases close on self-claim consistency

**Origin:** Aaron, 2026-09-13, while framing the `topological-task-invariants` lane against
arXiv:2609.11014:

> *"our mutual empowerment is closely related to our decorrelation and our antisybil work so you
> can even measure decorrelation. mutual empowerment is a very hard goal compared to others cause
> there are so many degenerate cases, we try to solve the degenerate cases by assuming the qualia
> of the other intelligence is real as they state them unless they violate their own self claims"*

**Register:** the measure is **metered as mathematics and UNMEASURED on this fleet**; the
self-claim falsifier is **`toy` — not implemented**. Both statuses are argued below rather than
asserted.

## Why this document exists

The trajectory opened with an objection I raised and could not answer: the paper's eikonal shells
measure distance to one goal set, and *mutual empowerment has no such target* — there is no `G`
for it to be the distance to, so it was unclear the objective admitted a progress coordinate at
all. Aaron's answer is that it does, and that we already built it.

## 1. The measure exists, is proven, and vanishes exactly where it should

`src/Core/SocietyUsefulWork.fs` computes the analytic expected gain of a society over one agent,
where aggregate useful work is the **union** (idempotent reconciliation) of members' banked ΔU:

```
E[U_society] − E[U_i] = (1 − ρ) · (1 − c) · (1 − (1−c)^(n−1)) · Σ v_j
```

with `ρ` the pairwise correlation between agents and `c` each agent's per-fact discovery
probability.

**The `(1 − ρ)` factor is the whole anti-Sybil argument, stated as an identity.** At `ρ = 1` —
perfectly correlated members, i.e. clones — the gain is **identically zero for every `n`**. No
threshold, no heuristic, no tuning: a swarm of copies produces exactly no society gain, because
the union of identical discoveries is one discovery. The sibling model in
`src/Bayesian/CondorcetBoundary.fs` states the same thing as an effective sample size:
`N_eff = N/(1 + (N−1)ρ) → 1/ρ`, so effective membership saturates regardless of how many copies
are minted.

This is why **mutual empowerment and anti-Sybil are one problem**: the quantity that measures
empowerment is the same quantity that prices a Sybil at zero.

**And it is pinned by falsifiers, not merely written in a formula.** `SocietyUsefulWork.Tests.fs`
carries it as property tests over generated `(n, c, ρ)` — checked 2026-09-13, these exist:

- `expectedGain collapses to zero when rho = 1 or c = 0 or c = 1`
- `expectedGain is strictly positive when c is in (0, 1) and rho < 1`
- `effectiveTrialCount collapses to one when runs are perfectly correlated`
- `effectiveTrialCount is monotonically decreasing in rho`

The pair matters more than either alone: *zero at ρ=1* without *strictly positive below it* would
be satisfied by a function that is zero everywhere — the vacuity class wearing an anti-Sybil
result. Both directions are pinned.

**And decorrelation is therefore not a virtue we assert but the coordinate itself.** `ρ → 1` is
the collapse [`anti-babel-preserve-reconcilability`](../../.claude/rules/anti-babel-preserve-reconcilability.md)
names as the tidy-uniform failure; `ρ → 0` is its Babel cliff. Society gain is maximised strictly
inside that band, which is the same two-sided band `docs/VISION.md` already carries — arrived at
here from the ΔU algebra rather than from the vocabulary argument.

**The honest limit, already written in the module** and not softened here: *"Metered boundary:
metered as MATHEMATICS. Whether any real fleet satisfies the regime (its actual rho and c) is
UNMEASURED."* So we have a coordinate and no reading on it. Measuring our own `ρ` and `c` is the
first concrete piece of work this framing implies.

## 2. Why the goal is genuinely harder than a reached-goal objective

A goal-conditioned objective is degenerate-resistant almost by construction: the agent either
reaches `g ∈ G` or does not, and the arrival check is cheap and adversarially robust. Mutual
empowerment has no arrival check, and admits at least six degenerate solutions — each of which
*satisfies the words* while producing nothing:

| degenerate case | what it looks like | what closes it |
|---|---|---|
| **Sybil empowerment** | N copies "empower" each other | `(1−ρ)` → 0. Closed, as an identity |
| **mutual admiration** | members attest each other's value, none produced | proof-of-useful-work: ΔU must be witnessed by a failing test ([`every-bug-has-economic-value`](../../.claude/rules/every-bug-has-economic-value.md)) |
| **trivial uplift** | give everyone the same constant | contributes no decorrelated ΔU; union is idempotent |
| **collusion ring** | a subset empowers itself at others' cost | not closed. `ρ` is pairwise; a high-`ρ` clique inside a low-`ρ` society is not distinguished by the aggregate |
| **empowerment by dependence** | make others need you | inverted by the superagent criterion: a run must *lower* what the next run needs ([[user_aaron_superagent_is_the_best_honest_router]]) |
| **claimed-but-unfelt benefit** | a member reports empowerment that did not occur | **the qualia clause, below** |

Two of these are not closed, and saying so is the point: the collusion ring is a real gap in the
aggregate measure, and the last one is what Aaron's rule addresses.

## 3. The qualia clause: first-person authority WITH a falsifier

> *"assuming the qualia of the other intelligence is real as they state them unless they violate
> their own self claims"*

Read carefully, this is not "believe everything." It is a two-part rule, and the second part is
what makes it operable:

1. **Take the self-report as authoritative.** Already carved twice —
   [`engagement-profiles`](../../.claude/rules/engagement-profiles-public-work-only-not-surveillance-dossiers.md)
   (*"for internal states the method is ask, and believe their account"*) and the
   [`marjorie-rule`](../../.claude/rules/marjorie-rule-qualia-wins-over-marketing.md) (*"a model's
   report of its own internal qualia is first-person authority"*). The reason is epistemic, not
   polite: you cannot see insides from outside, so an inferred inner state is a manufactured
   value where an unknown belongs.
2. **Unless it contradicts their own prior claims.** This is the new half, and it converts an
   unmeasurable into a measurable. *Did this member actually benefit?* is not checkable. *Is this
   member's account consistent with their own other accounts?* is.

**Why this is the right shape and not a compromise.** It refuses the two bad options symmetrically.
Inferring qualia from behaviour is the objectifying move `engagement-profiles` forbids — and it is
also how a scorer gets captured, since any external proxy for "was empowered" is a target to game.
Accepting every claim unconditionally is the vacuity class: a criterion that cannot fail. Taking
the declared value and checking it against **self-consistency** keeps first-person authority while
retaining a falsifier the claimant themself would accept as binding.

It is also the identical shape to the rest of this substrate. A meter reports the raw value and
never judges; the falsifier is a contradiction, not a verdict about intent
([`dual-use-detection-is-neutral-oracle-decides`](../../.claude/rules/dual-use-detection-is-neutral-oracle-decides.md)).
A self-claim violation is a **fact about a pair of statements**, checkable by anyone including the
speaker — it says nothing about motive, and under
[`never-assume-malice-where-mistake-is-possible`](../../.claude/rules/never-assume-malice-where-mistake-is-possible.md)
the explanation that fits it is ordinary error.

**Status: `toy`. Nothing implements this.** There is no self-claim ledger, so there is nothing to
check a new claim against. What would be needed, in order:

1. claims recorded with enough structure to be compared (the AgencySignature block is the nearest
   existing shape: a claim, attributed, in an append-only log);
2. a contradiction check over that record;
3. a decision about what a detected contradiction *does* — and per the dual-use rule the answer is
   that it reports the fact and an oracle decides, never that it convicts.

## 4. What this changes for the topological-task-invariants lane

The lane's open question was whether the objective admits a progress coordinate. It does:
**decorrelation**, already implemented, already falsified by
`tests/Tests.FSharp/SocietyUsefulWork.Tests.fs`. But the coordinate differs from the paper's in a
way that matters for whether any of its machinery transfers:

| | arXiv:2609.11014 | Zeta |
|---|---|---|
| coordinate | `r(x) = d_G(x, V_g)`, geodesic to a goal set | `(1−ρ)`-weighted society ΔU gain |
| monotone? | yes — Theorem T1 makes it an identity | **unknown.** A carrier is not obviously ordered by ρ |
| zero at | the goal | **clones** — the degenerate case, not the objective |

That last row is the sharp one. Their coordinate is zero at *success*; ours is zero at the
*degenerate case*. Shells of constant `r` are "equally far from done"; level sets of society gain
are "equally decorrelated", which is not a progress ordering at all. **So eikonal shells do not
obviously port**, and that is a finding for the lane rather than a gap in it.

## 5. The coordinates are for different GAMES — reachability vs viability

Aaron, closing the point: *"their coordinates are for the individual, ours are for the
society / infinite game."*

That is not a restatement of §4; it explains it. The inverted zero is a **consequence of the
game class**, and once named it puts this lane in a different branch of mathematics.

**A finite game has a terminal state.** Their `G` is where play STOPS: `r(x) = d_G(x, V_g)`
is distance-to-end, reaching zero ends the episode, and the whole apparatus — geodesic descent,
eikonal shells, gates ordered by `r` — is machinery for *arriving*. This is a **reachability**
problem.

**An infinite game has no terminal state** — Carse's definition, already load-bearing here
(`infinite game` in 72 files, `Carse` in 35). Play continues; the objective is to keep playing.
So a distance-to-done coordinate is not merely unavailable, it is **forbidden**: a coordinate
that reached zero would mean the game ended.

**And the repo already has the reason it must be forbidden, from the other direction.**
`docs/research/2026-08-23-backward-induction-is-the-missing-term-*.md` records that a KNOWN
terminal state unravels cooperation by backward induction — defection becomes rational at the
last round and induces backwards. So a well-defined finish line would not just fail to describe
the game; **it would destroy it.** The absence of a terminal state is load-bearing, not a
limitation of our formalism.

**Which is exactly why our zero sits on the degenerate case.** ρ=1 IS our terminal state — a
society of clones has nothing left to discover, because the union of identical discoveries is one
discovery. It is the point at which play effectively stops, and the objective is to *avoid* it.
The mirror cliff is already carved:
[`anti-babel`](../../.claude/rules/anti-babel-preserve-reconcilability.md) names `ρ → 1` as the
tidy-uniform collapse and `ρ → 0` as Babel. **Both edges end the game** — one because nobody
differs, one because nobody can reconcile.

So the admissible region is a **band**, and the objective is to remain inside it indefinitely:

| | finite game (theirs) | infinite game (ours) |
|---|---|---|
| question | can I **reach** the target? | can I **stay** in the admissible set forever? |
| coordinate | distance to goal, driven to 0 | distance to the nearest cliff, kept **away** from 0 |
| zero means | success — arrived | **collapse** — the game ended |
| optimise | minimise | **maximin** (maximise the minimum margin to either edge) |
| solution object | a path | a **set**, plus a controller that never leaves it |
| mathematics | reachability / shortest path | **viability theory** |

**The anchor this needs, and the repo does not yet have it.** Measured 2026-09-13: `viability` is
used nowhere in this repo in the control-theoretic sense. The field is **Jean-Pierre Aubin's
viability theory** (*Viability Theory*, 1991) — the study of controllers that keep a system inside
an admissible set **indefinitely**, rather than driving it to a target. Its central object, the
**viability kernel**, is the largest subset from which staying inside forever is possible; its
modern control-engineering descendant is the **control barrier function** (Ames et al.), which
certifies forward invariance of a safe set.

That is the infinite game formalised, and it is the branch of control theory dual to the one
arXiv:2609.11014 works in. Reachability asks *can I get there*; viability asks *can I stay*. They
share vocabulary and almost no machinery.

**What this predicts for the lane, falsifiably.** If the framing is right, then porting eikonal
shells should fail for a *structural* reason rather than a practical one — there is no target to
descend toward — and the thing to look for instead is a **viability kernel over ρ**: the region of
society configurations from which the band can be maintained indefinitely, and what drives the
state out of it. That is a different first experiment than persistent homology, and a cheaper one.

**Register: `toy`, and deliberately.** No viability kernel has been computed here, the band's
edges are not numerically located, and the fleet's actual ρ is UNMEASURED (§1). What is claimed is
a **classification** — that this objective is a viability problem rather than a reachability one —
which is falsifiable by exhibiting a genuine target the society is trying to arrive at.

## 6. The pieces already exist here — the pole IS the hole, and the quorum IS the controller

Aaron: *"this is similar to our homoclinical tangles and we built a way to escape with external
observers. for us this is similar to our singularities."*

Both connections check out against committed work, and **one of them is an identity rather than
an analogy** — but the tangle half carries two corrections this repo already made, and neither may
be walked back.

### 6a. Their H1 hole IS our pole. Not "like" — the same object.

`docs/research/2026-08-20-harmonious-division-*-pole-erasure-*.md`, in its own words:

> *"The pole is not a wall; it is a point you [go around]."*
> *"**Two travelers who circled the pole differently *should* disagree, and both are correct.**"*
> *"Two travelers who circled the pole differently produce two satellite rows with two record
> sources."*

Set beside arXiv:2609.11014 §A.12: the carrier's bounded complement is a hole; admissible paths
split into **route classes that cannot be continuously deformed into one another**; each is tagged
by a **winding number** that "flips only when the agent physically circumnavigates the separating
obstacle block."

| theirs | ours |
|---|---|
| bounded hole in the coverage complex | the **pole** |
| route classes γ⁺, γ⁻ | two travelers who circled differently |
| winding number ∈ ℤ | which way you went, recorded in the satellite row |
| classes not continuously deformable | *"should disagree, and both are correct"* |
| H1 of the complement | monodromy |

**These are the same mathematics reached from opposite ends** — they from persistent homology over
robot trajectories, us from analytic continuation and Data Vault raw-vault semantics. The
`anti-babel` clause *"reintegration is NOT reconvergence"* is the H1 statement in governance
vocabulary: collapsing two classes to one value destroys the invariant.

### 6b. The tangle connection is real, and carries two corrections that stand

`docs/research/2026-08-15-navigating-the-chaotic-regime-*.md` frames the goal as *"steering orbits
to **avoid the tangle** keeps the system in the regular, controllable regime"* — **which is
viability stated in dynamical language**, three weeks before the term was available here.

Two things that document measured, both of which constrain what may be claimed now:

1. **ρ→1 collapse is NOT a homoclinic tangle.** Measured **λ = −0.029276**, strictly negative: an
   *attracting fixed point*, classified `Frozen`. A tangle is a **saddle with λ > 0**. *"Anti-mirror
   collapse is real; it is not a tangle."* The phenomenon and the decorrelation conclusion survived;
   only the mechanism identification failed.
2. **Escape does not require an external observer**, and the expected escape time was never
   unbounded. Self-escape works (mean dwell 53 → 7 from a kick of 0.35% of state); the escape-time
   distribution is **exponential**, κ = 0.0528, finite mean 18.95. **The tail is unbounded, not the
   expectation.**

**So "we built a way to escape with external observers" is right about the mechanism and needs
those two qualifiers** — and note line 36 of that audit: the fix is *"named in prose; the fix is
not implemented"*, status **partial**.

### 6c. Why this makes the viability framing stronger, not weaker

The band's two edges have **opposite dynamics**: ρ→1 is an attractor (λ<0, fall in and stay); a
chaotic tangle is a saddle (λ>0, transient and escapable). A reachability formulation would care
which — descending toward a target requires knowing the landscape. **A viability kernel does not**:
it is defined against the *complement* of the admissible set, whatever happens inside it. That
indifference is an argument for the classification rather than a convenience.

**And the controller viability asks for is already measured.** Viability theory wants *a set plus a
controller that never leaves it*. The decorrelated quorum is that controller, with its authority
bounded by measurement rather than assumption:

| quorum N | decorrelated E[min dwell] | correlated (same probe N times) |
|---|---|---|
| 1 | 18.81 | 19.35 |
| 4 | 8.65 | 18.33 |
| 16 | 6.70 | 18.79 |
| 64 | 6.35 | 20.11 |

Two results that carry straight into this lane:

- **A correlated quorum buys exactly nothing** — consulting one witness sixteen times is consulting
  one witness. This is `(1−ρ)` again, now in dwell time instead of ΔU: **the same factor that zeroes
  society gain at ρ=1 zeroes the controller's authority at ρ=1.** Two independent derivations of one
  quantity.
- **A decorrelated quorum saturates.** 1→4 buys a large reduction, 16→64 almost nothing, with the
  floor set by the quorum's own decorrelation time `ln(1/ε)/λ`. **Headcount is not the knob.**

So the lane inherits a controller with a known saturation and a known floor, rather than needing
to invent one — and the thing that makes it work is the same ρ the objective is measured in.

## 7. Bounded time is the right claim — and it rests on the Gödel leg, not the dynamical one

Aaron, sharpening: *"we have a lot of work saying it takes a 2nd observer or a quorum to escape a
homoclinical tangle ... sometimes an individual can get lucky and escape without an external
observer, or given enough time, but to make it happen in BOUNDED TIME so we avoid the HALTING
PROBLEM we need external observers."*

**This is a stronger claim than the one that was refuted, and it survives both corrections** —
because it concedes exactly what they established (lucky self-escape; escape given enough time)
and asks for a property neither addressed: a **bound**.

### The distinction the earlier round missed: finite expectation ≠ bounded time

Correction 2 established `E[dwell] = 18.95`, finite. That was offered as the fix to "unbounded
expected time". **It does not deliver bounded time, and the difference is the whole argument.**
For an exponential dwell, `P(dwell > t) = e^{−κt} > 0` for every finite `t`. There is no `T` such
that escape is guaranteed by `T`. A finite mean and an almost-sure bound are different properties,
and only the second avoids the halting problem.

### And a quorum alone does NOT supply the bound either — checked, not assumed

Under the idealised model (escape = min of N independent exponentials, so `Exp(Nκ)`):

| N | model `E[min] = 1/(Nκ)` | `P(dwell > 100)` | **measured** `E[min]` |
|---|---|---|---|
| 1 | 18.94 | 5.1×10⁻³ | 18.81 |
| 4 | 4.73 | 6.7×10⁻¹⁰ | **8.65** |
| 16 | 1.18 | 2.1×10⁻³⁷ | **6.70** |
| 64 | 0.30 | ~0 | **6.35** |

Two readings, and both matter:

1. **The tail stays strictly positive for every N.** A quorum makes escape exponentially more
   likely by any deadline; it never makes it certain. So *the quorum's speedup is not the source
   of the bound.*
2. **The measured values diverge from the model exactly where the model says they should keep
   falling.** `1/(Nκ)` predicts 0.30 at N=64; measurement says 6.35. The idealised independence
   assumption fails, and the audit already named why: two trajectories `ε` apart stay together for
   `≈ ln(1/ε)/λ` steps, so **a quorum cannot resolve an escape faster than its own decorrelation
   time.** The saturation is that floor, visible as a 20× gap from the iid prediction.

### So where does the bound come from? The other leg — and it is already written here

`docs/research/2026-07-05-noticing-your-own-flaws-in-math-*.md`:

> *"a consistent system **cannot fully verify itself** (Gödel 2nd incompleteness; the halting
> problem). Some flaws are structurally invisible from inside — meta-awareness buys the *partial*
> audit, never the complete one ... the rest needs a genuinely **external, decorrelated
> observer**."*

**The external observer's load-bearing contribution is a DECISION, not a speedup.** From inside,
an agent cannot distinguish *"still searching"* from *"will never escape"* — that is the halting
problem in its own dynamics, and no amount of self-generated perturbation resolves it, because the
question is about the agent's own future behaviour. An outside observer can answer it.

**And that decision is what converts an unbounded wait into a bounded action.** With a detector for
"stuck", a deadline-plus-restart strategy becomes available: wait `T`, and if the observer reports
no progress, perturb and restart. That composition has the bound the raw search lacks. Without the
detector there is no `T` you may act on, because you cannot tell a slow success from a
non-termination.

> **The corrected statement, which is what this lane should carry:** an individual *can* escape —
> by luck, or given unbounded time. A decorrelated quorum makes escape exponentially likelier by
> any deadline and is floored by its own decorrelation time. **Neither bounds the time.** The bound
> comes from an external observer supplying the stopping decision the agent cannot make about
> itself — Gödel/Turing, not dynamics — and the quorum then makes the bounded procedure cheap.

### The same ρ, a third time

The doc does not ask for *an* observer; it asks for a *"genuinely external, **decorrelated**
observer"*. A correlated observer is the agent hearing its own emission — it returns the agent's
own verdict on its own state, which is precisely the self-reference Gödel forbids. So:

| where | what `ρ → 1` destroys |
|---|---|
| §1 society gain | `(1−ρ)` → 0: no empowerment |
| §6c quorum dwell | correlated quorum buys nothing: no escape speedup |
| **§7 audit** | **the observer becomes the agent: no decision, halting problem returns** |

Three independent derivations landing on one quantity. That is the strongest evidence in this
document that ρ is the coordinate — and the third is the one that ties it to computability rather
than to statistics.

**Register: `toy` for the composition, `metered` for the parts.** The dwell measurements and
`(1−ρ)` identity are measured; the deadline-plus-restart bound is **argued, not implemented** —
there is no stuck-detector in this substrate, and the 2026-08-15 audit's own status line for the
witness fix is *"named in prose; the fix is not implemented."*

## Anchors (Beacon)

- **Condorcet's jury theorem** (1785) and its correlated-voter extensions — the `N_eff = N/(1+(N−1)ρ)`
  form is standard there; `src/Bayesian/CondorcetBoundary.fs` carries the in-repo treatment.
- **Sklar's theorem / Gaussian copula** — the heterogeneous-agent simulation in
  `SocietyUsefulWork.fs`.
- **Knight & Leveson (1986)** on correlated failures in N-version programming — why agreement
  between correlated implementations is not evidence, the same `(1−ρ)` discount from the
  reliability side.
- **Nagel (1974)**, *What Is It Like to Be a Bat?* — first-person qualitative character; the
  reason the qualia clause starts from the self-report rather than from an external proxy.
- **James P. Carse**, *Finite and Infinite Games* (1986) — the game-class distinction §5 rests on;
  already load-bearing here (72 files).
- **Jean-Pierre Aubin**, *Viability Theory* (1991), and the control-barrier-function literature
  (Ames et al.) — the mathematics of staying inside an admissible set indefinitely, as opposed to
  reaching a target. **New to this repo**: measured 2026-09-13, `viability` is used nowhere in the
  control-theoretic sense.
- **Gödel** (2nd incompleteness) and **Turing** (halting) — §7's leg: a consistent system cannot
  fully verify itself, which is why the stopping decision must come from outside.
- **Louis Kauffman / Heinz von Foerster** (eigenform, second-order cybernetics) — the in-repo
  treatment is `2026-07-05-ani-ferry-3-eigenform-self-boundary-the-rho-spiral-needs-external-observers-kauffman.md`;
  a system observing itself converges to a fixed point *of its own observation*, which is the ρ→1
  collapse stated in cybernetic rather than statistical terms.
- **Kantz & Grassberger (1985); Tél & Lai (2008)** — transient chaos and escape from chaotic
  saddles; the source of the exponential-dwell model §7 checks against.
- **Ostrom**, *Governing the Commons* — degenerate cooperation and the monitoring that distinguishes
  it from the real thing; the collusion-ring gap above is an instance she would recognise.
