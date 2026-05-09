---
id: B-0356
priority: P1
status: open
title: "Capture model + token cost in commit message footer (git-native)"
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

# B-0356 — Capture model + token cost in commit message footer

## What

Every commit created by the background loop (or foreground
subagents) should include a cost trailer in the commit message:

```
Cost: model=opus input=200420 output=45100 est=$4.13 dur=156s
Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

Git-native. Survives host migration. Queryable via `git log`.
PR descriptions are host-durable-not-git-canonical — cost data
belongs in the commit, not the PR.

## Why

On enterprise API billing, this data is the evidence for
Kevin's reports. Without it, cost analysis requires
reconstructing token usage from API logs. Commit messages
are git-canonical and queryable via `git log --grep="Cost:"`.

## Implementation

1. The `claude` CLI prints token usage to stderr on
   completion. Parse the last line matching
   `"input_tokens": N, "output_tokens": N` from stderr.
2. In `claude-loop-tick.ts`, capture stderr output
   (already done — logged to `ticks.err`), extract
   token counts, compute estimated cost using the
   pricing table in `docs/ops/COST-REDUCTION-LESSONS.md`.
3. Include `Cost:` trailer in the commit message the tick
   creates, right above the `Co-Authored-By` footer.
4. In `model-rating-report.ts`, add `--git-costs` flag
   that parses `git log --grep="Cost:"` and aggregates
   per-model cost data from committed history.

## Acceptance criteria

- [ ] Every background-loop commit has `Cost:` trailer
- [ ] `git log --grep="Cost:" --oneline` shows cost per commit
- [ ] `model-rating-report.ts --git-costs` aggregates from log
- [ ] Foreground subagent commits also include cost trailer

## Composes with

- `docs/ops/COST-REDUCTION-LESSONS.md` (pricing reference)
- `docs/ops/agents/otto-cost-profile.md` (per-agent cost model)
- `tools/ops/model-rating-report.ts` (report consumer)
- B-0347 (skill description carving — reduces context cost)
