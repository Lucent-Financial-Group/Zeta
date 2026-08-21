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

**The name.** Aaron 2026-08-21: EVE is named for his daughter — *"Lillith (Freedom) Eve
(Control)"* — and he states she has given permission to be mentioned in his book. Recorded because
he volunteered it as the naming lineage; **the consent he described is scoped to the book**, so it
is noted here rather than treated as blanket permission for public surfaces, and he can widen or
withdraw it. Two flags for him rather than silent edits: the in-repo memory hub records the name as
*"Lillian Eve"*, which disagrees with what he wrote today; and the name is doing real work — a
protocol whose whole subject is control embedded in language, named for Freedom and Control.

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
