# Verification buys abstention, not accuracy — and on hard items that is the whole prize

**Register:** unmetered (local Ollama, gemma2:2b, no measured joule).
**Raw per-item log:** `data/decorr-selectors-hard-raw.jsonl` (150 rows, recomputable
without a model). **Ledger:** `data/decorrelation-research.jsonl`.
**Occasion:** the hard-item selector run (W5 point 2) — long menus (18–40 options),
the search-deficit regime where the best single model actually fails.

## The setup that finally discriminates

At short menus gemma-alone scores 95% and no selector can add value — there is nothing to
catch. So this run used long shuffled menus (18–40 options) to push the best model down.
It worked: **gemma-alone dropped to 58.0%**, qwen collapsed to 6.0%.

## The result the selectors gave — and why it looked like a null

| config | accuracy (95% CI) |
|---|---|
| qwen2.5:0.5b alone | 6.0% [3.2, 11.0] |
| gemma2:2b alone | 58.0% [50.0, 65.6] |
| agreement-gating | 58.0% — matches best-single, 0.0pp lift |
| third-call-verifier | 58.0% — matches best-single, 0.0pp lift |
| union oracle | **58.0%** — equal to best-single |

The union oracle equalling best-single is the tell: **qwen contributed zero correct
answers gemma missed.** At 6% on long menus, the weak producer never holds an answer the
strong one lacks, so no selector — not even a perfect one — can improve accuracy. The
second producer is pure cost.

## The finding hiding under the null: a PERFECT self-verifier

The raw log carries what the accuracy number cannot. When gemma was the producer AND the
verifier:

> **gemma-as-verifier caught 100% of gemma-as-producer's own errors (63/63 rejected) and
> approved 100% of its correct answers (87/87).**

That is a perfect discriminator, on its own mistakes, with no second model. The
produce/verify asymmetry is not just real (F1) — on this item set it is *complete*:
producing the answer in a 40-item menu is a search gemma often loses, but checking a
proposed answer against the rules is a test gemma never fails.

## Why that does not raise accuracy — and what it buys instead

A verifier that rejects without proposing converts an error into an ABSTENTION, not a
correction. It knows the answer is wrong; it has no better candidate to switch to (qwen
had nothing). So the accuracy-if-you-must-answer is unchanged. But the coverage–risk curve
is transformed:

| policy | coverage | accuracy on answered |
|---|---|---|
| gemma-alone (must answer) | 100% | 58.0% |
| **answer iff self-verifier approves, else abstain** | **58.0% (87/150)** | **100.0% (87/87)** |

**Every one of gemma's 63 errors became an abstention, never a wrong answer.** The system
now says "I am certain on these 58% and I do not know on the rest" — which is
categorically more useful than "I am 58% right and cannot tell you which." This is exactly
the `Abstain` move the design doc (F3) predicted, measured: verification's payoff is
selective prediction, not ensemble accuracy.

## The honest caveats (this is single-model self-verification)

- **It is one model checking itself.** The 100% self-catch is measured on THIS item set;
  it is not a guarantee, and a model that could be *confidently* wrong (approve its own
  error) would break it. The companion falsifier from F1 applies: a verifier must be shown
  to reject, and here it rejected 63/63 — but on adversarial items designed to fool the
  checker, that number is the one to watch.
- **Coverage is a cost.** 42% of items are abstained. Selective prediction is only useful
  if the abstained items can be routed (to a bigger model, a human, or a different tactic).
  A flat coverage–risk curve would make `Abstain` ceremony (F3's own falsifier); this curve
  is not flat — it jumps from 58% to 100% — so `Abstain` earns its place here.
- **No energy claim.** The verify call is a second gemma call (~965ms/item total). Whether
  100%-accurate-at-58%-coverage beats 58%-at-100%-coverage depends on what an abstention is
  worth, which is a routing/energy question, not an accuracy one. Register stays unmetered.

## What this changes for the program

The vote died because it aggregated correlated voters (ρ≈0.48, N_eff≈1.5). The ensemble
died on easy items because there was nothing to catch, and on hard items because the weak
producer had nothing to contribute. But the produce/verify asymmetry survives all of it as
a **selective-prediction mechanism**: it does not make the society more accurate per
answer, it makes the society HONEST about which answers to trust. On a substrate of free
runners where abstained items can be re-routed at no dollar cost, that is the move worth
building — and it needs exactly one model with a checkable rule, not three.

## Pointers

- `data/decorr-selectors-hard-raw.jsonl` — 150 per-item rows (menu size, choices,
  verifier verdicts, latencies). The 63/63 self-catch and the coverage–risk table both
  recompute from this file without a model.
- `src/Core.TypeScript/observe/decorrelation-selectors.ts` — the selectors; abstention is
  the natural extension (approve→answer, reject→abstain).
- `docs/research/2026-08-26-the-tiny-agent-society-on-free-runners-vote-was-the-wrong-operator.md`
  — §2 the `Abstain` move type; F3 (abstention buys nothing) — refuted here, the curve is
  not flat.
