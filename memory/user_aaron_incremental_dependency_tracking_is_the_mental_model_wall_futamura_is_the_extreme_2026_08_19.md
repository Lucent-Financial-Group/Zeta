---
name: incremental-dependency-tracking-is-the-mental-model-wall
description: Aaron — unused tooling is no tooling; the union bottleneck persists unless the graph is actually USED. Most devs cannot shift their mental model to incremental build/compile/test/deploy; he is taking it to the extreme with Futamura projections.
metadata:
  type: user
---

Aaron 2026-08-19, correcting a framing I had endorsed:

> "the tooling also has to be used, even if it exists but is not used or taken
> advantage of the bottle neck still ends in CI everything of everything union.
> most devs i've worked with struggle to move their mental model to incremental
> builds, compiles, tests, deployments, etc... this tedious dependency tracking
> most i've work with don't wrap their brains around, i'm taking it to the
> extreme with futamura projects"

## The correction (I got this wrong first)

I reported that his *"without hardcore tooling support"* conditional was **false**
here, because `src/Core.TypeScript/ace/build-graph.json` exists (107 targets,
verified) with **zero** references from `.github/workflows/`.

**That was a bad inference.** Existence is not support. An unwired graph provides
exactly the same union bottleneck as no graph at all, so his conditional was
**satisfied**, not falsified. The honest restatement:

> His claim holds. What the discovery changes is only the *price of the remedy* —
> the graph is already built, so wiring costs less than adopting one. It does not
> weaken the diagnosis.

Generalises past this instance: **a capability that exists but is not invoked is
indistinguishable from an absent one at the outcome layer.** Same shape as the
vacuity class (a check that did not run looks like a check that passed) and as
`ace`'s own `affected` query working perfectly while nothing calls it.

## The durable observation — the wall is COGNITIVE, not technical

The hard part of incremental everything is not the tooling, it is that most
engineers he has worked with cannot relocate their mental model from
"build/test/deploy the whole thing" to "build/test/deploy only what the
dependency graph says changed." He names the tracking as *tedious* — the reason
it is skipped is human, not machine.

**Predictive value:** expect the wiring, not the graph, to be where this stalls;
expect resistance to be about mental models rather than about correctness; and
expect a design that hides the tracking (so nobody has to hold it) to beat one
that exposes it.

## Futamura is the extreme case of the same idea

He connects incremental computation to **partial evaluation**: specialise the
interpreter to a program and you get a compiler (1st projection); specialise the
specialiser and you get a compiler-generator (2nd/3rd). An incremental build is
partial evaluation over "what is already computed" — Futamura is that taken to
the limit, where the generator itself is the incremental engine.

Already a live in-repo thread, not a new idea to introduce:
`docs/research/2026-06-14-zeta-language-ir-compiler-v2-capability-interface-principle-fsharp-host-csharp-contracts-self-hosting-futamura.md`
(§5 `gen(gen) == gen`) and
[[only-the-irreducible-is-primitive-generate-the-rest]] — generation and
error-correction are dual, so regenerating from the irreducible IS the
correction. Anchor: Yoshihiko Futamura 1971, partial evaluation / the three
projections.

## Related

[[user-aaron-monorepo-union-of-everything-bottleneck]] — this is its second half:
the union bites *unless the graph is used*, and using it is the part people
cannot hold in their heads.
