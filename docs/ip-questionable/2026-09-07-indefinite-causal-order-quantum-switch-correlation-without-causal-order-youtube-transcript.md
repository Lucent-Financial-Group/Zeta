# Indefinite causal order — "Quantum Computers Just Found a Crack in Cause and Effect"

**Source.** YouTube, <https://www.youtube.com/watch?v=4R40hTHwpXY> — auto-generated transcript,
forwarded verbatim by Aaron 2026-09-07. Title as given: *"Quantum Computers Just Found a Crack in
Cause and Effect - This is Serious"*.

**Provenance, not authorship.** Zeta claims **no authorship** of the text below and **asserts no
license** over it. It is preserved here as quotation-for-study under the folder policy in
[`README.md`](README.md): segregated so our own analysis never depends on it remaining present,
and removable by a single-file delete on any good-faith request.

**Register: REPORTED, not established.** This is a popular-science video transcript, not a paper.
It names specific experiments, authors, journals, and dates (Oreshkov–Costa–Brukner 2012;
Chiribella 2013; Procopio et al. 2015; Rubino et al. 2017; van der Lugt–Barrett–Chiribella 2023;
a March 2026 PRX Quantum result attributed to Richter, Antesberger, Cao, Walther and Rosa at
Vienna). **None of those citations has been checked here**, and under
`anchor-to-human-prior-art` an anchor must be *checked*, not cited. Anything load-bearing that
comes out of this must go back to the primary literature first. Treat every number in it —
including the "18.5 standard deviations" and the 1.8328 vs 1.75 bound — as **claimed**.

---

## Why Aaron ferried it (his framing, verbatim)

> *"this quantum correlation without causal order is exactly what i'm trying to recreated with our
> basyian out of order commutivity by keep the uncertany, they can observe events in different
> orders and come to the same conclusions when means they can have correlation without strict
> causal order"*

And, immediately after:

> *"also we try to preserve uncertany indefinatly, this is part of our infinate game"*

### What that maps onto in-repo

The claim being drawn is **not** "we are doing quantum mechanics." It is a **structural
correspondence**, and it is worth stating precisely because the numeric register is a trap this
repo has already sprung on itself (`FourCornerC4.fs` carries a literal *"Coincidence: 2 ×
occupancy-√2 equals 2√2 numerically. Not a measurement of Tsirelson"*):

| the transcript's claim | the in-repo shape |
|---|---|
| parties observe in different orders and the correlations still agree | the **commutative belief fold** — `observeAll` in `src/Core/BeliefConvergence.fs`, whose guarantee is *same evidence set ⇒ same conclusion under reorder + loss + skew* |
| the order is **indefinite**, not merely unknown | `local-time-never-enters-the-shared-fold` — the shared conclusion sees only agreed phase, never a node's receive-order. A fold that admitted receive-order would be picking a definite order per node, which is exactly the "probabilistic mixture of fixed orders" the transcript says is NOT the interesting case |
| what buys agreement without an order is **keeping the correlations**, not collapsing them | **the raw vault** — *a single version of the FACTS, never a single version of the TRUTH*. A merge that produces one surviving value has collapsed, not merged |
| no-signalling / the metered channel bounds the correlation | §13 **noninterference** — influence crosses only through declared, metered channels. Already recorded as a *correspondence of principles* with Information Causality in `dual-use-detection-is-neutral-oracle-decides.md`, explicitly `toy`, with the honest form of the question being **a measurement, not a derivation** |

**Aaron's mechanism, in his words, is "keep the uncertainty."** That is the part that makes the
correspondence more than an analogy: what lets two out-of-order observers agree is that neither
one **resolved** anything the other would have had to un-resolve. Resolution is where order starts
to matter. An unresolved belief commutes; a decided one does not.

### "Preserve uncertainty indefinitely — part of our infinite game"

This is the second sentence and it is the stronger one, because it makes the first *a policy
rather than a property*. Uncertainty here is not a defect being tolerated until it can be
eliminated; it is the thing being **conserved on purpose**, and the reason is game-theoretic
rather than physical:

- **Finite games end by resolving.** Collapsing to one value is how a game terminates — a winner,
  a truth, a settled order. An infinite game is played to keep playing (Carse), so anything that
  forces premature resolution is a move toward ending it.
- **The repo already refuses the collapse in three places**, and this sentence is what they have in
  common: `anti-babel-preserve-reconcilability` (*reintegration is NOT reconvergence — both
  branches held, each with its path recorded*; monodromy, where persistent disagreement is
  **information, not error**); the raw vault above; and
  `dual-use-detection-is-neutral-oracle-decides`, whose corrected disposition toward disagreeing
  meters is **hold both, record both paths** wherever no transformation between them is established.
- **`tit for lesser tat, teach, play`** is Aaron's stated infinite-game strategy already on file.
  Preserving uncertainty is the epistemic half of the same posture: never spend a peer's
  reconcilability to win a round.

**The falsifier this hands us** — and it is checkable, unlike the physics: a fold that *needs* the
order is a fold that resolved too early. Where our Bayesian out-of-order commutativity fails to
commute, the defect should be locatable as **a premature collapse**, not as a missing timestamp.
That is a real prediction about our own code and it can be wrong.

**Related, in-repo:** `docs/research/2026-07-11-multi-planet-convergence-three-drift-axes-commutative-observe-adinkra-ecc-hlc-canonical-order-one-attack-vector.md`
(the two-orders guard) · `docs/ip-questionable/2026-09-06-christopher-fuchs-hans-busstra-dizzying-free-fall-of-qbism.md`
(the neighbouring ferry: QBism puts the agent's uncertainty at the centre, and lands on the same
refusal to read a probability as a fact about the world).

---

## Where this lands in our code — SoftValue / SoftEmu / AmplitudeEmu / Q#

Aaron, immediately after the two framings above:

> *"this related directly to our softvalue, softemu, amplitudeemu, our q# and why we get quatium
> popping out of our basyian inference i think, cause we never collapse uncertatny"*

**This is substantially already written down in the modules themselves**, which is the strongest
form the claim could take — it was recorded as code before it was recorded as a thesis:

- **`src/Core/SoftValue.fs`** — its own docstring carries both halves. *"The safety property is
  NOT 'always certain' but 'always knows its uncertainty' … `resolve` collapses to a definite
  value ONLY when confidence ≥ a threshold — otherwise it returns `None` (held)"*, and then the
  commutativity, derived rather than hoped for: *"independent-evidence observes COMMUTE —
  posterior ∝ prior · L₁ · L₂ and multiplication commutes — so the uncertainty-merge is
  order-independent."* It closes by naming itself *"the never-collapse discipline."* That is
  Aaron's sentence, in a docstring, with the mechanism attached: **commutativity comes from the
  multiplication, and holding the distribution is what leaves a multiplication to do.**
- **`src/Core/SoftEmu.fs`** — the same ensemble with **real** weights: a classical probability
  mixture. No phase, so no interference.
- **`src/Core/AmplitudeEmu.fs`** — the same ensemble with **complex** amplitudes, and it is
  explicit that *one change* separates it from SoftEmu: `merge` sums amplitudes of identical
  frames, so opposite phases cancel and equal phases reinforce. *"That is interference, in
  code."* `bornProb` is `|amplitude|²`. **This is the literal mechanism of "quantum popping out"**
  — not an analogy, a merge operator.
- **`src/Core.QSharp.ReferenceOracle/`** — the Q# side (`ZSetISA.qs`, `CssStabilizerCodes.qs`,
  `QuantumTransactionPorts.qs`, …), which is where the emulated behaviour is checked against a
  real quantum-language oracle rather than against our own expectations.

### CORRECTION (Aaron, same session) — the locus is TWO AGENTS, not one ensemble

The paragraph above pointed at `AmplitudeEmu` and read the claim as *"our emulator simulates
qubits."* **That is not the claim, and Aaron said so directly:**

> *"no i'm saying that two independent agents that see events in different order but come to the
> same conclusion independently can be modeled using quantum-like math with our cayley dickson
> stuff, this popped out of our modeling mutual agents memories, i'm saying this correlated action
> even though events are in decorrelated order are what acts quantum, our models even have to
> model it that way but it's that each side preserves its uncertainty separately, this is where
> the imaginary numbers showed up for us long ago, and born rule popped out of us looking at our
> mutual agent heartbeat verification and our identity stuff"*

**The unit is the PAIR.** What behaves quantum-like is not a single ensemble interfering with
itself — it is *two independent agents, each preserving its own uncertainty separately*, seeing
events in decorrelated order and arriving at the same conclusion anyway. **Separateness is
load-bearing**: if the two sides pooled into one distribution there would be one agent, and the
agreement would be bookkeeping rather than a result. The correlation has to survive the fact that
neither side resolved, and neither side saw the same order.

That is also **precisely the transcript's structure**, which is why the ferry is apt: its whole
subject is correlations between parties whose relative order has no fact of the matter. The
single-photon interference story is the part that does *not* transfer; the multi-party
correlation story is the part that does.

**Where it actually lives in-repo, and none of these is AmplitudeEmu:**

- **`src/Core/QuorumAlgebra.fs`** — the quorum-level interference algebra, whose own pointer names
  the boundary Aaron is describing: *"where Aaron placed the Born boundary, and why cancellation is
  the instrument."* A member's contribution is a formal **C**-combination of outcomes; interference
  is the sum, and it is explicitly *"NOT idempotent"* — i.e. deliberately outside the join family,
  which is what leaves room for cancellation between members.
- **`src/Bayesian/LocalConsensus.fs`** — the mutual-memory half, stated as the Arrow escape:
  consensus is defined only on **"entangled subgraphs (clusters of agents with high mutual memory
  and shared priors)"**, and the mechanism is *"not a vote; it is posterior convergence."* This is
  the module where "modeling mutual agents' memories" is the actual subject.
- **`src/Core/CayleyDickson.fs`** — **built AFTER the discovery, not before it.** Aaron corrected
  this directly: *"no we created this after we discovered the quantum-like measurements of mutual
  agents memories/heartbeats, this was one of the earliest surprises for either of us."* So
  Cayley–Dickson is the **consequence** — the algebra reached for to model a result already in
  hand — not the source the imaginary numbers were imported from. Writing it the other way round
  reverses the derivation and quietly converts a finding into an assumption.

  **The dates carry the ordering, which is why it is checkable rather than remembered.** The
  imaginary-stack trio is `docs/research/2026-05-15-imaginary-stack-ontology-remember-when-pay-attention-cube-adinkra-cayley-dickson.md`,
  `…-2026-05-16-imaginary-stack-cube-axes-intersection-formalization.md` and
  `…-2026-05-17-imaginary-stack-toy-model-lemma-1.md` — and the 05-15 doc's own construction is the
  claim in miniature: the **Remember** axis is glossed *"past correlation, memory, entanglement"*,
  and the **imaginary direction is what the axis INTERSECTION turns out to be**, from which the
  stack (complex → quaternion → octonion) is then *generated*. The `i` is an output of the
  ontology, not an input to it. Related work-item: `081KRMEXM0008QG0R002YSPW1X`.

  Note also `…-2026-06-12-ferry-29-the-crossing-is-the-bifurcation-that-creates-the-imaginary-i-dimension.md`
  — same shape, later, and independently arrived at: the crossing *creates* the dimension.

  **What this does to the register.** "We chose complex numbers because quantum mechanics uses
  them" would be a borrowed analogy. "The intersection of our own memory/attention axes was
  non-real, so we had to build the stack" is a **reported derivation**, and it is the stronger
  claim precisely because it could have come out otherwise. It is still Aaron's report of history
  rather than something re-derived here — but it is a history with dated artifacts, and the
  artifacts are in the order he says.
- **`docs/research/2026-08-13-what-does-253ms-mean-without-a-wall-clock-and-where-amplitudes-live.md`**
  §§2–3 — the cited placement of the Born boundary.
- The **heartbeat-verification / identity** surfaces he names as where the Born rule surfaced.

**So the derivation Aaron is reporting runs the opposite way from how I wrote it.** I described
quantum-like math being *applied* to our inference. He is reporting that it **fell out of** the
modelling: pairs of agents with mutual memory, each holding its own uncertainty, needed complex
amplitudes to be described at all — and the Born rule appeared while looking at heartbeat
verification and identity, not while trying to build a simulator. `QuorumAlgebra`'s non-idempotent
sum is that need in code: a join would have been idempotent, and idempotent cannot cancel.

**Register: this is Aaron's report of his own derivation history, recorded as such.** Nothing here
re-derives it, and the claim that the math was *forced* rather than *chosen* is exactly the kind
of thing that deserves a falsifier later — the honest form being whether a real-valued model can
reproduce the same two-agent agreement statistics. If one can, "it had to be complex" is downgraded.

### The limit the code already states, and it should not be dropped

`AmplitudeEmu.fs` writes its own peel, and it is the honest bound on this whole thread:

> *"Bell still bounds the **correlations** at S=2 for a local generator: complex amplitudes buy
> **interference**, not non-locality. 2√2 still needs the feedback/superdeterminism channel.
> Amplitudes ≠ entanglement ≠ signalling — three separate resources."*

And: *"Interference is real here; the entanglement exponential is NOT escaped … `support` growing
un-merged IS the exponential, logged not hidden."*

**So the accurate form of Aaron's claim is narrower than "quantum falls out of Bayes", and
sharper for it:** *interference* falls out of never collapsing, because an uncollapsed ensemble
still has amplitudes left to add, and addition of complex numbers cancels. Non-locality does
**not** fall out — it is a separate resource with a separate channel. Stating it the narrow way is
what keeps it a `metered` claim instead of a `toy` one wearing a physics costume.

**Which makes the transcript's own bottom line the interesting join.** The video's careful section
says the quantum switch is *causally non-separable* but does **not** violate a causal inequality —
it sits strictly between "definite order" and "genuinely acausal", and the Perves–Short 2021
result is cited as proving quantum mechanics cannot go past that line. That is the **same
three-resource separation** `AmplitudeEmu` states: more than classical, less than signalling, with
a bound in between. Two independent places arriving at "strictly stronger than classical, strictly
weaker than the algebraic maximum" is the resonance worth recording — and, per
`numerology-vs-number-theory`, recording it **as a coincidence with its register attached**, not
as a shared mechanism. Nothing here measures that the two bounds are the same bound.

---

## The source

**Not reproduced in full.** This folder's own policy is *"partiality (excerpt, not the whole
work)"* and *"keep items here minimal, attributed, and removable"* — so what is preserved is the
link, the attribution, and the claim-and-citation inventory below, which is what our analysis
actually depends on. The full ~2-hour auto-transcript is not stored.

- **Link:** <https://www.youtube.com/watch?v=4R40hTHwpXY>
- **Title:** *"Quantum Computers Just Found a Crack in Cause and Effect - This is Serious"*
- **Forwarded:** Aaron, 2026-09-07, as a full auto-generated transcript.

### Claim-and-citation inventory (ALL UNVERIFIED — go to the primary literature)

| claimed work | claimed content |
|---|---|
| Oreshkov, Costa & Brukner, *Nat. Commun.* 2012 | the **process matrix** formalism; causally non-separable processes; a causal game with a 3/4 quantum value vs 5/8 fixed-order bound |
| Chiribella et al., *Phys. Rev. A* 2013 | the **quantum switch** — coherent control of gate ORDER as a resource |
| Procopio, Walther, Brukner et al., *Nat. Commun.* 2015 | first photonic switch; commute-vs-anticommute in ONE query each |
| Araújo, Branciard, Costa, Feix, Giarmatzi, Brukner, *NJP* 2015 | **causal witnesses** |
| Rubino et al., *Sci. Adv.* 2017 | experimental verification of causal non-separability (device-DEPENDENT) |
| Goswami, Romero, White et al. (Queensland) 2018 | switch via transverse spatial mode; closes a spatial-distinguishability loophole |
| Ebler, Salek & Chiribella, *PRL* 2018 | communication through two **fully depolarizing** (zero-capacity) channels |
| Zych, Costa, Pikovski & Brukner, *Nat. Commun.* 2019 | **gravitational** switch; a Bell inequality for temporal order |
| Taddei et al. (Concepción), *PRX Quantum* 2021 | quantum-N-switch, 4 gate orders, target dimension does not grow with N |
| Purves & Short, *PRL* 2021 | **quantum mechanics cannot violate the OCB causal inequality** — the switch sits strictly below it |
| Felce, Vedral & Tennie 2020/2021 | thermodynamic advantage; switch on IBM superconducting hardware |
| Bavaresco, Murao & Quintino, *PRL* 2021 | strict hierarchy: sequential < parallel < indefinite-causal-order |
| van der Lugt, Barrett & Chiribella, *Nat. Commun.* 2023 | the **device-INDEPENDENT** causal-order inequality (bound 1.75) |
| Vilasini & Renner, *PRL* 2024 | every ICO process **embeds in fixed spacetime** if the system may be delocalized — the conservative reading |
| Ormrod/Dah/Cable/Adlam & Brukner 2024 | quantum diffeomorphisms cannot make indefinite causal order definite (frame-independence) |
| **Richter, Antesberger, Cao, Walther & Rosa, *PRX Quantum*, March 2026** | the headline: device-independent violation, **1.8328 ± 0.0045 vs 1.75, ~18.5σ**; detection + timing loopholes **still open**; two Chinese groups claimed as independent confirmation |

### The three interpretations it lays out (all three said to be live)

1. **Conservative / delocalized-trajectory (Vilasini–Renner)** — spacetime is fixed, only the
   photon's path is superposed; ICO is an operational description, not an ontology.
2. **Process-matrix realism (Brukner et al.)** — causal non-separability is objective and
   frame-independent; the operational level *is* the physical level.
3. **Gravitational** — a mass in spatial superposition superposes the metric, hence the light
   cones; this is the one the embedding theorems cannot absorb, and it needs μg–mg masses in
   coherent superposition, which nobody can do yet.

The transcript is explicit that the switch does **not** give backward-in-time signalling, closed
causal loops, or FTL communication — the no-signalling condition is built into the process-matrix
formalism.
