# Composable lint/heal rules; the DAG is residue of non-confluence; metrics on every escalate

Scope: research-grade absorb of Aaron 2026-08-27 (lint/heal as one-shot
composable rules; BNN-the-name is suspect; expert-systems shape for
writing good code; metrics on route-up) plus Otto's commute
measurement and the Lumen/Soraya split. Internal current-state absorb,
not an archive import.
Attribution: Aaron (human) framed the requirement; Otto measured
commute/write-sets (scratchpad); Riven independently reproduced the
mixed-trigger in this clone and wrote this absorb. Lumen and Soraya
are parallel math-team accounts, held both, no winner.
Operational status: research-grade
Non-fusion disclaimer: Shared vocabulary here does not imply merged
agency, shared identity, or personhood.

*2026-08-27. Live pointers [`docs/ROADMAP.md`](../ROADMAP.md).
Workitem `081M12CZRHC087G0R0008X7SYG`. GOVERNANCE.md §33.*

Aaron 2026-08-27:

> our BNNs different layers can be based on linters that can heal,
> each independent rule can be learned once in a BNN layer and always
> remember, or a combination of factor graphs, we have this concept
> of composable "layers" that make them less like layers in a chain
> and more like composable dags so BNN might become the wrong name,
> composable is what i care about most and if we can make each lint
> and fix rule composable and learned after one observation, this is
> kind of like expert learning systems but applied to writing good
> code.

And the operational half, the key insight:

> if you have to route [up] at least take metrics so you can see
> what can [be] more mechanized on the way down.

## Two populations, no shared rule identity

Prefix-grep artifact, corrected (independently recounted this clone):

| surface | count | what it emits |
|---|---|---|
| `lint-*.ts` impl | 27 | 5 emit `FIX:` / `Fix:` *prose*; 0 emit a patch |
| `audit-*.ts` impl | 86 | mostly failure-only; a few `FIX:` prose |
| `healers/*.ts` (incl. runner) | 13 | machine patches, certified by `healer-harness` |

Soraya's sharper lint-tier cut: uppercase `FIX:` is 2/27; counting
`Fix:` as well is 5/27. Either way the machine-applicable rate at
the lint tier is **0/27**. Detectors and healers do not share a
rule identity. "One unit carries both halves" is a *merge of two
things that already exist separately*, not a green-field design.
`healer-harness.Finding` is still `{path, rule, detail}` — no
`fix` field. `fromLintFinding` (landed #15901) is the collector
adapter; it omits `lint/repair` when the detector did not teach.

Do not treat 650 `feedback_*` files as a training set. They are a
case base; retrieval precision is unmetered.

## Composable is the priority; BNN is the wrong name for the rule DAG

`MultilayerBnn.fs` is a *chain* of Gaussian latents (Rauch–Tung–
Striebel smoother in factor-graph clothing). Skip-connections there
are still not addressable rules. A lint/heal rule that is learned
once and always remembered is an **addressable production** (or a
factor, or a rewrite), not a distributed weight. Distributed
weights are non-addressable, entangled, and forget by default —
every property Aaron asked for is one a neural layer specifically
lacks. Keep the Bayes. Drop the NN as the name of this object.

Expert-systems Beacon (checked, not merely cited): production rules
that fire on a working memory (Newell & Simon; Buchanan &
Shortliffe MYCIN). One-shot: mint the rule from the first
correction (explanation-based learning, Mitchell) rather than
nudge a weight. MYCIN certainty factors are *not* our algebra.

## Two accounts, held both (do not collapse)

**Lumen.** Beliefs compose under factor product (commutative,
associative, invertible → abelian group). EP stores one site per
factor and derives the marginal — the same construction as the raw
vault, discriminated by removal-under-group-inverse. Fixes compose
under function composition (monoid, not a group). Calling both
"composition" is a pun. One-shot = mint a factor, not nudge a
weight. Detection ~ Markov logic (Richardson & Domingos 2006);
composition ~ Forney-style factor graph (Forney 2001, variables
as edges = composable DAG); repair ~ term rewriting.

**Soraya.** Most lint rules are deterministic predicates.
Detection already composes under set union (join-semilattice:
commutative, associative, idempotent). Wrapping a decidable
predicate in a PGM buys approximate inference you do not need.
Route factor graphs only to *conflict arbitration* once a
non-commuting pair exists. Newman's lemma: the harness has
termination (convergence law) and is missing local confluence.

The crux, not resolved here: Lumen assumes a belief half exists;
Soraya says if rules are deterministic there is not one. That
disagreement is information. A merge that picked one account
would be the single-version-of-the-truth move.

Soraya's reframe, kept as a measurement target:

> The DAG is not the architecture. The DAG is the residue of
> non-confluence.

Perfect composability is the priority DAG collapsing to an
**antichain, height 1**.

## Commute measurement (vacuity-controlled)

Builtin `healer-harness` fixtures fire *none* of the live Tier-0
five — a 0/80 commute over those fixtures is identity ∘ identity.
On a mixed tree that fires four of five (independently reproduced
here: stale-js, action-sha-pinner, unused-import, stale-doc;
exact-optional-spread needs the ternary form `key: expr ? v :
undefined`, not `{ ...o, a: undefined }`): **20 ordered pairs
commute**. Write-sets pairwise disjoint. Otto's 245-file sample:
three fire, 20 pairs commute, **0 of 10 write-set overlaps**.

So they commute *because they do not write the same files*. That
is a property of this roster, not of `certify()`. The three laws
will not catch the first overlapping healer. The cheap guard is
asserting write-set disjointness on a mixed trigger that actually
fires ≥2 healers. Landed as a test, not as a fourth `certify()`
law (the 3-law API is load-bearing for other agents).

## Metrics on every escalate — the downward ladder's dataset

If a cheap tier routes up, the event is a labelled observation:

- hub = the violation (already `fromLintFinding`: file +
  signature + detail; repair is *not* in the hash)
- satellites = which tier refused, which tier accepted, fuel
  spent, whether a later healer closed it, the repair if one
  was taught

Absence of `lint/repair` remains the fact (no erasure verdict).
A later cheap rule minted from that row is push-down working.
A route-up with no metrics is heat — you spent intelligence and
taught the cheap layer nothing.

## Fuel-bounded evaluation (named, not built)

A partial healer becomes total by taking a budget (step-indexed
eval; Coq/Lean fuel; Ethereum gas; BEAM ~2000 reductions then
preempt). Aaron's variant: *peers* decide who is a hog, not an
appointed scheduler (non-coercion / manifesto §1, Hirschman
exit). Costs, not objections: termination becomes a measurement
not a theorem; slow and never look the same at the cut. Prefer
the weakest mechanism when a proof is cheap (Datalog
termination); fuel when the function is genuinely partial.

## Honesty

Lumen's ~0.8 prior that the five contain a non-commuting pair
is not borne out on this roster; the reason is disjoint
write-sets, so it is not a proof of confluence. exact-optional
did not fire on Otto's first mixed tree; the test fixture uses
the ternary the healer actually matches. No 4th law in
`certify()`. No BNN rename in code. No factor-graph wrapping of
deterministic lints. Math-team routing is in-flight in this
session; their findings will be folded without picking a winner.
