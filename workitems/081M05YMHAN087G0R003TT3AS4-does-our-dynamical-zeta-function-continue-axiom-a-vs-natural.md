---
id: 081M05YMHAN087G0R003TT3AS4
type: task
state: backlog
priority: P2
slug: does-our-dynamical-zeta-function-continue-axiom-a-vs-natural
title: "Does our dynamical zeta function continue? Axiom A vs natural boundary for FigureEightEnsemble"
created: 2026-08-16T18:51:37.685Z
depends_on: []
composes_with: []
---

# Does our dynamical zeta function continue? Axiom A vs natural boundary for FigureEightEnsemble

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M05YMHAN087G0R003TT3AS4-*.md` glob. -->

## The question

Aaron, 2026-08-16, on ζ's analytic continuation: *"instead of recursing downwards and doing
cartography and using the demon and external observers to map it, this looks like a generator for
the singularity outwards."*

The generator he is describing is real and standard — the **poles of the meromorphically continued
Ruelle zeta function are the Pollicott–Ruelle resonances**, i.e. the system's decay rates obtained
by *generating* rather than by perturb-and-measure. Today we get the chaotic regime the other way:
`Orbit.largestLyapunov` nudges an orbit and averages the divergence, and `PhasePortrait` rasterizes
it for the visual cortex.

**But continuation is not guaranteed.** Many dynamical zeta functions admit only a *natural
boundary* past which no continuation exists. Ruelle proved meromorphic continuation for **Axiom A**
systems; outside that class the generator may simply not be there.

> **The question, precisely:** does the dynamical zeta function of a system we actually run
> continue past its abscissa of convergence, or does it hit a natural boundary?

## Why it is worth answering

If it continues, decay rates become derivable instead of sampled — and derivation is
**reversible**, so it does not pay the Landauer floor that each erasing measurement does
(`LandauerFloor.lean` proves both the floor and Bennett's zero-heat result). If it does not
continue, cartography is not a lazy choice but the only available one, and that is worth knowing
explicitly rather than by default.

## Where to look

- `src/Bayesian/FigureEightEnsemble.fs` — the figure-eight three-body orbit, the canonical chaotic
  system we actually run (Poincaré 1890)
- `src/Core/BraidEntropy.fs` · `src/Core/OrbitBraid.fs` — topological entropy via braids, the
  closest thing we have to a periodic-orbit census, which is what an Euler product needs
- `src/Core/Orbit.fs` (`largestLyapunov`, `classifyDynamics`) · `src/Core/PhasePortrait.fs` — the
  incumbent cartographic method this would be compared against

## Definition of done

1. State whether the system is (or is not) in a class where Ruelle's theorem applies — **with the
   hypothesis checked, not cited.** "Axiom A" asserted without verifying uniform hyperbolicity is
   the unchecked-anchor failure.
2. If it does not apply, say so and stop. A negative answer closes this item successfully and
   promotes cartography from default to justified.
3. Only if it applies: compare a resonance-derived decay rate against `largestLyapunov` on the same
   system, and state the disagreement honestly rather than tuning to match.

**Register discipline:** this is a `toy`/open question, not a plan. Nothing in `src/` should be
changed on the strength of the analogy alone — the continuation question gates everything
downstream.

## Pointers

- `docs/research/2026-08-16-generate-the-tangle-dont-map-it-pollicott-ruelle-resonances-vs-lyapunov-cartography.md` — the full derivation and register table
- `docs/research/2026-08-16-jacobis-generator-is-inversion-and-we-already-run-on-it.md` §2b — the Ruelle bridge this cashes
- Anchors: Ruelle 1976 · Pollicott 1985 · Artin–Mazur 1965 · Poincaré 1890
