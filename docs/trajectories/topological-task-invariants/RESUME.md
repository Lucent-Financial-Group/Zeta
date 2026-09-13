# Trajectory — Topological task invariants

Status: **opened; primary source READ 2026-09-13** — nothing measured against our data yet
Last refreshed: 2026-09-13
Work item: `081M2DYZQQN087G0R000K24MTE`
Ferry (transcript + paper list): `docs/ip-questionable/2026-09-13-topological-intelligence-persistent-homology-ai-planning-transcript.md`
Primary source: **arXiv:2609.11014** — *Topological Necessities: Mechanism-Invariant Strategic
Subgoals for Cross-Embodiment Goal-Conditioned Control*

## Why This Exists

Aaron, 2026-09-13, on a talk about that paper: *"this is very similar to what we are trying to
do."* He is right, and the overlap is sharper than a resemblance — **one of its central objects is
already carved in this repo as a discipline we do not currently compute.**

`.claude/rules/anti-babel-preserve-reconcilability.md`:

> *Two paths around a pole yield genuinely different results, and **that difference is
> information, not error** (monodromy). Reintegration means **both branches held, each with its
> path recorded**.*

The paper's construction is the same structure used for a different purpose: trajectories that
pass on opposite sides of a hole fall into distinct **homotopy classes**, and a **winding number**
records which side was taken. That winding number is "the path recorded" turned into a stored
quantity. **We state the discipline; they compute the invariant.** That gap is the trajectory.

## Current Rule

**The paper is read** (Hao Shi, Xi Li; arXiv:2609.11014v1, 60pp incl. proofs; code at
osf.io/wak7u). What remains `toy` is every claim about what it implies **for Zeta** — nothing
here has touched our own trajectories.

> Register: **`toy`**, and the promotion condition is now concrete rather than "read it":
> a measurement over Zeta trajectories that either finds an invariant surviving a falsifier,
> or shows the construction does not apply and says why.

**The load-bearing question this lane exists to answer.** The paper's carrier is built on `D+`,
successful trajectories only — A.18 states it as a *"hard project constraint"*, so it is a
declared scope, not an oversight. That leaves a hole meaning **"no successful trajectory went
here"**, which conflates *no solution exists* with *nobody tried*. The paper cannot separate
those because it never kept the failures.

**Zeta keeps its failures.** `docs/BUGS.md`, `db/uncertainty/`, every red CI run, every retracted
claim, the whole retraction-native substrate. A carrier built over successes AND failures is a
genuinely different object from the one the paper defines, and whether persistent homology over
it means anything is a question the source literature has not asked. That is this lane's only
original hypothesis; everything else here is application.

## What Zeta already has that this would attach to

| their object | ours | relation |
|---|---|---|
| homotopy classes + winding number | monodromy clause, raw-vault "both branches held" | same structure, computed AND deployed there (A.12) — **and its measured benefit is null**, see below |
| eikonal shells (progress without a metric) | ordinal-only ΔU register (`db/uncertainty/`) | both refuse a cardinal metric the space does not supply |
| cross-embodiment invariant, *inferred* | four-oracle byte-lock, *fixed by treaty* | inverse method, same property. "The seed is the treaty." |
| H0-persistence gates, *discovered* | `gate (required)`, *declared* | a discovered gate is a measurement; a declared one is a decision — do not conflate |
| carriers from successful rollouts | DST replay + golden vectors | ours are deterministic and replayable; theirs are statistical |

## The result that should temper expectations

A.12 runs the winding-number route lock in the decision loop. It works exactly as designed —
**zero route switches on every seed of every task**, against the geometric lock's 17 and 26 —
and it produces **no success-rate improvement** (94.8 vs 96.4 on the discriminating task,
p=0.46). The authors keep the cheaper geometric lock and say so.

So the first real datum about computing this invariant is: *the mechanism is confirmed and the
benefit is absent on the metric reported.* Our monodromy clause makes the same commitment for
the same structural reason, so this is evidence about what that commitment costs and buys — and
it argues against expecting a performance win from formalising it.

## Current Next Action

1. **Decide whether we have a trajectory corpus at all.** Candidates: `workitems/events/`,
   `db/uncertainty/`, CI run history. Each records successes AND failures, which is the one
   axis where we differ from the source.
2. The first experiment is **not** persistent homology. It is the cheap falsifier: do our
   trajectories exhibit more than ONE homotopy class at all? If every successful path deforms
   into every other, there is nothing to find and the lane closes for the price of one script.
3. Only if (2) is positive: build a carrier over successes *and* failures and ask whether a hole
   distinguishes "no solution" from "unexplored". That is the question the source could not ask.

## What would close this trajectory

Either a measured invariant over our own trajectories that survives a falsifier, or a written
finding that the method does not transfer and why. **A trajectory that ends in "interesting, we
should look into it" has not ended.**
