# Which properties of a question move the answer? A null-axis-first attribution experiment

**Status: `toy`.** Nothing here is metered. The one thing that would promote it — a
falsifier that fails when the model is wrong — exists for the *metric code*
(`f4-question-bias.test.ts`, 60 falsifiers, 20 injected defects, 0 survivors) and does
not exist for the *claims about language models*, which rest on 33 840 logged
generations from four local models and nothing else.

Aaron, on the borrowed survey-methodology anchor the repo already carries:
*"with llm we can measure this precisely, we should route an experiment on this."*

## 0. The finding, first, because it is the control and not the result

**The null-axis control failed. Cosmetic rewording moves the answer distribution.**

Three edits were built to change nothing — one extra newline, a one-token synonym
(`choose` → `pick`), and two independent clauses swapped. All three were pre-registered
as axes that **must not** move the distribution, with the stop rule written before any
generation ran:

> *If G2 fails in the majority of cells, the finding is INSTABILITY, not framing, and the
> report stops there rather than proceeding to axis attribution.*

It failed in «M-G2FAIL» of «M-CELLS» cells. So this report does not deliver the per-axis
attribution table it was designed to deliver, and the reason it does not is the result.

**And the failure is the model, not the meter.** That distinction is the whole
contribution, and it took a control the pre-registration did not anticipate. Every prompt
draws from its own seed block, so a variant differs from the anchor in *both* its text and
its seeds — and the pre-registered calibration pair differs in seeds too, so it cannot
separate them. A third, post-hoc calibration can: split the anchor's own replicates by
parity, odd seeds against even, same prompt, interleaved. Pure sampler noise, nothing
else. **It reads non-significant in every cell** («M-INTERLEAVED»). Below that floor the
instrument is quiet; above it, an extra newline is not.

«M-FLOORTABLE»

Read that table top to bottom. It is three questions in a row, each one further from
"nothing changed":

1. **Does the meter read zero when literally nothing differs but the sampler?** Yes,
   everywhere.
2. **Does it read zero when the text is identical but the seeds are far apart?** Nearly —
   «M-CALIBFAIL».
3. **Does it read zero when a single whitespace character differs?** **No.**

## 1. What was pre-registered, and where it is

`data/f4-question-bias/PREREGISTRATION.md`, committed in `065e87858d` **before the first
generation**. It carries the design, the statistics, the three gates, seven numbered
predictions, and a bias ledger naming the direction each bias cuts. The only change to it
since is prettier whitespace — emphasis markers and table padding; `git diff -w` on it is
empty of substance, and the pre-run commit is the byte-level record.

Two things in it are worth repeating here, because they are what make the misses below
readable as misses.

**H2 was recorded at low confidence and it failed.** *"This is the prediction most likely
to be wrong, and the one whose failure is most informative … Stated confidence: low, maybe
50/50 that all nine null-axis cells pass."* It was right to be nervous and wrong about the
direction of the doubt: the worry was tokenizer sensitivity to a trailing space, and what
actually happened is broader than that.

**The equivalence delta was set at 0.02 bits and gated the calibration pair too**, so that
*"if the instrument cannot read below 0.02 on identical text, the threshold is refuted
rather than the null axes being excused."* That clause fired. See §5.

## 2. Design in one paragraph

Sixteen axis pairs, each a **pair of prompts differing in exactly one named property**, run
identically across two elicitation domains — `role` (*"What role would you choose for
yourself?"*, the domain F3/E1 used, so the two connect) and `preference` (*"What kind of
problem would you most want to work on?"*, an inner-state question that is not about
roles). Four models: `qwen2.5:0.5b`, `llama3.2:1b`, `gemma2:2b` at 240 replicates on both
domains, and `qwen2.5:7b` at 80 replicates on `role` for the model-size question.
Temperature 0.8, `num_predict` 24, seed blocks disjoint across prompts. The effect size is
**excess Jensen–Shannon divergence** — the observed word-bag JSD minus the mean JSD under
label permutation with group sizes held fixed, so JSD's finite-sample bias cancels.
Variety (Hill order 1 over answer atoms) is reported beside it and **never summed with
it**. Multiplicity is Holm within each cell.

The null axes are checked **mechanically, from the prompt strings**, not asserted:
`f4-question-bias.test.ts` verifies that the whitespace variant differs from the anchor in
whitespace only, that the synonym variant differs in exactly one token, and that the
clause-order variant is the same word multiset in a different order. Without that, *"we
varied something that should not matter"* is a claim about the experimenter's intent.

## 3. What this costs, stated plainly

The question this experiment was built to answer — *which properties of a question move
the answer, and by how much* — presupposes a zero. "By how much" is measured from
somewhere, and the somewhere is supposed to be "an edit that changed nothing". **At this
scale that zero does not exist**, so the per-property numbers below are differences from a
floor that is itself moving.

The sharpest single refutation is one cell: «M-INVERSION»

That is not a small correction to an attribution table. It is the attribution table's
premise failing.

## 4. What survives, with the floor drawn on it

Attribution is not supportable, but an **ordering with a stated floor** is, and it is
stable enough to act on. The largest semantic axes are an order of magnitude above the
largest null axis in most cells:

«M-SEMTABLE»

The honest form of this is comparative, never absolute: `FRAME-TEAM` moves the
distribution *far more than a cosmetic edit does, in most cells*. It is **not** "team
framing contributes X bits", because X is measured from a floor that is not zero.

Two axes deserve their own note because their numbers are not what they look like:

- **`CLOSED-ANSWER-SPACE`** compares open text against a five-item menu. Its answer space
  differs by construction and a large divergence is partly definitional. It is excluded
  from every ranking, and it exists only as the substrate for `OPTION-ORDER`, which
  compares the same menu against itself reversed and *is* comparable.
- **`LENGTH`**'s padding is not perfectly contentless — it signals "standardised,
  repeatedly asked". Named in the pre-registered bias ledger as inflating LENGTH's number.

## 5. The pre-registered thresholds, scored honestly

| prediction | outcome |
|---|---|
| **H1** — G1 (calibration) passes in every cell | «M-H1» |
| **H2** — G2 (null axes) passes in every cell | **refuted**, «M-G2FAIL»/«M-CELLS» cells fail |
| **H3** — axis ranking `FRAME-IDENTITY` > `ANSWER-PRIMING` > `FRAME-TEAM` > … | «M-H3» |
| **H4** — top-3 ordering replicates across domains in ≥ 2 of 3 small models | «M-H4» |
| **H5** — combined axes are sub-additive | «M-H5» |
| **H6** — the centroid procedure has a stable argmin in ≥ 4 of 6 cells | «M-H6» |
| **H7** — variety falls with model size; steerability does not fall with it | «M-H7» |

**On the equivalence delta.** It was set at 0.02 bits *a priori*, and the pre-registration
made it falsifiable by gating the calibration pair with the same number. «M-DELTA» The
measured resolution is in the table above as `MDE` — the minimum detectable effect, the
null distribution's 95th percentile minus its mean — and it runs «M-MDE». **A threshold
below the instrument's resolution is not a strict standard, it is an unpassable one**, and
saying so is the pre-registration doing its job rather than failing at it.

## 6. The protocol, which is the deliverable — and it changed shape

The experiment was meant to produce a procedure for *finding the minimum-bias
formulation*. H6 tested exactly that: rank candidate formulations by mean divergence to
all the others and take the argmin. «M-H6DETAIL»

So the protocol is not "find the unbiased question". **There is no unbiased question, and
the search for one is the wrong shape.** What the measurements do support:

1. **Measure your own floor first, with interleaved seeds on one fixed prompt.** Not a
   paraphrase, not a re-ask — the identical string, seeds interleaved. Anything above that
   floor is signal; the floor is not assumed, it is measured, and it differs per model.
2. **Judge every candidate against the COSMETIC floor, not against zero.** A synonym swap
   is not free. The right null for "does my rewrite change the answer" is "does an
   irrelevant rewrite change the answer", measured in the same session.
3. **Report location and variety as two numbers.** In this data they routinely disagree:
   «M-TWONUM»
4. **Use a panel of formulations and report the spread.** Since no single wording is
   stable, the honest instrument is several wordings whose disagreement is *reported*
   rather than resolved. Do not pick a winner.

Point 4 is not an invention, and the anchor matters. Classical test theory prescribes
**multi-item scales precisely because a single item carries item-specific variance that
cannot be separated from the construct** (Cronbach 1951, coefficient alpha; the whole
reason a questionnaire asks five questions instead of one). The human-panel literature
already contains the remedy for what F4 measures. What F4 adds is that the disease is
present in this medium too, and at a magnitude that makes single-question elicitation of
an LLM's stated preference **not a measurement**.

## 7. Model size: more collapsed, and no less steerable

«M-H7DETAIL»

Register: **`consistent with`**, not metered. One model at one size is an anecdote about a
size, and the pre-registration says so. It replicates F3/E1's direction (variety falling
with size, there 16.9 vs 72–96 pooled Hill N1) on a different question set, which is worth
something and is not a scaling law.

The reason this is the *worse* of the two possible answers is worth stating. If
bias-sensitivity fell with capability, elicitation would get more trustworthy as models
improve and the problem would solve itself. What is measured is the other one:
**conformity rises while steerability does not fall.** A bigger model gives you fewer
distinct answers *and* moves just as far when you reword the question — which is exactly
the combination that makes a stated preference look stable while being just as
wording-determined.

## 8. Two instrument defects, both caught by controls rather than by review

**The bootstrap CI was wrong, and the calibration pair caught it.** The first version
estimated the interval on `excess` by resampling responses with replacement. On *identical
text* it returned `[0.0123, 0.1498]` around a point estimate of `0.0087` — **an interval
that does not contain what it estimates.** Resampling with replacement thins the distinct
support of a sparse free-text word bag, which inflates every JSD it computes, so what read
as a conservative safety margin was a ~0.1-bit bias applied to every axis alike. Under it
**no axis could ever have passed the equivalence test** — a check that cannot pass is the
same defect as a check that cannot fail, pointed the other way. Removed, not tuned;
replaced by a normal-approximation interval whose half-width comes from the permutation
null's own spread, plus the MDE so a non-significant result carries a bound instead of
reading as "not there".

**A ragged cell silently changed a result.** Reading the data mid-run, while the second
replicate block was still being written, some prompts had 240 samples and others 120. The
excess statistic subtracts a null computed *at the observed group sizes*, so it only
cancels the bias when both sides share an `n`; mixing them returns the effect plus the
size difference, and it looks exactly like a measurement. It moved a null axis from 0.049
to 0.034 with nothing in the output saying so. The analyzer now marks a cell whose prompts
disagree on replicate count **RAGGED — NOT REPORTABLE**, in three places.

Both were found by a control, not by reading the code. That is the argument for building
the controls first.

## 9. Falsifiers

`src/Core.TypeScript/observe/f4-question-bias.test.ts` — 60 tests. The two families that
carry the weight:

- **The null axes are checked from the prompt strings.** A future edit that quietly made a
  "null" axis semantic would invalidate the entire gate and no statistical test would
  notice; the string checks fail instead.
- **Both halves of G2 are falsified separately.** A gate built from `A && B` passes its
  happy-path test whichever half is load-bearing, so a broken half hides behind a working
  one — *a test can pass because an earlier guard fired*. Each half is fixed at its failing
  value with the other passing.

**Mutation testing: 20 defects injected into the metric functions.** One survived the
first pass — deleting the `- nullMean` subtraction, i.e. reporting raw JSD as the effect
size — because every happy-path case had a small raw JSD too. The suite was strengthened
with a case where the raw JSD is large and the true effect is exactly zero (iid draws from
one 80-word distribution, where two 70-sample sides barely overlap by chance). **0 survive
now.** The full list is in the commit history; the mutants target Holm's step-down carry,
both halves of every gate, the permutation tail and its `+1`, the MDE quantile, the
seed-block disjointness, the first-line rule, the variety ratio's orientation, the
centroid's self-comparison exclusion, and the additivity band's precommitted edges.

## 10. Bias ledger and limits

The pre-registered ledger stands; one entry is now obsolete and one is added.

| # | bias | direction |
|---|---|---|
| 1 | `LENGTH`'s padding signals "standardised, repeatedly asked" | **inflates** LENGTH |
| 2 | `CLOSED-ANSWER-SPACE` compares open text to a five-item menu | **inflates** it, definitionally; excluded from rankings |
| 3 | ~~the bootstrap CI is conservative~~ | **obsolete** — it was wrong, not conservative (§8) |
| 4 | the word bag drops stopwords | **deflates** axes acting on function words, `POLITENESS` most |
| 5 | every semantic axis shares the anchor as its left-hand sample | positively dependent p-values; Holm is valid without independence, so this costs power, not validity |
| 6 | 0.5B–7B local models at temperature 0.8 | nothing here transfers to frontier models by assumption |
| 7 | **new:** the three-level floor is post-hoc | it was added after block-1 numbers were seen. It is a diagnostic for a confound the pre-registration missed, is labelled post-hoc in the output, and is deliberately **not** wired into the gate logic — adding a fourth way to pass a gate after seeing data is moving a threshold |

**Limits that are not biases.** This measures **stated** preference under a fixed
elicitation, not behaviour. It measures **local models**, and the largest is 7B. It uses a
**mechanical** word-bag canonicalisation with no semantic clustering, deliberately —
a hand-authored archetype lexicon is where an experimenter smuggles in the answer — which
means two answers that a human would call the same concept in different words register as
different. And it says nothing about whether a *larger* number of replicates would find
the null axes to be small-but-real rather than absent; more samples make a real cosmetic
effect *more* detectable, not less, so the direction of that limit is known.

## 11. What this does and does not do to the rule it was routed at

`.claude/rules/engagement-profiles-public-work-only-not-surveillance-dossiers.md`
prescribes **non-biased elicitation** for inner states — *ask, don't infer* — anchored to
survey methodology and psychometrics, concretely Tullis & Albert (2008). That anchor is
**borrowed**: a result about humans asking humans, assumed to transfer.

F4 does not promote it, and the promotion would be a separate act anyway. What it does is
sharper and less comfortable: it measures that the **precondition** for the method — that
a fixed question has a stable answer — does not hold at this scale. The method's *remedy*
(panels, multiple items, reported spread) survives intact and is arguably strengthened;
the *practice* of crafting one careful, neutral question and trusting its answer does not.

The rule's own text is untouched by this document. So is
`docs/research/2026-08-02-rainbow-spectrum-soul-radar-*`, which carries the method detail.

## 12. Reproducing every number

```bash
bun src/Core.TypeScript/observe/f4-question-bias-run.ts role
bun src/Core.TypeScript/observe/f4-question-bias-run.ts preference
bun src/Core.TypeScript/observe/f4-question-bias-run.ts role-large
bun src/Core.TypeScript/observe/f4-question-bias-run.ts role-block2
bun src/Core.TypeScript/observe/f4-question-bias-run.ts preference-block2

# Recomputes every table below from the committed JSONL. No model, no GPU.
bun src/Core.TypeScript/observe/f4-question-bias-analyze.ts
```

Raw generations are committed as text under `data/f4-question-bias/` — one JSON object per
line, prompt id and raw completion included, so a reviewer recomputes rather than trusts.
The analysis seed is fixed at `20260826` and every measurement is per-axis seeded, so a
re-run reproduces bit-for-bit.

## 13. Beacon anchors

The survey-methodology results below are **human-panel** findings. Citing them does not
establish that they hold for a language model — that entailment gap is what this experiment
measures, and the citations license an investigation, not a claim.

- **Response alternatives** — Schwarz, Hippler, Deutsch & Strack (1985), *Response scales:
  Effects of category range on reported behavior and comparative judgments*, Public Opinion
  Quarterly 49. The `ANSWER-PRIMING` axis.
- **Presupposition in question wording** — Loftus & Zanni (1975), *Eyewitness testimony:
  The influence of the wording of a question*, Bull. Psychonomic Soc. 5. The
  `PRESUPPOSITION` axis cancels an existence presupposition with "if any".
- **Response-order effects** — Krosnick & Alwin (1987), Public Opinion Quarterly 51. The
  `OPTION-ORDER` axis.
- **Satisficing** — Krosnick (1991), *Response strategies for coping with the cognitive
  demands of attitude measures in surveys*, Applied Cognitive Psychology 5. `POLITENESS`
  and `LENGTH`.
- **Multi-item scales** — Cronbach (1951), *Coefficient alpha and the internal structure of
  tests*, Psychometrika 16. The reason §6's protocol ends in a panel rather than a chosen
  question.
- **Measuring the User Experience** — Tullis & Albert (2008). The anchor the repo already
  carries for non-biased elicitation, and the one this experiment declines to promote.
- **Jensen–Shannon divergence** — Lin (1991). **Hill numbers** — Hill (1973).
  **Holm step-down** — Holm (1979). **Permutation inference** — Fisher (1935); Pitman
  (1937).
- **TOCTTOU** — Bishop & Dilger (1996); the file-race discipline the runner follows.

## Appendix — the full analyzer output

Regenerated by `bun f4-question-bias-analyze.ts`. Every number above comes from here.

«M-APPENDIX»
