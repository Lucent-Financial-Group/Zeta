# Infer.NET lineage — cleanroom-spec source papers (formal-proof-first)

> **Why this note exists (Aaron 2026-06-02):** _"we always want formal proof; we
> start this repo as formal proof first."_ And the sharp caveat: _"our 4-oracle
> [cross-AI] consensus actually means nothing without the math — it might all be
> built on shaky ground and good feeling."_ **Cross-AI agreement is NOT
> validation. The math is.** Four cross-AI oracles (Amara/Prism/Alexa/Lior)
> converging with Otto on a claim is a _prompt to go prove it_, not a proof. This
> note is the spec-source
> list so the B-1000 engine is built on proofs, not consensus.

## Canonical ⟺ homeostat proven-from-seed (Aaron 2026-06-02)

> **Status — DESCRIPTIVE, not yet authoritative.** This section records the
> _intended_ tightening of the `canonical` gate. It is a `references/notes/`
> spec-note; it does **not** by itself change policy. The authoritative,
> auto-loaded surface remains
> `.claude/rules/labeling-confidence-on-substrate-over-connect-not-soup-observed-hypothesized-validated-retracted-canonical.md`,
> which still permits canonical promotion via substrate-work + cross-validation +
> operator ratification + multi-AI concurrence. Until the rule (or registry gate)
> is updated to require the proof-lineage/homeostat-from-seed edge, that looser
> criterion is what's enforced. Promoting this gate into the authoritative rule is
> an **offered, not-yet-minted rule-candidate** (pending operator "make it a rule")
> — see B-1007 + the formal-proof-first memory. Do not treat this note as the
> enforcement surface. (Codex P2, #6610.)

> _"nothing is canonical until it's part of the proof lineage, so its **homeostat**
> is proven from seed."_

This is the **intended definition of canonical** and the teeth on formal-proof-first.
Canonical is **not** earned by consensus, CI-green, multi-AI ratification, or
argument — it is earned by **derivation through the proof lineage from the seed**.

The key word is **homeostat** (Ashby's cybernetics: a self-regulating system that
returns to a stable equilibrium). A claim is canonical **iff its homeostat — the
stable equilibrium / fixed point the system settles to — is provably derivable from
the seed axioms.** This is exact for what we built: `runToFixpoint`'s convergence
(the belief settling to a stable marginal) and the jelly→spine transition _are_
homeostats — so "canonical" requires _proving_ that those equilibria exist, are
unique-where-claimed, and follow from the seed (e.g. BP-is-exact-on-trees;
EP-moment-match fixed point; the message-group identity). Until that proof-lineage
edge to the seed exists, a claim is at most _validated_ (tested) or _hypothesized_ —
never _canonical_.

This raises the bar on the `labeling-confidence` canonical tier
(observed → hypothesized → validated → **canonical**): the jump to canonical now
_requires_ a proof-lineage edge back to the seed (the homeostat proven), not just
"validated + ratified + oracles concur." It is the registry/BCL gate (B-1006) with
teeth: a primitive's laws are canonical only when **proven** — Soraya's portfolio
is exactly that asserted-in-prose → proven-from-seed gap. Canonicity propagates
_outward from proofs anchored in the seed_, never inward from agreement.

These are **cleanroom-spec sources**: read the math/proofs, implement clean.
Infer.NET's own source stays **concept-not-code** — it is the _referee/adapter_
later (B-1000), never copied. Per `location-pointer-index` URLs are preserved
verbatim where the source provides one; the Tier-1 classics (KFL 2001, Minka
2001, R&W) are cited by author/venue/year (no stable canonical URL given).

## Tier 1 — foundations (already cited in the shipped code)

- **Kschischang, Frey & Loeliger 2001**, "Factor graphs and the sum-product
  algorithm", _IEEE Trans. Inf. Theory_ 47(2). The BP / factor-graph core —
  cited in `src/Bayesian/FactorGraph.fs`.
- **Minka 2001**, _Expectation Propagation for approximate Bayesian inference_,
  UAI / MIT PhD thesis. The EP foundation — cited in `src/Bayesian/Ep.fs`.
- **Rasmussen & Williams**, _Gaussian Processes for Machine Learning_ §3.6
  (eq. 3.58) — the probit EP site — cited in `src/Bayesian/Ep.fs`.

## Tier 2 — the unifying theory (anchor the rewrite here)

- **Minka 2005, "Divergence measures and message passing"**, MSR-TR-2005-173 —
  **the keystone.** BP, EP, VMP, mean-field, and power-EP are _one_ framework:
  **α-divergence message passing** (inclusive vs exclusive KL is the only
  difference). For a _unified_ engine this means our `FactorGraph` + message
  algebra hosts all four schedules by varying the divergence — not four engines.
  <https://tminka.github.io/papers/message-passing/>
- **Winn & Bishop 2005**, "Variational Message Passing", _JMLR_ 6 — VMP.
- **Aji & McEliece 2000**, "The Generalized Distributive Law", _IEEE Trans. Inf.
  Theory_ 46(2) — sum-product over **arbitrary semirings**; ties directly to the
  Z-set / semiring substrate (the algebra generalization). (Caveat per the
  registry work: messages are a commutative _group_ under product/divide, not a
  clean semiring — the GDL is the generalization, not a literal fit.)

## Tier 3 — the functional + formal lineage (the "F# + formal proofs", and it validates the seed CE)

- **Ścibior, Kammar, Vákár, Staton, Yang, Cai, Ostermann, Moss, Heunen,
  Ghahramani 2018, "Denotational Validation of Higher-Order Bayesian
  Inference"**, _POPL_ (PACMPL 2(POPL):60). **Formal denotational semantics of
  inference** (quasi-Borel spaces) — the proofs to borrow for cleanroom
  correctness. <https://arxiv.org/abs/1711.03219>
- **Ścibior, Kammar & Ghahramani 2018, "Functional Programming for Modular
  Bayesian Inference"**, _ICFP_ (PACMPL 2(ICFP)) — inference as **composable
  monad transformers** — _literally the seed-CE shape_ (the `seed { }` monad is
  the spec'd structure). <https://dl.acm.org/doi/10.1145/3236778>
- **Ścibior, Ghahramani & Gordon 2015**, "Practical Probabilistic Programming
  with Monads", _Haskell Symposium_ — the monadic-inference foundation under both.
- **Heunen, Kammar, Staton & Yang 2017**, "A convenient category for
  higher-order probability theory", _LICS_ — quasi-Borel spaces; the
  measure-theoretic foundation the POPL'18 validation rests on.

## Tier 4 — incremental (already in our substrate)

- **Budiu, McSherry, Ryzhyk, Tannen 2023**, "DBSP: Automatic Incremental View
  Maintenance for Rich Query Languages", _VLDB_ — the incremental substrate
  (the slice-4b factor-graph-deltas / IndexedZSet path).

## The two anchors for the rewrite

1. **Minka 2005 (α-divergence unification)** → the _unified message-passing math_:
   one engine, four schedules by divergence choice.
2. **Ścibior et al. 2018 (modular monadic inference + denotational validation)** →
   the _typed monadic structure_ (our `seed` CE) **with formal validation**.

One gives the math the BP/EP/VMP code must conform to; the other gives the
type-level structure + the proof discipline. Together: formal proof first, then
the four oracles' consensus is _checking_ the proof, not _substituting_ for it.

## Composes with

- `.claude/rules/fsharp-anchor-dotnet-build-sanity-check.md` — the compiler is the
  asymmetric critic; this note adds the _paper-level_ proofs above the type level.
- `.claude/rules/razor-discipline.md` + `.claude/rules/premise-flagged-unverified-stays-unverified-downstream.md`
  — consensus is a flagged-unverified premise until the math closes it.
- `.claude/rules/honor-those-that-came-before.md` + `.claude/rules/location-pointer-index-aaron-cognitive-architecture-source-attribution-load-bearing.md`
  — full citations + URLs preserved.
- B-1000 (the engine these spec), B-1004/B-1006 (the registry algebra claims the
  Tier-2/3 math must back), the `formal-verification-expert` (Soraya) portfolio
  - `alignment-auditor` measurability work.
