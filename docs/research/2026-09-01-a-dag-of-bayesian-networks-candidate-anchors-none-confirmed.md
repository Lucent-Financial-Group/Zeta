# A DAG of Bayesian networks — candidate anchors, none confirmed

**Status: UNRESOLVED, and deliberately left that way.** This file records a search
that did not succeed, because the alternative — quietly promoting the closest
candidate to "the answer" — is the failure mode this repo names most often.

## The question

Aaron, 2026-09-01, while naming what `MultilayerBnn` / the equivariant factor layer
actually is:

> *"there actually is another name i forgot not BNN cause it's not a chain of neural
> networks, it's more like a dag of layers than where multiple layers can compose
> under one above it, it's a very compoisble learning."*

and, narrowing it:

> *"it's after basyian network i think casue it built on it, it was like a dag of
> basyian networks"*

with two further constraints from him: he raised it **with me roughly two weeks
prior** (mid-August 2026), and what he remembers most sharply is that **the prior-art
date was older than he expected.**

## What it is NOT — ruled out by Aaron directly

| ruled out | why |
|---|---|
| **Bayesian Neural Network** | his starting point: "not BNN cause it's not a chain of neural networks" |
| **Forney-style / normal factor graph** (Forney 2001, Loeliger 2004) | offered as the composability anchor; *"no this is not it"* |
| GMDH · Cascade-Correlation · Sum-Product Networks · randomly-wired NNs | offered on the "surprisingly old" reading; none recognised |

## Candidates — all close, none confirmed

| candidate | anchor | date | why it fits |
|---|---|---|---|
| **Object-Oriented Bayesian Networks (OOBN)** | Koller & Pfeffer, UAI | **1997** | BN fragments as reusable *classes*, instantiated and nested — networks composed of networks, one under another. The most literal reading of "a DAG of Bayesian networks", and its date genuinely surprises people. |
| **Multiply Sectioned Bayesian Networks (MSBN)** | Xiang, Poole & Beddoes | **1993** | one large BN partitioned into sections organised on a hypertree, each section itself a BN. Same shape, older still. |
| **Probabilistic Relational Models (PRM)** | Koller & Pfeffer | 1998 | BN templates over relational structure, instantiated and composed |
| **Multi-Entity Bayesian Networks (MEBN)** | Laskey | 2008 | BN *fragments* (MFrags) composing into larger theories |
| **Deep Belief Networks** | Hinton, Osindero & Teh | 2006 | stacked directed belief layers; greedy **layer-wise** training is literally composable learning. Builds on Sigmoid Belief Networks (Neal **1992**). |

Aaron on the set: *"they are very close but no i don't think any of these were it, it's
okay we don't need to know for sure."*

## What was searched, so the next attempt does not repeat it

- `docs/`, `src/`, and `memory/` for each candidate term — **absent**. The two apparent
  hits were false: the `Pfeffer` in `2026-07-11-moms-law-…` is *Jeffrey* Pfeffer
  (organisational behaviour), not Avi Pfeffer; the `Hinton` in `PRIOR-ART-LIST.md` is
  the 2015 distillation paper.
- The four session transcripts under
  `~/.claude/projects/-Users-acehack-Documents-src-repos-Zeta/`. Every candidate term
  appeared to hit — because they matched **my own message in the current session**
  listing them. A self-match is not evidence, and treating it as one would have
  manufactured a confirmation out of nothing. The conversation Aaron remembers is not
  in the transcripts I hold.

**So the honest state is: the term exists in Aaron's memory, was discussed in a session
whose transcript is not reachable from here, and is none of the above.**

## Why this file exists rather than a picked answer

`numerology-vs-number-theory.md` says a coincidence must be **stored with its
register** — recorded as *"coincidence: this resembles X"*, never as *"it is X"* —
because an unlabelled near-match in long-term memory is **a belief you never decided to
hold**. Five candidates that are all "very close" is exactly that hazard: the closest
one becomes the citation, the citation becomes the anchor, and nobody ever again asks
whether it was right.

`engagement-profiles-…` supplies the other half: *"I don't know" is often the most
honest answer*, and the method for something held in another mind is to **ask, and
believe the account** — not to infer it. Aaron says none of these is it. That settles
it against all five, however good the fit looks from outside.

## What would resolve it

An older session transcript, or Aaron recognising the name. If it is later identified,
**promote this file rather than replacing it**: record which candidate it turned out to
be, or that it was none of them, and what supplied the identification. The sequence is
the useful artifact — the same convention the cluster ledgers use for a figure that
changes.

## Related, and NOT the answer

- `src/Bayesian/FactorGraph.fs` — Kschischang, Frey & Loeliger 2001 (sum-product)
- `src/Bayesian/MultilayerBnn.fs` — Kalman 1960; Rauch–Tung–Striebel 1965; **Loeliger
  2004**; Minka 2001. Its `Dag parents` case is documented as "the general case, of
  which the other two are special forms."
  (I claimed in conversation that the Loeliger anchor was absent from the repo. It is
  not — it is cited here. Recorded because the correction is part of the search.)
