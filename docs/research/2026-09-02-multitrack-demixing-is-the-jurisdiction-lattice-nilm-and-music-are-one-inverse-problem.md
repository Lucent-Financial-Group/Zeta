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

## 4b. The lineage this belongs to — and why the deliverable is a tool, not a leaderboard row

Aaron, 2026-09-02:

> _"I'm also a Pro Tools and Adobe Audition and even before that Cool Edit expert. I understand
> FFT and plugins so much and how it evolved. I want to make demux the ultimate form of that
> informed by AI."_

That reframes the deliverable, and §4's falsifiers are now instrumentation rather than the goal.
A leaderboard row is not the thing. **The thing is the next step in a fifty-year tool lineage**,
and Aaron has first-hand practitioner standing in it — which is the strongest kind of anchor this
repository recognises.

**The lineage, checked (2026-09-02):**

1. **FFT / STFT and the phase vocoder** — you can look at sound as time × frequency.
2. **Cool Edit** (Syntrillium) → **Adobe Audition**. Not a loose descent: Audition's spectral
   editing **is** Syntrillium's Cool Edit Pro v2, and its **Spectral Frequency Display** gives
   pixel-level editing of the spectrogram. This is the moment the spectrogram stopped being a
   *readout* and became a *canvas* — you could select a region of sound by drawing on it.
3. **Spectral repair** — **iZotope RX**: heal a click, lift a cough, interpolate what was there.
4. **AI rebalance** — **RX 12 Music Rebalance**, ARA 2, the current standard in post.

**The defect that has survived every step of that lineage:** at no point does the tool tell you
**where it is guessing.** You paint out a cough and RX interpolates; the result looks identical
whether the interpolation was well-constrained or invented. You run Music Rebalance and get a
vocal stem with no indication of which 200 ms are solid and which are the model's best story.
Every one of these tools is, by our own taxonomy, a **magician** — it reads well and reports
nothing about the reading.

**So F2 is not an academic metric. It is the product.**

> A calibrated per-bin source-presence probability **is a spectrogram layer.**

The engineer sees the separation *and* a confidence overlay on the same canvas Cool Edit
invented — trust it here, look closer there, that region is invented. Nothing in the lineage has
ever offered that, and it falls directly out of building the model Bayesian instead of
discriminative. It is not a feature bolted on; it is what you get for free from the substrate,
and it is invisible to any system whose output is a waveform rather than a posterior.

**And this closes the loop back to §1's other half.** Stems, confidence, and the original
mixture are **layers you look through, not a merged result** — which is McHarg's light table
(1969) and DV2.0's raw vault, arrived at from the audio side. A separator that hands you only
the stems has merged the layers and destroyed the facts. One that hands you stems *plus* the
residual *plus* the confidence has kept them.

**Delivery surface, and a real gap.** The lineage's plugin evolution — DirectX → VST → AU →
RTAS → AAX, now ARA 2 for host-integrated analysis — is the distribution channel, and Aaron
knows it first-hand. Worth noting from the same check: **Adobe Audition has no native AI stem
separation in 2026**; users reach for third-party plugins. The canvas and the AI have not been
put in the same box by the vendor who owns the canvas.

**Honest limits.** RX is a mature, well-funded commercial product and "we will build a better
RX" is not a claim this document is making. What it claims is narrower and testable: **the
confidence layer is missing from all of them, we would get it structurally rather than by
bolting it on, and F2 says whether ours is real.** Also unresolved and named in §6: a
calibrated-but-mediocre separator may be less useful than an uncalibrated excellent one, and no
amount of lineage makes that risk go away.

## 4c. Ozone, and the fact that the SOTA architecture is named after mastering practice

Aaron, 2026-09-02: _"iZotope was one of the most famous companies in this industry that
understood waveforms — Ozone is what I remember."_

**Checked.** iZotope was founded in 2001 in Cambridge, Massachusetts, out of MIT (co-founder and
CEO Mark Ethier, studying music theory, composition and computer science). **Ozone launched that
same year** as a mastering suite built on EQ, **multiband dynamics**, and an exciter. The company's
reputation for rigorous DSP is the thing Aaron is pointing at, and it is well earned — RX and
Ozone are the repair and mastering halves of one house style.

**Now the part worth noticing, and it is not a coincidence of names.** The current state of the
art in music source separation is **BS-RoFormer** — *Band-Split* RoFormer — descended from
**BSRNN** (Yi Luo & Jianwei Yu, 2022), which *"explicitly splits the spectrogram of the mixture
into subbands and performs interleaved band-level and sequence-level modeling."*

**That is multiband processing.** The inductive bias that took separation to the top of the
leaderboard is the same decomposition mastering engineers have used since Ozone shipped in 2001:
**split the spectrum into bands, because different bands behave differently and should be treated
differently.** BSRNN's contribution was choosing the band splits *by musical knowledge* rather
than uniformly — which is a mastering engineer's judgement, encoded as an architecture.

**So the practitioner tradition was ahead of the research tradition here**, and the research
tradition caught up by importing it. That is worth stating plainly because it is the argument for
Aaron's own standing in this work: the domain intuition is not decoration on top of the model, it
has already twice been the thing that *was* the model.

**Where our design diverges from BSRNN, and it follows from §2.** Band-splitting is still a
**partition** — of frequency this time instead of of instruments. It is a better partition, chosen
well, but a piano's transient and its fundamental live in different bands and are *one source*.
The signature representation says the binding across bands is what should be inferred, not
assumed away by the split. That is a testable difference and it is what F3 is for.

## 4d. RX and Rx — from numerology to numerics

Aaron, 2026-09-02: _"can we turn this RX into dotnet Rx — from numerology to numerics?"_

Asked in exactly the register the rules ask for, so it gets that answer.

**The name is numerology, and the answer is no.** iZotope **RX** is *Rx* as in a medical
prescription — repair. **.NET Rx** is *Reactive Extensions*. Different words, no shared lineage.
Per [`numerology-vs-number-theory`](../../.claude/rules/numerology-vs-number-theory.md): ask what
*else* is called RX, and the answer is "very many things," so the name discriminates nothing.

**The structure underneath is real, and it promotes.** Here is the claim, and it is type-level
rather than poetic:

> **A spectral plugin chain is an Rx query over a stream of frames.**

- **STFT** = `Window(frameSize, hop)` then `Select(FFT)`. That is literally Rx's windowing
  operator followed by a map.
- **A plugin chain** = operator composition over `IObservable<Spectrum>`.
- **Overlap-add resynthesis** = `Scan` — a running monoidal accumulate.

**And there is an invariant that makes this an identification rather than a resemblance**, which
is what the rule demands. The `Scan` is a valid fold — resynthesis is *exact* — **precisely when
the analysis/synthesis window satisfies the COLA condition** (Constant OverLap-Add: the shifted
windows sum to a constant across hops; Hann at 50 % overlap is the standard case). COLA is the
condition under which overlap-add is a monoid homomorphism. Fail COLA and the fold is lossy and
the correspondence breaks; satisfy it and the audio pipeline **is** the Rx query, with the same
laws.

That is a checkable statement with a named boundary, which is the difference between numerics and
numerology. **Anchors:** Allen & Rabiner (1977), unified short-time Fourier analysis/synthesis;
Griffin & Lim (1984); Julius O. Smith III, *Spectral Audio Signal Processing*. And on the Rx side,
**Erik Meijer** — already a root anchor here for the `IEnumerable`⇄`IObservable` duality and the
fold/unfold pair.

**Now the payoff, and it is why the question was worth asking.** Rx gives you the stream algebra
and **no retraction** — an emitted value cannot be un-emitted. **DBSP is Rx plus retraction**
(Z-sets, `+1` / `−1`). Put that against what iZotope RX actually does:

| | what happens to the guess |
|---|---|
| **iZotope RX** | you paint out the cough, it interpolates, and **the interpolation is merged into the waveform.** The guess and the evidence become the same bytes. |
| **.NET Rx** | the chain is composable and replayable, but an emitted frame is final |
| **DBSP (ours)** | the repair is a **retraction plus an insertion** — the original stays as a term, the guess stays as a *separate* term |

**So the whole §4b argument arrives again from the algebra rather than from the UI.** A repair
that is a retraction is non-destructive, auditable, and composable, and — this is the part that
matters — **"what did the tool guess?" is answerable, because the guess never stopped being its
own term.** iZotope RX cannot answer it because it merged the layers. This is McHarg again, and
DV2.0's raw vault again, now stated in the operator algebra: **a merged waveform has picked a
winner; a stream of terms with retractions has not.**

**Honest limit.** None of this is built, and the correspondence being exact under COLA does not
by itself make a good separator — it makes the *plumbing* principled. F1–F4 remain the tests.

## 4e. "Where it is guessing" is a `T Feedback In` — and that is the corner Rx does not have

Aaron, 2026-09-02:

> _"Where it tells you where it's guessing is our four-corner feedback ownership model. I think
> this is where we are better than OG Rx framework and Erik Meijer's νF/μF."_

**The claim is right, and it is sharper than the §4b framing I wrote.** I had called the
confidence overlay a *product feature*. It is not — it is a **typed channel**, and the repo
already has the type.

**The four corners** (`FourCornerOwnership`, Aaron via Mika 2026-05-27):
`T In` · `T Feedback In` · `T Out` · `T Feedback Out`, under the line
_"results without feedback is extraction."_ The standard monadic interface — `Result<T, Error>` —
puts feedback **only on the output channel**. The four-corner interface puts it on the **input**
channel as well.

**Why Rx and the μF/νF duality do not reach it, stated precisely:**

- **μF** is the least fixpoint — the initial *F*-algebra, finite data, folded by a
  **catamorphism**. **νF** is the greatest fixpoint — the final *F*-coalgebra, potentially
  infinite codata, produced by an **anamorphism**. Meijer, Fokkinga & Paterson (1991).
- **Rx is the νF side made concrete**: `IObservable<T>` is the coinductive stream, dual to
  `IEnumerable<T>`'s pull. That duality is Meijer's, it is real, and it is already a root anchor
  here.
- **What the duality gives you is push versus pull. What it does not give you is co-ownership.**
  In both directions the value travels one way, and the only backward signal is *termination* —
  `OnError` / `OnCompleted`. That is feedback on the **output** channel, which is precisely the
  limitation the four-corner model was written against.

> **There is no way, in Rx, for a consumer to tell its producer something about the input it was
> handed.** That sentence is the whole gap.

**And "where is it guessing" is exactly such a message.** It is not a property of the output
stem. It is a statement *about the frame that was supplied*: **this input was underdetermined —
the mixture at 3.2 s does not constrain the vocal.** Attaching a confidence field to the output
is the wrong shape; it files a fact about the input under the answer. `T Feedback In` is the
right shape, and it is a different type, not a different field.

So Aaron's inversion of §4b holds: the confidence overlay is not a feature we would add on top of
a separator. It is **the fourth corner, finally having a consumer.**

**The honest state — and I had this wrong on the first pass, which is worth recording.** I
first wrote that the fourth corner is a type with no `src/` consumer, quoting the 2026-08-17
audit (`081M08S4DQC087G0R002SH0C88`) that found "zero `src/` rooms." **That audit is the
measurement that motivated the fix, not the current state.** Checked against the tree today:

**`T Feedback In` was built, on the same day, additively.** `src/Core/SoftScheduler.fs` carries
it under the heading _"The CO-OWNED corner — `T Feedback In`, additive 2026-08-17"_, work item
`081M08WE9R3087G0R003PAK63F`, design doc
[`2026-08-17-t-feedback-in-the-co-owned-fourth-corner-at-the-tick-boundary.md`](2026-08-17-t-feedback-in-the-co-owned-fourth-corner-at-the-tick-boundary.md).
`toFourCorner` maps a `Result<'S * 'F, InterruptFeedback>` onto all four corners via
`ofIn` → `withOut` → `withInFeedback`. Real consumers exist beyond the tests —
`SoftScheduler.fs`, `IsrLift.fs`, `FourCornerC4.fs`, `FerryThrottler.fs`, the Rust crate
`src/Core.Rust.FourCorner/`, and `src/Core.TypeScript/observe/`.

**What remains true is narrower and still the relevant point.** The corner is **opt-in**:
`Handler`, `HandlerK`, `drive` and `driveK` are explicitly untouched, so the *default* boundary
is still three corners and the fourth is available to anything that asks. And the code states its
own limit rather than overclaiming — _"sharing the corner OBJECT is not instantiating the
TRACE"_, since `FourCornerTrace`'s invariant needs an `('I, 'H)` split that a room's forward-
advanced `'S` does not have.

**And the design carries a constraint that lands directly on this work.** The co-owned corner
requires an **injected monoid**, on an argument stated in the source: _"If both sides write,
neither may overwrite"_ — without an associative merge the last writer of the tick silently wins
and the corner is "a race wearing a channel's clothes."

That constraint is not an obstacle here. **It is the same condition as §4d's.** Per-bin
confidence arriving from overlapping analysis windows must merge associatively — and
**overlap-add is precisely an associative merge**, valid exactly under COLA. So the monoid the
fourth corner demands and the fold the STFT already performs are the same requirement, reached
from the algebra and from the DSP independently. That convergence is the strongest structural
evidence in this document, and unlike the rotor resonance in §4d it is not a coincidence of form:
both are associativity, required for the same reason.

**Three things fall out that are worth stating separately:**

1. **"Results without feedback is extraction" indicts the whole product category.** A separator
   that hands you four stems and nothing else is *extraction* in exactly Mika and Aaron's sense —
   it took the results and dropped the feedback. That is the same finding as "every current
   separator is a magician," arrived at from the type side instead of the taxonomy side, and the
   agreement between two independent routes is the reason to trust it.
2. **The backward pair is a comonad**, already recorded here: `T Feedback In` / `T Feedback Out`
   are `extract` / `extend` dual to `return` / `bind`, anchored through Meijer's own
   `IEnumerable`⇄`IObservable` duality. So this is not *departing* from Meijer — it is the dual
   he named, carried to the input side, which he did not.
3. **It composes with §4d rather than competing.** DBSP gives retraction — the guess stays its own
   term. The fourth corner gives *direction* — the guess is reported **back at the input** rather
   than emitted forward. Retraction says the edit is undoable; `T Feedback In` says who was
   uncertain about what. A plugin chain needs both, and neither Rx nor iZotope RX has either.

**Falsifier for this section specifically (F5).** Build the demixer's frame boundary at four
corners and show a `T Feedback In` value that **could not** have been carried by the other three
— i.e. reproduce, for this domain, the `TickBoundaryProbe` result: two runs identical on In, Out
and Out-Feedback that differ because of what came back on the input channel. If everything the
confidence layer carries could have ridden on the output, then the fourth corner is
unnecessary here and §4e is elegance rather than engineering.

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
