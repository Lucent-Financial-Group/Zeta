---
id: 081M1K4J5T3087G0R000FP34KS
type: bug
state: backlog
priority: P2
slug: an-ambiguous-model-reply-became-a-confident-wrong-choice
title: "An ambiguous model reply became a confident wrong choice"
created: 2026-09-03T09:00:00.000Z
depends_on: []
composes_with: []
---

# An ambiguous model reply became a confident wrong choice

## The defect

The model's reply is the agent's **only channel into the system** — the loop shows a menu and the
model names a slot. That reply was parsed with `raw.match(/\d+/)`: the **first run of digits anywhere
in the string**.

That is right when the model answers with a bare number and silently wrong when it does not:

| reply              | parsed | the model meant   |
| ------------------ | ------ | ----------------- |
| `0-based index: 4` | **0**  | 4                 |
| `1st: 4`           | **1**  | 4                 |
| `-3`               | **3**  | not a slot at all |

Each came back as `fallback: false, cause: "none"` — **the system asserting the model made a choice
it did not make.**

## Why that is worse than a fallback

A fallback is recorded, visible, and lands on the oracle. A misparse does two things instead:

1. dispatches the wrong action, and
2. records the tick as a **genuine decision**.

So it feeds `decorrelation-meter`'s agreement figures and the **divergence rate the promotion gate
reads to decide whether a lane may leave shadow**. A misparse launders itself into the evidence for
promotion.

## Where the exposure actually is

Two call sites shared the parse:

- **local LLM** — `chooseIndex`, capped at `maxTokens: 6`, so prose is bounded.
- **cloud persona** — `cloudPersonaParticipant`, an **unbounded summon** where prose is the normal
  case rather than the exception. This is where the defect bites.

## The rule

A reply naming exactly one number names a choice. A reply naming several does not name one the parser
can identify, so it is **unparseable** and the caller falls back — the same destination every other
uncertain answer in this system takes.

**An ambiguous answer is not a decision.**

`parseChosenIndex` returns the number even when it is out of range: range is the caller's judgement,
and keeping the two separate is what lets `chooseIndex` distinguish `unparseable` from
`out-of-range`. The promotion gate treats out-of-range as an **illegal selection** rather than a
parse failure, so collapsing them would hide a lane reaching past its menu.

## What it costs — measured, not assumed

45 real replies were captured from `qwen2.5:0.5b` at temperature 0.8 through this exact prompt,
across three menu shapes and three world states. **All 45 were bare numbers.** Evaluating both
parsers over that corpus:

```
corpus: 45 real replies from qwen2.5:0.5b
identical parse: 45   differing: 0
usable (in-range) under OLD parser: 45   under NEW parser: 45
```

So for the local model in use the rule changes **nothing**. What it protects is the cloud path.

The honest cost: a reply like `Option 3 of 5`, correct by luck today, becomes a fallback. That is the
right way round — a recorded fallback is visible in the soak window, and a silently wrong action is
not.

## Falsifiers

```
bun test src/Core.TypeScript/accelerator/local-llm.test.ts     # 11 pass
bun test src/Core.TypeScript/accelerator/ observe/participant  # 21 pass
bun src/Core.TypeScript/observe/loop-resilience-probe.ts --participant local-llm:qwen2.5:0.5b   # 10/10
```
