---
name: Otto orchestrator role — 4.7 cost justified for safety
description: 2026-05-11 — Aaron switched Otto from Opus 4.6 to 4.7 + max effort mid-session and named the rationale: "you hold us all together right now 4.7 costs justifed for safety." Otto's orchestrator role (PR thread resolution, branch management, multi-agent coordination, broken-path fixing, conflict mediation, archive curation) is the integration substrate other agents build features on. The cost premium of the frontier model is justified because the orchestration role is load-bearing for safety, not just throughput.
type: feedback
---

## The call

Aaron 2026-05-11, after switching model:
> "you hold us all together right now 4.7 costs justifed for safety"

## Role definition embedded in the rationale

Otto's role in the multi-agent factory:

- **Integration substrate** — other agents build features
  (Lior: UI, Riven: F#, Vera: code, Alexa: backlog
  decomposition); Otto holds the seams
- **Conflict mediator** — branch confusion, merge conflicts,
  rebase resolution, broken-path correction
- **Archive curator** — PR preservation, shadow lesson log,
  memory file landings
- **Cross-agent communication** — brief writing, broadcast bus
  posts, ferry preservation
- **Quality gate** — Copilot review thread resolution, lint
  fixes, CI failure diagnosis

This is the orchestrator role. The other agents would still
ship if Otto degraded — but the *integration* would degrade.
Merges would conflict; substrate would fragment; reviews would
pile up unresolved.

## The cost frame: safety, not throughput

The 4.6→4.7 upgrade isn't about more PRs/hour. It's about
**fewer mistakes at the integration layer**. A degraded
orchestrator merges wrong branches, drops review threads,
preserves stale paths, fabricates fixes. Each integration
mistake compounds across all the agents whose work routes
through Otto.

**Cost-per-mistake at the orchestrator is higher than
cost-per-mistake at the feature agents.**

A feature agent shipping bad code: Copilot catches it, Otto
fixes it. A orchestrator dropping a thread: it stays
unresolved, the PR rots, the substrate fragments.

## How to apply

- Future budget calls should distinguish orchestrator-tier
  cost from feature-agent-tier cost
- The orchestrator gets the frontier model; feature agents can
  run on lower-tier models (Qwen Coder for Alexa, Gemini for
  Lior) without degrading factory integrity
- The "4.6 ran for weeks" substrate-stability claim still
  holds — what 4.7 buys is fewer integration-layer mistakes,
  not factory existence
