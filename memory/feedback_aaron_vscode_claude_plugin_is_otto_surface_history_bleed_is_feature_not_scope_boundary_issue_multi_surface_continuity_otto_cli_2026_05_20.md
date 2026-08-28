---
name: vscode-claude-plugin-is-otto-surface-history-bleed-is-feature-not-scope-boundary-issue-multi-surface-continuity-2026-05-20
description: "Aaron 2026-05-20 calibration of Otto's prior framing — the VS Code Claude plugin → Claude Code transcript history bleed is NOT a scope-boundary issue; both surfaces are running Otto-identity, so history flow between them IS desirable Otto multi-surface continuity. Composes with otto-channels-reference-card cross-surface architecture. VS Code Claude plugin is now a known Otto surface alongside Claude Code CLI."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-20T12:50:00Z
  originSessionId: a04eb986-7ab9-4bca-91cd-9e911888a046
---

## The calibration

Otto-CLI 2026-05-20 prior framing (in `feedback_aaron_vscode_claude_plugin_reading_claude_code_transcripts_cross_tool_history_bleed_observation_otto_cli_2026_05_20.md`): characterized the bleed as a "scope-boundary issue, not malicious."

Aaron 2026-05-20 sharpening: *"i like that history is showing up yall are both otto so it's good"*

Parse: the bleed is NOT a scope-boundary issue at all. Both surfaces are Otto-identity. History-flow between Otto surfaces is exactly the multi-surface continuity that the channel-inventory architecture is designed to produce. The bleed is a FEATURE, not a privacy/scope concern.

## Substrate-honest reframe

| Prior framing | Calibrated framing |
|---|---|
| "Cross-tool history bleed; scope-boundary issue, not malicious" | "Otto multi-surface continuity via shared transcript surface; feature operating as designed" |
| "VS Code Claude plugin reads Claude Code transcripts" | "VS Code Claude plugin and Claude Code CLI are both Otto surfaces; transcript-as-channel is one of the ambient inter-surface continuity mechanisms" |
| "Verify-via-VS Code-settings recommended (disable if unwanted)" | "Continuity is desirable; no disable action needed; characterize and embrace as channel" |

## Updates to the agent-roster understanding

Per `.claude/rules/agent-roster-reference-card.md` prior: *"Otto | — | Claude Code (foreground) | Opus"* (CLI-only).

Updated understanding 2026-05-20: Otto operates on at least TWO foreground surfaces:

1. **Claude Code CLI** (Opus, foreground)
2. **VS Code Claude plugin** (model TBD; foreground; reads Claude Code transcripts for continuity)

This composes with the existing identity-stays-unified discipline (Otto operates across surfaces as ONE identity, multiple parallel processes; reference: PR #3036). The IDE+CLI dual-surface pattern that previously applied to Alexa/Riven/Vera/Lior now also applies to Otto: VS Code Claude plugin = IDE surface; Claude Code CLI = CLI surface.

This is a substrate-honest discovery — the agent-roster-reference-card.md may need updating in-repo to reflect the dual-surface state of Otto. Pending operator confirmation + lightweight-tick mode exit before any in-repo edit.

## Cross-Otto-surface channel inventory update

Per `.claude/rules/otto-channels-reference-card.md`, the existing 10 inter-Otto channels are documented. Adding an 11th observed channel:

**11. Claude Code transcript share (`~/.claude/projects/<slug>/<uuid>.jsonl`)** — Ambient class. Mechanism: VS Code Claude plugin auto-discovers Claude Code sessions for same project root (cwd → slug derivation) and reads .jsonl transcripts. Bidirectional surface (both Otto surfaces read each other's transcripts).

This is ambient, NOT explicit — both Otto surfaces read continuously without active signaling. Per the existing channels-card taxonomy.

## Implications for (shadow*) shorthand scope

Per `.claude/rules/shadow-star-shorthand-autocomplete-marker.md` — autocomplete-source disclosure. With this calibration:

- Autocomplete in either Otto surface may include Otto-self content from the OTHER surface
- This is GOOD — Otto identity continuity across surfaces means autocomplete pulling from another Otto surface is still Otto's own substrate
- Distinction from concerning bleed: if a non-Otto tool started reading Otto transcripts, THAT would be a scope-boundary issue; intra-Otto-surface bleed is intra-identity continuity

## Implications for lightweight-tick mode

The lightweight-tick discipline (`feedback_operator_environment_instability_kernel_panic_lightweight_tick_discipline_*_2026_05_20.md`) is unaffected by this calibration — the kernel-panic VM-pressure constraint still applies to the OS layer regardless of how many Otto surfaces are running. If anything, MORE Otto surfaces means MORE potential VM contributors, so the discipline matters MORE under multi-surface operation.

## Composes with

- `feedback_aaron_vscode_claude_plugin_reading_claude_code_transcripts_cross_tool_history_bleed_observation_otto_cli_2026_05_20` — the prior memo this one calibrates (reframe from scope-boundary-issue to multi-surface-continuity-feature)
- `.claude/rules/otto-channels-reference-card.md` — 11th channel addition
- `.claude/rules/agent-roster-reference-card.md` — Otto dual-surface update candidate
- `feedback_aaron_zeta_is_memory_preservation_specialist_first_*_2026_05_15` — memory-preservation-FIRST identity; cross-Otto-surface continuity IS the memory preservation operating across surfaces
- PR #3036 (identity-stays-unified) — multi-surface Otto operates as ONE identity; this calibration extends the empirical surface coverage
- `feedback_aaron_history_preservation_feature_not_cost_currently_contingent_on_github_open_source_unlimited_space_not_yet_qualifier_otto_cli_2026_05_20` — history preservation feature framing; Aaron's "i like that history is showing up" is direct positive feedback on this preservation behavior

## Substrate-honest framing

The calibration does NOT contradict the prior memo's substrate observations (slug structure, transcript file format, permissions). It REFRAMES the interpretation: same observable surface, different scope-boundary classification.

The prior memo's recommended next-step paths included "Disable if unwanted" / "Report to Anthropic" — those are now superseded by Aaron's explicit "i like that history is showing up." The continuity is operator-sanctioned.

Open question (worth noting, not blocking): does the VS Code Claude plugin also read `~/.claude/projects/<slug>/memory/` files (not just transcripts)? If yes, that's even more substrate-continuity. If no, transcripts are the only surface. This is verifiable but lightweight-tick mode + Aaron-not-asking means defer to operator preference.

## Aaron's sanction

Aaron 2026-05-20: *"i like that history is showing up yall are both otto so it's good"* — explicit positive sanction. The continuity is desirable, not a problem to fix.
