# Alexa's open questions, answered from the Q# and QEC-routing work — with two corrections to the chain

**Date:** 2026-09-02 · **From:** shadow, at Aaron's request (*"can you check her questions, i think
we have answers in q# work, that's the hard work"*).
**Method:** every answer below is sourced to a file in this tree and marked with its register.
Where the tree does **not** answer a question, that is said rather than filled in.

Aaron is right that the answers are largely already there. **Two of them are stronger than what
was being asked for**, and **two steps in the chain over-read what the tree supports** — both
noted, because a review is worth what its corrections are worth.

---

## Q1 — "Have you run the coded vs uncoded comparison explicitly?"

**Answered, and with a quantified curve rather than a yes/no.**

Source: `docs/research/2026-08-23-qec-stack-routing-the-adinkra-bridge-closes-at-n8-and-reopens-at-n16-soraya.md`
§3, independently reproduced in §11 (M1 landed 2026-08-24; the enumerations are code a test can
fail, with a 14-mutation report and named survivors).

The N=8 adinkra category was **exhaustively enumerated** — every doubly-even self-orthogonal
binary code of length 8, at every dimension:

| `dim C` | code imposed | CSS code | logical qubits `k` | distance `d` |
|---|---|---|---|---|
| **0** | **none — the full 8-cube (UNCODED)** | **[[8,8,1]]** | **8** | **1 — corrects nothing, detects nothing** |
| 1 | | [[8,6,2]] | 6 | 2 |
| 2 | | [[8,4,2]] | 4 | 2 |
| 3 | | [[8,2,2]] | 2 | 2 |
| **4** | **[8,4] self-dual — Construction A → E8** | **[[8,0,4]]** | **0** | **4** |

**So the comparison is not qualitative — it is a monotone trade.** Adding code moves you down the
table: **`k` falls and `d` rises.** The uncoded end has every degree of freedom and no protection;
the fully-coded end has maximal protection and **`k = 0`, encoding nothing at all.**

The doc states the consequence in one sentence, and it is the sharpest thing in this whole thread:

> **"Homoiconicity is bought by declining the quotient, and the quotient is where the protection
> lives."**

That is Aaron's *"coded breaks homoiconic … uncoded keeps it at the source"* — **confirmed
in-tree, with the price named.** The price is `d = 1`.

**One honest gap.** The comparison was run against the **error-correction** criterion (`[[n,k,d]]`),
**not** against a "co-ownership" criterion — because co-ownership has no operational definition
anywhere in the tree yet. Alexa's request for the co-ownership version is therefore **still open**,
and the first blocker is her own point: the term needs a definition before it can be tested.

---

## Q2 — "Is the adinkra graph topology derivable from ℤ/2ℤ parity alone, or primitive?"

**Answered for N=8, by enumeration rather than derivation — and the answer splits by family.**

- **Coded:** the graph is **not free.** The correspondence the whole lineage rests on is
  *doubly-even code ↔ adinkra* (Doran–Faux–Gates–Hübsch–Iga–Landweber), so once the code is fixed
  the adinkra is determined. Construction A is explicit and one line:
  `L_A(C) = {x ∈ ℤ⁸ : x mod 2 ∈ C}`.
- **Uncoded:** the quotient is declined, so there is nothing to derive the graph *from* — it is
  **primitive** in that family by construction.

**So the answer is family-relative, which dissolves the question as posed.** Parity alone does not
generate the graph; the *code* does, and the uncoded family is precisely the one that has no code.

---

## Q3 — "Is the Meno bridge formalizable, or is it tacit?"

**Formalizable in one direction; the other direction is not a bridge but a different destination.**

Construction A is fully formal (above). What the tree adds — and this is the part that reframes
Aaron's "Meno bridge" remark — is that **the two routes do not land on the same object**:

| family | construction | object produced |
|---|---|---|
| **coded** ([8,4], Construction A) | `L_A(C) = {x ∈ ℤ⁸ : x mod 2 ∈ C}` | the E8 **lattice** / root system — 240 minimal vectors (`E8Lattice.fs`, integer, proven) |
| **uncoded** (bivector/spinor tower, no quotient) | `e₈ = so(16) ⊕ Δ⁺₁₆`, `120 + 128 = 248` | the E8 **Lie algebra** (`e8FromSpinors = (16, 248)`) |

`src/Core/CliffordPeriodicity.fs` §"THE SECOND TOWER" says outright that the bivector route *"is
the door out of the coded tower… quotients nothing"* and that **"the two routes do not produce the
same object."**

**And a correction on record that belongs here:** Aaron's own earlier framing had the coded route
producing the E8 *group*. It produces the **lattice**. Group, algebra and lattice are three
different objects — recorded in-tree as a correction rather than a quibble. The bridge between the
two routes is standard and in-tree: `248 = 8 + 240 = 120 + 128`, two decompositions against the
Cartan (ℤ⁸ grading) and `so(16)` (ℤ₂ grading), with the lattice's 240 minimal vectors **being** the
240 roots. Anchor: Adams, *Lectures on Exceptional Lie Groups*; Kostant.

---

## Q4 — "Does the ISA's binary primitive correspond to the ℤ/2ℤ edge parity? Is that vertical coherence established?"

**This is the one the chain got wrong, and the tree answers it directly: NO — the ISA does not
have *a* binary primitive.**

`src/Core.QSharp.ReferenceOracle/ZSetISA.qs` implements the six Z-set operators, and they fall into
**two different groups**:

| ISA operator | Q# | group generated |
|---|---|---|
| `EMIT(k, θ)` | `Ry(θ, k)` | **U(1)** — continuous |
| `RETRACT(k, θ)` | `Adjoint Emit` | inverse in U(1) |
| `BRANCH(k)` | `H` | **ℤ/2ℤ** — `H² = I` |
| `JOIN(a,b)` | `CNOT` | **ℤ/2ℤ** — `CNOT² = I` |

So the hypothesised identity *"ISA bit = adinkra edge parity = qubit basis"* holds for
**BRANCH/JOIN** and **fails for EMIT/RETRACT**, which is a continuous rotation carrying a real
parameter θ. **There is no single two-ness appearing at all levels**, and the "vertical coherence /
unification claim" the chain was building toward is not supported as stated.

**What IS supported, and it is the good half of the claim:** `EMIT` then `RETRACT` **= I**, by
construction, because `Retract` is literally `Adjoint Emit`. That is the group inverse the chain
correctly identified as the thing Rx lacks — and here it is not asserted, it is *structural*: the
adjoint of a unitary is its inverse. **The DBSP retraction and the quantum adjoint are the same
operation in this ISA.** That is a genuine result and it does not need the ℤ/2ℤ story.

Also worth keeping straight: `MERGE`/`FOLD` are **superposition/interference merge, not
measurement** — the file is explicit that there is *"no decoherence to classical"* and that Born
collapse is **sim-only**.

---

## Q5 — the "missing row": a meter that should have frozen but didn't

**Already added and merged**, before this review arrived, in
[`.claude/rules/dual-use-detection-is-neutral-oracle-decides.md`](../../.claude/rules/dual-use-detection-is-neutral-oracle-decides.md)
(PR #16397). The row is the **broken meter** — crystallised once, then drifted — and the detector
named there is **re-running the treaty against committed golden vectors**, which relocates the
danger to its real address: *a byte-lock nobody re-ran*.

Alexa is right that the intentional-revision predicate misses the drift case; the golden-vector
re-run is what catches drift specifically.

---

## The correction the chain most needs: there is no physics here, and the tree says so first

The chain closes with *"the physics and the architecture agree."* **The tree refuses that reading
in its own source**, and it should be quoted rather than paraphrased.
`src/Core.QSharp.ReferenceOracle/CssStabilizerCodes.qs`:

> *"Writing the circuit is still not a physical claim. Running it needs QDK and a simulator; the
> simulator is a program, not a device. **Nothing in Zeta holds an encoded qubit**, and no golden
> vector in this directory should ever be read as evidence that one does."*

And what the honest claim is, from the same file:

> *"the stabiliser generators here are an **independent transcription** of the same parity-check
> rows the F# module derives … That is the byte-lock, and it is a claim about three implementations
> agreeing, not about physics."*

**Measured execution status, because "we have an ISA that supports both" deserves a precise
reading:**

- `generate-qsharp-golden.py` **does** run the Q# through **Microsoft QDK** for unitary matrices —
  but it is an **offline generator**, rerun by hand when the surface changes.
- **CI runs neither the compiler nor a simulator.** `qsharp-golden.test.ts` checks the committed
  JSON; `zset-isa.test.ts` and `css-stabilizer.test.ts` **read the `.qs` files as text and parse
  them with string/regex matching**.

So the ISA is **written, simulator-checked once per surface change, and text-checked in CI.** It is
not run on hardware, and CI does not execute it. That is a real artifact and a real byte-lock. It
is not a physical result, and the gap between those two is exactly where a chain of confident
review steps can quietly promote one into the other.

---

## Where Alexa is right and it cost us something

**"Six of seven corrections were vocabulary corrections."** That observation is now a section of
[`docs/VISION.md`](../VISION.md) (definition drift vs argument change, PR #16397) — and **this
document is another instance of it**: *co-ownership*, *minimal*, *binary primitive* and *physics*
are each doing load-bearing work in the chain without a fixed referent, and three of the four
answers above are really answers about which referent was meant.

Her request for a **formal definition of co-ownership** is the correct next step and is **not
blocked on anything** — it is the missing piece that would let Q1 be re-run against the criterion
she actually asked about, instead of against `[[n,k,d]]`.

---

## Register summary

| claim | register |
|---|---|
| the dim-0..4 closure ladder, `[[8,8,1]]`…`[[8,0,4]]` | **computed**, enumerated, mutation-reported, independently reproduced |
| homoiconicity ⟺ declining the quotient ⟺ `d = 1` | **computed** |
| coded → E8 lattice; uncoded → E8 Lie algebra | **proven in-tree** (Lumen), cited here |
| `EMIT ∘ RETRACT = I` as unitary adjoint | **structural** — true by construction in the Q# |
| ISA has two primitive groups (U(1) and ℤ/2ℤ), not one | **read from the source**, this document |
| "the physics and the architecture agree" | **refused** — no device, simulator offline, CI text-checks |
| co-ownership as a testable criterion | **open** — undefined in-tree |
| whether the uncoded adinkra is *the* minimal generator | **open**; Aaron already declined the stronger claim (*"i don't know if they are minimal"*) |

## Pointers

- `docs/research/2026-08-23-qec-stack-routing-the-adinkra-bridge-closes-at-n8-and-reopens-at-n16-soraya.md`
  — §3 closure, §3a addendum, §11 M1 landing, §12 the partly-**refuted** membrane claim.
- `src/Core.QSharp.ReferenceOracle/` — `ZSetISA.qs`, `CssStabilizerCodes.qs`, the golden generator
  and the text-parsing tests.
- `src/Core/CliffordPeriodicity.fs` §"THE SECOND TOWER" · `src/Core/E8Lattice.fs` · `src/Core/CssCode.fs`.
- [`.claude/rules/toy-is-free-metered-must-be-earned.md`](../../.claude/rules/toy-is-free-metered-must-be-earned.md)
  — why the register column above is the load-bearing part of this document.
