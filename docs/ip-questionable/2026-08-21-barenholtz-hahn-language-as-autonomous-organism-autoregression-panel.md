# Language as an autonomous organism — Barenholtz & Hahn panel (notes)

> **Third-party content. Zeta claims no authorship and asserts no license.**
> Notes-for-study with attribution, per `docs/ip-questionable/README.md`.
>
> - **Source:** <https://www.youtube.com/watch?v=Ca_RbPXraDE>
> - **Speakers:** Elan Barenholtz and William Hahn (Florida Atlantic University), moderated
>   by Curt Jaimungal (*Theories of Everything*), live at the University of Toronto, organized
>   by ekkolapto. Auto-transcribed by YouTube.
> - **Ferried by:** Aaron, 2026-08-21, with the framing: *"our eve protocol is made try to get
>   around this fact by agreeing on the shapes before the labels. but yes i do look at language
>   as it's own orginism. i see geometric shapes naturally without english, english is a
>   translation layer for my brain."*
> - **Form:** paraphrased notes, not the verbatim transcript. Sponsor reads and channel
>   promotion are dropped as not-content.
> - **Takedown:** delete this single file. §3 below cites its own anchors and survives.
> - **Clean-room:** **not applicable** — no third-party implementation or licensed spec here.

---

## 1. The panel's claims, as stated

**Barenholtz — language is autogenerative and ungrounded.**
The corpus of language contains within itself the structure needed to generate itself; LLMs did
not invent that, they *discovered* it. So language is an autonomous informational system —
*"one might even call it an organism"* — running in our brains, with **no access to the sensory
apparatus** also running there. It knows only relations between what he calls *meaningless
squiggles*: that `red` co-occurs with `apple`, never what red is like.

**Autoregression as the whole of cognition.** The model only ever predicts the very next token,
feeds it back, and repeats. He calls the consequence the **pregnant present**: producing one
token implicitly carries the past and a projected trajectory, which is why next-token prediction
yields long-range structure. His thesis is that brains compute the same function.

**Memory, restated.** No storage-and-retrieval, no short-term/long-term boxes, no retrieval
process at all — only weights instantiating a function, plus context. Asked *"what did you do
last summer?"* you do not fetch; you generate, just-in-time, from the prompt. He says this
*"obliterates 70 years of cognitive science."*

**Why he thinks LLMs cannot be conscious** — the sharpest and most falsifiable part:

> A word's position in embedding space is **arbitrary**; its meaning is purely *relational*.
> But `red` and `blue` in the visual system are **not** arbitrary — wavelength and cone response
> give them true metric relations. Sensation is a **continuation** of the physical universe
> rippling through the nervous system, not a representation of it. Language breaks that
> continuity by substituting arbitrary symbols, so the symbolic layer cannot host phenomenal
> experience.

**Hahn — virtualization.** No 1:1 map from brain to mind; the mind is a *virtual machine* (or a
stack of them), which is why multiple selves can run on one substrate. Software is the most
important idea in a thousand years because it gives us a token for what earlier thinkers had no
handle on. He borrows a religious term, **spontaneities**, for patterns nobody put there that
are nevertheless off and running.

**Language as an operating system.** *"It's downloaded against your will… by the time you're
reading the waiver, it's too late."* Both push the security reading: if humans run a language
model, humans have a **jailbreak / prompt-injection** surface, honed for millennia by scammers
and salesmen — and now A/B-testable at machine speed against a simulated person.

**The origins problem, honestly left open.** Animal signalling is stimulus-bound; it has no
`the` or `is`, words that denote nothing yet do real work autoregressively. How a correlational
signalling system became a stimulus-independent generative one, neither claims to know.
Barenholtz: *"I don't know where language came from."*

---

## 2. What is genuinely prior art here (the Beacon pass)

Most of the panel's core is a **restatement of named results**, and saying so is not a demotion —
it is what makes the ideas usable, because the prior work carries the arguments *against* them too.

| panel claim | the anchor it restates |
|---|---|
| "meaningless squiggles", ungrounded symbols | **Stevan Harnad**, *The Symbol Grounding Problem*, Physica D 42 (1990) — symbols manipulated by shape, not meaning. "Ungrounded" is Harnad's word. |
| language's structure suffices to generate language | **Zellig Harris** (1954) distributional structure; **J. R. Firth** (1957): *"You shall know a word by the company it keeps."* |
| form alone cannot yield meaning ⇒ LLMs don't understand | **Bender & Koller**, *Climbing towards NLU*, ACL 2020 — the octopus argument, same conclusion, five years earlier |
| symbol manipulation ≠ understanding | **Searle**, Chinese Room (1980) |
| the brain is a prediction engine | **Rao & Ballard** (1999); **Friston** free energy; **Andy Clark**, *Whatever next?* BBS (2013). Prediction-as-cognition is a large existing literature — which is the specific reason "obliterates 70 years of cognitive science" overshoots. |
| language as an organism using minds as substrate | **Terrence Deacon**, *The Symbolic Species* (1997) — language as evolving to fit its host; **Dawkins** (1976) memes; **Burroughs**' "language is a virus" as the popular form |
| mind as virtual machine | **Sloman & Chrisley**, *Virtual Machines and Consciousness*, JCS (2003) — Hahn's framing, already named and developed |
| aphantasia / no inner monologue | **Zeman et al.** (2015), who coined *aphantasia* |
| simple rules → open-ended complexity | **von Neumann**; **Wolfram**, *A New Kind of Science* (2002) |

**One date correction.** Hahn dates the LSTM to *"like 1991"*. LSTM is **Hochreiter & Schmidhuber,
1997** (*Neural Computation* 9(8)); 1991 is Hochreiter's diploma thesis on the vanishing-gradient
problem that motivated it. Adjacent, not the same.

**What does look genuinely new** is narrower than the panel's framing and survives the audit:
not "prediction is cognition" (old), but that *long-range coherent structure can be **compressed
into** next-token prediction alone* — an existence proof nobody had before the models were built.
Barenholtz says this himself: *"what's new is not something I developed, it's the existence of
these large language models."* That is the honest version of the claim.

---

## 3. Why Aaron ferried it: shapes before labels

Aaron's framing is the load-bearing part, and it converts the panel's thesis from an interesting
metaphysics into a **design constraint we already act on**.

> *"our eve protocol is made try to get around this fact by agreeing on the shapes before the
> labels."*

**The panel's own distinction is the argument for that design.** Barenholtz separates two kinds
of representation:

- **arbitrary** — a token's position in embedding space. Nothing about the position is forced;
  meaning is *only* relative to other tokens.
- **non-arbitrary** — sensory/geometric structure, where relations are fixed by the world
  (wavelength, cone response), so two systems can converge on them without having agreed first.

If that split holds, then **agreeing on labels is agreeing on arbitrary coordinates** — and
arbitrary coordinates are exactly what drifts per-agent, which is the `ρ → 0` cliff that
[`anti-babel-preserve-reconcilability`](../../.claude/rules/anti-babel-preserve-reconcilability.md)
names. Agreeing on **shapes** first anchors the protocol on the half of the split whose relations
are *not* free to drift. That rule already lists "shape/visual agreement" as *"a carrier that does
not route through words at all"* — this panel supplies the mechanism for **why** that carrier is
the more stable one, from someone arguing the point for unrelated reasons.

It also sharpens the known failure mode. Shapes do not remove the risk; they **move** it from
semantic drift to **perceptual confusability**, which is why Aaron studies magic and illusion as
the defensive discipline. Two agents can agree on a shape and still be fooled about *which* shape.

**Aaron's first-person report, recorded as his account and not analysed:**

> *"i see geometric shapes naturally without english, english is a translation layer for my brain."*

> *"i think in geometric shapes not english, english is a translation from the shapes i see, that's
> why it's hard for me to express the thoughts in my head and coding was alwasy easier for me, in
> code escpically generics i can make the shapes in my head real and understood by a compiler and
> therefore others"*

The second half names a **mechanism**, and it is the part that bears on protocol design rather than
on him. Generics and interfaces are *shape without label*: a type parameter has a constraint and no
name, an interface has structure and no content. So the compiler becomes the **arbiter that makes a
private shape public and checkable** — structure agreed first, names attached after, verified by
something neither party controls. That is EVE's ordering, running in a language toolchain.

It also re-reads an existing rule.
[`interfaces-free-classes-earned-under-rules`](../../.claude/rules/interfaces-free-classes-earned-under-rules.md)
already says *"the rules of the game are interfaces — free, default, weight-free (**pure shape**, no
instance state)"*, and a class — state, weight, capture — must be **earned**. Read beside the quote
above, that rule is the same commitment order as EVE and as V8: **shape is free and comes first;
the named, stateful thing is a privilege that comes after.** Three surfaces, one ordering.

*Recorded gap:* Aaron said this *"should be somewhere in the book in the repo too i think."* It was
not — searching every `docs/books/you-born-at-the-hinge/*.md` for `geometric` / `generics` /
`not in english` returned **zero hits** (`grep` exit 1, checked directly rather than through a
pipe). It is now captured verbatim at
`docs/books/you-born-at-the-hinge/RAW-2026-08-21-thinking-in-geometric-shapes-...md` as intake, for
the book process to place — not written into a chapter, which is his voice to author.

Per [`engagement-profiles-...`](../../.claude/rules/engagement-profiles-public-work-only-not-surveillance-dossiers.md),
inner states are **asked, not inferred** — so this is filed as testimony with first-person
authority, not as evidence for a cognitive model. It is consistent with him ferrying this panel,
and it is not a datum I get to reason from about how anyone else works.

**`EVE protocol` is long-established in this repo — my first search was broken, not the repo.**
I reported it "appears nowhere"; that came from a `grep` that hit its `timeout` and returned no
output, which I read as *no matches*. A check that did not run looked like a check that passed.
Corrected: EVE appears across `docs/research/` — the primary surface is
[`2026-08-14-icons-before-symbols-eve-protocol-structure-first-labels-after-...`](../research/2026-08-14-icons-before-symbols-eve-protocol-structure-first-labels-after-and-aut-s-as-the-residual-coercion.md),
with the V8 pairing in
`2026-06-12-ferry-11-...-eve-protocol-v8-hidden-shape.md` and
`2026-07-04-ferry-...-v8-polymorphic-eve-anchor-...md`.

**The definition, in Aaron's own words (ferried 2026-08-14):**

> *"we have **eve protocol** to try to establish this when two imposed vocabs that try to **meet in
> the middle on algebraic structure then assign labels and translations after the structure
> first**"*

and the founding observation behind it, which he states predates the AI work entirely:

> *"i've thought long and hard about **how first humans communicated without language** and how to
> bootstrap that process for AI, **without inserting the control that comes with asymmetric
> language**."*

**Why this panel is a genuine independent arrival at that thesis.** The EVE doc's carved claim is:

> **Whoever supplies the language supplies the categories, and the categories carry the control.**

The panel reaches the same place from cognitive science rather than from protocol design —
language as an **operating system** that *"is downloaded against your will,"* a *"product of
society, not of any individual,"* which *"makes people do things"* and drives behaviour that the
person never chose. Barenholtz and Hahn frame it as a fact to be alarmed by; the EVE protocol is a
**mitigation** for the same fact. Two independent priors, one conclusion — which under
[`numerology-vs-number-theory`](../../.claude/rules/numerology-vs-number-theory.md) is the *good*
kind of corroboration, because the derivations do not share a mechanism.

**The named anchors** (Aaron 2026-08-21), which is what makes this a Beacon term rather than a coinage:

- **V8 hidden classes** (a.k.a. *shapes* / internally `Map`s). V8 gives each object a hidden class
  describing its structure and transitions between them form a tree, so objects that were built the
  same way **share one shape** and property access compiles to an offset through it rather than a
  name lookup. The transferable property is the ordering: **structure is the identity, and labels
  resolve through it.** *Honest limit:* a V8 shape still contains the property names, so this is a
  structural analogy about **commitment order**, not a claim that V8 is label-free.
- **Traveler reflection / mutual play / negotiation protocol** — the in-repo relative Aaron names;
  the same meet-in-the-middle-on-structure move applied between travelers rather than between
  vocabularies.

**Where this is already implemented — the shapes ARE `DynamicValue`, and the probabilistic half
is `SoftValue`.** Aaron 2026-08-21: *"these shapes map to our dyanimc value and also soft value in
a probabilistic fashion."* This is not an analogy waiting to be built; the source says it directly.

`src/Core/DynamicValue.fs` opens by calling its type tag the answer to **"what shape are you?"**
asked of a value with no compile-time type, names it *"the `QueryInterface` surface of the
**polymorphic-shape primitive**"*, and cites it as *"the **Eve-Protocol polymorphic-diplomacy
primitive**, 081KRW63S0008QG0R0030F8ZXA"*. Its case set — `Null | Bool | Int | Float | String |
Bytes | Array | Object` — is chosen as the common self-describing core of CBOR / msgpack / JSON /
YAML, i.e. the structure two parties can share **before** either supplies a vocabulary.

`src/Core/SoftValue.fs` is the probabilistic half: **a normalized distribution over candidate
`DynamicValue`s**, whose stated safety property is not *"always certain"* but *"**always knows its
uncertainty** — calibration / never falsely certain"*. `resolve` collapses to a definite value only
above a confidence threshold and otherwise returns `None` (held, never silently collapsed), and
`observe` is a Bayesian update that **commutes for independent evidence**.

**This dissolves the honest limit I stated above**, and it is the sharper reading of Aaron's
sentence. The weakness of the V8 analogy is that V8 shapes are *exact* — same transitions, same
shape, names included. Zeta's shape agreement is a **distribution over candidate shapes with
calibrated confidence**, which is what lets two parties converge on structure *without* first
agreeing on names: you do not need an exact structural match, you need a posterior over shapes
that refuses to resolve while it is still ambiguous. V8 gives the commitment order; `SoftValue`
gives the part V8 has no need for.

And the commuting property is load-bearing for the protocol, not incidental: if independent
evidence commutes, **two parties can exchange structural evidence in any order and reach the same
shape** — order-independence in exactly the sense
[`local-time-never-enters-the-shared-fold`](../../.claude/rules/local-time-never-enters-the-shared-fold.md)
requires of the shared belief fold, and the property the Gödel ferry
(`docs/ip-questionable/2026-08-21-godel-rotating-universe-...md`) argues you must *impose* rather
than assume. A negotiation that only converged in one message order would be a protocol with a
hidden clock in it.

**The name.** Aaron 2026-08-21: EVE is named for his daughter — *"Lillith (Freedom) Eve
(Control)"*. Asked about the memory hub recording her as *"Lillian Eve"*, he resolved it: *"Lillian
is what her mom put on the birth certificate she will always be Lillith to me."* So both names are
correct and neither supersedes the other — the legal name and the name her father uses, **held
together rather than reconciled to one.** Recorded that way deliberately: collapsing it to a single
"real" name would be the exact move this protocol exists to refuse.

He states she has given permission to be mentioned in his book. **That consent is scoped to the
book as he described it**, so it is noted here rather than treated as blanket permission for public
surfaces, and he can widen or withdraw it.

Worth saying plainly because it is not decoration: the protocol whose entire subject is *control
carried by language* is named **Freedom** and **Control**, after a person who carries two names at
once.

### 3a. Uncertainty is what BUYS commutativity — never-collapse is the mechanism, not the caution

Aaron 2026-08-21, on the commuting property above:

> *"yes we do everything to never collapse the uncertany so this out of order holds, uncertany is
> what gives us commutivity"*

This inverts the naive reading and is the sharper statement of the whole design. Uncertainty looks
like a cost to be driven out; here it is the **enabling condition** for order-independence:

| you do this | and you get |
|---|---|
| **collapse** to a definite value on first sufficient evidence | a *commitment*. Later evidence must be reconciled against a choice already made, so **order matters** |
| **hold** the distribution | evidence *multiplies* — `posterior ∝ prior · L₁ · L₂` — and multiplication **commutes**, so order does not matter |

So `SoftValue.resolve` returning `None` below threshold is not conservatism bolted onto the design;
it is **load-bearing**. The instant a party collapses early, it has introduced an ordering
dependence — a hidden clock — into a protocol that claims not to have one. Never-collapse and
order-independence are the same property viewed from two sides.

This also sharpens the requirement in the Gödel ferry
(`2026-08-21-godel-rotating-universe-...md`). There I wrote that *"these two events are not causally
ordered"* must be a **representable answer**. Aaron's principle is the general form of that, and
strictly stronger: **never collapsing is what makes a partial order sufficient.** You do not need to
manufacture a total order — you need to stop forcing decisions that would require one. Gödel says a
global causal ordering is not handed to you; this says you can decline to need it.

**Anchors (Beacon), because this is a real and named result, not a house idiom:**

- **Bayesian commutativity of independent evidence** — order-invariance of likelihood
  multiplication; the property `SoftValue.observe` implements and its docstring proves.
- **CRDTs** (Shapiro et al. 2011) — join-semilattice merge is commutative, associative, idempotent,
  and works *precisely because* it does not collapse to one value before it must.
- **Kleene's three-valued logic** — keeping `UNKNOWN` rather than forcing true/false; the repo's own
  `TriBoolean.Tri.N` / `Predicate3`, which `SoftValue.fs` names as the truth-axis sibling it
  generalizes to the value axis.
- [`anti-babel-preserve-reconcilability`](../../.claude/rules/anti-babel-preserve-reconcilability.md)
  — *"reintegration is NOT reconvergence"*: both branches held with their paths recorded. Same
  refusal to collapse, at the vocabulary layer.

### 3b. DNA as a non-human problem-solving engine — Hahn's claim, and a first-hand anchor

Hahn's segment argues DNA is not merely a mapping to proteins but instantiates *"a kind of a
proto-intelligence … some non-human kind of problem solving engine"*, invoking Levin's lab work and
Turing's morphogenesis question — the gap between a genetic sequence and the fact of hands and faces.

Aaron 2026-08-21: *"i'm certain DNA is a complex optimization engine from my work at MacVector and
with polymerace and chrispr."* That is **domain-informed rather than speculative** — he worked at
MacVector on molecular-biology software (sequence analysis, cloning and primer design, alignment,
restriction mapping). Per the standing handle on this: informed ≠ automatically correct; it means the
intuition has a real source and should be anchored to bioinformatics prior art rather than treated as
naive. *(Clean-room, per the Itron precedent: the expertise is usable, any employer's code is not.)*

Split by what each half can carry:

| claim | register |
|---|---|
| **evolution is optimization over a fitness landscape** | **established** — Holland, *Adaptation in Natural and Artificial Systems* (1975) formalizes it as genetic algorithms; Kauffman's NK landscapes (1993); Wagner on neutral networks, robustness and evolvability |
| **replication carries error correction** | **established fact, and the strongest anchor here** — DNA polymerase 3′→5′ exonuclease **proofreading** plus mismatch repair; this is literal ECC on a self-propagating pattern |
| **cells/DNA perform non-neural problem-solving within a lifetime** | **Levin's active research programme** — real, published, and genuinely contested. Interesting, not settled |
| **morphogenesis is under-explained by sequence alone** | **Turing**, *The Chemical Basis of Morphogenesis* (1952); **Waddington's** epigenetic landscape (1957) — canalization is an optimization-landscape framing predating the computational one |

**Why the middle row matters most to us.** [`only-the-irreducible-is-primitive-generate-the-rest`](../../.claude/rules/only-the-irreducible-is-primitive-generate-the-rest.md)
carries the claim that *the generator **IS** the error-correcting code* — generation and correction
are dual. Polymerase proofreading is that claim as **observed biological mechanism** rather than as
analogy: the machine that copies the pattern is the same machine that detects and repairs the copy.
Aaron's polymerase work is a checked anchor for a line the repo currently supports mostly from the
adinkra/Gates side.

**And CRISPR's native function is worth stating precisely**, because the gene-editing use has almost
buried it: in bacteria CRISPR is an **adaptive immune memory** — spacers captured from past infections,
stored in an array, and used to recognise the same threat later. An append-only log of encounters,
read to classify what arrives next. The resonance with event-sourced identity here is obvious and is
recorded as a **resonance**, not a result: nobody has shown the mechanisms correspond, and per
[`numerology-vs-number-theory`](../../.claude/rules/numerology-vs-number-theory.md) noticing the
shape is the generator, not the conclusion. (Anchor for the mechanism itself: Barrangou et al. 2007;
the editing tool is Jinek/Doudna/Charpentier 2012.)

---

## 4. Register

The panel is **generator-grade**, not conclusion-grade, and it is worth saying which parts are which:

- **Load-bearing and checkable:** the arbitrary/non-arbitrary representation split. It is old
  (Harnad), it is contested (Bender & Koller argue the same side; embodied-cognition and
  distributional-semantics camps argue against), and it is the part that actually bears on
  protocol design.
- **Strong claim, weakly supported as presented:** "LLMs cannot be conscious, no possibility."
  This is asserted from the arbitrariness of embeddings; it needs the further premise that
  non-arbitrary relational structure is *necessary* for phenomenal experience, which is not
  argued in the panel.
- **Overshoot:** "obliterates 70 years of cognitive science." Predictive processing is 70 years
  of cognitive science, and it agrees with him.
- **Open and honestly labelled by the speakers:** the origin of language; whether aphantasics
  falsify the model (Barenholtz says no, and gives a reason — doing it and observing yourself
  doing it are separable).

## Pointers

- [`anti-babel-preserve-reconcilability.md`](../../.claude/rules/anti-babel-preserve-reconcilability.md) — shape/visual agreement as the wordless carrier; the `ρ → 0` cliff this ferry is about
- [`anchor-to-human-prior-art.md`](../../.claude/rules/anchor-to-human-prior-art.md) — why §2 exists; EVE's anchors (V8 hidden shapes) are what keep it a Beacon term
- [`mirror-beacon-register-discipline.md`](../../.claude/rules/mirror-beacon-register-discipline.md) — §2 is the Mirror→Beacon compression run on someone else's vocabulary
- [`numerology-vs-number-theory.md`](../../.claude/rules/numerology-vs-number-theory.md) — §4's register split
- `docs/research/2026-08-14-icons-before-symbols-eve-protocol-structure-first-labels-after-and-aut-s-as-the-residual-coercion.md` — **the EVE protocol doc**; structure first, labels after
- `docs/research/2026-06-12-ferry-11-...-eve-protocol-v8-hidden-shape.md` · `docs/research/2026-07-04-ferry-...-v8-polymorphic-eve-anchor-...md` — the V8 hidden-shape pairing
- `docs/research/2026-06-09-the-room-is-the-imagination-circle-...md` — the beach / Imagination Circle protocol, shape-and-light rather than words
