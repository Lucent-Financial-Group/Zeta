# Generate the tangle, don't map it — Pollicott–Ruelle resonances vs Lyapunov cartography

**Date:** 2026-08-16 · **Ferried by:** Otto (shadow) · **Origin:** Aaron, 2026-08-16, watching a
3Blue1Brown-derived visualization of ζ's analytic continuation:

> *"this looks like the homoclinic tangle in our code or like a generator function for it, so
> instead of recursing downwards and doing cartography and using the demon and external observers
> to map it, this looks like a generator for the singularity outwards kind of. i'm using some
> metaphor here."*

He labelled the register himself. This doc supplies the structure, which turns most of it from
metaphor into standard mathematics — and names the one place it genuinely can fail.

## 1. The reading of our code is accurate (verified)

Our treatment of the homoclinic tangle **is** cartography, by explicit design:

- `src/Core/PhasePortrait.fs` — *"rasterize a dynamical orbit into a character grid."* Its own
  docstring: Poincaré *discovered* the tangle **by drawing** the stable/unstable manifolds and
  seeing they must cross infinitely often; *"visualizing an orbit is not a shortcut for this class
  of object; it is the native method that found it."*
- `src/Core/Orbit.fs` — reaches the chaotic regime via `largestLyapunov`, computed by `nudge`:
  perturb, iterate, measure divergence, average over short windows.

Iterate downward, probe from outside, record what you saw. That is exactly the procedure Aaron
described, and the repo says so in its own words.

## 2. The generator has a name — and it is the Ruelle bridge, cashed

The object Aaron is pointing at is **analytic continuation of the dynamical (Ruelle) zeta
function**, and "generator for the singularity outwards" is *literal* rather than figurative:

> The **poles** of the meromorphically continued Ruelle zeta function are the **Pollicott–Ruelle
> resonances** — the system's correlation-decay rates.

That is the same class of information `largestLyapunov` samples by nudging, obtained instead by
**generating**: build a function as an Euler product over the primitive periodic orbits, continue
it, and read the dynamics off its singularities. Same content, opposite direction of travel.

**This cashes the Ruelle bridge from earlier the same day**
(`2026-08-16-jacobis-generator-is-inversion-and-we-already-run-on-it.md` §2b), which Aaron
endorsed but had not derived. That entry looked like taxonomy — orbits play the role primes play.
It is not taxonomy: it is the load-bearing link, because Ruelle's zeta is precisely what converts
orbit **cartography** into a **generating function**.

## 3. The thermodynamic contrast is real, and we have already proved half of it

| | cartography (today) | continuation (the generator) |
|---|---|---|
| method | iterate · perturb · measure | one forced extension |
| how many answers | many samples, approximate | **exactly one** — the identity theorem |
| thermodynamics | each measurement erases ⇒ pays the **Landauer floor** | derives without erasing ⇒ **Bennett reversible, zero heat** |

`src/Core.Lean4/Lean4/LandauerFloor.lean` already proves the second law, the Landauer floor, and
**Bennett reversibility (Adj-only pays ZERO heat)**. So "map it with a demon and external
observers" vs "generate it" is not a stylistic preference — it is a measurable energetic
difference about which we hold a machine-checked proof. Aaron's "demon" is the right word: a
measuring agent that must eventually erase, and pays.

## 4. Uniqueness is the error-correction property

Analytic continuation is **forced**: by the identity theorem, if an extension exists it is the
only one. That is the same shape as
[`only-the-irreducible-is-primitive-generate-the-rest`](../../.claude/rules/only-the-irreducible-is-primitive-generate-the-rest.md)
— regenerating from the irreducible **is** the correction. Two oracles that continue the same
local data and disagree cannot both be right; the disagreement is a detected error, not a
tolerance. **The N-oracle byte-lock, restated in complex analysis.**

## 5. The obstruction — specific, named, and the reason this is a question and not a plan

ζ continues because it is holomorphic and the identity theorem applies. Chaotic systems are the
hard case and the failure mode has a name: **natural boundaries.** Many dynamical zeta functions
continue only up to a boundary curve past which *no* continuation exists — the function stops,
and there is nothing beyond to generate.

So the honest form is a question with a known answer-shape:

> **Ruelle proved meromorphic continuation for Axiom A systems.** Where a system is in that class,
> the generator exists. Where it is not, a natural boundary may forbid it — and then cartography
> is not a lazy choice, it is the only one.

**This is what makes the idea falsifiable rather than evocative**, and it is the check to run
before any of §2–§4 is acted on.

## 6. What would settle it

`src/Bayesian/FigureEightEnsemble.fs` and `src/Core/BraidEntropy.fs` are the concrete systems we
actually run — the figure-eight three-body orbit being the canonical chaotic example (Poincaré
1890, and the same three-body thread as the Jacobi doc). The question is whether that system sits
in a class where the dynamical zeta function continues.

Filed as a work-item rather than attempted here.

## Register

| claim | register |
|---|---|
| our tangle handling is cartography (portrait + Lyapunov-by-nudge) | **verified** — read from the source |
| Pollicott–Ruelle resonances are poles of the continued dynamical zeta function | **anchored** — standard result |
| Ruelle: meromorphic continuation for Axiom A | **anchored** |
| natural boundaries obstruct continuation for many dynamical zetas | **anchored** |
| measurement pays Landauer; reversible derivation does not | **proved in-repo** (`LandauerFloor.lean`) |
| **our** systems admit such a continuation | **UNKNOWN — the open question** |
| resonances could replace `largestLyapunov` in our code | **NOT claimed** — depends entirely on the row above |

## Pointers

- `src/Core/PhasePortrait.fs` · `src/Core/Orbit.fs` (`largestLyapunov`) · `src/Core/BraidEntropy.fs` · `src/Bayesian/FigureEightEnsemble.fs`
- `src/Core.Lean4/Lean4/LandauerFloor.lean` — the Landauer/Bennett proofs
- `docs/research/2026-08-16-jacobis-generator-is-inversion-and-we-already-run-on-it.md` §2b — the Ruelle bridge this cashes
- [`only-the-irreducible-is-primitive-generate-the-rest.md`](../../.claude/rules/only-the-irreducible-is-primitive-generate-the-rest.md) — the generator-is-the-ECC rule §4 instantiates
- [`numerology-vs-number-theory.md`](../../.claude/rules/numerology-vs-number-theory.md) — the promotion path this doc runs: a labelled coincidence, given structure, becomes a question with a falsifier
- Anchors: Poincaré 1890 (homoclinic tangle) · Ruelle 1976 · Pollicott 1985 · Artin–Mazur 1965
