import Mathlib

/-!
# Seven-generator central involution and projector laws

This file proves only the abstract algebra used by the finite coded-Adinkra / half-spin census.
It derives centrality and `ω² = 1` from seven pairwise-anticommuting generators with square `-1`,
then proves the `(1 ± ω)/2` projector laws. Computed ranks and Bayesian claims are intentionally
outside this theorem.
-/

namespace Zeta.AdinkraCentralProjectors

variable {A : Type*} [Ring A]

theorem prod_mul_of_forall_anticommute
    (a : A) :
    ∀ (xs : List A),
      (∀ x ∈ xs, x * a = -(a * x)) →
      xs.prod * a = ((-1 : ℤ) ^ xs.length) • (a * xs.prod) := by
  intro xs h
  induction xs with
  | nil => simp
  | cons x xs ih =>
      have hx : x * a = -(a * x) := h x (by simp)
      have hxs : ∀ y ∈ xs, y * a = -(a * y) := by
        intro y hy
        exact h y (by simp [hy])
      rw [List.prod_cons, List.length_cons, mul_assoc, ih hxs, mul_smul_comm]
      rw [← mul_assoc x a, hx]
      simp [pow_succ, mul_assoc]

theorem mul_prod_of_forall_anticommute
    (a : A) :
    ∀ (xs : List A),
      (∀ x ∈ xs, a * x = -(x * a)) →
      a * xs.prod = ((-1 : ℤ) ^ xs.length) • (xs.prod * a) := by
  intro xs h
  induction xs with
  | nil => simp
  | cons x xs ih =>
      have hx : a * x = -(x * a) := h x (by simp)
      have hxs : ∀ y ∈ xs, a * y = -(y * a) := by
        intro y hy
        exact h y (by simp [hy])
      rw [List.prod_cons, ← mul_assoc, hx, neg_mul, mul_assoc, ih hxs]
      simp [List.length_cons, pow_succ, mul_assoc]
      rw [← mul_assoc, ((Commute.neg_one_right x).pow_right xs.length).eq]
      simp [mul_assoc]

theorem centered_word_commutes
    (a : A) (pre suf : List A)
    (hpre : ∀ x ∈ pre, a * x = -(x * a))
    (hsuf : ∀ x ∈ suf, x * a = -(a * x))
    (hsign : ((-1 : ℤ) ^ pre.length) = (-1 : ℤ) ^ suf.length) :
    (pre.prod * a * suf.prod) * a = a * (pre.prod * a * suf.prod) := by
  calc
    (pre.prod * a * suf.prod) * a = pre.prod * a * (suf.prod * a) := by simp [mul_assoc]
    _ = pre.prod * a * (((-1 : ℤ) ^ suf.length) • (a * suf.prod)) := by
      rw [prod_mul_of_forall_anticommute a suf hsuf]
    _ = ((-1 : ℤ) ^ suf.length) • (pre.prod * a * (a * suf.prod)) := by
      rw [mul_smul_comm]
    _ = ((-1 : ℤ) ^ pre.length) • (pre.prod * a * (a * suf.prod)) := by rw [hsign]
    _ = (((-1 : ℤ) ^ pre.length) • (pre.prod * a)) * a * suf.prod := by
      simp [mul_assoc]
    _ = (a * pre.prod) * a * suf.prod := by
      rw [← mul_prod_of_forall_anticommute a pre hpre]
    _ = a * (pre.prod * a * suf.prod) := by simp [mul_assoc]

def omega7 (g : Fin 7 → A) : A :=
  g 0 * g 1 * g 2 * g 3 * g 4 * g 5 * g 6

theorem omega7_commutes
    (g : Fin 7 → A)
    (hanti : ∀ i j, i ≠ j → g i * g j = -(g j * g i)) :
    ∀ i, omega7 g * g i = g i * omega7 g := by
  intro i
  fin_cases i
  · have h := centered_word_commutes (A := A) (g 0) [] [g 1, g 2, g 3, g 4, g 5, g 6]
      (by simp)
      (by
        intro x hx
        simp at hx
        rcases hx with rfl | rfl | rfl | rfl | rfl | rfl
        · exact hanti 1 0 (by decide)
        · exact hanti 2 0 (by decide)
        · exact hanti 3 0 (by decide)
        · exact hanti 4 0 (by decide)
        · exact hanti 5 0 (by decide)
        · exact hanti 6 0 (by decide))
      (by norm_num)
    simpa [omega7, List.prod_cons, mul_assoc] using h
  · have h := centered_word_commutes (A := A) (g 1) [g 0] [g 2, g 3, g 4, g 5, g 6]
      (by
        intro x hx
        simp at hx
        subst x
        exact hanti 1 0 (by decide))
      (by
        intro x hx
        simp at hx
        rcases hx with rfl | rfl | rfl | rfl | rfl
        · exact hanti 2 1 (by decide)
        · exact hanti 3 1 (by decide)
        · exact hanti 4 1 (by decide)
        · exact hanti 5 1 (by decide)
        · exact hanti 6 1 (by decide))
      (by norm_num)
    simpa [omega7, List.prod_cons, mul_assoc] using h
  · have h := centered_word_commutes (A := A) (g 2) [g 0, g 1] [g 3, g 4, g 5, g 6]
      (by
        intro x hx
        simp at hx
        rcases hx with rfl | rfl
        · exact hanti 2 0 (by decide)
        · exact hanti 2 1 (by decide))
      (by
        intro x hx
        simp at hx
        rcases hx with rfl | rfl | rfl | rfl
        · exact hanti 3 2 (by decide)
        · exact hanti 4 2 (by decide)
        · exact hanti 5 2 (by decide)
        · exact hanti 6 2 (by decide))
      (by norm_num)
    simpa [omega7, List.prod_cons, mul_assoc] using h
  · have h := centered_word_commutes (A := A) (g 3) [g 0, g 1, g 2] [g 4, g 5, g 6]
      (by
        intro x hx
        simp at hx
        rcases hx with rfl | rfl | rfl
        · exact hanti 3 0 (by decide)
        · exact hanti 3 1 (by decide)
        · exact hanti 3 2 (by decide))
      (by
        intro x hx
        simp at hx
        rcases hx with rfl | rfl | rfl
        · exact hanti 4 3 (by decide)
        · exact hanti 5 3 (by decide)
        · exact hanti 6 3 (by decide))
      (by norm_num)
    simpa [omega7, List.prod_cons, mul_assoc] using h
  · have h := centered_word_commutes (A := A) (g 4) [g 0, g 1, g 2, g 3] [g 5, g 6]
      (by
        intro x hx
        simp at hx
        rcases hx with rfl | rfl | rfl | rfl
        · exact hanti 4 0 (by decide)
        · exact hanti 4 1 (by decide)
        · exact hanti 4 2 (by decide)
        · exact hanti 4 3 (by decide))
      (by
        intro x hx
        simp at hx
        rcases hx with rfl | rfl
        · exact hanti 5 4 (by decide)
        · exact hanti 6 4 (by decide))
      (by norm_num)
    simpa [omega7, List.prod_cons, mul_assoc] using h
  · have h := centered_word_commutes (A := A) (g 5) [g 0, g 1, g 2, g 3, g 4] [g 6]
      (by
        intro x hx
        simp at hx
        rcases hx with rfl | rfl | rfl | rfl | rfl
        · exact hanti 5 0 (by decide)
        · exact hanti 5 1 (by decide)
        · exact hanti 5 2 (by decide)
        · exact hanti 5 3 (by decide)
        · exact hanti 5 4 (by decide))
      (by
        intro x hx
        simp at hx
        subst x
        exact hanti 6 5 (by decide))
      (by norm_num)
    simpa [omega7, List.prod_cons, mul_assoc] using h
  · have h := centered_word_commutes (A := A) (g 6) [g 0, g 1, g 2, g 3, g 4, g 5] []
      (by
        intro x hx
        simp at hx
        rcases hx with rfl | rfl | rfl | rfl | rfl | rfl
        · exact hanti 6 0 (by decide)
        · exact hanti 6 1 (by decide)
        · exact hanti 6 2 (by decide)
        · exact hanti 6 3 (by decide)
        · exact hanti 6 4 (by decide)
        · exact hanti 6 5 (by decide))
      (by simp)
      (by norm_num)
    simpa [omega7, List.prod_cons, mul_assoc] using h

def cliffordSquareSign : Nat → ℤ
  | 0 => 1
  | n + 1 => ((-1 : ℤ) ^ n) * (-1) * cliffordSquareSign n

theorem prod_square_of_pairwise_anticommute
    (xs : List A)
    (hanti : xs.Pairwise fun x y => x * y = -(y * x))
    (hsquare : ∀ x ∈ xs, x * x = -1) :
    xs.prod * xs.prod = cliffordSquareSign xs.length • (1 : A) := by
  induction xs with
  | nil => simp [cliffordSquareSign]
  | cons x xs ih =>
      rw [List.pairwise_cons] at hanti
      have hmove : xs.prod * x = ((-1 : ℤ) ^ xs.length) • (x * xs.prod) := by
        apply prod_mul_of_forall_anticommute x xs
        intro y hy
        have hxy := hanti.1 y hy
        rw [hxy]
        simp
      have hxx : x * x = -1 := hsquare x (by simp)
      have htailSquare : ∀ y ∈ xs, y * y = -1 := by
        intro y hy
        exact hsquare y (by simp [hy])
      calc
        (x :: xs).prod * (x :: xs).prod = x * (xs.prod * x) * xs.prod := by
          simp [List.prod_cons, mul_assoc]
        _ = x * (((-1 : ℤ) ^ xs.length) • (x * xs.prod)) * xs.prod := by rw [hmove]
        _ = ((-1 : ℤ) ^ xs.length) • ((x * (x * xs.prod)) * xs.prod) := by
          rw [mul_smul_comm, smul_mul_assoc]
        _ = ((-1 : ℤ) ^ xs.length) • ((x * x) * (xs.prod * xs.prod)) := by
          simp [mul_assoc]
        _ = ((-1 : ℤ) ^ xs.length) • ((-1 : A) *
              (cliffordSquareSign xs.length • (1 : A))) := by rw [hxx, ih hanti.2 htailSquare]
        _ = cliffordSquareSign (xs.length + 1) • (1 : A) := by
          simp [cliffordSquareSign]

theorem omega7_square
    (g : Fin 7 → A)
    (hanti : ∀ i j, i ≠ j → g i * g j = -(g j * g i))
    (hsquare : ∀ i, g i * g i = -1) :
    omega7 g * omega7 g = 1 := by
  let xs : List A := [g 0, g 1, g 2, g 3, g 4, g 5, g 6]
  have hpair : xs.Pairwise fun x y => x * y = -(y * x) := by
    dsimp [xs]
    have h0 : ∀ x ∈ [g 1, g 2, g 3, g 4, g 5, g 6], g 0 * x = -(x * g 0) := by
      intro x hx
      simp at hx
      rcases hx with rfl | rfl | rfl | rfl | rfl | rfl
      · exact hanti 0 1 (by decide)
      · exact hanti 0 2 (by decide)
      · exact hanti 0 3 (by decide)
      · exact hanti 0 4 (by decide)
      · exact hanti 0 5 (by decide)
      · exact hanti 0 6 (by decide)
    have h1 : ∀ x ∈ [g 2, g 3, g 4, g 5, g 6], g 1 * x = -(x * g 1) := by
      intro x hx
      simp at hx
      rcases hx with rfl | rfl | rfl | rfl | rfl
      · exact hanti 1 2 (by decide)
      · exact hanti 1 3 (by decide)
      · exact hanti 1 4 (by decide)
      · exact hanti 1 5 (by decide)
      · exact hanti 1 6 (by decide)
    have h2 : ∀ x ∈ [g 3, g 4, g 5, g 6], g 2 * x = -(x * g 2) := by
      intro x hx
      simp at hx
      rcases hx with rfl | rfl | rfl | rfl
      · exact hanti 2 3 (by decide)
      · exact hanti 2 4 (by decide)
      · exact hanti 2 5 (by decide)
      · exact hanti 2 6 (by decide)
    have h3 : ∀ x ∈ [g 4, g 5, g 6], g 3 * x = -(x * g 3) := by
      intro x hx
      simp at hx
      rcases hx with rfl | rfl | rfl
      · exact hanti 3 4 (by decide)
      · exact hanti 3 5 (by decide)
      · exact hanti 3 6 (by decide)
    have h4 : ∀ x ∈ [g 5, g 6], g 4 * x = -(x * g 4) := by
      intro x hx
      simp at hx
      rcases hx with rfl | rfl
      · exact hanti 4 5 (by decide)
      · exact hanti 4 6 (by decide)
    have h5 : ∀ x ∈ [g 6], g 5 * x = -(x * g 5) := by
      intro x hx
      simp at hx
      subst x
      exact hanti 5 6 (by decide)
    simp only [List.pairwise_cons]
    exact ⟨h0, ⟨h1, ⟨h2, ⟨h3, ⟨h4, ⟨h5, by simp⟩⟩⟩⟩⟩⟩
  have hsquares : ∀ x ∈ xs, x * x = -1 := by
    intro x hx
    dsimp [xs] at hx
    simp at hx
    rcases hx with rfl | rfl | rfl | rfl | rfl | rfl | rfl
    · exact hsquare 0
    · exact hsquare 1
    · exact hsquare 2
    · exact hsquare 3
    · exact hsquare 4
    · exact hsquare 5
    · exact hsquare 6
  have h := prod_square_of_pairwise_anticommute xs hpair hsquares
  norm_num [xs, List.prod_cons, cliffordSquareSign] at h
  simpa [omega7, mul_assoc] using h

section Projectors

variable [Algebra ℚ A]

def projectorPlus (ω : A) : A := (1 / 2 : ℚ) • (1 + ω)
def projectorMinus (ω : A) : A := (1 / 2 : ℚ) • (1 - ω)

theorem projector_plus_idempotent (ω : A) (hsquare : ω * ω = 1) :
    projectorPlus ω * projectorPlus ω = projectorPlus ω := by
  dsimp [projectorPlus]
  noncomm_ring [hsquare]
  module

theorem projector_minus_idempotent (ω : A) (hsquare : ω * ω = 1) :
    projectorMinus ω * projectorMinus ω = projectorMinus ω := by
  dsimp [projectorMinus]
  noncomm_ring [hsquare]
  module

theorem projector_complementary (ω : A) (hsquare : ω * ω = 1) :
    projectorPlus ω * projectorMinus ω = 0 ∧
      projectorMinus ω * projectorPlus ω = 0 := by
  constructor
  · dsimp [projectorPlus, projectorMinus]
    noncomm_ring [hsquare]
    module
  · dsimp [projectorPlus, projectorMinus]
    noncomm_ring [hsquare]
    module

theorem projector_sum (ω : A) : projectorPlus ω + projectorMinus ω = 1 := by
  dsimp [projectorPlus, projectorMinus]
  module

theorem projector_preserved
    (ω a : A) (hcomm : ω * a = a * ω) :
    projectorPlus ω * a = a * projectorPlus ω ∧
      projectorMinus ω * a = a * projectorMinus ω := by
  constructor
  · dsimp [projectorPlus]
    noncomm_ring [hcomm]
  · dsimp [projectorMinus]
    noncomm_ring [hcomm]

theorem omega7_projector_laws
    (g : Fin 7 → A)
    (hanti : ∀ i j, i ≠ j → g i * g j = -(g j * g i))
    (hsquare : ∀ i, g i * g i = -1) :
    projectorPlus (omega7 g) * projectorPlus (omega7 g) = projectorPlus (omega7 g) ∧
      projectorMinus (omega7 g) * projectorMinus (omega7 g) = projectorMinus (omega7 g) ∧
      projectorPlus (omega7 g) * projectorMinus (omega7 g) = 0 ∧
      projectorMinus (omega7 g) * projectorPlus (omega7 g) = 0 ∧
      projectorPlus (omega7 g) + projectorMinus (omega7 g) = 1 ∧
      ∀ i,
        projectorPlus (omega7 g) * g i = g i * projectorPlus (omega7 g) ∧
          projectorMinus (omega7 g) * g i = g i * projectorMinus (omega7 g) := by
  have hω2 := omega7_square g hanti hsquare
  have hcentral := omega7_commutes g hanti
  exact ⟨
    projector_plus_idempotent (omega7 g) hω2,
    projector_minus_idempotent (omega7 g) hω2,
    (projector_complementary (omega7 g) hω2).1,
    (projector_complementary (omega7 g) hω2).2,
    projector_sum (omega7 g),
    fun i => projector_preserved (omega7 g) (g i) (hcentral i)
  ⟩

end Projectors

end Zeta.AdinkraCentralProjectors
