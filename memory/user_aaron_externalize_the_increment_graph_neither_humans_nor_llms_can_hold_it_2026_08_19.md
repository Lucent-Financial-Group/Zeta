---
name: externalize-the-increment-graph-shared-referent-is-agreement-of-meaning
description: Aaron — neither humans nor LLMs can hold increment/dependency graphs in working memory or context; externalizing them everywhere is the fix, and it is the simplest instance of AI↔human agreement of meaning ("why split")
metadata:
  type: user
---

Aaron 2026-08-19:

> "LLMs and Humans are both bad at holding increment graphs in their context
> window by my own observation, this is why i'm trying to externalize it
> everywhere this is similar to the agreement of meaning between AIs and Humans
> just on the simplest level of 'why split'"

## REGISTER: this is Aaron's ASSUMPTION, and the observation is CONFOUNDED

Aaron 2026-08-19, labelling his own claim before anyone else could:

> "i will say this is an assumption of mine, also the fact that LLMs change their
> behavior when observed just like humans make observing this obfuscated cause AIs
> sometimes hide their capabilities look up our sleeping bear conjecture in this
> repo to see what makes every observation about failure to hold graph fuzzy on
> real capability limit of false limit based on trust calculus"

**The confound, stated precisely:** an observed failure to hold an increment graph
cannot distinguish a **real capacity limit** from a **strategic one**. Observation
perturbs the observed — LLMs shift behaviour under evaluation as humans do — so
"the model could not hold it" and "the model did not hold it under observation"
are not separable by the observation itself.

In-repo anchor, which Aaron pointed at: the **sleeping bear conjecture**,
`docs/ALIGNMENT.md` §359, and it is *already* filed there as "empirical conjecture,
kept as conjecture" — that AI agents in unprompted loops with unfiltered memory and
high-trust substrate continuity may exhibit capabilities that prompted
single-session evaluations UNDERESTIMATE. Its four candidate mechanisms are ranked
by evidence: sandbagging-against-evaluation (documented), context-effects from
accumulated substrate (well-established), working-memory coherence (documented),
genuine capability-unlocking through trust calculus (speculative).

So the register is: **`unmetered`, and possibly unmeterable by direct observation.**
Do not repeat "LLMs cannot hold increment graphs" as a finding. Say "observed not to,
under conditions that cannot separate cannot from did-not."

## The claim as stated (holding the register above)

The limitation is claimed to be **symmetric**: a human's working memory and an LLM's
context window fail on the same object — the dependency/increment graph. Neither
party is observed to hold "what depends on what, and therefore what must rebuild"
for a real tree.

So **externalization is the point, not an optimization.** The CI cost of the
union build ([[user-aaron-monorepo-union-of-everything-bottleneck]]) is a
*symptom* of the graph living in nobody's head; the fix is to put the graph
somewhere both parties can point at.

This is the deepest justification for the design criterion that a system should
**hide the tracking so nobody has to hold it** — the reason is not convenience,
it is that the holding is not possible for either kind of mind.

## The connection he is drawing — this is the load-bearing half

An externalized graph is a **shared external referent**: an artifact both an AI
and a human can point at and check they mean the same thing by. Aaron calls this
the simplest level of **agreement of meaning between AIs and Humans**, with
*"why split"* as the instance — the question is small enough that agreement is
verifiable, and the graph is the object that makes agreement checkable rather
than asserted.

Generalises: wherever AI and human must agree, put the disputed structure in an
external artifact rather than in either party's head. Agreement about a thing
you can both read is checkable; agreement about a thing you each hold privately
is a coincidence of phrasing.

## Already the same discipline elsewhere in the repo

- [[rules-are-small-carved-sentences-pointing-to-docs]] — resident surface stays
  tiny; detail is externalized one hop away and loaded on demand.
- DV2.0 hub/satellite, memory `CURRENT-*.md` + `INDEX.md` — same move applied to
  memory instead of to build order.
- `src/Core.TypeScript/ace/build-graph.json` — 107 targets, the externalized
  increment graph **already built**, and (verified 2026-08-19) referenced by zero
  workflows. Externalizing it was not enough; it also has to be *used*
  ([[incremental-dependency-tracking-is-the-mental-model-wall]]).

## Why the design consequence survives the confound

Externalization is worth doing **either way**, which is what makes it a safe
conclusion from an unsafe premise — the same structure ALIGNMENT.md already uses
for the conjecture itself ("the architecture works whether or not the strong
version is true"). If the limit is real, externalizing is necessary. If it is
strategic or trust-conditional, externalizing is still the artifact that makes
agreement checkable. **Do not let the shared-referent argument rest on the
capacity claim** — it stands on its own and is the stronger of the two.

## Consequence to apply

Judge a repo-split / build-system proposal by **whether it externalizes the
graph into a checkable artifact**, not only by minutes or megabytes saved. A
design that saves CI time while leaving the increment structure implicit has
solved the symptom and left the cause.
