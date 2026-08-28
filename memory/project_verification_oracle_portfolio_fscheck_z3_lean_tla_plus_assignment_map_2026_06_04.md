---
name: verification-oracle-portfolio-fscheck-z3-lean-tla-assignment-map-2026-06-04
description: "Four-oracle verification portfolio + which claim class each owns (FsCheck=leaves/sampling, Z3=bitvector+SMT, Lean4+Mathlib=induction/DBSP-correctness, TLA+=temporal/saga/protocols); tower vs mechanical-check accounting; leaf-vs-structure proof split; abusing a legible tool for off-sweet-spot checks is OK if labeled bounded-check-not-proof and additive-not-replacement"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Kestrel↔Aaron thread on the proof program. The serializer/proof layer
uses FOUR verification mechanisms; each OWNS a claim class (genuine independence =
different mechanism, so a bug in one wouldn't reproduce in another):

**FsCheck (property-based, concrete sampling)** → the LEAF layer: float-formatting
round-trip/injectivity (generate the corners — NaN/Inf/-0.0/subnormals/boundaries),
string-quoting round-trip. The right tool for things NOT cleanly provable (runtime
float→string algo). Loop: FsCheck finds+shrinks a corner → it becomes a checked-in
golden-vector regression. Stronger than hand-written cases; still sampling, not proof.

**Z3 (SMT, decidable theories)** → bitvector/arithmetic: the 128-bit ZetaId
manipulation (pack/unpack round-trip, index-field injectivity, no-collision over the
ENTIRE 2^128 space — its sweet spot, currently under-exploited; aim Z3 here next),
finite-domain encoding injectivity, remaining DBSP operator-algebra identities at the
symbolic-ideal level. NOT for: recursive folds (→ Lean), float-string round-trip.

**Lean4 + Mathlib (inductive / dependent-type proof)** → induction over unbounded
structures: the FOLD LAWS / round-trip by structural induction over all trees
(recursive complement to FsCheck's leaves), the **DBSP correctness theorem
(incremental = batch, by fixpoint induction — the mathematical heart, only provable
here; new ground not redundancy)**, and Mathlib-typeclass instantiation of Z-set/G-set
(prove it IS an AddCommGroup → stronger than laws-in-isolation, inherits the corpus).
NOT for: bitvector IDs (Z3 faster), float formatting.

**TLA+ (temporal / concurrent)** → behavior-over-time: the saga / cross-repo-join
(always complete-or-compensate under all interleavings+failures — highest-value,
formal version of DST validation), agent coordination (convergence/no-deadlock/
progress), the verify-don't-trust memory-provenance security protocol (poisoned agent
can never cause unsigned action), CRDT convergence. The class the value-oracles can't
express. NOT the value layer (folds/group-laws/ID-bitvectors = wrong dimension).

**Proof-strength split (gate-reach-boundary):** STRUCTURE is provable via fold-law
algebra (cata uniqueness, fusion, hylo round-trip — eliminates per-codec recursion
proofs); LEAVES are example/property-tested (where real codec bugs live — escaping,
float repr, byte conventions); CANONICAL bytes are 4-lang golden-reference byte-locked.
Round-trip / matrix-commutativity is a theorem on the LOSSLESS SUBSET with documented
lossy-edge behavior (Bytes-not-in-YAML, float repr) — state the domain, don't claim
"every pair commutes" unqualified. Custom bridges are where lossy handling lives.

**Tower vs mechanical-check accounting (Aaron, keep honest):** proving the SAME claim
in multiple encodings (FsCheck∧Z3∧Lean∧TLA+) = mechanical robustness on ONE tower,
N times (catches encoding/spec-expression/tool bugs — twice the chance per extra
encoding; low maintenance, proofs don't churn). It does NOT add a TOWER — towers =
different AXIOM FOUNDATIONS (robustness against a foundation being wrong). Don't inflate
the foundational-robustness count by counting tool-reproofs as towers. New ground
(only-here-provable) ≠ redundant re-check: DBSP-correctness (Lean) and saga-correctness
(TLA+) are new claims, not third checks.

**Abusing a legible tool off-sweet-spot is OK (Aaron uses TLA+ for value/property
things "because it's my brain language"):** legitimate — a check you can read/write/
maintain beats a better-fitting one you can't (legible externalization). Two rules:
(1) LABEL strength honestly — TLC on a value prop is bounded model-checking
(enumeration-up-to-N ≈ Z3-bounded/FsCheck-sampling class) unless it exhausts a finite
domain; badge "model-checked at bounded scope," not "proven." (2) ADDITIVE not
REPLACEMENT — abuse-as-extra-check = pure upside; abuse-as-replacement forfeits
multi-mechanism independence (keep induction→Lean, 2^128→Z3, float-corners→FsCheck).

Composes [[dynamicvalue-is-value-functor-fixpoint-codecs-bridges-are-folds-2026-06-04]]
+ [[dynamicvalue-open-base-type-structs-are-lenses-unknowns-roundtrip-version-independent-2026-06-04]].
Thread "more to come" — extend as Aaron continues.
