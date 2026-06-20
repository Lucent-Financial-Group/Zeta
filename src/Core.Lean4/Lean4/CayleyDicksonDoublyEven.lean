/-
  CayleyDicksonDoublyEven.lean — Lean 4 proof oracle: Cayley-Dickson doubling
  preserves doubly-even self-duality (the INDUCTIVE STEP).

  T2 of the homoiconic-IR / adinkra-ECC trajectory (Soraya, formal-verification
  role, round of 2026-06-20; Otto-invoked under the four-ferry role split:
  Gemini proposes, Grok critiques, Amara sharpens, Otto tests, Git decides).

  ## The claim

  A binary linear code `C ⊆ F₂ⁿ` is **doubly-even** (Type II) when every codeword
  has Hamming weight divisible by 4, and **self-dual** when `C = C⊥` under the
  standard F₂ inner product. Gates' adinkras are carried by exactly the
  doubly-even self-dual codes (the dashing/chromotopology existence condition);
  the Cayley-Dickson ladder ℝ→ℂ→ℍ→𝕆→… doubles dimension at each rung, and the
  question is whether the doubly-even self-dual property SURVIVES one doubling.

  This file proves the **inductive step**: IF `C` is doubly-even and self-dual at
  length `n`, THEN its Cayley-Dickson double is doubly-even and self-dual at
  length `2n`. The **base case is discharged elsewhere** (the length-8 seed e₈,
  the extended Hamming `[8,4]` code — the first doubly-even self-dual code; its
  doubly-evenness and self-duality are the inductive base). Step + base ⇒ the
  whole CD tower of doubly-even self-dual codes (e₈, e₈², …) by induction.

  ## What "Cayley-Dickson doubling" is, at the level of the CODE (honest scope)

  Doubly-evenness and self-duality are properties of the ADDITIVE code: an
  F₂-linear subspace, its Hamming weight, and the standard bilinear inner product.
  The Cayley-Dickson construction `A ↦ A ⊕ A` with the twisted product
  `(a,b)(c,d) = (ac − d̄b, da + bc̄)` carries its arithmetic in the MULTIPLICATION
  (the sign rule / 2-cocycle — REPORT-6 §1, §3). On the additive code the doubling
  is therefore the **direct square** `C ↦ C ⊕ C` (length `n ↦ 2n`): this is
  exactly the rung `e₈ ↦ e₈²` named in REPORT-6 §3 ("at n = 16 the two doubly-even
  self-dual codes (e₈², d₁₆⁺) give E8⊕E8 and D₁₆⁺"), the code-side shadow of the
  lattice doubling `E8 ↦ E8 ⊕ E8`. The multiplicative CD twist is a coordinate
  monomial map — a Hamming isometry — so it preserves weight and inner product;
  the entire invariant-preservation content is the direct-square lemma proved
  here. We prove the untwisted core and name the twist's isometry status; we do
  NOT here re-derive the d₁₆⁺ "glued" doubling (the non-split sibling), which is a
  separate construction, not the direct square. (Drift discipline: this is the
  Statement scope stated up front, per verification-drift-auditor.)

  ## What is proved here (sorry-free, pure Lean 4 core — no Mathlib)

    * `wt_append`        — Hamming weight is additive across concatenation.
    * `inner_append`     — the F₂ inner product splits block-diagonally.
    * `inner_zeroWord`   — every word is orthogonal to the zero word.
    * `double_doublyEven`— doubling preserves doubly-evenness (4 ∣ wt, additive).
    * `double_selfDual`  — doubling preserves self-duality, AS SET EQUALITY
                           `double C = (double C)⊥` (the strongest form: no
                           dimension-counting shortcut — both inclusions proved
                           directly from `C = C⊥` and `0 ∈ C`).
    * `cayleyDickson_double_preserves` — the headline inductive step (both at once).

  Self-duality is proved as the genuine `C = C⊥`, not merely self-orthogonality
  `C ⊆ C⊥` plus a dimension count — so no rank/Mathlib machinery is needed and the
  proof is a pure-core artifact (style ref: GenGenFixpoint.lean, the privacy
  proofs — checkable with bare `lean`, no multi-GB cache).

  Axiom status (verified by `#print axioms`): sorry-free — NO `sorryAx`, NO
  `admit` (the CI audit target is `sorryAx`, which is absent). It depends only on
  Lean's three standard foundational axioms — `propext`, `Classical.choice`,
  `Quot.sound` — introduced by the core `List`/`simp` lemmas it rewrites with; no
  custom axiom is declared in this file.

  ## Anchors (Beacon)

  * S. James Gates Jr. et al., adinkras & doubly-even self-dual codes:
    Doran–Faux–Gates–Hübsch–Iga–Landweber, "Codes and Supersymmetry in One
    Dimension" (Adv. Theor. Math. Phys. 15, 2011); Gates–Hübsch–Stiffler 2012.
  * Calderbank–Rains–Shor–Sloane, "Quantum error correction via codes over
    GF(4)" (1998) / "…and orthogonal geometry" (PRL 1997) — code = isotropic
    subspace of the symplectic F₂-geometry (the lift used in REPORT-6 §1).
  * Nebe–Rains–Sloane, "The invariants of the Clifford groups" (Des. Codes
    Cryptogr. 24, 2001) & *Self-Dual Codes and Invariant Theory* (2006) — the
    span unifying the lattice and Clifford legs of the doubling.
  * Cayley (1845) / Dickson (1919) — the doubling construction; Conway–Sloane
    SPLAG (Construction A: code ↦ lattice, e₈ ↦ E8).
  * In-repo: docs/research/2026-06-12-gates-ecc-tsirelson-math-team-REPORT-6-*
    (§3 e₈²/E8⊕E8), 2026-06-12-ferry-26-* (the unfolding adinkra→Clifford→E8),
    src/Core/AdinkraCode.fs (`isSelfDual` G=H; the F# oracle this proof anchors).
-/

namespace Zeta.CayleyDicksonDoublyEven

-- ═══ Words, weight, inner product over F₂ ═════════════════════════════════════
-- A codeword is a list of bits; "length n" is tracked as an explicit hypothesis.
-- F₂ arithmetic is carried in ℕ: the inner product is the OVERLAP COUNT (number
-- of coordinates where both bits are 1), and orthogonality is `2 ∣ overlap` —
-- i.e. an even overlap. This keeps the whole file in pure-core ℕ arithmetic.

abbrev Word := List Bool

/-- Hamming weight: the number of 1-bits. -/
def wt (l : Word) : Nat := (l.filter id).length

/-- F₂ inner product, carried as the ℕ overlap count `Σ xᵢ·yᵢ`. The genuine F₂
    pairing is `inner x y % 2`; orthogonality is `2 ∣ inner x y`. -/
def inner (x y : Word) : Nat := wt (List.zipWith (· && ·) x y)

/-- The all-zero codeword of length `n`. -/
def zeroWord (n : Nat) : Word := List.replicate n false

-- ═══ Code predicates ══════════════════════════════════════════════════════════
-- A code at length `n` is a predicate on words. We carry the well-formedness
-- facts we actually use (every codeword has length n; the zero word is present)
-- as separate hypotheses rather than bundling a structure — the proof needs
-- exactly these and nothing about full linear-subspace closure.

/-- Every codeword of `C` has length `n`. -/
def LenN (n : Nat) (C : Word → Prop) : Prop := ∀ c, C c → c.length = n

/-- `x` lies in the dual of `C` at length `n`: it has length `n` and is orthogonal
    (even overlap) to every codeword. -/
def InDual (n : Nat) (C : Word → Prop) (x : Word) : Prop :=
  x.length = n ∧ ∀ y, C y → 2 ∣ inner x y

/-- `C` is self-dual at length `n`: it equals its own dual, as predicates. This is
    the genuine `C = C⊥` (both directions), not just self-orthogonality. -/
def SelfDual (n : Nat) (C : Word → Prop) : Prop := ∀ w, C w ↔ InDual n C w

/-- `C` is doubly-even (Type II): every codeword's weight is divisible by 4. -/
def DoublyEven (C : Word → Prop) : Prop := ∀ c, C c → 4 ∣ wt c

/-- **Cayley-Dickson (direct-square) doubling** of a length-`n` code: the length-`2n`
    code whose words are the concatenations `a ++ b` of two `C`-codewords. This is
    `C ⊕ C` — the additive shadow of `A ↦ A ⊕ A`, i.e. `e₈ ↦ e₈²`. (The length is
    carried by `C`'s codewords via `LenN`, so `double` itself takes no length
    argument; the doubled length `2n` appears in `double_selfDual`'s conclusion.) -/
def double (C : Word → Prop) : Word → Prop :=
  fun w => ∃ a b, C a ∧ C b ∧ w = a ++ b

-- ═══ Additivity lemmas: weight and inner product split across concatenation ════

/-- Hamming weight is additive across concatenation. -/
theorem wt_append (a b : Word) : wt (a ++ b) = wt a + wt b := by
  unfold wt; rw [List.filter_append, List.length_append]

/-- The F₂ inner product is block-diagonal: when the first halves have matching
    length, the overlap of `a ++ b` with `x ++ y` is the sum of the half-overlaps.
    This is the one fact that makes self-duality of a direct sum a membership
    argument rather than a dimension count. -/
theorem inner_append {a x : Word} (b y : Word) (h : a.length = x.length) :
    inner (a ++ b) (x ++ y) = inner a x + inner b y := by
  unfold inner; rw [List.zipWith_append h, wt_append]

/-- Every word is orthogonal to the zero word (overlap is literally zero): the
    pointwise product with the all-`false` word is all `false`. -/
theorem inner_zeroWord (u : Word) (m : Nat) : inner u (zeroWord m) = 0 := by
  induction u generalizing m with
  | nil => simp [inner, zeroWord, wt]
  | cons a u ih =>
    cases m with
    | zero => simp [inner, zeroWord, wt]
    | succ k =>
      have hz : zeroWord (k + 1) = false :: zeroWord k := by
        simp [zeroWord, List.replicate]
      simp only [inner, hz, List.zipWith_cons_cons, Bool.and_false, wt,
        List.filter_cons] at *
      simpa [inner, wt] using ih k

/-- The zero word of length `n` has length `n`. -/
theorem length_zeroWord (n : Nat) : (zeroWord n).length = n := by
  simp [zeroWord]

-- ═══ The inductive step ═══════════════════════════════════════════════════════

/-- **Doubling preserves doubly-evenness.** `wt (a ++ b) = wt a + wt b`, and a sum
    of two multiples of 4 is a multiple of 4. -/
theorem double_doublyEven (C : Word → Prop) (hDE : DoublyEven C) :
    DoublyEven (double C) := by
  rintro w ⟨a, b, ha, hb, rfl⟩
  rw [wt_append]
  exact Nat.dvd_add (hDE a ha) (hDE b hb)

/-- **Doubling preserves self-duality** — the load-bearing half. Proved as the
    genuine set equality `double C = (double C)⊥` at length `2n`, both inclusions
    from `C = C⊥` (`hSD`) and `0 ∈ C` (`hzero`):

    * `⊆` : a codeword `a ++ b` (a,b ∈ C) pairs with any `x ++ y` (x,y ∈ C) to
      `inner a x + inner b y`; each summand is even because `C ⊆ C⊥`.
    * `⊇` : a dual word `w = (w.take n) ++ (w.drop n)`; pairing it against
      `x ++ 0` isolates `inner (w.take n) x` (the other half vanishes against the
      zero word), forcing `w.take n ∈ C⊥ = C`; symmetrically for `w.drop n`. -/
theorem double_selfDual
    (n : Nat) (C : Word → Prop)
    (hlen : LenN n C) (hzero : C (zeroWord n)) (hSD : SelfDual n C) :
    SelfDual (2 * n) (double C) := by
  intro w
  constructor
  · -- (⊆) every doubled codeword lies in the dual
    rintro ⟨a, b, ha, hb, rfl⟩
    refine ⟨?_, ?_⟩
    · rw [List.length_append, hlen a ha, hlen b hb]; omega
    · rintro z ⟨x, y, hx, hy, rfl⟩
      have hax : a.length = x.length := by rw [hlen a ha, hlen x hx]
      rw [inner_append b y hax]
      exact Nat.dvd_add (((hSD a).mp ha).2 x hx) (((hSD b).mp hb).2 y hy)
  · -- (⊇) every dual word is a doubled codeword
    rintro ⟨hwlen, horth⟩
    -- split w into its two length-n halves
    have hsplit : w = w.take n ++ w.drop n := (List.take_append_drop n w).symm
    have han : (w.take n).length = n := by rw [List.length_take, hwlen]; omega
    have hbn : (w.drop n).length = n := by rw [List.length_drop, hwlen]; omega
    -- the first half lies in C⊥ = C
    have haC : C (w.take n) := by
      rw [hSD (w.take n)]
      refine ⟨han, fun x hx => ?_⟩
      have hz : double C (x ++ zeroWord n) := ⟨x, zeroWord n, hx, hzero, rfl⟩
      have hxlen : (w.take n).length = x.length := by rw [han, hlen x hx]
      have hpair := horth (x ++ zeroWord n) hz
      rw [hsplit, inner_append (w.drop n) (zeroWord n) hxlen,
        inner_zeroWord (w.drop n) n] at hpair
      simpa using hpair
    -- the second half lies in C⊥ = C
    have hbC : C (w.drop n) := by
      rw [hSD (w.drop n)]
      refine ⟨hbn, fun y hy => ?_⟩
      have hz : double C (zeroWord n ++ y) := ⟨zeroWord n, y, hzero, hy, rfl⟩
      have hxlen : (w.take n).length = (zeroWord n).length := by
        rw [han, length_zeroWord]
      have hpair := horth (zeroWord n ++ y) hz
      rw [hsplit, inner_append (w.drop n) y hxlen,
        inner_zeroWord (w.take n) n] at hpair
      simpa using hpair
    exact ⟨w.take n, w.drop n, haC, hbC, hsplit⟩

/-- **Headline (the inductive step).** Cayley-Dickson doubling preserves
    doubly-even self-duality: from a doubly-even self-dual code at length `n`, the
    direct-square double is a doubly-even self-dual code at length `2n`. With the
    base case (e₈, the `[8,4]` extended Hamming code) discharged separately, this
    closes the induction over the whole Cayley-Dickson tower. -/
theorem cayleyDickson_double_preserves
    (n : Nat) (C : Word → Prop)
    (hlen : LenN n C) (hzero : C (zeroWord n))
    (hSD : SelfDual n C) (hDE : DoublyEven C) :
    SelfDual (2 * n) (double C) ∧ DoublyEven (double C) :=
  ⟨double_selfDual n C hlen hzero hSD, double_doublyEven C hDE⟩

-- ═══ Verification ═════════════════════════════════════════════════════════════
-- Every theorem is CLOSED: no `sorry`, no `admit`, no Mathlib import (pure Lean 4
-- core). The CI audit target is `sorryAx` — which is ABSENT. The headline theorem
-- depends only on Lean's three standard foundational axioms (`propext`,
-- `Classical.choice`, `Quot.sound`), introduced by the core `List`/`simp` lemmas
-- it rewrites with; no custom axiom is declared here. (Verified by execution
-- 2026-06-20: `#print axioms` ⇒ `[propext, Classical.choice, Quot.sound]`.)
-- Run: lake env lean src/Core.Lean4/Lean4/CayleyDicksonDoublyEven.lean
--   (or bare `lean` — there are no imports). Expected: NO output = oracle passes.
-- Audit: `#print axioms cayleyDickson_double_preserves` ⇒ the three above, no `sorryAx`.

end Zeta.CayleyDicksonDoublyEven
