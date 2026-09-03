---
id: 081M1JP3JN3087G0R000X5BYB4
type: bug
state: backlog
priority: P2
slug: the-illegal-selection-counter-the-promotion-gate-reads-was-s
title: "The illegal-selection counter the promotion gate reads was structurally always zero"
created: 2026-09-03T04:10:00.000Z
depends_on: []
composes_with: []
---

# The illegal-selection counter the promotion gate reads was structurally always zero

`enforcement/promotion-gate.ts` refuses to promote a lane whose shadow window shows **any** illegal
slot selection. That counter could never be anything but zero, for three independent reasons:

1. **`observeWithParticipant` discarded the `ChooseResult`.** It returned only the `NextAction`, so
   nothing downstream could distinguish "the participant picked the oracle's action" from "the
   participant named a slot outside the menu and was silently substituted"
   (`menu[result.index] ?? observe(world)`).
2. **`testPersonaParticipant` and `humanParticipant` CLAMP** an out-of-range index
   (`Math.max(0, Math.min(menu.length - 1, idx))`) and returned `fallback: false`. A persona naming
   slot 999 of 15 produced slot 14, recorded as a legitimate choice.
3. **`chooseIndex` conflated three causes into one boolean.** A backend error, an unparseable reply,
   and an out-of-range pick all set `fallback: true` — so even where the fault was visible, it was
   indistinguishable from a flaky ollama daemon.

A lane reaching past its menu on **every** tick would have soaked its way to `primary` with a
spotless record. And a lane with a flaky daemon would have been demoted for the runtime's fault.

## The fix

- `ChooseFallbackCause` = `none` | `backend-error` | `unparseable` | `out-of-range`, set by every
  participant. **The recoveries are all unchanged** — the clamp still clamps, the oracle fallback
  still falls back. Only the reporting is new.
- `participantTick(world, participant): ParticipantTick` — the observable boundary, reporting
  `illegalSelection`, `fellBackToOracle`, `cause`, `divergedFromOracle`, `menuSize`, `chosenIndex`.
  `observeWithParticipant` is now a one-line wrapper, so every existing caller is untouched.
- A **throw is not an illegal selection** — nothing was selected. Counting it as one would let a
  broken runtime demote a well-behaved lane, which is the mirror of the original defect.

## And the producer the gate was missing

The promotion gate shipped with the honest admission that nothing produced a `PromotionWindow`, so
every lane resolved to `insufficient_soak` forever. **A gate that can only refuse is half a control:
it is safe, it can never be satisfied, and eventually someone routes around it.**

`observe/promotion-soak.ts` is the other half. It runs a participant over N rounds of the seven
built-in scenarios, counts what the gate reads, and writes the window. Soak hours come from the
clock, not the tick count — a soak measured in ticks is not a soak measured in hours. The
primary-mode counters are written as **zero because a shadow soak dispatched nothing**, which is the
true count, not an assumption of good behaviour; those are produced by the change-control clamp at
dispatch time.

## Measured end to end against a real small model

`ollama` + `qwen2.5:0.5b`, 15 rounds = **105 ticks**, past the gate's 100-tick soak bar:

```
ticks              105
illegal selections 0
divergences        30 (28.6%)
gate: shadow (divergence_too_high) — divergence 0.2857142857142857 exceeds 0.05
```

The gate refuses for the **right reason**, and only because the divergence is measured rather than
assumed. A clean 100-tick window promotes (pinned by a test), so the gate is satisfiable and not
merely safe.

## An observation I could NOT reproduce, recorded as a coincidence rather than a finding

`accelerator/local-llm.ts` asserts the local model is deterministic at temperature 0 with a fixed
seed, and proposes it as a real DST fixture. One early soak round disagreed with later rounds on the
`ferry` scenario. Every controlled follow-up said the claim holds: 10 identical requests → 1 distinct
answer; 3 in isolation and 3 inside full rounds → identical; 3 runs across two model unloads →
identical. Twelve-plus observations of stability against one unreproduced anomaly on the first
request after `ollama pull`. **Not filed as a defect** — one coincidence is a generator, not a
conclusion.

## Falsifiers

```
bun test src/Core.TypeScript/observe/promotion-soak.test.ts   # 17 pass
bun test src/Core.TypeScript/observe/ src/Core.TypeScript/accelerator/   # 1530 pass
bun src/Core.TypeScript/lint/lint-typescript.ts               # exit 0
```

Mutation matrix: **13/13 killed** — including the original blindness restored, only-half-detected,
a throw scored as an illegal selection, both clamps going quiet again, and soak hours faked from the
tick count. One mutant (*the soak stops counting divergences*) SURVIVED the first pass because
"a clean lane records 0 divergences" is satisfied by a counter that never increments; fixed with a
lane that diverges on every tick and an exact `=== ticks` assertion.

The 7 failures in the suite are the pre-existing Windows-only ones (POSIX path assertions,
`core.symlinks=false`).
