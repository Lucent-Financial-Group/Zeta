---
name: otto-aaron-chaubard-ai-club-talk-ip-questionable-hold
description: "Aaron streamed François Chaubard's AI-club talk transcript + an attention recurrent-forms table screenshot (\"Wall (ours)\"); flagged IP as questionable — hold internal (Mirror), do NOT publish as ours (Beacon)"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-15. Aaron streamed a YouTube talk transcript (François Chaubard's AI
reading club) covering five vignettes, plus an image: a comparison table of
attention/linear-recurrent forms (Softmax, RoPE, Linear, Mamba2, GLA, Gated
DeltaNet, FoX, RWKV-7, KDA, **"Wall (ours)"**), captioned "Adapted from Kimi
Linear (KDA)." His note: **"save in ip questionable, also what's next?"**

**The IP caution is load-bearing.** Aaron clarified 2026-06-15: **the math/slides
are François Chaubard's, presented via Y Combinator** — the "Wall (ours)" row is
*Chaubard's* "ours" (his lab's method), NOT Aaron's and NOT Zeta's. "Mine is his"
= the thing that could read as mine is actually his. The transcript is his club.
None of it is ours. This makes the hold *firmer*: it is explicitly someone else's
published-talk work. So this is **Mirror only** (internal, fast, uncited) — it must
NOT be ferried to `docs/` as a coinage. The Beacon rule
([[anchor-to-human-prior-art]]) is exactly the discriminator: if we ever surface
any of this outward, it goes in as **cited external prior art with the named
human**, never as Zeta novelty. When Aaron flags IP, the default flips from
"auto-ferry" to "hold + confirm scope" — the decorrelated critic applies to my
own ferry reflex.

**The principle (Aaron 2026-06-15):** *"we can copy math if it fits but give
credit where credit is due — these KV optimizations are where a lot of the money
is at in AI."* Copy-with-credit = the Beacon rule. **Precondition: a creditable
*public* source must exist** — published (arXiv; the table's cited origins like
Kimi Linear / KDA) ⇒ copy + cite; Chaubard's unpublished "Wall (ours)" ⇒ no
citation to give yet ⇒ **hold, don't copy**. The IP flag and the copy-with-credit
rule are the same rule with publication-state flipped. Two peels on "where the
money is": (1) the *money* is in the **systems** (fused kernels, serving stack,
hardware co-design), not the equation — math copies, engineering is the spend;
(2) KV-cache is the dominant **inference-time** cost (O(n) memory/bandwidth in
context), so the linear-recurrent family = one bet: collapse growing KV → O(1)
state = serving margin.

**Metering tie (Aaron 2026-06-15: "intelligence per watt/sample — this is what
we are looking to meter").** intelligence-per-sample / -per-watt are *metered
efficiency ratios* = value / metered-resource — the exact shape of our metering
discipline. Denominator already exists: **noninterference §13** meters every
crossing at the membrane → the ledger. Numerator candidate: **ΔU banked**
([[every-bug-has-economic-value]]) → intelligence-per-sample ≈ ΔU/measurement
(close to in-reach; `db/uncertainty/` is already that shape), intelligence-per-watt
≈ ΔU/joule (aspirational — we meter ΔU + crossings, NOT joules; needs energy
instrumentation; Landauer kT·ln2/bit + Koomey's law are the physical anchors).
Seam: "intelligence = ΔU" is similar-not-same (§B conjecture), and Chaubard
proxies intelligence by downstream task perf, not an information measure.

**Aaron's synthesis (2026-06-15, streamed):**
- *"What we are building is more alpha-zero — very little human priors."* Precise
  form: **minimal content/imitation prior, deliberate structural prior** — exactly
  AlphaZero (threw away human game records, kept the rules of Go). We generate from
  the irreducible (no human corpus to imitate) but the 13 specs + free-object
  generator ARE given priors. Tension with [[anchor-to-human-prior-art]] resolves:
  we anchor *claims* to humans for credit+checkability (Beacon); we don't *train on*
  human content. Two different "priors."
- *"grow from irreducible uncertainty; the 0 and 1 adinkras are base generators
  that grow; like bigfloat autogrow."* Spine = discharged §A
  ([[only-the-irreducible-is-primitive-generate-the-rest]]; adinkra→Cayley-Dickson
  doubling R→C→H→O, gen(gen)=gen). **Two distinct growth axes** (similar-not-same):
  adinkra/CD grows *structure* (algebra dim); bigfloat grows *numeric precision*.
  Shared kernel = **materialize only what the irreducible demands** (lazy, on-need
  = holographic/lensable bounded-resource). **CORRECTION (Otto was wrong; Aaron:
  "we had this for sure, look better — UniversalNumber, that's ours"):** the
  autogrow-precision number type **EXISTS** — `src/Core/UniversalNumber.fs`, a PORT
  `IUniversalNumber<'T>` (hexagonal/Cockburn) carrying Add/Mul **plus resolution
  accounting** (`BitsUsed`/`IsExact`); bigint adapter (exact) + the **TriBoolean
  middle-out Float = the arbitrary-precision BigFloat adapter** (lineage:
  `docs/research/2026-06-11-...universalnumber-is-our-bigint.md`,
  `...2026-06-10-...bigfloat-holds-superposition.md`, `physics-of-floats...unum-significance.md`).
  My first `rg` was too narrow (missed "UniversalNumber" = Gustafson's *unum* /
  "universal number"); confabulated a gap from a bad search — lesson: search
  prior-art names, not just generic terms. **The REAL buildable (Aaron's combine):
  "bigfloat + ECC over its growth data = ECC Bayesian memory growth, if you combine
  the two types"** — protect/drift-correct the autogrow precision-bits with the
  adinkra/CD generator (the generator IS the ECC), precision growing Bayesian-style
  with evidence. NOT build-the-number (exists); COMBINE the two existing pieces.
- *"they are talking about BERT over proteins ACTG."* **Correction:** proteins = 20
  amino acids, NOT ACTG (DNA's 4 nucleotides); ESM is masked-LM over the 20-aa
  alphabet (metagenomic data sequenced from DNA, model tokenizes amino acids) —
  consistent with Aaron's own "DNA/ACTG is metaphor" note. Validated alphabet-
  agnostic pattern: **masked-prediction over a small discrete alphabet → emergent
  higher structure** (ESM: protein structure + clean unsupervised SAE hierarchy) =
  our §B "each hat = its own BERT" / correlation-as-geometry row + generate-from-
  irreducible. ESM's 20-letter base ↔ our 0/1 adinkra codewords: small irreducible
  alphabet → masked growth → emergent structure. Same shape, different alphabet.

**The overarching goal (Aaron 2026-06-15):** all these structures (generator chain
CD/adinkra→Clifford `Cl3.fs`→E8 `E8Lattice.fs`, UniversalNumber, the metering
vector) are *"just more shapes we map to human labels with SoftValue/Bayesian
inference"*; the goal is to render cutting-edge math/physics as **pictures +
5-year-old talk** = the Feynman / vernacular-as-Beacon test
([[user_aaron_can_now_explain_his_shapes_in_common_vernacular_the_real_beacon_test_2026_06_10]],
[[user_aaron_feynman_is_the_root_anchor_technique_and_sees_feynman_diagrams_of_distributed_systems]]).
Already carved for braids (register row 371 §9 — Bruner enactive/iconic/symbolic,
Paivio dual-coding, producer-side persona-coverage NOT consumer learner-typing;
learning-styles meshing debunked Pashler/Willingham/Kirschner). Two peels:
(1) shape→label via SoftValue is the right mechanism but an **unbuilt application**
(SoftValue = a confidence primitive; the Eve/DynamicValue recognizer is the
candidate, not yet wired to these math shapes); (2) 5-yo pictures lower the
**floor** (one shared entry-object), NOT the **summit** (E8/SUSY mastery still
prerequisite-gated) — "universal interface" = one shared entry-object, not
one-size-fits-all mastery.

**Backlog home for shape→label (found 2026-06-15; Aaron: "CS/value-tree based not
english, we have backlog around a freer structure to learn from"):** the
**Structure Recognizer** cluster — **B-0240** (shape-indexed catalog that
distinguishes structures WITHOUT labels), **B-0244** (English concordance AI =
structure recognizer applied to language), B-0277/B-0276/B-0292
(catalog/fingerprint/local-GPU inference). That is where "move shape→label forward"
lands: recognize by *shape* first (CS/value-tree), attach human labels via
SoftValue/Bayesian as a confidence-weighted second step.

**Rotation memory-maps, written in Rx (Aaron 2026-06-15):** chains ship
**memory-maps between them, written in Rx** (reactive transforms over the ZSet =
the "what acts" face, register rows 370/371). The map IS the §5
regeneration/migration path that keeps rotation from orphaning memory; a
high-quality chain ⇒ a high-quality (low-loss) map. Seams: map *quality* (lossless
vs approximate — what's preserved); N chains = O(N²) pairwise maps OR O(N) routed
through the canonical pivot; and the Rx transform must be structure-**preserving**
(the Majorana-braid faithfulness question), not merely composable.

**The anchorable kernels that genuinely touch our substrate** (named humans, so
Beacon-safe IF cited):

1. **Alpha-Go (human-anchored / correlated) vs Alpha-Zero (decorrelated /
   unbounded)** — Chaubard: training on the human subspace H bounds you to a
   typical set; no feasible test-time compute samples F∖H. This IS the
   decorrelated-critic thread (cold-boot, different-model/human lenses) and the
   §B decorrelated-selection loop (commit 6a507fa). Decorrelate from human
   priors = alpha-zero.
2. **Selfplay plateaus → self-guidance** (Luke Bailey + Tatsunori Hashimoto,
   Stanford). Rewarding "produce hard problems" collapses to artificially-complex
   junk (their Lean example); fix = ground synthetic tasks in *unsolved real*
   problems + a third "guide" role that judges relatedness. Same shape as our
   decorrelated-selection / NCI loop and [[every-bug-has-economic-value]] (a
   reward-hacking conjecturer = a junk-finding bug-finder). Directly relevant to
   the §C "flood the frontier" engine: flooding works only if grounded+guided.
3. **Lean for science / verified intelligence** (Robert George, Caltech) — formal
   proof in the loop; torch-in-Lean proving flash-attn ≡ standard attn; thinking-
   machines temp-0 nondeterminism formalized to kernel level. Maps onto
   [[only-the-irreducible-is-primitive-generate-the-rest]] (generator IS the ECC,
   build=verify) and [[no-binary-in-proof-lineage]].
4. **Bitter lesson from biology** (Yasa Baig / ESM-Cambrian, Biohub) — data+scale
   beats handcrafted MSA features; SAE features self-organize into a biological
   hierarchy unsupervised. Touches generate-from-the-free-object + interpretability.
5. **RTS-style agentic programming** (Lukens Orthwein, channel AI) — macro-by-
   default, parallel git worktrees, APM = tool-calls/min, linked-MD knowledge base
   "faster for LLMs than code-as-source-of-truth." This is **convergent external
   validation of what we already run**: clone-per-writer ([[shared-checkout-is-view-only]]),
   the ferry loop, MEMORY.md hub→satellite docs (carved-sentence→docs is exactly
   "linked MD faster than code"). No IP care needed — we're not claiming it; it
   confirms our DV2.0 surface discipline.

**What's next (my recommendation):** the one Beacon-safe, lowest-risk ferry is a
`docs/research/` note connecting **alpha-zero decorrelation + Bailey's
self-guidance plateau-fix** to our existing decorrelated-selection loop and
every-bug-has-economic-value — all named humans, cited as prior art, zero "ours."
The table stays out entirely. Gated on Aaron's nod because he flagged IP.
