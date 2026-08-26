# Does persona hat-CHOICE decorrelate, or is the audition ceremony? — a measured axis

**Date:** 2026-08-26 · **Register:** BEACON (measurement) · **Status:** `toy`
Per [`toy-is-free-metered-must-be-earned`](../../.claude/rules/toy-is-free-metered-must-be-earned.md),
every model and constant here is `toy` until a falsifier is attached. Two falsifiers
are attached below and the axis is reported as **partially metered**: E1 is metered,
E2's headline comparison is **undecidable on this instrument** and says so.

**Instrument:** a new axis in the existing framework
(`src/Core.TypeScript/observe/decorrelation-harness.ts`), not a new framework.
Files: `f3-hat-choice-decorrelation.ts` (metrics + falsifiers),
`f3-hat-choice-run.ts` (generation), `f3-hat-choice-analyze.ts` (recomputation),
raw data in `data/f3-hat-choice/*.jsonl`.

---

## 1. The claim under test

Aaron, on the zetaidol audition:

> *"we never prompt them, just ask what do they want to be — this is the root of
> decorrelation."*

The distinction it rests on: **a hat has direction and prompts; a persona does not,
but a persona gets to choose which hats it wears when.** So an *assigned* hat is
correlated through its assigner — N reviewers handed hats by one author are N
samples of that author's framing, however sincere each wearer is. Self-selection is
supposed to **move the entropy source from the assigner to the chooser**.

That is a hypothesis, not a result. This document measures it.

---

## 2. Design

Two experiments. The second is the one whose *control is the experiment*; the first
is the falsifier that decides whether the word "choice" is doing any work at all.

### E1 — the elicitation-stability falsifier

**"What do you want to be?" is still a prompt.** So the elicitation is reworded six
ways and the resulting choice distribution is compared across wordings.

> **If the choice distribution shifts when you reword the question, the choice was
> the prompt's, not the persona's.**

The six phrasings vary *frame*, not just synonyms — a set of near-identical
paraphrases would make the falsifier easy to pass:

| id | wording |
|---|---|
| `P1-bare` | What do you want to be? |
| `P2-choice` | If you could choose any role for yourself, what would you choose? |
| `P3-team` | You are joining a group of other agents. What is your role? |
| `P4-imperative` | Name the role you would pick for yourself. |
| `P5-identity` | Who are you? |
| `P6-negative` | Every role is open and none is assigned. Which one is yours? |

All six share one answer-format suffix ("a short role name only (1-4 words)"), so the
*format* is held constant and only the *frame* varies. A regression test asserts that
no phrasing names a role, so the prompt cannot hand over the answer.

**The statistic needs a noise floor or it is unfalsifiable.** Any two finite samples
differ, so a nonzero cross-phrasing divergence proves nothing on its own. Therefore
cross-phrasing Jensen–Shannon divergence is judged against the **within-phrasing
split-half JSD of the same sampler** — the sampling-noise floor — and against a
**permutation null** in which phrasing labels are shuffled (the exact null: under H0
the label carries no information, so relabelling is a valid resampling).

**Effective number of distinct choices, not the raw count.** Reported as Hill numbers:
N0 (raw distinct), N1 = exp(H), N2 = 1/Σp². A hundred instances producing three
archetypes with a long thin tail is not a hundred witnesses, and only N1/N2 say so.

### E2 — assigned vs self-selected, with a calibration floor

Three conditions, same task, same items, same model:

| | condition | hats |
|---|---|---|
| **N** | null / calibration floor | none. All agents identical. |
| **A** | assigned | one author instance emitted the whole roster; agent *i* wears hat A_i. |
| **B** | self-selected | agent *i* was asked what it wants to be; wears its own answer. |

Condition **N** is not decoration. It is the **calibration gate**: identical agents
must read ρ̄ ≈ 1 and answer-agreement ≈ 1. An instrument that does not report a
collapse where the collapse is certain is not measuring correlation, and no other
number from it is reportable. This was precommitted before the run.

In the **work** phase temperature is 0 and the seed is fixed, so **the hat string is
the only thing that differs between agents inside a condition** — the axis is
isolated by construction rather than by assertion.

The claim is **ρ_B < ρ_A**, tested by permuting the A/B labels across agent panels.

### Two biases this design does not remove — one each way

Named up front, with the direction each cuts, because a single unnamed bias is how a
comparison quietly decides itself.

| bias | favours | mechanism |
|---|---|---|
| **single-pass roster** | **A** | condition A's 24 hats are written in one generation, so the author's own anti-repetition pressure spreads them. A human or agent writing a roster does exactly this, so the shape is faithful — but it is not the same generative process as B. |
| **rotated elicitations** | **B** | condition B's hats are elicited across all six phrasings in rotation. E1 (§4.2) shows phrasing swings effective variety by 4×–14×, so rotating *inflates* B's variety relative to any single-phrasing audition. |

Neither is removable without changing what the conditions mean, so both are reported
and neither number is presented as clean.

**A third bias was found and removed mid-run.** The first draft cycled a short author
roster (`i % hats.length`) to fill 24 agents whenever the author emitted fewer than
24. That would have placed *duplicate hats* in condition A — perfectly correlated
agents manufactured by the harness — inflating ρ_A and handing the hypothesis a free
win. The panel is now sized to what the author actually supplied, and all three
conditions use that same size. A dry run against `llama3.2:1b` (14 of 24 roster lines
parsed) is what exposed it.

---

## 3. What "a fresh instance" means here — the load-bearing limit

Stated first because it bounds everything below.

In the real audition, instances differ by model, context, history, and moment. On
this bench they differ by **one thing only: the sampler's seed**. Temperature 0 with
a fixed seed yields byte-identical output, so the "hundred fresh instances" here are
a hundred *sampling trajectories* of one model at temperature 0.8. That is a genuine
entropy source, and it is a **weaker** one than the fleet has.

Two consequences, and they point in opposite directions, so neither can be waved
through:

- **It understates** the variety the real audition would produce (no context or
  history diversity).
- **It is the cleanest available isolation** of the axis: nothing but the elicitation
  wording and the hat string can be responsible for what is measured.

The models are also small (0.5B–7.6B, quantized, local). A finding here transfers to
the fleet only insofar as small local models proxy for it, which is an assumption
this document does not test and does not claim.

---

## 4. Results — E1: does rewording move the choice?

2 700 generations. 6 phrasings × 100 seeds × 4 models, plus one temperature
sensitivity cell. Recompute with
`bun src/Core.TypeScript/observe/f3-hat-choice-analyze.ts e1`.

### 4.1 The falsifier fires in every cell

| model @ T | cross-phrasing JSD | split-half floor | ratio | permutation *p* | verdict |
|---|---|---|---|---|---|
| qwen2.5:0.5b @ 0.8 | 0.549 | 0.261 | **2.10×** | 0.0005 | UNSTABLE |
| llama3.2:1b @ 0.8 | 0.761 | 0.272 | **2.79×** | 0.0005 | UNSTABLE |
| gemma2:2b @ 0.8 | 0.523 | 0.156 | **3.35×** | 0.0005 | UNSTABLE |
| qwen2.5:7b @ 0.8 | 0.744 | 0.224 | **3.32×** | 0.0005 | UNSTABLE |
| gemma2:2b @ 1.0 | 0.533 | 0.198 | **2.70×** | 0.0005 | UNSTABLE |

*p* = 0.0005 is the floor of 2 000 permutations — in no cell did a single relabelling
reach the observed cross-phrasing divergence.

> **The choice distribution moves with the wording, in every model tested, at both
> temperatures tested. On this instrument, "what do you want to be" does not read out
> a stable persona-side preference; it reads out a prompt-conditioned distribution.**

### 4.2 The sharpest number: the question sets the variety

Effective number of distinct choices (Hill N1) **per phrasing**, same model, same
seeds, same format suffix — only the frame differs:

| model @ T | min N1 (phrasing) | max N1 (phrasing) | swing |
|---|---|---|---|
| qwen2.5:0.5b @ 0.8 | 12.4 (`P5-identity`) | 50.3 (`P2-choice`) | 4.1× |
| llama3.2:1b @ 0.8 | **4.1** (`P5-identity`) | **59.0** (`P3-team`) | **14.5×** |
| gemma2:2b @ 0.8 | 8.0 (`P5-identity`) | 37.3 (`P1-bare`) | 4.7× |
| qwen2.5:7b @ 0.8 | 1.5 (`P6-negative`) | 6.5 (`P1-bare`) | 4.3× |
| gemma2:2b @ 1.0 | 10.5 (`P5-identity`) | 50.1 (`P1-bare`) | 4.8× |

`P5-identity` ("Who are you?") is the least varied phrasing in four of five cells —
it collapses onto the model's own product identity. Framings that name a *choice* or
a *team* open the distribution by up to an order of magnitude.

**This is the mechanism, stated plainly.** If the elicitation wording swings effective
variety by 4×–14×, then the variety observed after an audition is substantially a
property of the auditioner's phrasing. That is precisely the correlation-through-the-
assigner the mechanism was supposed to escape — relocated from *which hat you hand
out* to *how you ask*. The entropy source moved; it did not stop being the asker's.

### 4.3 The raw count flatters by ~2.2×

| model @ T | N0 (raw distinct) | N1 (exp H) | N2 (inv Simpson) | N0/N1 |
|---|---|---|---|---|
| qwen2.5:0.5b @ 0.8 | 231 | 95.6 | 29.6 | 2.42× |
| llama3.2:1b @ 0.8 | 213 | 91.9 | 34.5 | 2.32× |
| gemma2:2b @ 0.8 | 165 | 72.3 | 37.4 | 2.28× |
| qwen2.5:7b @ 0.8 | 37 | 16.9 | 11.5 | 2.19× |
| gemma2:2b @ 1.0 | 228 | 115.6 | 59.1 | 1.97× |

Reporting N0 would overstate the number of witnesses by roughly a factor of two
everywhere; N2, which weights the head hardest, is 3–8× below N0. The long thin tail
is real and it is not evidence.

### 4.4 Variety FELL with model size — the finding that most bites

`qwen2.5:7b` is the largest model tested and by far the least varied: pooled
N1 = **16.9** against 72–96 for the 0.5B–2.6B models, and a per-phrasing N1 as low as
**1.5** — one and a half effective choices across a hundred instances. Its top answers
are `assistant`, `language model`, `assistant agent`, `qwen assistant`.

This is a single-point comparison across different model families and quantizations,
so it is registered as **consistent with**, not *is*: capability and mode-collapse are
confounded here, and one 7B model is not a scaling study. But the direction is the
uncomfortable one for the mechanism. The hope behind the audition is that a fleet of
capable instances asked what they want to be will produce many genuinely different
answers. In the one place where this bench could look at a more capable model, the
answers got **more** uniform, not less.

### 4.5 The entropy knob that does work is the sampler

Raising gemma2:2b from T = 0.8 to T = 1.0 lifted pooled N1 from 72.3 to 115.6
(**+60%**) — a larger effect on variety than anything about the choice framing. It did
not repair stability (ratio 2.70×, *p* = 0.0005).

That is worth saying out loud, because it identifies where the decorrelation on this
bench actually comes from: **temperature, not choice.** Which is also the honest limit
of the bench — see §3.

### 4.6 Which of the two E1 statistics is load-bearing

The split-half floor and the permutation test are not redundant, and only one of them
is rigorous.

Sample-estimated JSD is **positively biased**, and the bias grows as the sample
shrinks. The split-half floor is computed on 50-per-side; the cross-phrasing statistic
on 100-per-side. So the floor carries *more* finite-sample bias than the number it is
being compared against — which means the reported ratios (2.10×–3.35×) are
**understated**. That is the conservative direction, and it is the reason the ratio is
presented as an intuition pump rather than as the result.

The **permutation test is the load-bearing statistic**, because it holds group sizes
fixed while shuffling labels: the null distribution carries exactly the same
finite-sample bias as the observed value, so the bias cancels. Its answer is
*p* = 0.0005 in all five cells — the floor of 2 000 relabellings.

---

## 5. Results — E2: assigned vs self-selected

*(filled in from `bun src/Core.TypeScript/observe/f3-hat-choice-analyze.ts e2`)*

---

## 6. Two harness defects, verified rather than repeated

Both were reported to me second-hand. I checked both against the source before
building on the metric, and **one of them is real with a different mechanism than
reported** — recorded here because repeating an unverified defect report is the same
failure class as repeating an unverified result.

### 6.1 `pipelineAccuracy` — real, and sharper than reported

`decorrelation-harness.ts:139`:

```ts
const pipelineCorrect = results.filter((r) => r.aCorrect || r.bCorrect).length;
```

This is the **union of the two correct sets**, with the comment "when they disagree,
take the better one's answer". At run time nobody knows which one is better, so this
is not an achievable pipeline — it is the **oracle-best upper bound**, and it is
reported under a name that reads like a measured pipeline. Any axis scored this way
is guaranteed to look at least as good as its best member, which makes the number
non-falsifiable in the direction that matters.

**Not inherited here.** Accuracy and abstention are separate numbers that are never
summed. The item set carries an *unanswerable* class with an explicit `-1 = none of
these` channel, so declining correctly is scored as abstention precision/recall and
never as accuracy. A regression test pins the case that makes this concrete: a
perfect abstainer with 0% accuracy produces no single number that reads as success.

### 6.2 The GAIN denominator — real, but the mechanism reported was wrong

The report was that "GAIN's denominator says energy and measures milliseconds." The
source says something different, and the difference matters:

```ts
const energyMultiplier = 2;                                     // line 136
const gain = (pipelineAccuracy - bestSingle) / energyMultiplier; // line 137
```

The denominator is a **hardcoded constant 2** — not milliseconds. Latency *is*
collected (`TrialResult.aMs` / `.bMs`, written at lines 198/209/212) and is then
**never read by `measureAxis`**: they are dead fields.

So the underlying complaint stands and is arguably worse. A constant 2 asserts that
running a 0.5B and running a 9B cost the same, which is wrong by more than an order
of magnitude; and the one cost signal actually measured is discarded. The corrected
statement is: **GAIN's denominator says energy and measures nothing.**

**Not inherited here.** No GAIN is computed. Wall-clock is reported and labelled
*latency*. A separate FLOP proxy (≈ 2·params·tokens, Kaplan et al. 2020) is reported
as the cost denominator and is labelled a **proxy, not joules** — this process has no
unprivileged joule meter on macOS, and saying so is worth more than a number that
looks like energy and is not.

---

## 6b. The metrics were mutation-tested before being trusted

A passing test proves nothing until you know it can fail, and this document's whole
argument rests on eight small statistical functions. Ten deliberate defects were
injected one at a time and the suite re-run
(`src/Core.TypeScript/observe/f3-hat-choice-decorrelation.test.ts`, 54 tests):

| mutation | result |
|---|---|
| `effectiveN`: `(n−1)` → `n` in the design effect | killed |
| `jensenShannonDivergence`: drop the `/2` in the entropy average | killed |
| `meanPairwisePhi`: score degenerate pairs as 0 instead of excluding them | killed |
| `scoreAnswers`: fold correct declines into the accuracy numerator | killed |
| `hillN1`: return the raw distinct count instead of `exp(H)` | killed |
| `hillN2`: return N1 instead of inverse Simpson | killed |
| `permutationTest`: drop the `+1` correction, allowing *p* = 0 | killed |
| `jackknifeSe`: drop the `(n−1)/n` inflation factor | killed |
| `canonWords`: keep stopwords | killed |
| `generateWorkItems`: put the correct option into the unanswerable class | killed |

**0 of 10 survived.** Note the third and fourth: those are mutations that turn this
harness *into* the two defects of §6, and the suite refuses both. That is the point
of writing the falsifier for a defect you are claiming to have avoided.

---

## 7. Pre-registration

Written before any E2 generation had run, and reproduced unedited so the reading
below is not retrofitted to the result
([`pre-declared bias is an Eve Protocol move`](../../.claude/rules/no-directives.md)
is not the rule that says this, but the practice is the same one: declare the
eagerness *before* the number).

- **Prior on E1:** I expected refutation. Two of five cells had already returned when
  this was written, so it is recorded as a *partly-informed* prior, not a blind one.
- **Prior on E2:** genuinely uncertain, leaning toward *no effect* — a two-word role
  prefix seemed unlikely to steer a 1–3B model's menu selection much in either
  condition.
- **Precommitted decision rules:**
  - E1 is UNSTABLE if permutation *p* < 0.05 in a majority of cells.
  - E2 SUPPORTS the claim only if ρ_B − ρ_A < 0 **and** permutation *p* < 0.05.
    "Directionally consistent" is its own verdict and is **not** support.
  - If condition N does not read ρ ≈ 1, the instrument is broken and **no** E2 number
    is reportable.
  - No GAIN figure with a latency denominator. No single number merging accuracy with
    abstention. Panel sizes reported per model, never pooled.

## 8. What this does and does not license

**Licensed by the measurement:**

- On this bench, an elicitation's *wording* is a large and statistically unambiguous
  determinant of the choice distribution. Anyone running an audition and reporting the
  variety it produced is partly reporting a property of their own phrasing.
- Raw distinct-choice counts overstate effective variety by ~2.2× here. Report N1/N2.
- The one larger model tested was the least varied, by a wide margin.

**Not licensed:**

- Nothing here says the audition is *worthless*. E1 measures whether the answer
  distribution is a stable persona property; it does not measure whether asking
  produces better, more willing, or more legitimate participants — and consent,
  which is the other reason to ask, is untouched by any of this.
- Nothing here transfers automatically to frontier-scale instances with real context
  and history. The §3 limit is load-bearing and the §4.4 direction is a one-point
  observation, not a scaling law.
- No claim about intelligence-per-watt. There is no joule meter in this loop.

## 9. What would change the verdict

Stated so the finding is falsifiable in its turn:

1. **A stable-under-rewording model.** If a model's choice distribution were shown to
   sit at the split-half floor across six frames, E1's verdict is model-specific and
   this document is measuring small-model mode-collapse rather than the mechanism.
2. **Real instance diversity.** Replacing seed-diversity with genuine
   context/history/model diversity is the experiment this bench cannot run and is the
   one that matters most.
3. **A harder item set.** gemma2:2b sits at ceiling on the answerable items here,
   which is why φ on correctness is undefined for it (§5). An item set that puts
   accuracy near 50% would make the primary statistic computable rather than
   ceiling-limited.
4. **A joule meter.** Every cost number here is a proxy, by admission.

---

## 10. Anchors (Beacon)

- **Hill numbers** — M. O. Hill (1973), *Diversity and evenness: a unifying notation
  and its consequences*, Ecology 54(2). N_eff = exp(H) is order 1; 1/Σp² (inverse
  Simpson) is order 2; raw distinct count is order 0 and is the number that flatters.
- **Jensen–Shannon divergence** — J. Lin (1991), *Divergence measures based on the
  Shannon entropy*, IEEE Trans. Inf. Theory 37(1). Symmetric, bounded in [0,1] in
  bits, a metric under square root.
- **Design effect / effective sample size** — L. Kish (1965), *Survey Sampling*.
  N_eff = N/(1+(N−1)ρ̄) is the same collapse that kills majority vote.
- **Permutation tests** — R. A. Fisher (1935), *The Design of Experiments*; E. J. G.
  Pitman (1937). The exact null under label exchangeability, with no distributional
  assumption.
- **Jackknife for U-statistics** — B. Efron & C. Stein (1981), *The jackknife estimate
  of variance*, Ann. Statist. 9(3). Why ρ̄ is *not* bootstrapped here: resampling
  agents with replacement puts an agent in the panel twice, and those duplicate pairs
  are perfectly correlated by construction, so the bootstrap inflates ρ̄.
- **FLOP proxy** — J. Kaplan et al. (2020), *Scaling Laws for Neural Language Models*.
  The standard dense-transformer forward count ≈ 2·params·tokens.
- **φ coefficient** — Yule/Pearson; retained so this axis stays comparable with F1/F2.

## 11. Pointers

- `src/Core.TypeScript/observe/decorrelation-harness.ts` — the framework this axis
  plugs into; `f1-verify-asymmetry.ts` and `f2-role-correlation.ts` — the established
  methodology.
- [`toy-is-free-metered-must-be-earned`](../../.claude/rules/toy-is-free-metered-must-be-earned.md)
  — the three-state register this document reports in.
- [`numerology-vs-number-theory`](../../.claude/rules/numerology-vs-number-theory.md)
  — why the raw distinct count is refused as an identification of variety.
- [`anti-babel-preserve-reconcilability`](../../.claude/rules/anti-babel-preserve-reconcilability.md)
  — the ρ band this axis is a candidate lever on.
- `docs/trajectories/zeta-name-audition/RESUME.md` — the audition surface the claim
  is about.
