# Multitrack demixing is the jurisdiction lattice — NILM and music separation are one inverse problem, and the fixed stem set is the tree-on-a-lattice error

**Work item:** `081M1J5FEVQ087G0R002BZY9KX`
**Register:** `toy`. This is a design and a set of falsifiers. Nothing here is measured, no model
is trained, and the SDR claim below is deliberately **not** "we will beat the leaderboard."
**Origin:** Aaron, 2026-09-02, on reading the jurisdiction-lattice section written for Max:

> *"yes this connects to our meter and music disambiguation where I learned at Itron and
> multitrack music decomposition. I'd love to come up with a state of the art multitrack music
> disambiguation based on our DAG online learning based on Bayesian."*

---

## In plain words, first

**One microphone, many instruments playing at once — work out who is playing what.** That is
the whole problem. It is the same problem as **one power meter, many appliances running at once
— work out which ones are on**, which is what Hart's 1992 paper is about and what Aaron worked
inside at Itron.

And the bug in every current music system, in plain words: **it makes you pick one bucket per
sound, and real music does not work that way.** A piano is a drum and a bass note at the same
time. The systems ship a bucket literally called `other` because the buckets do not close.

Everything below is why that is hard and what it connects to. If you read only this much, you
have the idea.

---

## 1. The three problems are one problem

| | observation | latent | question |
|---|---|---|---|
| **jurisdiction overlay** | an address | overlapping districts | which regions contain this point? |
| **NILM / metering** | whole-premise power | appliances, each on or off | which loads are running, at what draw? |
| **music demixing** | a stereo mixture | instruments, each sounding or not | which sources are present, at what level? |
| **neural features** (Goodfire) | an activation vector | concept subspaces | which concepts is this token inside? |

All four are the same statement: **an observation is a superposition of simultaneously-active
overlapping sources, and the task is to recover the active set.** The answer is never a label.
It is a **signature** — a vector over sources, with a magnitude and an uncertainty per entry.

This is not an analogy that we are choosing to draw. **NILM and music separation were solved
with literally the same model**, and the model is a factor graph:

- **George W. Hart**, *Nonintrusive Appliance Load Monitoring*, Proc. IEEE **80**(12):1870–1891,
  1992 — the founding statement of the metering case, and the tradition Aaron worked inside at
  Itron.
- **Ghahramani & Jordan**, *Factorial Hidden Markov Models*, 1997 — many independent latent
  chains, one shared observation.
- **Kolter & Jaakkola**, *Approximate inference in additive factorial HMMs with application to
  energy disaggregation*, AISTATS 2012 — the **Additive Factorial HMM (AFHMM)**: each aggregate
  power sample is a sum over appliance states. Note the word in the title: **approximate**.
  Exact inference in an AFHMM is intractable, and that fact is load-bearing in §4.
- On the audio side the same decomposition arrived as **NMF** (Lee & Seung 1999; Smaragdis &
  Brown 2003 for polyphonic music), **PLCA** (Smaragdis, Raj & Shashanka 2006), and **Bayesian
  NMF** (Cemgil 2009) — non-negative additive superposition, which is the AFHMM's assumption
  wearing a spectrogram.

**Aaron's own migration is the evidence this transfer is real rather than decorative.** His
recorded path is 16 kHz metering → audio separation → Shazam-style fingerprinting; he has
already carried the technique across these domains once, by hand, before there was a repository
to write it down in.

---

## 2. The sharp claim: the fixed stem set is the tree-on-a-lattice error

This is the part that comes from the jurisdiction thread and is not, as far as I can find,
how the music-separation field frames its own problem.

**Every major system separates into a fixed partition — vocals / drums / bass / other.** That
is a *partition*: each time-frequency bin is assigned to exactly one stem, and the stems are
disjoint and exhaustive by construction.

**Music is not partitioned that way.** It is an overlapping lattice, and the field has the
evidence in plain sight:

- A **piano** is percussive *and* harmonic. It has a drum-like transient and a bass-register
  fundamental. Under a partition it must be filed once.
- A **synth pad** straddles bass and "other" continuously, not at a boundary.
- **`other` is the residual bucket** — the category that exists because the partition does not
  close. It is the exact analogue of a **precinct split**: the representation admitting, in its
  own vocabulary, that the regions overlap.
- A **doubled vocal, or a vocal through a reverb bus**, is present in the room sound that also
  carries every other source. There is no bin that is "only" one of them.

So the field is doing to music what a hierarchical district model does to an address: forcing a
tree onto a lattice, and then naming the leftover `other`. **A tree cannot represent a lattice**,
and the cost is paid exactly where sources overlap — which is most of a real mix.

**The proposal follows directly.** Do not assign a bin to a stem. Give it a **signature**: a
distribution over which sources participate, at adaptively-learned cardinality. This is
precisely the move Goodfire had to make in interpretability — from a feature as a *ray* to a
feature as a **subspace of adaptively-learned dimension** — arrived at independently, in a
different field, for the same reason: the rays were tiling something curved and overlapping.

---

## 3. Why our substrate is the differentiated part, and not just a place to put it

If the answer were "fit an AFHMM," that would be 2012 work and there would be nothing here.
Three properties of the Zeta substrate change what is buildable:

**(a) DBSP incremental view maintenance makes the inference genuinely online.** Every current
system is offline and batch: the mixture arrives whole, the network runs once. On a DBSP
substrate, arriving audio frames are an input stream and the posterior is an incrementally
maintained view. Crucially, a **revised** belief about an earlier frame is a **Z-set retraction**
(`+1` then `−1`) rather than a recompute — so evidence that arrives late (a chorus that reveals
what the ambiguous verse instrument was) can correct the past *without* reprocessing it. That is
the durable-execution property applied to inference, and it is what "online learning" should
mean here.

**(b) Probabilistic circuits answer the intractability Kolter & Jaakkola had to approximate.**
The AFHMM's exact posterior is intractable, which is why the 2012 title says *approximate*. PCs
(Darwiche's arithmetic circuits, 2003; Choi, Vergari & Van den Broeck 2020) are the model family
whose defining property is that marginals and conditionals are **tractable by construction**.
This is the concrete reason to build it on our factor-graph DAG rather than on a generic tensor
stack — the substrate is answering a *named* open difficulty in the source literature, not
merely hosting the model.

**(c) The DAG is the overlap structure, not a pipeline.** Sources that share a bus, a room, or a
performer are *dependent*, and a factor graph says so in its edges. The fixed-stem systems have
nowhere to put that fact.

---

## 4. The falsifiers, including the one that says we will probably lose

A design with no falsifier is the vacuity class, and a design whose falsifier is guaranteed to
pass is worse. So:

**F1 — separation quality, and the honest prediction.** MUSDB18-HQ, `museval` SDR/SIR/SAR/ISR,
against **BS-RoFormer** (current SOTA) and **HT-Demucs** (the strong hybrid baseline).
**Predicted outcome: we lose on raw SDR**, and saying so in advance is the point. A
Bayesian factor-graph model built from scratch against years of tuned large discriminative
transformers is not going to top that leaderboard, and a design document that quietly implies
otherwise is doing the thing this repository exists to prevent. The claim to defend is *"within
a stated margin of the baseline"*, with the margin fixed **before** the run.

**F2 — calibration, which is the metric the leaderboard cannot score.** Per-bin source-presence
probability, scored by expected calibration error and reliability diagrams against the known
stems. **Nothing on the MDX leaderboard emits a probability**, so this is not a metric we are
losing at — it is one the incumbents cannot enter. If our uncertainty is uncalibrated, the whole
"honest meter" claim below is dead and the work should stop.

**F3 — the overlap case, which is the actual hypothesis.** Held-out material chosen for
overlapping roles — solo piano, synth pads crossing bass and `other`, heavy shared-bus reverb.
If the signature representation does **not** beat the forced partition *here*, then §2 is a nice
story and nothing more. This is the falsifier that tests the claim rather than the machinery.

**F4 — streaming.** Real-time factor and latency under incremental arrival, plus a correctness
check that the incremental posterior equals the batch posterior on the same input (DST replay).
If incremental and batch disagree, the DBSP claim in §3(a) is unfounded.

---

## 5. Why this is the right place to make the meter thread falsifiable

The charlatan / magician / teacher taxonomy in [`docs/VISION.md`](../VISION.md) is currently
`toy`: it is argued rather than measured, because the domains we have applied it to lack ground
truth about what an intelligence "really read."

**Music demixing has ground truth.** MUSDB18-HQ ships the true stems. So for the first time the
three dispositions are directly measurable on a system:

| disposition | in a separator | measured by |
|---|---|---|
| **charlatan** | emits confident stems it cannot support — content that is not in the mixture | overconfidence at high ECE; hallucinated energy absent from the true stem |
| **magician** | separates well and reports nothing about its own reliability | good SDR, **no** probability emitted at all — the entire current leaderboard |
| **teacher** | emits stems *and* calibrated per-bin uncertainty, so a downstream user knows where to trust it | good SDR **and** low ECE (F1 ∧ F2) |

Note what this makes of the incumbents, and it is not an accusation: **every current SOTA
separator is a magician by our own definition** — it reads the mixture accurately and tells you
nothing about the reading. That is a *disposition*, not a verdict, exactly as Aaron insisted when
he corrected the taxonomy: whether a magician is good or bad is a multi-oracle decision, never a
meter decision.

**And this is the Itron thread closing.** Revenue-grade metrology is Aaron's prior and, in his
own account, his blind spot — tamper-evidence and honest readings are table stakes in metering
and a novel claim in software. A demixer that reports calibrated uncertainty per bin is a
**revenue-grade meter for audio**. The discipline he learned on power meters is the missing
requirement in a field that has optimised one number for a decade.

---

## 6. What would be built first, and the honest state

Nothing here is started. In dependency order:

1. **The signature representation** — per-bin distribution over source participation at adaptive
   cardinality. This is the §2 claim and everything else depends on it.
2. **The factor-graph model** — additive superposition factor, per-source latent chains, shared
   dependency edges for bus/room/performer.
3. **Tractable inference** — the PC compilation, which is where §3(b) is either true or not.
4. **DBSP incrementalisation** — streaming posterior with retraction, checked against batch (F4).
5. **Evaluation harness** — MUSDB18-HQ + `museval`, plus the calibration scorer, which does not
   exist off the shelf because nobody needed it.

**Known risks, named rather than discovered later:** MUSDB18-HQ is small by modern standards and
easy to overfit; SDR is a contested metric with known perceptual blind spots; and the biggest
one — a calibrated-but-mediocre separator may simply be less useful than an uncalibrated
excellent one, which would make F2 a real result and a commercially uninteresting one. That
would be worth knowing and worth publishing, and it is not a reason to skip the measurement.

---

## Anchors (Beacon)

- **Hart, G. W.** (1992), *Nonintrusive Appliance Load Monitoring*, Proc. IEEE 80(12):1870–1891.
- **Ghahramani, Z. & Jordan, M. I.** (1997), *Factorial Hidden Markov Models*.
- **Kolter, J. Z. & Jaakkola, T.** (2012), *Approximate inference in additive factorial HMMs with
  application to energy disaggregation*, AISTATS.
- **Lee, D. & Seung, H. S.** (1999), NMF, *Nature*; **Smaragdis & Brown** (2003), NMF for
  polyphonic music; **Smaragdis, Raj & Shashanka** (2006), PLCA; **Cemgil, A. T.** (2009),
  *Bayesian Inference for Nonnegative Matrix Factorisation Models*.
- **Darwiche, A.** (2003), arithmetic circuits; **Choi, Vergari & Van den Broeck** (2020),
  probabilistic circuits.
- **McHarg** (1969) overlay · **Tomlin & Berry** (1983) map algebra — the same lattice, in space.
- Current systems referenced as baselines: **BS-RoFormer**, **HT-Demucs**, **Open-Unmix**,
  **Spleeter**; benchmark **MUSDB18-HQ** with `museval` (BSS_Eval).

## Pointers

- [`docs/ZETA-CORE-TECHNOLOGY-FOR-MAX.md`](../ZETA-CORE-TECHNOLOGY-FOR-MAX.md) §The Geometry
  Thread — the jurisdiction lattice this generalises.
- [`docs/research/ip-questionable/2026-09-02-mlst-tom-mcgrath-goodfire-neural-geometry-...`](ip-questionable/2026-09-02-mlst-tom-mcgrath-goodfire-neural-geometry-manifolds-block-sparse-featurizers-general-addition-module-aaron-forwarded-verbatim.md)
  — the ray→subspace move, arrived at independently in interpretability.
- [`docs/VISION.md`](../VISION.md) §Charlatan, magician, teacher — the taxonomy §5 would meter.
- [`.claude/rules/toy-is-free-metered-must-be-earned.md`](../../.claude/rules/toy-is-free-metered-must-be-earned.md)
  — why this document says `toy` at the top and predicts its own F1 loss.
