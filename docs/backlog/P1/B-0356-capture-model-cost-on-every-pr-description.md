---
id: B-0356
priority: P1
status: open
title: "Capture model + token cost on every PR description"
effort: S
created: 2026-05-09
last_updated: 2026-05-09
depends_on: []
classification: buildable-now
decomposition: atomic
owners: [architect]
type: friction-reducer
tags: [cost-governance, model-routing, A/B-testing, enterprise-billing]
---

# B-0356 — Capture model + token cost on every PR description

## What

Every PR created by the background loop (or foreground subagents)
should include a cost metadata footer in the PR description:

```
### Cost metadata
- Model: opus
- Input tokens: 200,420
- Output tokens: 45,100
- Estimated cost: $4.13
- Duration: 156s
```

## Why

On enterprise API billing, this data is the evidence for
Kevin's reports. Without it, cost analysis requires
reconstructing token usage from API logs — which we don't
have access to from the repo side. PR descriptions are
git-canonical (host-durable) and queryable via `gh api`.

The model-rating-report.ts already tracks model/duration/
produced_pr — adding cost to the PR description closes the
loop so the report can pull cost directly from GitHub.

## Implementation

1. The `claude` CLI prints token usage to stderr on
   completion. Parse the last line matching
   `"input_tokens": N, "output_tokens": N` from stderr.
2. In `claude-loop-tick.ts`, capture stderr output
   (already done — logged to `ticks.err`), extract
   token counts, compute estimated cost using the
   pricing table in `docs/ops/COST-REDUCTION-LESSONS.md`.
3. When the tick creates a PR (via `gh pr create`), append
   the cost metadata footer to the PR body.
4. In `model-rating-report.ts --reviews`, pull cost from
   PR description via `gh api` and include in the
   per-model comparison table.

## Acceptance criteria

- [ ] Every background-loop PR has cost metadata in description
- [ ] `model-rating-report.ts --reviews` includes cost column
- [ ] Foreground subagent PRs also include cost (when dispatched
  via the parallel A/B pattern)

## Composes with

- `docs/ops/COST-REDUCTION-LESSONS.md` (pricing reference)
- `docs/ops/agents/otto-cost-profile.md` (per-agent cost model)
- `tools/ops/model-rating-report.ts` (report consumer)
- B-0347 (skill description carving — reduces context cost)
