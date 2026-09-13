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
- **Ostrom**, *Governing the Commons* — degenerate cooperation and the monitoring that distinguishes
  it from the real thing; the collusion-ring gap above is an instance she would recognise.
