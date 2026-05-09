---
id: B-0356
priority: P1
status: open
title: "Capture model + token usage in commit trailer (git-native, cost derived at query time)"
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

# B-0356 — Capture model + token usage in commit trailer

## What

Every commit created by the background loop (or foreground
subagents) should include a `Tokens:` trailer in the commit
message — raw token counts only, no cost estimate:

```
Tokens: model=opus input=200420 output=45100 cache_read=180000 cache_write=20420 dur=156s
Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

**Five numbers fully determine cost at any future rate card:**

| Fact | Why |
|---|---|
| `model` | Determines rate card row |
| `input` | Total input tokens |
| `output` | Total output including thinking tokens |
| `cache_read` | Input subset that hit prompt cache (90% discount) |
| `cache_write` | Input subset written to cache (25% premium) |

**Tokens are the atoms. Cost is derived at query time:**

```
uncached = input - cache_read - cache_write
cost = (uncached × input_rate)
     + (cache_read × input_rate × 0.10)
     + (cache_write × input_rate × 1.25)
     + (output × output_rate)
```

Never store cost — it changes when pricing changes. Store
the immutable facts (tokens used + cache breakdown), derive
the view (dollar cost) when you need it.

Git-native. Survives host migration. Queryable via
`git log --grep="Tokens:"`.

## Why

On enterprise API billing, this data is the evidence for
Kevin's reports. Token counts are the raw material; the
report script multiplies by the current pricing table to
produce cost. No re-pricing hygiene needed — the facts
never rot, only the rate card changes.

## Implementation

1. Claude Code session JSONL transcripts at
   `~/.claude/projects/` already contain per-message
   `input_tokens`, `output_tokens`,
   `cache_creation_input_tokens`, and
   `cache_read_input_tokens`. Sum across the session.
2. In `claude-loop-tick.ts`, after the `claude -p` call
   completes, parse the session JSONL (or stderr summary)
   to extract the five token counts.
3. Include `Tokens:` trailer in the commit message the
   tick creates, right above the `Co-Authored-By` footer.
4. In `model-rating-report.ts`, add `--git-costs` flag
   that parses `git log --grep="Tokens:"`, applies the
   current pricing formula, and aggregates per-model.

## Acceptance criteria

- [ ] Every background-loop commit has `Tokens:` trailer
- [ ] `git log --grep="Tokens:" --oneline` shows usage per commit
- [ ] `model-rating-report.ts --git-costs` derives cost from log
- [ ] Foreground subagent commits also include token trailer

## Composes with

- `docs/ops/COST-REDUCTION-LESSONS.md` (pricing reference)
- `docs/ops/agents/otto-cost-profile.md` (per-agent cost model)
- `tools/ops/model-rating-report.ts` (report consumer)
- B-0347 (skill description carving — reduces context cost)
