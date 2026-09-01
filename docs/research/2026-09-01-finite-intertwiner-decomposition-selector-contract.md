# Finite Intertwiner Decomposition and Canonical-Selector Contract

**Author:** Manus AI
**Status:** Measured; TypeScript, F#, and Rust agree
**Scope:** Exact finite module structure and naturality tests for the previously measured seven-generator action

## Key Recommendation

Retain the exact two-sector decomposition and the **canonical-selection obstruction for the three tested selectors**. The source splits into two simple inequivalent rank-8 sectors, the target contains eight copies of each matching sector, and the Hom-space is `8 ⊕ 8`. Each tested deterministic selector is full-rank, but basis orientation or an explicit target-module automorphism moves its image. This does not prove that no possible canonical selector exists.

## 1. Frozen Input

This program does not change the embedding measured in the precursor contract.[1] The algebra is generated over each declared odd prime field by the seven signed permutations

`A_i = L_iL_0` on `M_[8,4,4]` and `B_i = Γ_(2i)Γ_0` on `S+`, for `i = 1,…,7`.

The carrier dimensions remain `16 → 128`, and the equations remain `TA_i = B_iT`. An intertwiner is therefore a module homomorphism for this generated algebra, not merely a matrix that resembles one.[2] Real Clifford-algebra classification motivates central and ideal decompositions, but the decomposition of these concrete repository actions must be measured from their matrices rather than copied from a classification table.[3] [4]

## 2. Exact Central Decomposition

Define the ordered central-word candidates

`Ω_M = A_1A_2···A_7` and `Ω_S = B_1B_2···B_7`.

For each carrier, the implementation must directly check `Ω² = I` and `[Ω,G_i] = 0` before using the odd-characteristic projectors

`P_+ = (I + Ω)/2` and `P_- = (I - Ω)/2`.

| Quantity | Required witness |
|---|---|
| Centrality | Zero coordinate violations for every commutator `[Ω,G_i]` |
| Involution | Zero coordinate violations for `Ω²-I` |
| Projectors | Exact idempotence, complementarity, orthogonality, and `P_+ + P_- = I` over both fields |
| Carrier split | Exact modular ranks of `P_+` and `P_-` on source and target |
| Invariance | Every generator preserves each projector image |
| Representative stability | Source projector ranks and restricted Hom dimensions agree across declared `repSeed` values |

Reversing the seven-generator order is a label-control: it may exchange `+` and `-`, but it must not change the unordered rank or multiplicity spectrum. Characteristic two is rejected because `1/2` does not exist; it is not silently coerced.

## 3. Hom-Space and Commutant Census

The existing signed-constraint solver supplies an explicit basis of `Hom_A(M,S)`. The follow-on implementation must classify every basis map by exact restricted ranks

`rank(P^S_ε T P^M_δ)`, for `ε,δ ∈ {+,-}`,

and report the four block dimensions `dim Hom_A(M_δ,S_ε)`. It must also solve the source and target self-intertwiner problems and report `dim End_A(M)` and `dim End_A(S)`.

The following interpretations are permitted only when their witnesses are present:

| Witness | Permitted finite conclusion |
|---|---|
| Source split has two nonzero invariant rank-8 images and cross-Hom blocks vanish | The declared source separates into two inequivalent invariant summands for this action |
| Each same-sign source-to-target Hom block has dimension `m_ε` | The measured multiplicity space for that source summand has dimension `m_ε` |
| Target commutant dimension equals `m_+² + m_-²` and explicit block matrix units are recovered | The target commutant matches the declared two-isotypic multiplicity model |
| Only dimensions agree | A dimensional pattern, not an algebra isomorphism |

No irreducibility claim may be inferred from dimension alone. A source summand is called simple only if its restricted commutant is scalar and the generated action algebra reaches the full endomorphism dimension on that summand, or an equivalent exact witness is supplied.

## 4. Candidate Canonical Selectors

Three deliberately simple selectors are tested. Determinism in one coordinate presentation is not naturality.

| Selector | Definition | Primary falsifier |
|---|---|---|
| Unit-component sum | Give coefficient `+1` to every signed-graph basis component | Reorder or re-root graph components; conjugate target coordinates |
| Lexicographic minimum-support embedding | Among rank-16 sums using the fewest nonzero graph components, choose the lexicographically first coefficient/support vector | Permute target multiplicity copies while preserving the module |
| Balanced-Gram selector | Among declared coefficient vectors, minimize off-diagonal entries and spread in `TᵀT`, with exact lexicographic tie-breaking | Exhibit two symmetry-related minimizers or a field-dependent tie |

Every returned map must still pass equivariance and rank 16. The selector census must distinguish:

1. **presentation-deterministic**: repeatable for a fixed matrix encoding;
2. **natural under tested basis changes**: transforms as `T' = QTP⁻¹` under declared source/target conjugacies;
3. **module-canonical**: fixed up to the declared equivalence by the full tested module-automorphism action.

The third label is refused if a nontrivial target-module automorphism moves the selected image. In particular, global sign, permutation of equal target summands, and independent automorphisms of the two central sectors are controls, not nuisances.

## 5. Projective Family and Non-Uniqueness Witness

If the measured same-sign Hom blocks have dimensions `m_+` and `m_-`, the implementation may count full-rank embedding classes only after proving the exact rank criterion for coefficient vectors. If full rank is equivalent to choosing one nonzero vector in each multiplicity block and source-sector rescaling is the declared equivalence, the permitted parameter-space statement is

`P^(m_+-1)(F_p) × P^(m_--1)(F_p)`.

The finite count must be computed with integer arithmetic as

`((p^m_+ - 1)/(p - 1)) · ((p^m_- - 1)/(p - 1))`.

This count is a finite-field classification of declared coefficient classes. It is not a probability, physical state count, identity count, or regularity score.

## 6. Controls

| Control | Required outcome |
|---|---|
| Synthetic one-copy and two-copy signed modules | Recover their known central ranks, Hom multiplicities, and commutant dimensions |
| Two-prime agreement | All rank, block-dimension, and selector-naturality verdicts agree or remain field-labelled |
| `repSeed` sweep | Unordered decomposition and naturalized selector verdicts remain invariant |
| Generator-order reversal | Only central labels may exchange |
| Target coordinate conjugacy | Decomposition transports exactly; presentation-only selectors may fail naturality visibly |
| Target module automorphism | A moved selected image falsifies module-canonicity |
| Existing coordinate-sign, duplicate-generator, and Jordan–Wigner faults | Continue to destroy or quarantine the baseline before decomposition claims |
| Coefficient perturbation | At least one perturbation in each central block must make the proposed full-rank criterion fail at the declared boundary |

A surviving mutation is reported as a measured symmetry or possible equivalence. Tests must not require a mutation to fail when algebra says it should survive.

## 7. Independent Third-Language Oracle

A separately authored Rust oracle will reconstruct the extended Hamming quotient action, the even-occupation Jordan–Wigner action, both central words, the signed constraint graph, the four restricted Hom dimensions, both commutant dimensions, and the declared selector verdicts. It must not import TypeScript/F# matrices, serialized basis maps, or measured constants. The cross-verification adapter may compare aggregates only after all three implementations run independently.

## 8. Decision Rules

| Result | Report |
|---|---|
| Central/projector checks fail | Stop; no decomposition conclusion |
| Three implementations disagree | Preserve all outputs; result disputed |
| Decomposition agrees but selector fails naturality | Report the decomposition and a canonical-selection obstruction |
| A selector passes finite tested conjugacies only | Report tested naturality, not universal canonicity |
| A full automorphism-invariance proof and witness pass | Report canonicity only for the declared finite module and equivalence relation |

## 9. Measured Result

All three implementations independently rebuild the quotient and Fock actions from the written declarations. They agree over both fields, and the representative controls at seeds 1 and 255 reproduce the same aggregates.

| Exact witness | Measured result |
|---|---|
| Central-word laws | `Ω²=I`; every commutator vanishes |
| Projector laws | Idempotent, complementary, orthogonal; characteristic two rejected |
| Source central ranks | `8 + 8` |
| Target central ranks | `64 + 64` |
| Source-to-target Hom blocks | `8, 0, 0, 8` in `(+→+,+→−,−→+,−→−)` order |
| Source commutant blocks | `1, 0, 0, 1`; total dimension 2 |
| Target commutant blocks | `64, 0, 0, 64`; total dimension 128 |
| Generated action-algebra rank | 64 on each source and target central sector |
| Source conclusion | Two simple inequivalent rank-8 modules for the declared generated algebra |
| Target conclusion | Multiplicity eight for each matching simple source sector |

The simplicity conclusion is not inferred from dimension alone. Each source-sector generated algebra has the full `8²=64` endomorphism rank, each restricted self-commutant is one-dimensional, and both cross-sector Hom spaces vanish. The target commutant dimension is exactly `8²+8²=128`, matching the two measured multiplicity spaces.

The coefficient boundary is exact: the zero, plus-only, minus-only, and both-sector controls have ranks `0,8,8,16`. Consequently, full rank occurs exactly when both central coefficient vectors are nonzero. Modulo independent nonzero source-sector rescaling, the finite embedding classes form `P⁷(F_p)×P⁷(F_p)`.

| Field | Exact projective embedding-class count |
|---|---:|
| `F_1000003` | `1000044000900011344098444622274954978710349778979216628882229380606160830628490758400` |
| `F_999983` | `999764025858256224848037770421929319196307604158950106653043409522135837291290726400` |

These are field-labelled counts of coefficient classes, not physical states, identities, probabilities, or scores.

| Selector | Equivariance / rank | Falsifier result |
|---|---|---|
| Unit component sum | Pass / 16 | Negating one graph-basis orientation changes the selected image |
| Lexicographic minimum support | Pass / 16 | All 64 one-plus/one-minus pairs are rank 16; target automorphism moves the chosen image |
| Balanced Gram | Pass / 16 | All 64 minimum-support pairs tie at exact score `(0,0)`; target automorphism moves the tie-broken image |

The permitted verdict is therefore **presentation-deterministic but not basis-natural and not module-canonical for the tested selectors**. The experiment supplies explicit obstructions to those three rules; it does not establish a universal theorem that no other natural construction can exist.

| Injected target fault | Clifford violations | Disposition |
|---|---:|---|
| One coordinate-sign flip | 14 | Quarantined before decomposition |
| Duplicated generator | 128 | Quarantined before decomposition |
| Removed Jordan–Wigner parity | 3,584 | Quarantined before decomposition |

The standalone dispatcher reports four baseline cases plus all three faults across TypeScript, independently authored F#, and independently authored Rust with zero disagreement.

## 10. Explicit Non-Claims

This program does not establish general Adinkra/spinor equivalence, a preferred physical basis, particles or qubits, consciousness, personal identity, privacy, global authority, physical reversibility, or a regularity/homoiconicity scalar. It studies one finite module homomorphism space and whether specified algebraic symmetries obstruct a canonical choice.

## References

[1]: https://github.com/Lucent-Financial-Group/Zeta/blob/main/docs/research/2026-09-01-finite-adinkra-half-spin-intertwiner-contract.md "Finite Adinkra–Half-Spin Intertwiner Contract"
[2]: https://arxiv.org/abs/0901.0827 "Etingof et al., Introduction to representation theory"
[3]: https://arxiv.org/abs/0907.5356 "Lundholm and Svensson, Clifford algebra, geometric algebra, and applications"
[4]: https://doi.org/10.3390/universe7060168 "Floerchinger, Real Clifford Algebras and Their Spinors for Relativistic Fermions"
