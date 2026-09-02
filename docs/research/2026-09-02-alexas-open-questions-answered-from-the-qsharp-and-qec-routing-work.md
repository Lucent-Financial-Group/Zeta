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

## Q4b — WHY the ISA has no binary primitive: a boolean forces a branch, and a branch is hidden control structure

Aaron, on reading Q4: _"yes yes yes — this is trying to avoid hidden control structure. These hide
in the binary if statements."_

That is the **design reason**, and it turns Q4 from a correction into the most load-bearing finding
in this document. The ISA does not lack a binary primitive by oversight or by convenience. **A
binary primitive is avoided on purpose, because a boolean forces an `if`, and an `if` is control
structure that is not a channel.**

### The carved form (rule candidate, cooling — not added to `.claude/rules/` here)

> **A boolean forces a branch, and a branch is control structure that no channel declares.** Prefer
> a value that **carries** — a weight, a signature, a feedback corner — over a test that
> **decides**. Where a decision is genuinely unavoidable, declare it as a channel and meter it;
> never let it hide in an `if`.

This is **§13 noninterference stated for control flow.** The existing rule governs *entropy*
crossing a membrane through declared, metered channels. A branch is the same violation in the
other currency: an **influence** point that no type mentions, no trace records, and no probe can
see, because the decision leaves no residue — the untaken path simply does not exist afterwards.

### The ISA's `BRANCH` does not branch, and the name is exact rather than ironic

`ZSetISA.qs`:

> `/// BRANCH(k): H gate. Superposition (both states coexist while tick open).`

**A classical `BRANCH` is the if-statement — it takes one path and discards the other.** The
Hadamard takes neither: both states coexist for the duration of the tick. No decision is made, so
there is no undeclared decision-maker. The file then closes the obvious escape hatch:
`MERGE`/`FOLD` are *"superposition/interference merge, NOT measurement"*, with **"no decoherence to
classical"** and **Born collapse "sim-only, terminal, never live."**

Measurement is exactly where the branch would reappear — and it is pushed out of the live path
entirely. **The ISA avoids hidden control structure by never collapsing inside a tick.**

And this is why `EMIT`/`RETRACT` are `Ry(θ)` rather than a bit flip: **a continuous parameter cannot
be reduced to a test.** There is no `if` that recovers θ. The U(1) half of Q4's table, which looked
like an inconsistency, is the principle doing its job.

### The same move, in five places this session, all of which now read as one

| surface | the branch it removes | what carries instead |
|---|---|---|
| **ISA** | `if (bit) A else B` | `H` superposes; `Ry(θ)` carries a real |
| **Four corners** | `Result`'s error position — the source says it **"short-circuits rather than carries"** | `T Feedback In` **carries** |
| **Z-sets / DBSP** | `if (retracted) drop` | weight `−1`; retraction is an *addition*, not a test |
| **Jurisdictions** | a tree — a chain of `if`s descending from a root | an overlay; **a permission is a signature, not a boolean** |
| **Demixing** | `argmax` over four stems, which is an `if`-chain | a per-bin **signature** over sources |

**Every one of those was reached independently in this session**, from Q#, from Meijer, from
election districts, from Ozone, and from Alexa's review. The convergence is the evidence, and it is
the kind this repo trusts: five surfaces that do not share a mechanism arriving at one shape.

That also retroactively explains the §2 result of the demixing doc. *"A tree cannot represent a
lattice"* is the same sentence: a tree **is** the if-chain, and the lattice is what you get when
you refuse to branch.

### It is already metered in one domain, which is worth knowing

The phrase is not new to the tree, but it arrived narrowly — as **GPU warp divergence** (*"warp
hidden control structure"*, in the soft-regime and BNN-encoding research). That is the same
principle with a **performance** falsifier attached: divergent branches serialise a warp, so
hidden control structure has a measurable cost on real hardware. The general form above is what
was missing; the narrow form already pays rent.

### The honest limit

**A decision has to happen somewhere.** This does not abolish branching — it relocates it: out of
the tick, to a declared boundary, where it is measurable. In the ISA that boundary is measurement,
and it is marked sim-only. In the four-corner model it is the driver's injected monoid. In the
demixer it would be whatever downstream consumer finally has to *act*, and that consumer's choice
is a legitimate branch **because it is named**. The claim is never "no branches" — it is **"no
branch that no channel declares."**

## Q4c — AmplitudeEmu and "more quantum resistant": the ISA's two groups ARE the classical-simulability boundary

Aaron, 2026-09-02: *"yes this is our AmplitudeEmu in the basic form — do you know a way to make it
more quantum resistant?"*

**Reading, stated because the phrase is ambiguous and I am not going to guess silently.** I read
this as *"make the classical emulator carry more of the quantum structure"*, not as post-quantum
cryptography (Shor/Grover-resistant primitives), which is a different question the KSK/PKI work
owns. Answering the first; say the word if the second was meant.

### First, what `AmplitudeEmu` already is — and its own honest scope

`src/Core/AmplitudeEmu.fs` carries complex amplitudes over the **free ℂ-module on frames**,
`ℂ[Frame]`; `merge` sums amplitudes so opposite phases **cancel** and equal phases **reinforce**
(interference, in code), and `bornProb` measures by `|a|²`. Its own peel is the important part:

> *"Interference is real here; the entanglement exponential is NOT escaped … General
> high-entanglement state needs `4ⁿ` reals … `support` growing un-merged IS the exponential, logged
> not hidden."*

and it separates three resources that get conflated everywhere else: **interference ≠ entanglement
≠ signalling.** It has the first, explicitly not the second, and Bell still bounds correlations at
`S = 2` for a local generator.

### The finding: Q4's two groups are exactly Clifford vs non-Clifford

This is the third consequence of §Q4, and it is checkable rather than resonant.
**Gottesman–Knill**: circuits built from the **Clifford** group — `H`, `CNOT`, `S`, Paulis — are
classically simulable in **polynomial time, with arbitrary entanglement**. The classical cost of
simulation lives *entirely* in the **non-Clifford** gates.

Now put the ISA's own table beside that:

| ISA operator | Q# | group | Clifford? | classical cost |
|---|---|---|---|---|
| `BRANCH` | `H` | ℤ/2ℤ | **yes** | polynomial |
| `JOIN` | `CNOT` | ℤ/2ℤ | **yes** | polynomial |
| `EMIT` / `RETRACT` | `Ry(θ)` / `Adjoint` | U(1) | **no**, for generic θ | exponential in the count |

> **The ℤ/2ℤ half of the ISA is precisely the classically-simulable half, and the U(1) half is
> precisely the part that is not.**

That is not a coincidence of form — Clifford versus non-Clifford *is* the classical-simulability
boundary, and the ISA's split falls on it exactly. So Q4's "two groups, not one" — which read as an
inconsistency when Alexa's chain wanted a single binary primitive — is the design placing the
quantum-advantage surface in one named operator pair and nowhere else.

### The recommendation: do not make it more quantum — make its DISTANCE from quantum a metered quantity

The honest answer to "how do we make the emulator more quantum" is that in general **you cannot**;
`4ⁿ` is a theorem, not an engineering gap. What you *can* do is buy specific, **priced** amounts of
quantum structure, and each known technique comes with its own meter:

| structure | what it buys | the meter (and it is the point) |
|---|---|---|
| **stabiliser / Gottesman–Knill** | arbitrary entanglement, free, while you stay Clifford | **T-count / non-Clifford count**; stabiliser-rank cost ≈ `2^{0.23t}` (Bravyi–Gosset) |
| **tensor networks / MPS** | bounded-entanglement states in `poly(n)·χ³` | **bond dimension χ**, and the **truncation error is computable** — an error bar, not a silent approximation |
| **what is already there** | reconverging-path collapse | **`support` size**, which the module already logs |

**And the last row is why this is a small change rather than a rewrite.** `AmplitudeEmu` already
logs `support` growth and already says *"logged not hidden."* The upgrade is to promote that log
into a **declared budget with a refusal** — the same shape as the entropy budget under §13
noninterference. Neither MPS nor the stabiliser formalism requires abandoning the current algebra
either: `ℂ[Frame]` is a vector space and both are **structured subspaces of it**, so they are
representations of the object the module already has.

**Why this is the right answer in this repository's idiom specifically:** it closes the loop with
the VISION section written the same day. *The disagreement is the prediction* — and the point at
which the classical emulator must truncate **is** the predicted disagreement location. Metering
T-count and χ means that point is **computed in advance rather than discovered on hardware**, which
is the only version of the claim we can currently act on, since nothing here holds an encoded qubit.

**CONFIRMED BY AARON, 2026-09-02: _"yes metered distance is the right answer."_** That moves this
from shadow's proposal to an endorsed direction, and it is now work item `081M1J8DG67087G0R0009DXXV1`. The register
change is real: the recommendation was mine, the *direction* is his, and the instrumentation is
unbuilt either way.

**Falsifier (F6).** Instrument `AmplitudeEmu` with a non-Clifford counter and a truncation-error
budget; then exhibit a circuit the emulator **refuses** rather than silently approximates. If no
circuit in the tree ever trips it, the budget is the vacuity class and the instrumentation bought
nothing.

**Anchors:** Gottesman (1998), *The Heisenberg Representation of Quantum Computers*; Aaronson &
Gottesman (2004), *Improved Simulation of Stabilizer Circuits*; Bravyi & Gosset (2016), stabiliser
rank / simulation of Clifford+T; Vidal (2003) and Schollwöck (2011) for MPS and bond dimension.
**Register: all cited, none checked by entailment here.**

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
