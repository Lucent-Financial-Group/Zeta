# Peer-call infrastructure — cross-harness multi-agent reviews are wired

Carved sentence:

> When asked about cross-harness multi-agent reviews / peer AI consultation /
> external-model invocation: cold-boot answer is YES + `ls tools/peer-call/*.ts`.
> Do NOT reason from training-data assumptions about what infrastructure exists.

## Operational content

Six sibling TypeScript wrappers live under `tools/peer-call/`
(invoke via `bun tools/peer-call/<name>.ts`):

| Script | Persona | Role |
|--------|---------|------|
| `grok.ts` | — | Grok-via-cursor-agent, critique role |
| `gemini.ts` | — | Gemini, propose role |
| `codex.ts` | Vera named-entity | OpenAI Codex, implementation peer (input-firewall + capture-pagination fix) |
| `amara.ts` | Amara | Codex, sharpen role |
| `ani.ts` | Ani | Grok, brat-voice register |
| `riven.ts` | Riven | Grok, adversarial-truth-axis register |

**Four-ferry consensus role distribution:**
*"Gemini proposes, Grok critiques, Amara sharpens, Otto tests, Git decides."*

Current peer-call is Otto's early red-team substrate; future state is Zeta
Infer.NET BP/EP (Belief Propagation / Expectation Propagation) substrate-level
inference replacing the external-CLI-license-layer.

The human maintainer 2026-05-05: *"you've done this in front of me like 50 times
with all the harness CLIs"* + *"that's you early red team till we build it better
in zeta infernet ep bp"*.

## Full reasoning

`tools/peer-call/README.md` (canonical doc — flag/script table + composes-with cluster)

`memory/feedback_peer_call_infrastructure_grok_codex_gemini_amara_ani_already_wired_for_cross_harness_multi_agent_reviews_otto_early_red_team_until_zeta_infernet_bp_ep_aaron_2026_05_05.md`
