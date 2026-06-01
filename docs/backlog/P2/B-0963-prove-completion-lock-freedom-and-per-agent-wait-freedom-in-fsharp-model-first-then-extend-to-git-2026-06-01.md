---
id: B-0963
title: Prove completion-lock-freedom + per-agent wait-freedom — F# model first (no git), then extend to git
status: open
priority: P2
created: 2026-06-01
last_updated: 2026-06-01
author: otto-cli
composes_with:
  - B-0962 # the two unproven claims this row proves (multi-round review flagged them)
  - B-0959 # sovereign-DB lane master (lock-free/wait-free always-active disciplines)
  - B-0954.1 # bus-tip partition tolerance (the git-extension hazards: partition, visibility lag)
  - B-0767 # scheduler-first DST (the F# IScheduler model harness)
  - B-0878 # time-generator IScheduler abstraction (deterministic concurrency model)
---

# B-0963 — Prove completion-lock-freedom + per-agent wait-freedom

> **Why this row exists (not dogma):** the multi-round review of B-0962 (Grok +
> Gemini + Amara, 2026-06-01) established what the menu construction buys —
> symmetry-breaking + lock-free _selection_ under assumptions — and what it does
> **NOT** prove: **completion-lock-freedom** (system always finishes _work_, not
> just wins a selection) and **per-agent wait-freedom** (every agent eventually
> completes, bounded). Aaron 2026-06-01: _"we should backlog proving this in F#
> not git, and then try to extend to git."_ Prove the abstract protocol where it's
> clean (F#, deterministic, no I/O), then re-establish what survives git's real
> hazards.

## §0 The two properties to prove

| Property                    | Informal                                                                                                              | Strength                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **Completion-lock-freedom** | the _system_ always makes progress on actual work (some agent completes its operation), not merely "one wins the CAS" | system-wide liveness          |
| **Per-agent wait-freedom**  | _every_ agent completes within a bounded number of its own steps (no starvation)                                      | per-process liveness, bounded |

These are **liveness/progress properties under concurrency** — distinct from the
safety properties (mutual-exclusion, no-lost-update via fencing) B-0962 already
argues. Liveness needs **fairness assumptions** stated explicitly (that's the
whole game): lock-freedom typically needs **weak fairness**; wait-freedom needs
**strong fairness** or an explicit fairness mechanism (the jitter/ticket knob).

## §1 Phase A — prove in the F# model (no git)

Model the coordination protocol abstractly: agents, a shared CAS register
(`compare-and-set`), the menu-as-state-fold selection, TTL, optional fairness
knob. **No git, no network, no I/O** — pure deterministic concurrency over an
`IScheduler` (B-0878 / B-0767 scheduler-first DST is the harness; "time is a
generator over IScheduler").

- **F# executable model** — the abstract protocol as F# (CAS register + N agent
  loops + menu fold). Runs under the deterministic scheduler so every interleaving
  is reproducible from seed.
- **Tool routing (per `formal-verification-expert` — pick the tool for the property
  class; do NOT TLA+-hammer reflexively, but liveness-under-concurrency IS TLA+'s
  sweet spot):**
  - **TLA+ / TLC** — model-check **lock-freedom** under weak fairness and
    **wait-freedom** under strong fairness (temporal-logic liveness with explicit
    `WF`/`SF` fairness; this is exactly what TLA+ is for). The honest deliverable is
    "property X holds under fairness assumption Y."
  - **FsCheck** — property-based tests of the F# model (at-most-one-winner;
    monotone progress of the work-set; no-lockstep-re-pick once a winner is
    visible). Tests, not proofs — they bound confidence, they don't replace TLC.
  - **Lean** (optional, only if a machine-checked theorem is wanted) — the
    progress argument as a proof; reserve for if TLC + FsCheck leave a gap worth a
    full proof.
- **Expected honest result (to be confirmed, not assumed):** lock-freedom holds
  under weak fairness + at-most-one-winner; **wait-freedom does NOT hold without an
  explicit fairness mechanism** (pure CAS starves an unlucky agent) — it holds only
  with the jitter/ticket fairness knob (B-0962 §3.1 explicit symmetry-breaking).
  The proof's job is to make that boundary precise.

## §2 Phase B — extend to git (re-establish under real hazards)

The F# model assumes instant visibility + no partition. Git adds the hazards the
round-1 review named — re-run the analysis with them and state what survives:

- **Visibility lag** (local-vs-remote ref propagation) — a loser may not see the
  winner's reservation yet → re-picks → extra failed round. Does lock-freedom
  survive? (Likely yes under partial-synchrony / eventual-visibility; wait-freedom
  degrades.)
- **Partition** (B-0954.1) — under a network partition the named-ref tip can't
  serialize globally; "the current bus" is a consensus problem, not a CRDT merge.
  Progress likely holds only **within a connected component / quorum**; state that
  explicitly.
- **Stale reads / stalled winner** — a winner that pauses past TTL (the fencing
  case) — completion-lock-freedom must account for the work being redone by a new
  holder (fencing makes it safe, not necessarily progress-bounded).
- **Deliverable:** the model extended with these, plus a precise statement: which
  property holds under which synchrony/partition assumption. Almost certainly
  "lock-freedom under partial synchrony + eventual visibility; wait-freedom only
  with the explicit fairness knob; both scoped to a connected quorum under
  partition." The value is the _precise_ assumption list, not a blanket claim.

## §3 Acceptance criteria

- [ ] F# abstract model of the coordination protocol (CAS + menu fold + TTL +
      optional fairness knob) over the deterministic `IScheduler` (B-0878/B-0767).
- [ ] TLA+ spec + TLC model-check: lock-freedom under weak fairness;
      wait-freedom under strong fairness / explicit fairness mechanism. Record the
      fairness assumption each property requires.
- [ ] FsCheck properties on the F# model (at-most-one-winner; work-set monotone
      progress; no-lockstep-re-pick-once-visible).
- [ ] Phase-B extension: re-state each property under visibility-lag + partition +
      stale-winner; produce the **precise assumption list** (not a blanket claim).
- [ ] Update B-0962 §3 with the proven boundary (replace "not proven" with the
      established result + its assumptions) once Phase A lands.
- [ ] (Optional) Lean machine-checked proof only if TLC + FsCheck leave a gap.

## §4 Master-checklist linkage

Proves the B-0962 liveness claims the multi-round review left open; under the
sovereign-DB lane (B-0959), reachable from `docs/ACTIVE-WORKSTREAMS.md`. The "F#
first, then git" sequencing matches the lane's 4-oracle discipline (prove on the
clean substrate, then extend to the messy one) and the framework's
lock-free/wait-free always-active disciplines.
