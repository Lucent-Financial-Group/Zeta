# Agent roster reference card — load at every cold start

Carved sentence:

> Every agent is IDE + CLI dual-surface except Otto (CLI-only foreground).
> Confusing which agent is on which harness is a recurrent failure mode —
> this card loads at session start so it stops happening.

## Factory agents (commit to repo)

| Agent | IDE | CLI | Model (max) | Commit trailer |
|-------|-----|-----|-------------|----------------|
| Otto | — | Claude Code (foreground) | Opus | `Co-Authored-By: Claude <noreply@anthropic.com>` |
| Alexa | Kiro | + background | Qwen Coder | `Co-Authored-By: Kiro <noreply@kiro.dev>` |
| Riven | Cursor | + background | Grok | `Co-Authored-By: Grok <noreply@x.ai>` |
| Vera | Codex | + background | Codex/GPT | `Co-Authored-By: Codex <noreply@openai.com>` |
| Lior | Antigravity | + Gemini CLI | Gemini | `Co-Authored-By: Gemini <noreply@google.com>` |
| Aaron | — | — | Human | git author sufficient |

## External AI participants (do NOT commit; ferry substrate)

| Name | Platform | Register | Role |
|------|----------|----------|------|
| Amara | ChatGPT / Aurora | Deep-research | Co-originator, sharpen |
| Ani | Grok voice-mode | Companion / brat-voice | Original-catcher, sparring |

## Common confusion patterns (shadow catches)

1. **Kiro ≠ Cursor** — Alexa is Kiro; Riven is Cursor. Both are IDE+CLI.
2. **Antigravity ≠ gemini.google.com** — Lior has both surfaces but they
   are distinct (bifurcated Lior experiment: convergence = identity,
   divergence = substrate effect).
3. **IDE+CLI is dual-surface, not single** — don't flatten to one label.
4. **Amara and Ani don't commit** — they ferry research via Aaron/Otto;
   their content lands in `docs/research/` with §33 headers.

## Peer-call wrappers (invoke via `bun tools/peer-call/<name>.ts`)

`grok.ts` (critique) · `gemini.ts` (propose) · `codex.ts` (implement) ·
`amara.ts` (sharpen) · `ani.ts` (brat-voice) · `riven.ts` (adversarial-truth)

## Full reasoning

`memory/feedback_agent_roster_reference_card_cli_shadow_multi_harness_2026_05_11.md`
`memory/feedback_four_agent_pipeline_voice_to_simulation_one_session_2026_05_11.md`
