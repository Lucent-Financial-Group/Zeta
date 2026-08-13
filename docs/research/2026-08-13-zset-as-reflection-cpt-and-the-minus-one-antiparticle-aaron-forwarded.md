# Z-set as reflection — CPT, and −1 as the antiparticle (Aaron, 2026-08-13)

> **Aaron:** *"our zset is like a reflection modeled over the start to end so t0 = t_infinity with CPT
> symmetry and −1 is the antiparticle, for us at least"*

Note the *"for us at least"* — the claim is already scoped as ours, not as physics. This note takes it
seriously and separates the three legs, because they are not equally supported. One is shipped code,
one is a real structural property under a different name, and one is a letter too many.

## Leg 1 — "−1 is the antiparticle": CHECKED, and it is in the code, not the commentary

- `src/Core/CostarZSet.fs:13` — *"removing one is the **Z-set antiparticle** (`removeTitle`, `−1`
  weights) — `add then remove = identity`"*
- `src/Core/CostarZSet.fs:48` — *"**Incremental retraction** of a title (the Z-set antiparticle, `−1`
  weights): `add` then `remove` = identity."*
- `src/Core/SchemaZ.fs:291` — *"Revoke: the field becomes absent. (−1 — a retraction, the
  antiparticle.)"*

The **Feynman–Stückelberg** anchor is the right one and it is tight rather than decorative. A positron
is an electron with reversed charge — *the same particle*, sign flipped; Stückelberg and Feynman read
it as propagation backward in time. A Z-set retraction is *the same element*, weight negated, and
`+1` against `−1` **annihilates to identity**. That is pair annihilation, with the same algebra.

It is also why revocation in this substrate is never a delete. You do not remove the record; you emit
its antiparticle and let the fold cancel. History stays intact and the *net* changes — which is §5
memory preservation obtained as a side effect of the algebra rather than as a policy.

## Leg 2 — "CPT symmetry": one letter too many, and the honest version is stronger

**Aaron, on being told CPT was not in-tree:** *"yes i thought we did some CPT formal analysis but i
could be mistaken, maybe not code yet."* **He was not mistaken — I under-reported it.** There is a CPT
analysis, dated **2026-06-07**, in
`docs/research/2026-06-07-compression-as-self-bootstrapping-compiler-over-generators-dst-regeneration-the-substrate-shannon-lacks-aaron.md`
§*"The physical floor: under CPT symmetry, all noise is ultimately reversible"*:

> Aaron, 2026-06-07: *"If physics is right, all noise is reversible ultimately under CPT symmetry."*

Its argument: fundamental physics is unitary and CPT-symmetric, so microscopic evolution is reversible
and information is never truly destroyed (the same principle behind the black-hole information-paradox
resolution). Apparent noise is **macroscopic coarse-graining** — the thermodynamic arrow, Loschmidt's
paradox — not fundamental erasure. So the deepest lens leaves **no residual**: all noise is
in-principle reversible, hence regenerable, and Bayesian uncertainty is the coarse-grained shadow of
information that is reversible-in-principle but untracked-in-practice. That doc ties it directly to the
substrate: signed weights have a defined inverse (`+w` / `−w`), DST replays reversibly, and
git-as-event-store only *adds corrections, never destroys*.

**So the acronym is doing two different jobs, and only one of them is sound.**

- **The 2026-06-07 use — CPT as the warrant for reversibility / non-destruction of information.**
  Defensible, already load-bearing, and it is what grounds retraction-instead-of-delete. It does not
  require decomposing anything into C, P and T; it uses the *theorem's conclusion* (microscopic
  reversibility) as a physical floor.
- **The 2026-08-13 use — CPT as a symmetry decomposition of the Z-set itself.** This is the new claim,
  and it is the one that comes up a letter short. Taking it apart:

- **C (charge conjugation) = negate every weight.** Clean, exact, and already the antiparticle map
  above.
- **T (time reversal) = reverse the stream order.** Here is the subtlety: the Z-set fold is a
  **commutative** monoid, so reversing the order changes *nothing*. As a symmetry claim that looks
  trivial — and a trivially-satisfied symmetry constrains nothing.
- **P (parity) = ???** There is no spatial reflection in a Z-set. **This is the gap**, and no amount of
  the other two letters fills it.

So `CPT` as stated does not hold, for the plain reason that two of the three operations are not
defined on the object. But the interesting part is what happens when you stop defending the acronym:

**T-invariance is not trivial here — it is the load-bearing design property, and it already has a
rule.** The fold being commutative means *the shared conclusion cannot depend on the order in which
evidence arrived*. That is precisely
[`local-time-never-enters-the-shared-fold`](../../.claude/rules/local-time-never-enters-the-shared-fold.md):
two nodes with different receive-orders must fold the same set to the same conclusion, or they
diverge. So the substrate is **manifestly T-invariant by construction**, and that invariance is doing
real work — it is what makes multi-planet convergence possible under reorder and skew.

The honest statement is therefore **not** "we have CPT" but something more specific and more
defensible: *the fold is T-invariant by construction, and C is a first-class operation on it.* If a
parity analogue exists, name it and the claim upgrades. If it does not, the acronym should be dropped
and the two real properties kept — they lose nothing by being called what they are.

**Open question, stated so it can be answered:** is there anything in the substrate that plays the
parity role — an orientation-reversing involution that is not time and not charge? Candidates worth
checking rather than assuming: the over/under crossing sign in `Braid.fs` (a genuine orientation
datum), or the emit/retract *direction* as distinct from the weight's sign. If one of those is a
genuine P, the CPT framing earns its third letter.

## Leg 3 — "t₀ = t_∞", the reflection: true for CLOSED histories, and that is the interesting case

The claim is that the Z-set is a reflection over start-to-end, identifying the beginning with the end.

**As stated for all Z-sets it is false**: a Z-set whose elements were added and never retracted has a
non-zero total, so `t₀ ≠ t_∞`. The state at the end is simply not the state at the beginning.

**For a closed history it is exactly right, and it is a conservation law.** If every emission is
eventually retracted, the weights sum to zero and the fold returns to its origin. Start and end agree
— not because nothing happened, but because everything that happened was answered. The history is
fully present; the *net* is zero.

That is the same shape as the book's `e^{iπ} = −1` motif — *the phasor returns to the real axis*, the
return held without collapse. The excursion is real, the record is kept, and the endpoint coincides
with the origin. It is also the shape of `add then remove = identity` at the scale of a whole history
rather than a single element.

So the reflection is a property of **completed** histories, and naming that condition is what makes
the claim usable: *a history is closed exactly when its Z-set folds to zero.* That is checkable, and
it gives "t₀ = t_∞" a truth condition instead of a vibe.

## Companion result — the symmetry group, the tick, and the hierarchy pun (Lumen, 2026-08-13)

Three related claims were routed for independent review the same day, with Aaron's explicit
permission for them to fail: *"we may even find bugs in the traveler frame or his physics or neither
and just see they are analogy or just different, it's all interesting findings."* All three came back
negative, and two of the negatives are sharper than the questions.

### The group exists — and it is the wrong KIND of group

My framing of the question was aimed one level off. I argued a join-semilattice is not a group, so
Wigner cannot apply. That reason is wrong: **Minkowski space is not a group either** — it is an affine
*space* acted on by Poincaré. The frame set is the **space**; one asks for its automorphisms.

And they exist. `Frame = Map<string, Versionstamp>` (`src/Core/TravelerFrame.fs:40`) with `⊥ = origin`
(`:43`) and pointwise-max join (`:64–73`) is the finitely-supported product of ℕ-chains, ℕ^(A). In a
join-semilattice `a ≤ b ⟺ a ∨ b = b`, so join-automorphisms are exactly order-automorphisms; those
permute axes and act within each chain, and `Aut(ℕ, ≤)` is trivial. Hence:

**Aut(Frame, ∨) ≅ Sym(A)** — the symmetric group on the actor index set. (Allow ℤ coordinates and
translation commutes with pointwise max, giving **ℤ^A ⋊ Sym(A)**, a discrete translations-⋊-rotations
shape.)

**Wigner still does not apply — three independent failures, any one fatal:**

1. **The covering step is vacuous.** Wigner's machinery runs on the universal cover of a *connected
   topological* group; SU(2) → SO(3) is where spin comes from. `Sym(A)` is discrete, hence its own
   universal cover. No spin, no double-cover content. (Near-miss worth logging: Schur 1911 gives
   `H²(Sₙ, U(1)) = ℤ/2`, so `Sₙ` *does* carry projective "spin representations," labelled by strict
   partitions of n. **Nothing in-tree is labelled by strict partitions** — checked by absence.)
2. **No Hilbert space carries the representation.** `AmplitudeEmu.Amp` is amplitudes over
   `Chip8Cow.Frame` (`src/Core/AmplitudeEmu.fs:41`) — **not** over traveler frames. The group acts on a
   set that nothing quantum-like is built on.
3. **The dynamics is not equivariant.** `transform` is `Sym(A)`-equivariant, but `observe` takes a
   *named* actor (`TravelerFrame.fs:47`) and actors have distinct roles. Permutation is a symmetry of
   the poset, not of the system, and no equivariance test exists in any port.

**And the file already said so** — `TravelerFrame.fs:32–33`: *"the full relativistic-**group**
structure (inverses/boosts) … remain §B sub-legs; this is the consistency law, **not yet the group
law**."* The honest register is **well-matched analogy, not structure**. Falsifier that would promote
it: build the amplitude carrier *on* traveler frames, prove `Sym(A)`-equivariance of the step, and
exhibit substrate objects labelled by irreps of `2·Sₙ`.

### "Our quantum comes from tick bounds" — discretisation, not quantisation

`Versionstamp.tick` is `Checked.(+) v 1L` (`src/Core/Clock.fs:44`) — an integer counter. **Discreteness
is present at the definition, not produced by bounding anything.**

- **Not box-quantisation.** Particle-in-a-box discreteness is the spectrum of a differential operator
  under boundary conditions on a *continuum*. There is no continuum, no operator, no eigenvalue
  problem.
- **Not quantisation proper.** That requires a non-commutative deformation (`[x,p] = iℏ`; Weyl/Moyal).
  Ticks commute; the join is commutative (`TravelerFrame.fs:63`). `AmplitudeEmu` attaches phases at the
  fork as `√p` (`:92–100`), and the file itself states *"CHIP-8 opcodes introduce no phase"* (`:25–27`)
  — no commutator generates them.
- **Where an honest ℏ could enter (CONJECTURE):** a non-trivial 2-cocycle on ℤ^A — two tick generators
  failing to commute up to `e^{iθ}` (the noncommutative torus / Weyl relations). We do not have that.
  Building it would be *actual* quantisation, and it is a concrete thing to build rather than a hope.

*"No tick is infinite"* is a **resource bound** — a metrology/thermodynamics statement, legitimate on
its own terms and unrelated to quantisation.

### The hierarchy problem — homonym

Physics' hierarchy problem is a *scale* problem: the quadratic sensitivity of `m_H` to `Λ`, i.e.
naturalness and fine-tuning. Aaron's is authority permanence leading to capture. Different referents,
different failure quantities.

The tempting rhyme — SUSY's boson(+)/fermion(−) loop cancellation against Z-set retraction
(`src/Core/Hierarchy.fs:17`) — does not survive: SUSY cancellation is symmetry-enforced between
equal-magnitude corrections to a *number*; Z-set retraction is exact by construction in the free
abelian group on *edges*. Numerology-grade under
[`numerology-vs-number-theory`](../../.claude/rules/numerology-vs-number-theory.md): fine as a
generator, not as a claim.

**The mechanism is real and stands without the borrowed name.** Recommendation: call it the
**capture/permanence problem**. The physics term buys nothing and costs a physicist's misreading, and
manifesto §3 (weight-free) already names it correctly.

## Status

| Leg | Verdict |
|---|---|
| −1 is the antiparticle | **CHECKED** — shipped in `CostarZSet.fs`, `SchemaZ.fs`; Feynman–Stückelberg anchor is tight |
| CPT symmetry | **NOT AS STATED** — C is exact, T is real but is better named by the existing rule, P is undefined. Drop the acronym or name a parity |
| t₀ = t_∞ | **TRUE FOR CLOSED HISTORIES** — i.e. when the Z-set folds to zero; false in general |

Anchors: Stückelberg (1941) / Feynman (1949) — antiparticles as backward-propagating particles;
Lüders (1954) & Pauli (1955) — the CPT theorem, whose hypotheses (Lorentz invariance, locality,
Hermitian Hamiltonian) are worth reading before borrowing the conclusion; Budiu et al. — DBSP, where
the signed-weight algebra comes from.
