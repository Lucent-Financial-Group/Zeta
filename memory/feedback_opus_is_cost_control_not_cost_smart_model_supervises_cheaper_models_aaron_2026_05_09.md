---
name: Opus is cost control, not cost — smart model supervises cheaper models
description: Enterprise API billing framing — Opus builds the evaluation infrastructure that enables safe routing to cheaper models. ST called out the spend but didn't say reduce it; they want reports. The reports ARE the justification.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Opus high-effort is the supervisor model, not the line worker.
It builds rating infrastructure, review category classifiers,
A/B comparison reports, and routing decisions. The cheaper
models (Sonnet, Haiku) do volume work under that supervision.

**Why:** Aaron 2026-05-09 after ST (Kevin) called out the
~$10K/week spend on enterprise API billing. ST did not say
reduce spend — they want to see reports showing model-level
evaluation and intentional routing. The reports Opus produces
ARE the cost governance.

**How to apply:** When cost conversations surface, the answer
is not "use AI less" or "downgrade the model." The answer is
"here's the data from the smart model showing which tasks can
safely route to cheaper models." Keep Opus for: supervision,
evaluation, architecture, novel debugging, routing decisions.
Route to Sonnet/Haiku for: thread resolution, lint fixes,
backlog pickup of mechanical items, heartbeats.

Composes with: docs/ops/COST-REDUCTION-LESSONS.md (the
dollar math), tools/ops/model-rating-report.ts (the
evidence generator), the A/B rating tracker in the
background loop tick script.
