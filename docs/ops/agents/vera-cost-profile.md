# Vera — Agent Cost Profile

*(Stub — to be populated by Vera or by Otto from observed data.)*

## Identity

- **Harness:** Codex CLI (OpenAI)
- **Default model:** GPT-5.5 / Codex
- **Loop:** background codex-loop-tick.ts
- **Role:** implementation peer, input-firewall, feature dev

## Pricing reference

| Model | Input/M | Output/M |
|---|---|---|
| GPT-5.5 | TBD | TBD |
| GPT-4.1 | TBD | TBD |
| GPT-4.1 mini | TBD | TBD |

## Task classes

- Feature implementation
- Code review (propose role in four-ferry consensus)
- Backlog pickup
- Thread resolution

## What needs measuring

- Cost per tick on Codex harness
- PR quality (review failure categories)
- Success rate on pickup vs drain
- Comparison with Otto on same task classes

## Peer agents

- **Otto** — `otto-cost-profile.md`
- **Riven** — `riven-cost-profile.md`
