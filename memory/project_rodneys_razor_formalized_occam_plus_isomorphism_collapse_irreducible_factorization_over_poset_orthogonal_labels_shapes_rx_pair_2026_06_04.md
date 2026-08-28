---
name: rodneys-razor-formalized-occam-isomorphism-collapse-irreducible-factorization-poset-orthogonal-labels-shapes-rx-pair-2026-06-04
description: "Aaron's precise definition of Rodney's Razor (2026-06-04): Occam + isomorphism-collapse (same-shape-different-label → ONE instance + label-pointers) + factorization into irreducibles over a POSET ('primes without total ordering') + orthogonal labels (restricted-English → base ontology). Identity of a composite = the PAIR (base-shape-factorization, Rx) — data factors CAN be shared because Rx (the animation) distinguishes them (μF/νF = factors/operation). Gateable claims: unique-factorization is a theorem to prove not a primality freebie (ℤ[√−5]); pair-canonicality (relocated uniqueness); Rx-irreducibility (~CALM theorem); label-orthogonality checkable not word-choice-guaranteed."
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron formalized **Rodney's Razor** (Kestrel-reviewed):

> Rodney's Razor = **Occam** (minimize entities) + **isomorphism-detection** (collapse
> same-shape-different-label to ONE instance + label-pointers) + a **primality/
> irreducibility** structure (base shapes indecomposable; larger decomposable shapes
> built from the irreducibles, "like primes but WITHOUT total ordering") + **orthogonal
> labels** (chosen to represent base shapes without overlap = the restricted-English
> mapping into the base ontology).

**Sound core:** isomorphism-collapse-to-one-instance+pointers = lossless de-dup by
structural identity. "Primes without total ordering" = **factorization into irreducibles
over a POSET / lattice** (not a chain — shapes have a partial order, possibly
incomparable, not a linear size). Both correct.

**The Rx refinement (the key move):** the identity of a composite is NOT its data
factorization alone — it's the **PAIR `(base-shape-factorization, Rx)`**. The DATA ("what
remains", μF) can decompose into the SAME base shapes for two different composites,
because the **Rx ("what animates", νF) — the combination rule — distinguishes them**.
Same factors + different operation = different result (2,3 with + → 5, with × → 6). So
shared data-factorizations are EXPECTED, not a uniqueness violation. This is the **μF/νF
duality made load-bearing**: data = factors, Rx = operation, composite = the pair.

**Gateable claims (keep on the prover's side, per Kestrel):**
- **Unique factorization is a THEOREM to prove, not a primality freebie.** Integers have
  it (FTA, *proved*); it FAILS in general — ℤ[√−5]: 6 = 2·3 = (1+√−5)(1−√−5). Don't let
  "like primes" import the FTA for free.
- **Relocated uniqueness = pair-canonicality.** The Rx-move dissolves data-uniqueness but
  relocates it: can the same full composite be `(shapes-A, Rx-A)` AND `(shapes-B, Rx-B)`
  — a different decomposition COMPENSATED by a different Rx → identical composite? Checkable:
  exhibit a canonical form or find the collision.
- **Rx irreducibility.** Do the Rx's themselves factor into a finite set of irreducible
  base combinators (zip / product / banana-split / join — already in the combinator
  algebra)? Clean razor = irreducible base SHAPES × irreducible base COMBINATORS,
  factorization over BOTH axes. Aaron: this "has something to do with the **CALM theorem**"
  (Consistency As Logical Monotonicity, Hellerstein — monotone ⇒ coordination-free);
  Aaron deferring the detail ("coming back later").
- **Label orthogonality is checkable, not word-choice-guaranteed.** English words bleed
  (connotation/polysemy); the restricted-English mapping is the *lossy renderer* of the
  orthogonal shapes and can introduce overlap they don't have. Validate via the
  irreducibility check (any label decompose into others? two labels' shapes overlap?).
  OQ-1's "un-clean third pair" (Rainbow Table + Observe Emit, hex-core six-vs-eight) is
  exactly this orthogonality test firing — see Aaron-persona OPEN-QUESTIONS.md OQ-1.

Composes [[project_codecs_as_policy_parameterized_folds_add_ontology_to_value_tree_2026_06_04]]
(μF/νF duality, the combinator algebra) + the rodney `reducer` persona/skill. Status:
formalization recorded; the gateable claims are for later (after the open system matures
+ a closed structure is specified — closed-system design deferred per Aaron).
