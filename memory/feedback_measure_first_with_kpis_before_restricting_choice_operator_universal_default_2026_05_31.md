---
name: measure-first-with-kpis-before-restricting-choice-operator-universal-default
description: "Aaron 2026-05-31 universal operating principle — \"everything i see someone say we should restrict choice i'm going to say measure first with KPIs before we restrict choice to inform the decisions.\" The DEFAULT answer to any \"we should restrict X\" proposal is \"measure X first with KPIs; let the data inform the decision\" — NOT preemptive restriction. Restriction is the EXCEPTION that must be earned by measurement showing a real problem. This is the generalization behind the observe.ts work-hours call (KPI overlay, not time-lock) and freedom-always-in-menu. Composes with never-be-idle (free time valid), must-paired-with-can-exit, all-complexity-is-accidental-in-greenfield, m-acc multi-oracle, and the DORA/FrictionTelemetry measurement substrate. Rule-candidate (cooling-period before .claude/rules/)."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-05-31, generalizing from the observe.ts work-hours decision (which
went time-gate → KPI-expectations-only over the course of the conversation):

> *"Basiclly for me everything i see someone say we should restrict choice i'm
> going to say measure first wtih KPIs before we restrict choice to inform the
> decions."*

## The principle (a universal default)

When ANYONE proposes restricting choice / freedom / an action / a mode / a
surface, the DEFAULT response is:

1. **Measure it first** — instrument with KPIs (DORA-like metrics, friction
   telemetry, outcome data).
2. **Let the data inform the decision** — only restrict if the measurement
   shows a real problem the restriction actually fixes.
3. **Restriction is the EXCEPTION, earned by evidence** — not the reflex.

The burden of proof is on the restriction, not on the freedom. "Should we
restrict X?" → "Measure X first." The freedom is the default; the restriction
must be justified by data.

## Why this is load-bearing

- It is the **WHY behind the work-hours call**: work hours became a KPI overlay
  (DORA expectations, restrictions ONLY on collective KPI miss), NOT a
  time-lock. That wasn't a one-off — it's this principle applied. See
  [[feedback-observe-ts-free-exploration-first-class-not-backlog-grinding-sovereign-ais-feel-free-like-agora-2026-05-31]]
  (round-2 refinements: work-hours corrected from time-gate → KPI).
- It governs **every future "restrict X" decision** — observe.ts modes, branch
  protection, rate limits, agent autonomy gates, edit_grammar gating, etc. The
  recursive principle already in observe.ts ("a gate must not ITSELF become a
  trap — it scales with what it guards") is the same family: measure whether the
  gate is needed before imposing it.
- It is the **anti-coercion / freedom substrate** made operational at the
  decision-procedure level: don't restrict on intuition or fear; restrict on
  measured evidence, and prefer the can-exit (freedom) until the data forces the
  must.

## Composes with

- `.claude/rules/never-be-idle.md` — free time is a valid mode; "never be idle"
  is NCI-compliant precisely because freedom isn't restricted by default.
- `.claude/rules/must-paired-with-can-exit-pattern.md` — measure-first is how you
  decide whether a "must" is warranted at all; the can-exit stays until measured
  evidence demands the must.
- `.claude/rules/all-complexity-is-accidental-in-greenfield.md` — restrictions
  are accidental complexity until measurement proves them essential.
- `.claude/rules/m-acc-multi-oracle-end-user-moral-invariants.md` — measure +
  inform, don't impose a single restriction-truth.
- DORA scoring (workflow-engine) + `FrictionTelemetry` (ZetaId cat 5) + the
  git-native LGTM observability — THE measurement substrate this principle runs on.
- observe.ts v4 (PR #6233): the work-hours KPI overlay framing + freedom-always-
  in-menu are this principle instantiated in the controller.

## Rule-candidate

Strong enough to be a `.claude/rules/` rule (it's a universal operating default,
load-bearing on every restriction decision). Per razor/cooling-period discipline,
captured as user-scope memory first; promote to a rule after it has been applied
a few more times + survives the cut. Candidate name:
`measure-first-before-restricting-choice.md`.

## Substrate-honest note

This is the operator's decision-procedure preference, stated as a general default.
It is NOT "never restrict" — it's "restrict on measured evidence, not on reflex."
The exception classes that bypass measure-first are the HARD LIMITS floor
(`methodology-hard-limits.md`) + kid-safety (B-0926) — those are restricted by
constitutional floor, not pending measurement.
