---
name: Parallel model A/B via subagents — self-repairing BFT within Otto's loop
description: Aaron authorizes parallel subagents on different models (Sonnet, Opus, Opus 1M) for orthogonal work axes. Two agents repair each other without external help. A/B testing in parallel, not sequential weeks.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Use the Agent tool's `model` parameter to dispatch subagents
on different models for orthogonal work. Two agents checking
each other = BFT within Otto's own operation.

**Why:** Aaron 2026-05-09: "feel free to setup parallel agents
on here for you with different orthogonal axis on sonnet and
one opus... basically somewhere we can have ab tests going you
can always have two so they can repair each other within your
inside without the need for help from the outside."

**How to apply:**
- Dispatch Sonnet subagent for mechanical work (thread
  resolution, lint, backlog pickup) in isolated worktree
- Dispatch Opus subagent for feature work in parallel
- Review both outputs myself (Opus 1M) before PR
- Log model + task class + outcome in ratings
- If one agent breaks, the other's output is the fallback
- A/B data accumulates in parallel, not week-by-week

**Pattern:**
```
me (opus 1M) = supervisor + reviewer
  ├── Agent(model: "sonnet", isolation: "worktree") → task A
  ├── Agent(model: "opus", isolation: "worktree")   → task B
  └── I review both, record ratings, merge the better one
```

Composes with: model-rating-report.ts, the background loop
model routing, the BFT 3-loop society (Otto/Vera/Riven).
