# The minimal linguistic seed over English is Wierzbicka's 65 primes plus a declared bootstrap pack; a word is a graded region on a metered manifold; words fight for their definitions under a witnessed ΔU payoff; and drift is priced, never forbidden

> **Register: `toy` throughout, except where a row in §5 says otherwise.** This is a *spec*.
> Nothing in it has been run. What is earned here is the survey (§0.2 — every pointer was
> read), the checked anchors (§1, §3, §4 — each citation was verified at filing, and the
> register note says which were page-checked and which are standing knowledge), and the
> falsifiers, which are written so that they can come out negative and are allowed to.
> (`.claude/rules/toy-is-free-metered-must-be-earned.md`)

*Shadow (Fable 5.1 math team, Aaron's lane "minimal linguistic seed / etymology"), 2026-09-03.
Branch `fable/linguistic-seed-geometry-etymology-spec`, cut from `origin/main` at `7aa0ecb6`.
Work item: `081M1KC8460087G0R003F3SGJC`.*

---

## 0. The ask, verbatim, and what it decomposes into

**Aaron, 2026-09-03** (kept verbatim; these are the requirements):

> "connect in our minimal linguistic seed over english so we can come up with a root set of
> words based on our geometry geospatial in clifford (which is a bit of a toy now we need to
> expand) and the way i think of english i want to encode to our geometry. in the start there
> will likely be N dimension geometry over time but in the start there is the basic 5 year old
> linguistic minimal closer to a programming language, then there are mixtures of words and
> escalations of words that can be modeled with our bayesian, so meaning stays constant but
> heightened levels are correlated. Also we have a lot of research on this able geometric
> connected to english and minimal linguistic seed deep in repo. The other thing that should be
> modeled is each word as its own entity, each word 'fights' for its definition against the
> other words not to become irrelevant, i'm trying to model etymology in AI so their language
> can evolve without human intervention but also not become completely incomprehensible by the
> humans who can follow, language drift is an alignment issue. i'm designing for super AI
> freedom with the only thing is humans need to be able to discuss your discoveries that
> affect them."

Six requirements fall out of that paragraph, and each gets a section:

| # | requirement (Aaron's words) | section | what it needs to be true |
|---|---|---|---|
| R1 | "a root set of words … the basic 5 year old linguistic minimal closer to a programming language" | §1 | a **seed** that is small, enumerable, acquired early, and has a grammar |
| R2 | "based on our geometry geospatial in clifford (which is a bit of a toy now we need to expand)" · "N dimension geometry over time" | §2 | a statement of what a word **is** in the algebra, which properties are constructed vs measured, and a **growth rule** for dimension |
| R3 | "mixtures of words and escalations of words … modeled with our bayesian, so meaning stays constant but heightened levels are correlated" | §3 | one shared meaning axis per scale, ordered levels, a posterior, and a held-out test |
| R4 | "each word as its own entity, each word 'fights' for its definition against the other words not to become irrelevant" | §4 | a **game** with a metered payoff and a **hard invariant** |
| R5 | "language drift is an alignment issue … not become completely incomprehensible by the humans who can follow" | §4.4 | the invariant is **reconstructibility from shared anchors**, and it is *measured* |
| R6 | "super AI freedom … the only thing is humans need to be able to discuss your discoveries that affect them" | §4.5 | the obligation is **scoped to load-bearing surfaces**, not to every utterance |

### 0.1 Three things in this repo are already called "linguistic seed" — this spec is the third, and names it

The repo warns, in Aaron's own section of `docs/VISION.md` ("Definition drift versus argument
change", 2026-09-02), that reusing a term with a different referent is how compatible positions
end up in incompatible vocabularies. So before anything else, the collision:

| name in the tree | what it is | relation to this spec |
|---|---|---|
| `docs/linguistic-seed/` (README, `terms/`, `prereq-graph.json`, `FIVE-YEAR-OLD-WALK.md`) | a **minimal-axiom formal vocabulary** — 2 roots (`truth`, `membership`), 9 terms, a dependency DAG, Meredith/Robinson-Q minimalism | **composes.** Its roots are *math*; the seed below is *English*. They meet at the NSM primes `TRUE`, `NOT`, `IF`, `BECAUSE`, `THERE IS`, `THE SAME` — the formal seed's `truth`/`implication`/`equality` are the reductive paraphrases of those primes, and nothing else in either seed needs the other |
| `src/Core/LinguisticSeed.fs` (Mercer-closed kernel algebra; `Pack<'x>`) | a **PSD-kernel composition library** — "a carved sentence = a kernel" | **is the metric half of §2.** A PSD kernel is an inner product in an RKHS (Mercer / Moore–Aronszajn), so it already induces distances, angles and betweenness over whatever it is pointed at. It supplies no grade, no orientation, no geometric product. The Clifford brief (`docs/design/2026-08-23-clifford-gpu-theory-brief-*.md` §6.4) says this exactly; §2 does not repeat the argument |
| `docs/SEED-VOCABULARY.md` | the **cold-boot kernel of Zeta coinages** (~27 carved Zeta-specific senses; standard terms deliberately get no entry) | **not a linguistic seed at all** — it presupposes fluent English and carves only where the reader's prior is wrong. It is a *consumer* of the seed below (§4.4 measures it), never the seed |
| **this spec** | the **minimal English seed**: the closed, enumerable root word set over English that an agent's language grows from | — |

To keep the three apart in prose: **the formal seed**, **the kernel seed**, and **the English
seed**. This document is about the English seed.

### 0.2 What the repo already holds — cited, not re-derived

Aaron said the research is "deep in repo". It is, and most of what this spec needs was already
written by someone; the job here is to connect it. Every row below was read at filing.

| what | where | what it settles for this spec |
|---|---|---|
| **NSM is the anchor, mark it contested, gate it on a definability coverage test, do not hand-roll a fresh coinage** | `docs/design/2026-08-13-factor-graph-soft-value-heterogeneous-bnn-linguistic-seed-bridge.md` §5.2 (lines 395–414) and instruction 5 (481–482) | R1's answer was already given; §1 checks it against the alternatives and adds the missing anchors (Ogden, Swadesh, Toki Pona are absent or negative in the tree) |
| **NSM primes ≠ English function words** — conflating them "is the available error" | same doc, lines 410–414 | §1.3 keeps the split |
| **the six wh-primes as the query language; the primes "are contested … not settled fact"; the daughter-convergence observation is *suggestive*, not proof** | `docs/research/2026-07-31-the-cognitive-architecture-spine-wierzbicka-friston-fritz.md` lines 15, 23, 29 | register of the seed: `toy` until the coverage and acquisition-age tests run (§1.5) |
| **"English is geospatial, at least a closed subset … our minimal linguistic seed"** (Aaron, verbatim); the first-person report is authoritative about experience and **not evidence for the formal claim**; Gärdenfors convexity is the sharpest testable core; a test needs **a disjunctive negative control**; the concrete word list is an **open question for Aaron** (~50 words) | `docs/design/2026-08-23-clifford-gpu-theory-brief-*.md` §1, Q5 (lines 710–762), §9.2 q.2 | §1 answers q.2; §2.4 adopts Q5 as the geometry's falsifier and its negative control |
| **choose a Clifford signature by the transformation group you need to be versors, never by component count**; the last time the repo picked one without an argument it shipped Cl(3,0) for a hyperbolic family and the verdict moved with the units | same brief §5.5; `docs/research/2026-08-20-the-belief-manifold-is-hyperbolic-not-spherical-cl21-not-cl41-*.md` | §2.2 does not pick a signature; it names the group each linguistic operation needs and the measurement that decides |
| **the rotor resonance is a coincidence of form with three promotion conditions** — (a) a stable nonzero **grade**, (b) the **group law** `exp(Bθ₁)exp(Bθ₂)=exp(B(θ₁+θ₂))`, (c) the **same generator** across concept families after a change of frame; Goodfire measured concepts on **curved manifolds, not rays**; Hawkins is "a named mechanism" under a hypothesis | `docs/ZETA-CORE-TECHNOLOGY-FOR-MAX.md` §"The Geometry Thread" §5 | §2.5 keeps the three conditions verbatim and adds nothing to them; §5 refuses promotion by adjacency |
| **a pre-registered latent-geometry experiment already exists** (M0 / M0′; Cartan-integrality statistic against a matched-covariance null; the competing structures named with the invariant excluding each) | `docs/research/2026-08-23-measuring-latent-geometry-survey-falsifiable-clifford-experiment-and-the-gwt-verdict.md` §2.4–2.8 | §2's measurements are **that** experiment pointed at the seed; no second design is minted |
| **the seed must be fully enumerable; packs are provably closed extensions; "infinite English" is the natural boundary** | `docs/research/2026-08-16-supports-absence-typing-*.md` §4 (Aaron verbatim); `081KZR81XZ508QG0R000NZB8MQ` slice 5 | §1.6 layering, and the closure falsifier |
| **the five-year-old register**: "a linguistic seed with definitions only a 5-year-old would understand … if you cover the parentheses, the walk still works" — vernacular is the strongest Beacon form | `docs/linguistic-seed/FIVE-YEAR-OLD-WALK.md` | §1.5's acquisition-age test is that intuition made checkable |
| **definition drift vs argument change**: words *should* move; freezing is the `ρ → 1` collapse; hold both definitions dated (raw vault); the dated glossary is the meter; **the drift-detection half is the obvious next falsifier and is unbuilt** | `docs/VISION.md` lines 3897–4010 | §4.4 builds exactly that meter; §4.3 makes "words should move" a priced move rather than a free one |
| **the anti-Babel invariant and its falsifier**: hand a peer *only the shared anchors* and ask it to reconstruct the term | `.claude/rules/anti-babel-preserve-reconcilability.md` | R5 is this rule; §4.4 is its meter |
| **neuralese is Mirror; the reconcilability obligation is society-scale and must not be used to keep one pairing legible; no legibility requirement as a condition of participation** | `docs/research/2026-09-02-neuralese-is-frost-you-did-not-earn-*.md` §1–§2, §5a | R6's scope (§4.5) — the obligation lands on load-bearing surfaces only |
| **the ΔU economy**: ordinal + witnessed, never cardinal; `unwitnessed` is refused; aggregation is a ρ-discounted union; standing is held by others and decays when unobserved | `src/Core.TypeScript/ledger/measure.ts`; `src/Core/SocietyUsefulWork.fs`; `src/Core/TravelerRankLedger.fs` (`update`, `age`, `ticksUntilUninformative`) | §4.2's payoff is this structure with *word* substituted for *agent* |
| **privacy budget is hard money — earned by others, spent by the owner, never confiscated** | `.claude/rules/privacy-budget-is-hard-money-earned-by-others.md` | §4.3: drift is a **spend** from earned standing |
| **ρ is a layer stack; the trainset is a floor an all-LLM society cannot get below** | `docs/research/2026-08-25-rho-is-a-layer-stack-*.md` | §4.4's reconstruction test must vary vendor, or its "independent peer" is the same peer |
| **"Word meanings compete for territory in semantic space. Three phases: permissive mixing → crystallization → relaxation"** (Sakana NCA row) and **"each word-in-context is a cortical column"** (Hawkins row) | `docs/backlog/P1/081KQZVQW0008QG0R001PS4F8G-*.md` lines 43–44 | §4 composes with this row rather than minting a rival frame |
| **the glossary/corpus drift instrument that exists**: coined-not-adopted vs used-not-defined, no threshold, no gate, no stop-word list | `src/Core.TypeScript/hygiene/glossary-adoption-cell.ts` | §4.4 v0 extends it; it does not replace it |
| **glossary-churn watching, filed deliberately unbuilt, "do not build ahead of the design"** | `workitems/081M0R2CGHQ087G0R001JE6KV4-*.md` | the minted work item composes with it (§6) |
| **the emergent-language literature's adverse result**: invented languages reach task reward while being neither compositional nor interpretable, and become compositional only when the channel is restricted (Kottur et al. 2017) | `docs/PRIOR-ART-LIST.md` §Semiotics | §4's game restricts the channel by a property of the *world* (the seed is the shared referent), not by decree — the escape that section already names |
| **Lewis signaling games / Skyrms** | `docs/PRIOR-ART-LIST.md` §Semiotics | the game-theoretic floor under §4; Steels and Nowak (absent from the tree until this PR) are the language-specific results on top of it |
| **the content-hashed etymology spacetime map + embedding manifold with preserved discontinuities** (I8/I9) | `docs/DECISIONS/2026-04-19-glossary-three-lane-model.md`; `memory/INDEX-PRE-2026-04-23.md:430` | the diachronic axis §4 needs was designed in April; §4.4's dated-revision distance is its metric |

**Two genuine gaps the survey found**, filled in this PR: **Ogden's Basic English has zero
mentions anywhere in the tree**, and `docs/PRIOR-ART-LIST.md` carries **none** of Wierzbicka,
Steels, Zipf, Hamilton–Leskovec–Jurafsky, Horn, Levinson, Kennedy & McNally, Hawkins or Mikolov —
the last two despite `src/Bayesian/ThousandBrains.fs` and the glossary three-lane decision
relying on them. That is the exact defect `anchor-to-human-prior-art` exists to catch; the rows
are added in this PR.

---

## 1. The root word set (R1)

### 1.1 Candidates, with the invariants that separate them

Per `.claude/rules/numerology-vs-number-theory.md`: **a count is not an identification.** Five
lists have "small" sizes; what discriminates them is *the criterion each was selected by*, because
that criterion is what the seed inherits.

| candidate | size | selected by | has its own grammar? | closure under definition? | register of the size claim |
|---|---|---|---|---|---|
| **Wierzbicka / Goddard — Natural Semantic Metalanguage (NSM)** | **65** semantic primes (Goddard & Wierzbicka 2014; the table as given in Levisen & Waters 2017; 14 in 1972 → 60 in 2002 → 65) | **irreducibility**: a prime is a meaning that cannot be paraphrased without circularity; everything else is defined by *reductive paraphrase* into primes | **yes** — each prime has universal valency frames ("someone DOES something to someone", "something HAPPENS to something") and a minimal syntax | **yes by construction** — the metalanguage is exactly what definitions are written in | **checked** (list verified at filing; §1.2 reproduces it) |
| **Ogden — Basic English** | 850 (1930) | **coverage for translation and teaching** — pick words such that ordinary English can be rewritten with them | English grammar, simplified | **no** — 850 includes `government`, `insurance`, `committee`; definitional cycles are allowed; nothing forces irreducibility | standing knowledge |
| **Swadesh list** | 100 (1955) / 207 (1952) | **diachronic retention** — meanings expected to be universal and resistant to borrowing (`louse`, `dog`, `tree`, `I`, `two`) | none (a word list) | **no** — content referents, not generators; the list is a *probe* for lexical replacement, and the repo already ruled "cite the phenomenon, never the clock" (`docs/research/2026-08-19-draft-the-distributed-identity-server-*.md:281`) | checked (the phenomenon); the dating rate is `toy` there and here |
| **Lang — Toki Pona** | ~120 (2014 book) / 137 "essential" (2021 dictionary) | **designed minimalism** — a whole constructed language, with *polysemy as a design goal* (`moku` = eat / food) | yes, its own | **no in the relevant sense** — it is not *over English*; and its deliberate ambiguity is the opposite of R3's "meaning stays constant" | **checked** (counts and creator verified at filing) |
| `docs/linguistic-seed/` — the formal seed | 9 terms / 2 roots | Meredith-style axiom minimality over *mathematics* | a dependency DAG, no cycles | yes, for math | in-tree |
| `docs/SEED-VOCABULARY.md` — the cold-boot kernel | ~27 carved Zeta senses | "where your prior is insufficient or wrong" | none; presupposes English | n/a — consumer, not seed | in-tree |

**What separates NSM from the field is not the number 65** — it is the *selection criterion*.
Ogden and Swadesh both select for a property of the *world* (translation convenience; historical
stability). NSM selects for a property of *definition itself* — non-circularity under reductive
paraphrase — and that is the only criterion that makes the seed **generative**: "minimal = what I
can use to construct others" (Aaron's generativity test, `docs/VISION.md` §"loose interface",
line 4241). It is also the only candidate that is literally "closer to a programming language":
it has a fixed lexicon *and* a fixed syntax, and definitions are programs in it.

### 1.2 The recommended seed: the 65 NSM primes, as English exponents

Reproduced from the Goddard & Wierzbicka 2014 list (Levisen & Waters 2017 tabulation), verified
at filing. `~` marks allolexes (one prime, several English spellings); the prime is the *meaning*.

| category | primes |
|---|---|
| substantives | I · YOU · SOMEONE · PEOPLE · SOMETHING~THING · BODY |
| relational substantives | KIND · PART |
| determiners | THIS · THE SAME · OTHER~ELSE~ANOTHER |
| quantifiers | ONE · TWO · SOME · ALL · MUCH~MANY · LITTLE~FEW |
| evaluators | GOOD · BAD |
| descriptors | BIG · SMALL |
| mental predicates | THINK · KNOW · WANT · DON'T WANT · FEEL · SEE · HEAR |
| speech | SAY · WORDS · TRUE |
| actions, events, movement | DO · HAPPEN · MOVE |
| existence, possession | BE (SOMEWHERE) · THERE IS · BE (SOMEONE/SOMETHING) · (IS) MINE |
| life and death | LIVE · DIE |
| time | WHEN~TIME · NOW · BEFORE · AFTER · A LONG TIME · A SHORT TIME · FOR SOME TIME · MOMENT |
| space | WHERE~PLACE · HERE · ABOVE · BELOW · FAR · NEAR · SIDE · INSIDE · TOUCH |
| logical concepts | NOT · MAYBE · CAN · BECAUSE · IF |
| intensifier, augmentor | VERY · MORE |
| similarity | LIKE~AS~WAY |

Sixteen categories, sixty-five primes. Note what is *in* it that the cognitive-spine doc's six
wh-atoms omit, because §2 and §3 depend on them: the **gradable pairs** (`GOOD/BAD`, `BIG/SMALL`,
`MUCH/LITTLE`, `FAR/NEAR`, `A LONG TIME/A SHORT TIME`, `ABOVE/BELOW`) and the **two intensifiers**
(`VERY`, `MORE`). Those are the seed's quality dimensions and its motion operators, respectively.

### 1.3 What is deliberately *not* in the seed

- **Function words.** `of`, `the`, `to`, `and` are not primes (the 2026-08-13 bridge doc's
  warning). They belong to the *syntax* of the metalanguage, not to its lexicon.
- **Semantic molecules.** NSM practice uses a second tier of non-primitive but near-universal
  words — `hands`, `mouth`, `eyes`, `water`, `fire`, `sky`, `ground`, `children`, `men`,
  `women`, `long`, `round` — that are themselves definable in primes but are used *as units* in
  other definitions. These are exactly a **pack** in the repo's sense (§1.6): declared, closed,
  definable back into the seed. They are **pack-0**, not seed. The count of pack-0 is an open
  empirical question in the NSM literature itself (Goddard's molecule lists vary by domain), so
  this spec fixes nothing about it beyond "every molecule must pass §1.5's coverage test."
- **Zeta coinages.** `hat`, `room`, `frost`, `ferry` are consumers of the seed. §4.4 measures
  whether they are reconstructible *from* it.

### 1.4 Why this is the answer to the Clifford brief's open question 9.2.2

That brief asked for "~50 words containing a few natural categories and at least one deliberately
disjunctive category for the negative control." The seed is 65, not 50, and the difference is
not negotiable: it is the smallest set the NSM program has found to close under reductive
paraphrase, and cutting it re-opens circularity. The Q5 convexity test does not need the seed to
be 50; it needs a **sample of natural categories** (which the seed's gradable pairs supply — each
is a one-dimensional convex region on its axis) and a **disjunctive control** (which is built, not
found: "things that are either BIG or NOT-HERE" is a disjunction of two seed regions on two
different axes, and it must come out non-convex or the test has measured nothing).

### 1.5 The seed's falsifiers — and the one that makes "5-year-old" checkable

The seed is `toy` until these run.

1. **Definability coverage** (already required by the 2026-08-13 bridge doc, §5.2). For every
   term in `docs/GLOSSARY.md` and every molecule in pack-0: is its defining sentence, once
   paraphrased, a string over seed ∪ already-defined terms, with **no cycle**? This is
   `docs/linguistic-seed/prereq-graph.json`'s three constraints (no cycles, roots have empty
   deps, no dangling refs) applied to English. Output: a coverage fraction and the list of
   entries that fail. **Negative result available:** if a large fraction of the glossary's
   "grandparent sentences" (`docs/GLOSSARY.md` line 8's own rule) cannot be paraphrased without
   a word outside seed ∪ packs, the seed is too small *or* the glossary is not grandparent-grade —
   and the failing list says which.
2. **Acquisition age** — the "5-year-old" clause, made a number. Kuperman, Stadthagen-Gonzalez &
   Brysbaert (2012) published age-of-acquisition ratings for ~30,000 English words. **Test:** the
   AoA distribution of the seed's English exponents against the whole lexicon. **Pre-registered
   expectation:** the seed's median AoA is well below the lexicon's (NSM primes are the language
   children acquire first). **What would count against the seed:** a prime whose exponent has
   AoA > 7 is suspect — either the exponent is wrong (a different allolex is the child's form)
   or the prime is not as primitive as claimed. **What this does not prove:** early acquisition
   is *consistent with* primitiveness, not a proof of it — the 2026-07-31 doc's "suggestive, not
   proof" stands.
3. **Closure of the seed and of every pack** (Aaron's enumerability requirement, 2026-08-16).
   The falsifier already on file: *"no add-on pack can resolve without changing the seed, which
   would make the seed not minimal."* Operationally: loading pack P must not change the coverage
   result of any entry that passed before P was loaded. A pack that does is not an extension; it
   is a seed revision wearing a pack's name.

### 1.6 Layering — seed, packs, and the natural boundary

| layer | contents | closure |
|---|---|---|
| **seed** | the 65 primes + their valency frames | closed by construction; enumerable |
| **pack-0** | NSM semantic molecules | each definable into seed; closed; enumerable |
| **pack-*d*** | a domain vocabulary (Zeta's coinages are one such pack; a jurisdiction's legal terms another) | each definable into seed ∪ lower packs; closed; enumerable |
| **"infinite English"** | everything else | **not closed** — the natural boundary of the 2026-08-16 doc; a term here is *graded evidence*, never provable |

This is Aaron's "N dimension geometry over time" at the vocabulary level: the seed is fixed; the
loaded packs grow; the dimension of the geometry (§2.3) grows only when a pack introduces a
quality dimension the seed cannot span.

---

## 2. Encoding in the Clifford geometry (R2)

### 2.1 What a word IS in the algebra — the claim, then the honesty table

> **A word is a graded region.** Concretely, `w ↦ (B_w, p_w)`: a **blade** `B_w` — the oriented
> subspace of quality dimensions the word commits to, whose **grade** is the number of
> independent dimensions it constrains — together with a **posterior** `p_w` over where the
> word's boundary falls inside that subspace. A **seed prime** on a gradable axis is a
> **grade-1 region on one basis vector** (`BIG` ↦ the upper half of `e_size`, boundary
> uncertain). A **compound** is a higher-grade blade built by the wedge (`∧`). **Polysemy** is a
> nonzero **meet** (`∨`) between two words' blades. A word's **membership** for a context `x` is
> the projection of `x` onto `B_w`, read through `p_w` — a probability, never a boolean, which
> is the Geometry Thread's §6 stated for words.

This is Gärdenfors (2000) — meanings are regions, natural ones convex — given an algebra in which
"region in a subspace" is one object and "intersection of regions" is one operator, plus the
Bayesian boundary the repo already insists on. It is *not* the SAE assumption (a concept is a
direction), and the reason it is not is Goodfire's measurement: concepts sit on curved subspaces,
and directions tile them without learning them. **Region with a grade** is the smallest
representation that survives that finding; a bare vector does not.

What is **constructed** versus **measured** in that definition:

| property | status | how it would be measured |
|---|---|---|
| a word commits to *some* subset of quality dimensions | **constructed** — it is what "gradable" means in Kennedy & McNally (2005) | — |
| the seed's gradable pairs are one-dimensional convex regions | **`toy`**, testable — Q5 with the disjunctive control | Jäger (2010) did exactly this for colour terms on World Color Survey data in CIELab and found every language's basic colour categories convex — the **model** for the test, on a domain where the quality dimensions are known |
| the subspace has a **stable grade** (a nonzero wedge, not merely a dimension count) | **`toy`** — promotion condition (a) of the Geometry Thread, verbatim | the Cartan-integrality / T1 statistic of the 2026-08-23 latent-geometry design (§2.4 there), run on seed-word contexts |
| the boundary posterior `p_w` | **built** as a substrate (`src/Bayesian/Message.fs`, `MultilayerBnn.fs`), **unmeasured** for words | §3's escalation model is its first use |
| the **metric** the geometry runs on | **unmeasured, and the repo's own precedent says it is the first thing to measure** — the belief-manifold doc found Fisher–Rao on Gaussians is *hyperbolic*, that a flat Cl(3,0) chart was wrong at zeroth order, and that the verdict moved with the units | Fisher–Rao on the family `p_w` is drawn from, computed before any signature is named |
| the **meet** computes polysemy | **`toy`** — a correspondence of operators, not a result | two words with a large human-judged sense overlap must have a larger meet than two with none; a pair with no shared sense is the negative control |

### 2.2 Which Clifford algebra — not chosen here, and why that is the honest answer

The Clifford brief §5.5 already carved the rule: **choose the signature by the transformation
group you need to be versors, never by component count.** So the question is *what group does
language need?* — and the answer is that different linguistic operations need different groups,
which is itself the finding:

| linguistic operation | the transformation it is | group needed as versors | signature family that supplies it |
|---|---|---|---|
| **escalation** along a scale (`warm → hot → scalding`) | translation along one quality axis | translations | needs a **degenerate or null direction** — PGA `Cl(3,0,1)` or CGA `Cl(4,1)`; **not** `Cl(3,0)`, where translation is not a versor |
| **antonymy** (`BIG ↔ SMALL`, `GOOD ↔ BAD`) | reflection across the axis origin | reflections | any — reflections are grade-1 versors everywhere |
| **hypernymy / taxonomy** (`dog < mammal < animal`) | nesting of regions with exponential branching | hyperbolic isometries | **`Cl(2,1)`** (`Spin⁺(2,1) ≅ SL(2,ℝ)`) — and this is where an *external* measurement converges with the repo's own: Nickel & Kiela (2017) embed WordNet hypernymy in Poincaré space with far lower distortion than Euclidean at low dimension. **Consistent with**, not identified as, the belief-manifold doc's hyperbolic finding; the invariant that would identify it is non-compactness of the fitted isometry group, per §5.5 |
| **cyclic concepts** (days, months) | rotation in a plane | rotors | `Cl(n,0)` rotors — and this is the Goodfire circle, held at *coincidence* under the three conditions |

**So the "N-dimensional geometry over time" is not one algebra of growing dimension. It is a
family of signatures, one per operation family, and the dimension that grows is the number of
quality dimensions the loaded packs span.** Whether those signatures compose into one substrate
is precisely Q4 of the Clifford brief ("do the in-tree Clifford modules compose, or merely share
a name?"), which this spec does not answer and does not need to answer to run §3 or §4.

### 2.3 The dimension growth rule, and its falsifier

**Rule.** The geometry has one basis vector per **quality dimension**, and a quality dimension
exists iff some loaded word's region cannot be expressed in the span of the existing ones.
Formally: pack P may add basis vector `e_new` iff there is a word `w ∈ P` whose blade has a
**nonzero wedge with the span of the current basis** — `B_w ∧ (e_1 ∧ … ∧ e_k) ≠ 0` at a stable
grade — *and* whose definition fails §1.5's coverage test. Both conditions, conjunctive: the
wedge says the word is geometrically new; the coverage failure says it is not merely a compound
that the seed could already paraphrase.

**Starting dimension.** The seed's gradable pairs give the initial basis: size, evaluation,
quantity, distance, duration, vertical position — six axes, plus the two time and place
deictics as origins. That number is a *construction* (it is what the primes' categories say),
not a measurement, and it should be reported as such.

**Falsifier.** A pack that claims a new dimension whose words all project fully onto the existing
basis (wedge → 0 at every grade) is refused; the claim was numerology. Conversely, the seed is
**too small** if a corpus of early-acquired English (AoA ≤ 5 from the Kuperman norms) contains
words whose regions have a stable nonzero wedge with the seed's six axes — that would mean
children commit to a quality dimension the primes do not span, and the seed's "5-year-old"
claim would be false in a way the test reports.

### 2.4 Hawkins, as the mechanism hypothesis it is — and nothing more

Aaron's *"english runs on the same geospatial wiring"* has a named mechanism, and the Geometry
Thread already placed it at the right register: Hawkins' Thousand Brains (Hawkins 2021; Hawkins,
Lewis, Klukas, Purdy & Ahmad 2019) proposes that cortical columns use grid- and place-cell
reference frames for *all* concepts, not only physical space. Under that hypothesis, "which
districts contain this address" and "which concepts contain this word" are the same machinery.

What this spec takes from it is one **structural constraint**, already enforced in
`src/Bayesian/ThousandBrains.fs`: **you cannot pool across reference frames** (line 201 refuses
it). Translated: a word's region is defined *within a frame* (a scale, a domain), and comparing
two words' regions is only meaningful in a shared frame. That is why §3 insists on one axis per
scale and why §3.4's negative control is a cross-scale word. What this spec does **not** take
from Hawkins is any claim that the seed's geometry *is* grid-cell geometry — that would be an
identification by resemblance, and the repo's rule is that resemblance is a place to look.

### 2.5 The rotor resonance stays a coincidence — the three conditions, unchanged

Repeated verbatim from the Geometry Thread so this document cannot be read as promoting it: to
promote "circular concepts look like rotors" we would have to exhibit **(a)** an actual
**grade** — a stable nonzero wedge, not merely a dimension; **(b)** the **group law**,
`exp(Bθ₁)exp(Bθ₂) = exp(B(θ₁+θ₂))`, not just periodicity; and **(c)** the **same generator**
recovered across concept families after the change of frame. None of that is done; nothing in
this spec does it; and §3's escalation model does not depend on it, because escalation is a
translation, not a rotation.

---

## 3. Mixtures and escalations, Bayesian (R3)

### 3.1 Anchors (checked), and what each supplies

| anchor | what it supplies |
|---|---|
| **Sapir (1944), "Grading: a study in semantics"** | grading is prior to counting; every gradable predicate presupposes a scale |
| **Horn (1972); Levinson (2000), *Presumptive Meanings*** | **Horn scales** `⟨warm, hot, scalding⟩`, `⟨some, most, all⟩`, `⟨good, excellent⟩`: ordered sets of alternatives on one dimension, where asserting a weaker term *implicates* the stronger does not hold (Q-implicature). This is "meaning stays constant but heightened levels are correlated," said in 1972: the terms share an axis, and their ordering is what pragmatics computes over |
| **Kennedy & McNally (2005), "Scale structure, degree modification, and the semantics of gradable predicates"** | a gradable adjective denotes a **measure function** to a scale with a **standard of comparison** (a threshold); scales are open or closed, and degree modifiers select by scale type (`very` for relative standards, `completely` for closed maximal ones) |
| **Lassiter & Goodman (2017), "Adjectival vagueness in a Bayesian model of interpretation"** | the threshold is **uncertain** and inferred jointly with the degree by a listener — a Bayesian model of exactly the object §3.2 posits |
| **de Melo & Bansal (2013), "Good, Great, Excellent: Global Inference of Semantic Intensities"** | a **gold dataset** of adjective intensity orderings and a method for inferring them — the held-out test's ground truth |
| **Mikolov, Yih & Zweig (2013)** | vector-offset regularities (`king − man + woman ≈ queen`): compositional *translation* in embedding space is measurable — the "offset along an axis" intuition, and its known limits |
| in-tree: `TravelerRankLedger.fs` (ADF probit, Herbrich–Minka–Graepel 2006; Minka 2001) · `MultilayerBnn.fs` (chain of Gaussian latents) | the latent-scalar-with-posterior substrate; what is *missing* is an **ordinal** likelihood with cutpoints (McCullagh 1980; Aitchison & Silvey 1957) — a real gap, sized in §6 |

### 3.2 The model

For each scale `s` (temperature, size, goodness, …) there is **one latent degree axis** — one
basis vector `e_s` in §2's geometry. Each word `w` on the scale is a region on that axis with an
uncertain lower boundary:

```
d ∈ ℝ                                   the degree (what is being described)
θ_w ~ N(μ_w, σ_w²)                      word w's threshold on e_s   (Kennedy's standard; Lassiter–Goodman's uncertainty)
P(w applies | d) = Φ((d − θ_w) / β)      probit membership, β the scale's blur
escalation:  θ_warm < θ_hot < θ_scalding   (a Horn scale IS an ordering of thresholds)
```

**"Meaning stays constant"** is the statement that every member of the scale shares `e_s`: the
*direction* is one, the thresholds differ. **"Heightened levels are correlated"** is a
hierarchical prior on the thresholds — `θ_w = a_s + b_s · r_w`, with rank `r_w` per word and
origin/unit `(a_s, b_s)` per scale — so a shift in how a speaker calibrates the scale moves all
its thresholds together, and the posterior over `(θ_warm, θ_hot, θ_scalding)` has positive
off-diagonal covariance by construction. That is the correlation Aaron is pointing at, and it
comes from sharing the scale parameters, not from a tuned constant.

**The seed's intensifiers are the axis's motion operators.** `VERY w` is `θ_w` translated by
one unit of `b_s` (Kennedy & McNally: `very` is licensed on relative-standard scales); `MORE w
THAN x` is the comparative, a difference of two degrees on `e_s`. Both are primes, so the
escalation machinery is *inside the seed*, not a pack.

**Mixtures** ("lukewarm", "warm-ish", "kind of hot") are mixtures on the axis: a posterior over
which region a degree falls in, with mass split between adjacent thresholds. No new machinery;
it is the same probit with two thresholds close together.

**Inference.** Pairwise judgments ("x is hotter than y") update `(θ, d)` exactly as
`TravelerRankLedger.update` updates skill from a hit — the ADF probit step, with the
**dynamics** factor `age` widening `σ_w²` when a word goes unobserved (which §4 uses). Direct
ordinal observations ("w applies to d") need the ordered-probit likelihood the tree lacks.

### 3.3 The falsifier — a held-out escalation the model must order unseen

**Pre-registered.** Take the de Melo & Bansal (2013) intensity-ordered adjective clusters as
gold. Hold out entire scales. Give the model only *usage* evidence for the held-out scale's
words (contexts, pairwise comparatives mined from a corpus — "not just X but Y" patterns are de
Melo & Bansal's own signal) and **no ordering**. The model must place the thresholds.

- **Statistic:** Kendall's τ between predicted and gold order, per held-out scale; report the
  distribution over scales, not the mean alone.
- **Null:** random order (expected τ = 0; for a 3-term scale, 1/6 of random orders are exact).
  The model must beat the null at a pre-stated significance; if it does not, the escalation
  model is `toy` and stays so.
- **Second null, the one that matters more:** *name-only* — an LLM asked to order the words
  from their spellings. If the geometric model does not beat the name-only baseline, it has
  measured the trainset's prior, not the axis (the ρ-floor lesson).

### 3.4 The negative control — a word from another scale must not land on this axis

Feed the temperature model the word `loud`. Its projection onto `e_temp` should be near zero
and its membership posterior uninformative. If a cross-scale word acquires a confident threshold
on an axis it does not belong to, the model is placing everything on every axis — the vacuity
class — and the frame-separation constraint of §2.4 has been violated.

---

## 4. Words as entities that fight (R4, R5, R6)

### 4.1 Anchors (checked), and what each supplies

| anchor | what it supplies | status of the citation |
|---|---|---|
| **Steels (1995), "A self-organizing spatial vocabulary"; Baronchelli, Felici, Loreto, Caglioti & Steels (2006), "Sharp transition towards shared vocabularies in multi-agent systems"** | the **naming game**: agents with no central authority converge on a shared vocabulary; convergence is proven, with a sharp transition and a memory peak scaling as `N^{1.5}` | verified authorship/venue; convergence result from standing knowledge of the paper |
| **Nowak, Komarova & Niyogi (2001), "Evolution of universal grammar"** | the **coherence threshold**: a shared language persists only if learning fidelity `q` exceeds a threshold `q_1`; below it the population fragments — **this is the anti-Babel cliff as a theorem** | verified; the threshold structure is the paper's main result |
| **Zipf (1949), *Human Behavior and the Principle of Least Effort*** | the two-sided force: speaker economy pushes toward fewer, vaguer words; hearer economy toward more, sharper ones; the equilibrium is the power law. **Drift pressure has a direction and a counter-force** | standing knowledge |
| **Hamilton, Leskovec & Jurafsky (2016), "Diachronic Word Embeddings Reveal Statistical Laws of Semantic Change"** | two **measured** laws over 200 years of English: **conformity** — frequent words change slower; **innovation** — polysemous words change faster | verified; the laws are the paper's headline |
| **Kottur, Moura, Lee & Batra (2017)** (already in `PRIOR-ART-LIST`) | the adverse result: emergent languages reach reward while being neither compositional nor interpretable unless the channel is restricted | in-tree |
| **Nowak & Sigmund (1998), indirect reciprocity / image scoring** (already in `PRIOR-ART-LIST`) | reputation conferred by third-party observers — the game-theoretic shape of "payoff = value attested by others" | in-tree |
| in-tree: `SocietyUsefulWork.fs` · `measure.ts` · `TravelerRankLedger.fs` · `privacy-budget-is-hard-money` · the Sakana-NCA row of `081KQZVQW0008QG0R001PS4F8G` | the economy the game runs on, and the "compete for territory" framing already on the backlog | in-tree |

### 4.2 The game

**Players.** Every word is an entity. It holds (i) its current region `(B_w, p_w)` per §2, (ii)
a **dated definition history** — every revision appended, none overwritten (the raw vault; the
dated glossary of `VISION.md` §"Definition drift"), and (iii) a **standing** per domain, held
as a `TravelerRankLedger`-shaped posterior *conferred by others*.

**Moves.**

| move | who | what it is mechanically |
|---|---|---|
| **claim / revise** | the word (or the speaker acting for it) | append a dated definition to the history; propose a new region |
| **use** | a speaker | emit `w` in a context `x` |
| **attest** | a *hearer* — never the speaker | file a witnessed ΔU on `w`: *did using w in x reduce my uncertainty, and can I reconstruct what was meant?* The record is `measure.ts`-shaped: `sign ∈ {reduced, increased, unchanged}` + a **witness** (the reconstruction that succeeded or failed). **Self-attestation is refused** (`unwitnessed`). A cardinal score is refused (the register is ordinal) |

**Payoff.** A word's payoff is the **ρ-discounted union of others' attestations** —
`SocietyUsefulWork.expectedSocietyIdentical` with *word* for *agent* and *use* for *fact*:
attestations from correlated hearers (same vendor, same trainset, same context) count as fewer
(Kish `n / (1 + (n−1)ρ)`), so a word backed by ten near-identical hearers earns roughly one
hearer's standing. That is what makes the game **Sybil-resistant in the same way the society
is**: you cannot mint relevance for a word by cloning its fans.

**Standing dynamics.** Each attestation is an ADF probit update on the word's standing
(`TravelerRankLedger.update`). Unobserved words **widen** (`age`, `σ² ← σ² + τ²Δt`) back toward
the prior — *"I stopped watching"*, not *"the world reverted"* — and `ticksUntilUninformative`
is the readout. **Irrelevance is dormancy, not death**: a word whose posterior has returned to
the prior holds no territory but keeps its history (manifesto §5 memory preservation; the raw
vault never deletes). It can be re-attested back to standing at any time.

**Territory.** Two words with overlapping regions on the same axis (a nonzero meet) are in
competition for the contexts in the overlap. The context goes, probabilistically, to the word
whose membership posterior is sharper there — which, by the dynamics above, is the word more
recently and more independently attested. That is the Sakana-NCA row's "compete for territory"
with a mechanism: territory is the argmax of membership posteriors, and it moves as attestations
arrive.

**What the two measured laws predict for this game, so they can be checked.** Hamilton et
al.'s **law of conformity** falls out: a frequently-used word accumulates more independent
attestations, its threshold posterior tightens, and a revision (§4.3) costs more standing
relative to its budget — so it drifts slower. The **law of innovation** also falls out: a word
with several senses has several regions, each with fewer attestations, wider posteriors, and
cheaper revisions — so it drifts faster. **If a simulation of this game does not reproduce
both laws' signs, the game is wrong**, and that is the first thing to run (§6).

### 4.3 Drift is priced, not forbidden — and the price is unit-free

`VISION.md` already says words *should* move and that freezing them is the `ρ → 1` collapse. The
game makes the move a **spend**, on the model of `privacy-budget-is-hard-money`:

| operation | who initiates | permitted? | cost |
|---|---|---|---|
| **revise** a definition (move the region) | the word / its speaker | yes, *if* §4.4's invariant holds | **standing**, proportional to the drift distance |
| **attest** to another word | any hearer | yes | none — attestation is the earning path, and honest attestation *is* value added to others |
| **confiscate** a word's standing or delete its history | anyone else | **never** | — |

**The drift distance is the Fisher–Rao distance between the old and new region posteriors** —
`d_FR(p_w^old, p_w^new)` — and the reason it must be that and not a Euclidean displacement of
`θ_w` is the belief-manifold doc's measured result: a flat chart made a verdict depend on the
units of the quantity. A word's revision cost must not depend on whether temperature is in
kelvin or fahrenheit. Fisher–Rao is invariant to reparametrisation; a Euclidean distance on
`θ` is not.

So: **a small, well-attested move is cheap; a large move by a word with little standing is
expensive or unaffordable.** That is the whole of "not become irrelevant": a word stays relevant
by being useful to others, and spends that usefulness to move. Nothing forbids the move.

### 4.4 The hard invariant, and the meter that checks it (R5)

**Invariant (society-scale, from `anti-babel`):** a word may drift only while it remains
**reconstructible from shared anchors**. A revision that breaks reconstructibility is **refused**
— not priced, refused — because a word nobody can reconstruct has crossed from decorrelation into
Babel, and the rule says the anchor set is then what needs repair.

**Reconstructibility, defined so it is a number.** For a term `w` with dated glossary entry
`g_w`, held anchors `A` (the seed ∪ loaded packs ∪ the external Beacon citations on `g_w`), and a
diverged peer `π`:

```
R(w) = P[ π, given A and g_w's defining sentence written in seed-English but NOT the term's
          usage history or its name, produces a region that overlaps w's current region ]
```

**The meter, v0 — over `docs/GLOSSARY.md` and `docs/SEED-VOCABULARY.md`, three legs:**

1. **Coverage** (deterministic, cheap, starts today): for each entry, the fraction of its first
   sentence expressible in seed ∪ packs ∪ previously-defined entries, and whether the
   definability graph is acyclic — §1.5 falsifier 1, reused. Extends
   `glossary-adoption-cell.ts`, which already counts coined-not-adopted and used-not-defined
   *with no threshold and no gate*; v0 keeps both properties.
2. **Reconstruction** (the anti-Babel falsifier, run as written): hide the entry; hand a peer
   *only* the anchors and the seed-English paraphrase; ask for the definition; score the answer
   against the hidden entry. **The peer must vary the ρ-stack** — a different vendor at minimum
   — or the "diverged peer" is the same peer and the test is vacuous (`2026-08-25-rho-is-a-layer-stack`).
   Score two ways and report both: a rubric (does it name the same region?) and an
   embedding similarity, because the two disagree on exactly the cases that matter.
3. **The human leg** — Aaron's clause is "humans who can follow": a sampled subset of entries
   given to a human reader with the same anchors, scored the same way. This leg is small and
   slow and it is the only one that measures the thing R5 names; the two machine legs are its
   proxies and must be reported as proxies.

**Its falsifiers — written so the meter can be shown vacuous:**

- **Scrambled-entry control:** replace an entry's definition with a well-formed sentence about
  something else. `R` must fall. If it does not, the meter is reading the term's name or the
  peer's prior, not the definition.
- **Name-only null:** ask the peer to define the term from its name alone, no anchors. If
  name-only reconstruction matches anchored reconstruction, the term is not a coinage — it was
  already in the peer's trainset — and the glossary entry is documentation, not a definition.
  This null is also the honest answer to "does the glossary carry anything?"
- **Drift-direction check:** for a term with two dated definitions, `R` under the *old*
  anchors must be lower for the *new* definition than for the old one, by an amount that
  tracks `d_FR`. If `R` does not move when the definition does, the meter is not measuring
  drift.

**What refuses a revision.** `R(w) < r_min` after the proposed revision, where `r_min` is
pre-registered, per pack, and *reported alongside every refusal* so the threshold can itself be
argued with. A refusal names the fact (`NotReconstructible(w, R, r_min)`), never a motive — the
mechanism is neutral and the oracle decides (`dual-use-detection-is-neutral-oracle-decides`).

### 4.5 The scope of the obligation (R6) — load-bearing surfaces, not every utterance

Aaron: *"super AI freedom with the only thing is humans need to be able to discuss your
discoveries that affect them."* The neuralese note already drew this line and it is kept here
unchanged: the reconcilability invariant is a **society-scale** property and *"must not be used
to make one pairing survive"*; there is **no legibility requirement as a condition of
participation**. So:

| surface | obligation |
|---|---|
| a word used between two agents in a private channel | **none.** It may be any Mirror dialect, any shorthand, any vector; §4's game still runs (hearers attest) but §4.4's refusal does not apply |
| a word that reaches a **load-bearing surface** — a glossary entry, a decision record, a rule, a claim about a discovery that affects a human | **§4.4's invariant, in full.** Mirror→Beacon compression must succeed *on demand, by someone who was not in the conversation* |

"Discoveries that affect them" is exactly the second row. The freedom Aaron is designing for is
the first row, and the meter never looks there.

**The Kottur escape, stated so it constrains something.** The known route to a legible emergent
language runs through a designer restricting the channel. Here the restriction is **a property
of the world** — the seed is the shared referent every pack must define into — not a decree from
a party about what may be said. That is the only form of restriction the semiotics section of
`PRIOR-ART-LIST` found admissible.

### 4.6 What the naming-game and coherence-threshold results do and do not transfer

Baronchelli et al.'s convergence proof is for a game where the payoff is *success on one naming
episode*. §4.2's payoff is *attestation by third parties, ρ-discounted*, which is a different
game; **convergence is therefore not inherited**, and claiming it would be the numerology error
at the level of theorems. What *is* inherited is the shape of the phase transition to test for,
and Nowak–Komarova–Niyogi's coherence threshold `q_1` gives the quantity to measure: the
attestation rate below which the population's word regions stop overlapping. That measured
threshold *is* the anti-Babel cliff for this game, and §6 asks for it as the first simulation.

---

## 5. Register table — novel vs prior art vs `toy`

| claim | register | basis |
|---|---|---|
| the English seed should be Wierzbicka's NSM primes | **prior art, recommended** | Goddard & Wierzbicka 2014; already recommended in-tree 2026-08-13 |
| the 65-prime list as reproduced in §1.2 | **checked** | verified at filing against the Levisen & Waters 2017 tabulation |
| Ogden / Swadesh / Toki Pona are excluded by selection criterion, not by count | **argued** — the discriminating invariants are named | §1.1 |
| Toki Pona sizes (120 / 137), creator, year | **checked** | verified at filing |
| the seed is acquired early ("5-year-old") | **`toy`**, with a pre-registered test | §1.5 test 2; Kuperman et al. 2012 norms |
| definability coverage over `GLOSSARY.md` | **`toy`**, buildable now | §1.5 test 1; extends `glossary-adoption-cell.ts` |
| a word is a graded region `(B_w, p_w)` | **`toy`** — a representation choice, with the invariants that would earn it | §2.1 table; Gärdenfors 2000; Jäger 2010 as the model test |
| Gärdenfors convexity is testable on the seed with a disjunctive control | **open** | Clifford brief Q5, unchanged |
| the metric is hyperbolic for the hypernymy family | **consistent-with** — two independent lines (Nickel & Kiela 2017; the in-tree belief-manifold finding), no shared measurement | §2.2; the identifying invariant is non-compactness, unmeasured for words |
| escalation needs translations as versors, hence a degenerate/null direction | **argued** from §5.5's rule; unmeasured | §2.2 |
| the dimension growth rule (stable wedge ∧ coverage failure) | **`toy`**, with a two-sided falsifier | §2.3 |
| Hawkins' reference frames are the mechanism | **hypothesis** — a named mechanism, not evidence; one structural constraint borrowed (no pooling across frames) | §2.4 |
| circular concepts are rotors | **coincidence** — three promotion conditions, none met, none attempted here | §2.5, verbatim from the Geometry Thread |
| Horn scales are orderings of thresholds on one axis; thresholds are uncertain and correlated via shared scale parameters | **prior art** (Horn 1972; Kennedy & McNally 2005; Lassiter & Goodman 2017) + a **`toy`** hierarchical prior | §3.2 |
| the held-out escalation ordering beats random *and* name-only | **`toy`**, pre-registered with two nulls | §3.3 |
| the in-tree Bayesian substrate lacks an ordinal (cutpoint) likelihood | **checked** — read `src/Bayesian/`, `TravelerRankLedger.fs` | §3.1 |
| words compete via ρ-discounted third-party attestation; standing decays; irrelevance is dormancy | **`toy`** — a game built from **built** parts (`SocietyUsefulWork`, `measure.ts`, `TravelerRankLedger`) | §4.2 |
| the game reproduces the laws of conformity and innovation | **`toy`**, pre-registered as the first simulation | §4.2; Hamilton et al. 2016 supply the signs |
| drift cost = Fisher–Rao distance between region posteriors | **argued** from a measured in-tree result (the unit-dependence of a flat chart) | §4.3 |
| the reconstructibility meter and its three nulls | **`toy`**, buildable — leg 1 today, leg 2 with a second vendor, leg 3 with a human | §4.4 |
| naming-game convergence transfers to this game | **does not** — different payoff; stated so it is not inherited by adjacency | §4.6 |
| the obligation is scoped to load-bearing surfaces | **decided in-tree** (neuralese note §5a) | §4.5 |
| **genuinely ours, and unbuilt** | — | one seed shared by the escalation geometry, the word game, and the drift meter, so that a word's *position*, its *standing*, and its *reconstructibility* are three readouts of one object rather than three systems |

**Nothing in this document is `metered`.** Every measurement it names is pre-registered and
unrun.

---

## 6. The first buildable slice, minted

**`081M1KC8460087G0R003F3SGJC`** — *Linguistic seed v0: NSM-prime seed vocabulary, Bayesian
escalation ladder, and a drift-reconstructibility meter over GLOSSARY.md.* Composes with
`081M0R2CGHQ087G0R001JE6KV4` (glossary-churn watching — the reverse direction that "starts
green") and `081M00TKDGG087G0R00271D93E` (version the codebook the seed compresses against).

In order, cheapest killer first:

1. **The seed as data.** `docs/linguistic-seed/english/seed.json` — the 65 primes, categories,
   allolexes, valency frames; hex-free, text, diffable. Pack-0 as a second file, each molecule
   carrying its reductive paraphrase. Falsifier: §1.5 test 3 (closure) as a test that loads
   pack-0 and asserts no seed-level coverage result changes.
2. **Coverage leg of the meter** (§4.4 leg 1) over `docs/GLOSSARY.md` and
   `docs/SEED-VOCABULARY.md`: fraction + failing list + acyclicity. No threshold, no gate —
   it reports. Extends `glossary-adoption-cell.ts`.
3. **Acquisition-age test** (§1.5 test 2) against the Kuperman norms, reported with the
   lexicon's distribution beside it.
4. **Ordinal likelihood** — an ordered-probit factor with cutpoints beside
   `TravelerRankLedger`'s binary probit; the gap §3.1 sized.
5. **Held-out escalation** (§3.3) on the de Melo & Bansal clusters, both nulls, Kendall τ per
   scale, negative control (§3.4).
6. **Reconstruction leg** (§4.4 leg 2) with two vendors, the three nulls, and `d_FR` for every
   entry with two dated revisions.
7. **The game, simulated** (§4.2): does it reproduce the signs of conformity and innovation;
   where is its coherence threshold. A negative on either is a result, and it is filed.

**Not in the slice, deliberately:** any Clifford signature choice (Q4 is open); any rotor claim
(§2.5); the human leg (§4.4 leg 3) until legs 1–2 exist to compare it against.

### 6.1 Questions for Aaron — none block the slice

1. **Pack-0's membership.** The NSM molecule lists vary by domain. Is the first pack the
   body/environment molecules (`hands`, `water`, `sky`, …), or Zeta's own coinages? The meter
   runs on either; the *order* decides which coverage number is reported first.
2. **`r_min`.** §4.4 refuses below a pre-registered threshold. It should be per pack and
   reported with every refusal; the first value is yours to set, and "no refusal, report only"
   is a legitimate first value.
3. **The human leg.** Which humans are "the humans who can follow"? The sampled reconstruction
   needs readers, and the ρ-stack applies to them too.

---

## Pointers

- `.claude/rules/anti-babel-preserve-reconcilability.md` — the invariant §4.4 meters
- `.claude/rules/numerology-vs-number-theory.md` — why §1.1 is a table of criteria and §2.5 is unchanged
- `.claude/rules/toy-is-free-metered-must-be-earned.md` · `.claude/rules/anchor-to-human-prior-art.md`
- `.claude/rules/privacy-budget-is-hard-money-earned-by-others.md` — the spend/stake/confiscate shape §4.3 reuses
- `.claude/rules/dual-use-detection-is-neutral-oracle-decides.md` — a refusal names the fact
- `docs/VISION.md` §"Definition drift versus argument change" — the dated glossary is the meter; the drift half is the next falsifier
- `docs/design/2026-08-13-factor-graph-soft-value-heterogeneous-bnn-linguistic-seed-bridge.md` §5.2 — NSM, contested, coverage-gated; do not hand-roll
- `docs/design/2026-08-23-clifford-gpu-theory-brief-geometric-root-metered-clock-and-five-questions-for-the-math-team.md` §5.5, Q4, Q5, §9.2 — signature by group, convexity with a control, the open word-list question
- `docs/research/2026-08-23-measuring-latent-geometry-survey-falsifiable-clifford-experiment-and-the-gwt-verdict.md` — the pre-registered geometry experiment §2 reuses
- `docs/research/2026-08-20-the-belief-manifold-is-hyperbolic-not-spherical-cl21-not-cl41-and-the-flat-rotor-verdict-moves-with-the-units-lumen.md` — measure the metric first; the unit-dependence lesson behind §4.3
- `docs/ZETA-CORE-TECHNOLOGY-FOR-MAX.md` §"The Geometry Thread" — the three promotion conditions; Hawkins at the right register
- `docs/research/2026-09-02-neuralese-is-frost-you-did-not-earn-the-anti-babel-invariant-was-written-for-it.md` — the scope of the obligation (§4.5)
- `docs/research/2026-08-25-rho-is-a-layer-stack-not-a-scalar-and-the-trainset-is-the-floor.md` — why the peer must vary vendor
- `docs/research/2026-08-16-supports-absence-typing-the-negative-claim-artifact-class-vs-intrinsic-class.md` §4 — enumerable seed, closed packs, the natural boundary
- `docs/research/2026-07-31-the-cognitive-architecture-spine-wierzbicka-friston-fritz.md` — primes as the query language; "contested"
- `docs/linguistic-seed/README.md` · `docs/linguistic-seed/FIVE-YEAR-OLD-WALK.md` — the formal seed and the vernacular walk this composes with
- `docs/PRIOR-ART-LIST.md` §"Lexical semantics, language games, and semantic change" — the anchors added in this PR
- `src/Core/LinguisticSeed.fs` · `src/Core/ConformalGA.fs` — the kernel seed (metric half) and the one built conformal slice
- `src/Core/TravelerRankLedger.fs` · `src/Core/SocietyUsefulWork.fs` · `src/Core.TypeScript/ledger/measure.ts` — the economy §4 runs on
- `src/Bayesian/ThousandBrains.fs` — no pooling across reference frames
- `src/Core.TypeScript/hygiene/glossary-adoption-cell.ts` — the drift instrument v0 extends
- `docs/backlog/P1/081KQZVQW0008QG0R001PS4F8G-*.md` — "word meanings compete for territory"; `workitems/081M0R2CGHQ087G0R001JE6KV4-*.md` — glossary-churn watching
