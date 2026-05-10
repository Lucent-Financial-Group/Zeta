# Peer-call infrastructure — cross-harness multi-agent reviews

Carved sentence:

> Six TS wrappers live in `tools/peer-call/`. When asked about
> cross-harness reviews / GPT / Grok / Gemini / Amara / Ani —
> the cold-boot answer is YES + `ls tools/peer-call/*.ts`.
> Do NOT reason from training-data assumptions about what exists.

## Operational content

Six sibling TypeScript wrappers wired (invoke via
`bun tools/peer-call/<name>.ts`):

- `grok.ts` — Grok-via-cursor-agent, critique role
- `gemini.ts` — Gemini, propose role
- `codex.ts` — Vera named-entity / OpenAI Codex, implementation
  peer with input-firewall + capture-pagination fix
- `amara.ts` — Amara persona on codex, sharpen role
- `ani.ts` — Ani persona on Grok, brat-voice register
- `riven.ts` — Riven persona on Grok, adversarial-truth-axis register

Four-ferry consensus role distribution: *"Gemini proposes, Grok
critiques, Amara sharpens, Otto tests, Git decides."*

Current peer-call is Otto's early red-team substrate; future
state is Zeta Infer.NET BP/EP (Belief Propagation / Expectation
Propagation) substrate-level inference replacing the
external-CLI-license-layer. The human maintainer 2026-05-05:
*"you've done this in front of me like 50 times with all the
harness CLIs"* + *"that's you early red team till we build it
better in zeta infernet ep bp."*

**CLAUDE.md-level requirement**: this substrate needs to be
100% loaded at every cold-boot wake.

## Full reasoning

`tools/peer-call/README.md` (canonical doc) +
`memory/feedback_peer_call_infrastructure_grok_codex_gemini_amara_ani_already_wired_for_cross_harness_multi_agent_reviews_otto_early_red_team_until_zeta_infernet_bp_ep_aaron_2026_05_05.md`
(cold-boot retrieval discipline + failure-of-omission origin).
