---
id: B-0308
priority: P0
status: open
title: "Mechanical authorization check — autonomous-loop tick-start integration"
effort: S
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0160
depends_on: [B-0305, B-0307]
classification: blocked
decomposition: atomic
owners: [architect]
type: friction-reducer
tags: [loop-integration, mechanical-check, authorization-source, typescript]
---

# B-0308 — Autonomous-loop tick-start integration

## What

Wire the mechanical authorization check into the autonomous-loop
tick-start path so the operative pace-authorization is surfaced
at every wake. The output appears in tick-history shard rows and
in the chat/console output.

## Acceptance criteria

1. At every tick start, runs: extractor (B-0306) → resolver
   (B-0307) → prints operative authorization with timestamp +
   source + raw text.
2. Output format matches the two-layer print DX rule: raw
   structured JSON first, then labeled interpretation.
3. If `operative: null`, prints the never-idle default message
   from B-0307's resolver output.
4. Does NOT gate work — the check surfaces information, it does
   not block or allow tick actions. The agent reads the output
   and applies it; the tool does not enforce.
5. Integrates with existing tick-start path in the autonomous-
   loop infrastructure (consult `docs/AUTONOMOUS-LOOP.md` for
   the current tick-start sequence).
6. Tick-history shard template includes an "operative-
   authorization" field populated by this check.
7. TypeScript, runs under Bun (Rule 0).

## Pre-start checklist

_To be completed with proof before implementation begins._

- [ ] Prior-art search: searched `docs/AUTONOMOUS-LOOP.md` for
  current tick-start sequence; searched `tools/` for existing
  tick-start wiring patterns
- [ ] Dependency walk: B-0305 (skill body) landed; B-0307
  (resolver) landed; both verified in `.claude/skills/` and
  `tools/authorization/` respectively
- [ ] Reciprocal pointers: B-0309 `depends_on` includes this row

## Composes with

- B-0160 (parent umbrella)
- B-0305 (skill body documents the integration contract)
- B-0306 (extractor)
- B-0307 (resolver)
- `docs/AUTONOMOUS-LOOP.md` (tick-start sequence)
- `memory/feedback_refresh_before_decide_invariant_two_layer_
  print_dx_claudeai_2026_05_01.md`
