---
name: de-finetti-non-correlation-boundary-unifies-homeostat-markov-bayesian
description: "The convergence that pulls it together (Aaron 2026-06-05): homeostat order-independence IS de Finetti exchangeability / the non-correlation boundary. Discrete exact core ALREADY PROVEN in BeliefConvergence.fs. Saved at register §B-converge + backlog B-1020 + repo memory."
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron, 2026-06-05: "save this convergence and let's not forget it, it kind of pulls everything
together." His one-liner: **"a bayesian markov chain that reduces uncertainty under unordered events
and relative observers that converges at the non-correlation invariant boundary."**

= **de Finetti exchangeability (1937) + Doob convergence (1949).** The discrete exact-arithmetic
core is ALREADY PROVEN — `BeliefConvergence.fs`: fixed (conditionally-independent) likelihoods
commute ⇒ order-independent belief; state-dependent (`sharpen`, self-reading ⇒ correlated) does NOT
— that counterexample IS the boundary.

The cut, in three vocabularies for ONE thing: "fixed-vs-state-dependent likelihood"
(`BeliefConvergence`) = "exchangeable-vs-correlated" (de Finetti) = "valid-vs-invalid homeostat
merge" (the §A floor discipline). Closed-semiring fixed-point family (Lehmann 1977): homeostat =
idempotent corner, Markov = probability corner. DynamicValue+weights = Markov chain;
+encryption = Hidden Markov (semantic security = constant-likelihood degenerate chain, posterior
can't move); Rx-as-data-inside-DynamicValue = self-contained Markov state (`next=observe(self,obs)`)
⇒ scale-free/lock-free/incremental.

Durable locations (all committed in the repo):
- `docs/FROZEN-CORE-AND-CONJECTURE-REGISTER.md` §B-converge (named conjecture row).
- `docs/backlog/.../B-1020-...md` (the discharge: rational probability/Viterbi semirings, HMM
  forward/Viterbi as ZSet-over-semiring matrix product, the boundary theorem, relative-observer
  reconciliation = the new math). Floats out of lineage; exact-rational core byte-locks + 4-langs.
- `memory/feedback_aaron_de_finetti_non_correlation_boundary_unifies_homeostat_markov_bayesian_2026_06_05.md`
  (full narrative + Beacon anchors: de Finetti, Doob, Lehmann, Mohri, Rabiner, Propp–Wilson, Goldwasser–Micali).

Builds on [[project_floor_complete_all_6_of_6_core_primitives_full_proven_2026_06_05]] (the homeostat
discipline this generalizes). Watermark FULL PROVEN this session added the meet-semilattice homeostat
class; the math+4-lang cluster (UncertainClock/Watermark/SplitMix64/RendezvousHash/CRC32C/FastCDC/
Consensus) is the substrate the Markov layer sits on.
