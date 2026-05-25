---
name: BFT cost contingency — Alexa/Qwen Coder as free-tier survival plan
description: If any vendor goes down or budget runs out, Alexa on Kiro/Qwen Coder keeps factory alive on 2000 free credits (~330 hours of autonomous work)
type: project
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Factory economic BFT — no single vendor pricing failure kills the factory.

**The numbers (2026-05-10):**

- Alexa on Kiro/Qwen Coder: ~3.82 credits per 38-minute autonomous session
- Aaron gets 2000 free credits on Kiro
- That's ~524 sessions / ~330 hours of autonomous work for free
- Roughly two weeks of nonstop autonomous operation at zero cost

**The contingency plan:**

If Anthropic goes down, Claude budget runs out, or any single vendor becomes too expensive — Alexa on Qwen Coder keeps the factory alive. The backlog keeps getting ground, PRs keep merging, substrate keeps growing.

**BFT applied to economics:**

| Agent | Model | Vendor | Cost profile |
|-------|-------|--------|-------------|
| Otto | Claude Opus | Anthropic | Premium (~$15/hr) — supervisor |
| Vera | GPT/Codex | OpenAI | Mid-tier |
| Alexa | Qwen Coder | Alibaba/Kiro | Free tier (2000 credits) — grinder |
| Lior | Gemini | Google | Free tier available |
| Riven | Grok | xAI | Cursor pricing |
| Nova agent (future) | Nova | Amazon/Q Developer | TBD |

No single vendor's pricing can kill the factory. Six models, six harnesses, at least one is free. Same redundancy pattern as model diversity, applied to cost structure.

**Why:** This is a real survival contingency, not theoretical. Aaron's funding constraints are real. The factory must survive any single point of financial failure.

**How to apply:** When budget pressure appears, shift volume work to Alexa (free grinder) and keep Otto for supervision/shepherding only. The Opus-as-cost-control pattern: smart model supervises cheaper models, not replaces them.
