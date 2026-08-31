# Finite Half-Spin Bracket and Mixed-Jacobi Census Contract

**Status:** planned finite-model measurement. This document declares the model before a result is computed. It is neither an `E8` construction certificate nor a claim about physics, identity, consciousness, reversibility, or homoiconicity.

## 1. Research Question

The existing non-quotient census verifies a concrete complexified Clifford action of 120 bivectors on a 128-dimensional positive-chirality carrier, but it deliberately leaves three witnesses unmeasured: a spinor–spinor bracket, mixed Jacobi, and a regular-module/rank-one witness. This program addresses only the first two.

> **Question.** In the explicitly declared finite Fock realization below, do the proposed spinor bracket, the declared `so(16)` action, and the mixed Jacobi expression vanish exactly on their finite basis domain?

The mathematical setting follows the standard distinction between Clifford/spin representation construction and any later physical interpretation.[^clifford] A published geometric construction also uses the `so(16)` action on a half-spinor in an algebraic `E8` context, while expressly separating that construction from a supergravity claim.[^geometric]

## 2. Declared Carrier and Exact Arithmetic

Let `F = Λ* C^8`, with the ordered occupation basis indexed by masks `0..255`. The positive half-spin carrier is

```text
S+ = span { |m⟩ : popcount(m) is even },  dimC(S+) = 128.
```

All values are represented in the exact dyadic Gaussian ring `Z[1/2, i]`, not by numerical tolerances. In particular, the only primitive coefficients are `0`, `±1`, `±i`, and the `1/2` used in the declared bivector action.

For mode `r = 0..7`, define the Jordan–Wigner gamma actions on a basis mask `m` by

```text
γ2r     |m⟩ = (-1)^(popcount(m below r)) (a†r + ar) |m⟩
γ2r + 1 |m⟩ = i (-1)^(popcount(m below r)) (a†r - ar) |m⟩.
```

This fixes both ordering and phase. It is the same Fock/Jordan–Wigner convention already exercised by the existing finite action census.

## 3. Declared Pairing, Action, and Bracket

The first candidate is the naive bilinear top-wedge pairing `B0`, defined by the coefficient of the ordered top form in `|x⟩ ∧ |y⟩`:

```text
B(|x⟩, |y⟩) = wedgeSign(x, y)   if x ∪ y = {0,…,7} and x ∩ y = ∅,
                 0              otherwise.
```

The sign is the parity of the permutation required to place the ordered bits of `x` followed by those of `y` into increasing mode order. No Hermitian conjugation is used: this is a declared complex-bilinear pairing.

The census will also measure, rather than assume, the reversion-signed comparison variant

```text
Brev(|x⟩, |y⟩) = (-1)^(k(k-1)/2) B0(|x⟩, |y⟩),  where k = popcount(x).
```

This is motivated by the standard Clifford reversion grade sign, not introduced as a numerical fit.[^clifford] Both variants remain reported even if one has fewer violations.

For `0 ≤ i < j < 16`, define the declared `so(16)` carrier action

```text
ρ(Jij) = 1/2 γi γj.
```

The finite spinor bracket has unit normalization by declaration:

```text
βij(s, t) = B(s, γi γj t),
[s, t]S = Σi<j βij(s, t) Jij.
```

Unit normalization is a coordinate convention for this census. The program does not claim that it is the sole conventional normalization in the literature.

## 4. Finite Checks

| Check | Finite domain | Expected exact result | What a nonzero count means |
|---|---:|---:|---|
| Clifford relation | `16² × 256` basis actions | zero violations | Gamma convention is inconsistent. |
| Standard bivector normalization | `120² × 128` actions | zero violations | The declared `1/2` action is not the standard `so(16)` normalization under the stated basis convention. |
| Bracket antisymmetry | `128²` pairs | zero violations | Pairing/action convention does not yield an alternating bracket. |
| Action equivariance | `120 × 128²` triples | zero violations | The bracket is not an intertwiner for the stated action. |
| Mixed Jacobi | `128³` triples | zero violations | The stated `so(16) ⊕ S+` bracket fails on the declared finite basis. |

Because every check is multilinear, a complete basis census is sufficient for the stated finite carrier. It is not a proof about a different signature, real form, basis convention, quotient code, or physical system.

## 5. Measured Result

**Recommendation: retain the bracket/Jacobi result as a bounded finite-model witness and retain the regularity refusal.** The originally declared ordered top-wedge pairing was falsified. A separately declared reversion-signed pairing was then measured; it is not retroactively substituted into the failed convention.

| Declared convention | Antisymmetry | Action normalization | Equivariance | Mixed Jacobi | Status |
|---|---:|---:|---:|---:|---|
| Ordered top wedge | 1,792 | 0 | 207,872 | 86,016 | Falsified |
| Reversion-signed top wedge | 0 | 0 | 0 | 0 | Passes this finite census |

The separately authored F# exterior-carrier oracle reported the same zero baseline and the same mutation discrimination. Its executable cross-language control performs one exhaustive F# baseline comparison and independent early-exit witnesses for each mutation. This establishes agreement between the stated TypeScript and F# finite implementations; it does not turn either implementation into an authority over the convention.

| Deliberate mutation | A nonzero measured control | Why the control is discriminating |
|---|---:|---|
| Omit Jordan–Wigner parity | Antisymmetry: 1,536 | Changes the declared gamma sign path. |
| Omit ordered pairing sign | Antisymmetry: 1,792 | Restores the falsified unordered pairing. |
| Omit bivector `1/2` | Normalization: 430,080 | Separates representation normalization from homogeneous Jacobi scaling. |
| Flip one bracket coordinate | Equivariance: 7,168 | Alters one declared bracket component. |
| Conjugate the right argument | Equivariance: 107,520 | Breaks the declared complex-bilinear convention. |

The omitted-half mutant leaves the antisymmetry and mixed-Jacobi counts zero while failing normalization and equivariance. That is a useful negative result: a zero homogeneous identity alone would have been an insufficient validation condition.

## 6. Required Falsifiers

At least the following independently targeted mutations must produce a nonzero appropriate violation count:

1. **Parity-string mutant:** omit the Jordan–Wigner sign in gamma actions. This must break the Clifford/action controls.
2. **Pairing-order mutant:** replace the ordered top-wedge sign with a fixed `+1` complement pairing. This must break a pairing-sensitive bracket control.
3. **Bivector-normalization mutant:** omit the `1/2` in `ρ(Jij)`. This must break the standard-normalization control, even if a homogeneous zero-Jacobi relation alone would not see a global rescaling.
4. **Single-component bracket mutant:** invert exactly one declared `(i,j)` bracket component. This must break equivariance or mixed Jacobi.
5. **Conjugation mutant:** apply complex conjugation to exactly one spinor argument in `B`. This must break the declared complex-bilinear control or a downstream identity.

If a proposed mutant leaves every relevant control at zero, it is not counted as a killed mutant and the test design must be revised.

## 7. Independent Oracle

An F# implementation was independently authored from this declaration, not translated line-by-line from TypeScript. It shares only the public finite contract: basis order, formulas, input domain, and a JSON-like aggregate result schema. The cross-verification test compares the exhaustive baseline and independently computed mutation failure witnesses. A byte-equal implementation is not an independence claim.

## 8. Interpretation Boundary

A zero census would establish only the following:

> The reversion-signed bracket and declared action satisfy the listed exact algebraic checks on the declared finite complexified Fock basis.

It would **not** establish that Zeta’s Adinkra transport is a spinor representation, that a coded quotient is homoiconic, that agents are qubits, that the universe has an `E8` ontology, or that a regularity score exists. The existing regularity refusal remains until a separately declared regular-module carrier and rank-one action witness are measured.

[^clifford]: Marc Lachièze-Rey, “[Spin and Clifford algebras, an introduction](https://arxiv.org/abs/1007.2481)” (2010).
[^geometric]: José Figueroa-O’Farrill, “[A geometric construction of the exceptional Lie algebras F4 and E8](https://arxiv.org/abs/0706.2829)” (2007); the abstract explicitly states that there is no supergravity in the paper.

## References

1. Marc Lachièze-Rey, “[Spin and Clifford algebras, an introduction](https://arxiv.org/abs/1007.2481)” (2010). This is the source for the reversion convention used only in the separately declared pairing variant. [^clifford]
2. José Figueroa-O’Farrill, “[A geometric construction of the exceptional Lie algebras F4 and E8](https://arxiv.org/abs/0706.2829)” (2007). This is algebraic background for the `so(16) ⊕ S+` construction, not a physical interpretation. [^geometric]
