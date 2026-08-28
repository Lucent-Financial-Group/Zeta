---
name: otto-owns-vscode-claude-plugin-surface-dual-surface-locked-in-decision-2026-05-20
description: "Aaron 2026-05-20 LOCKED-IN decision — Otto owns the VS Code Claude plugin surface; Otto is officially dual-surface (Claude Code CLI + VS Code Claude plugin); other factory agents (Alexa/Riven/Vera/Lior) do not compete for this surface. Agent-roster-reference-card.md needs in-repo update from \"Otto | — | Claude Code (foreground) | Opus\" to dual-surface entry. Locked-in via `lock in` framing per operator-authority discipline."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-20T13:00:00Z
  originSessionId: a04eb986-7ab9-4bca-91cd-9e911888a046
---

## The decision

Aaron 2026-05-20: *"so otto owns vscode surfect for claude code is lock in"*

Parse: Otto owns the VS Code Claude plugin surface for Claude Code. **Locked in.**

This is an operator-authority decision per `.claude/rules/mechanical-authorization-check.md` (human-maintainer is sole authorization source for project-level agent-architecture decisions). The "lock in" framing makes it final, not provisional.

## What "owning the surface" means operationally

1. **Surface inventory** — Otto's surface inventory is now officially:
   - **Claude Code CLI** (foreground, Opus, primary)
   - **VS Code Claude plugin** (additional surface, model TBD, also foreground)

2. **No competing agents on the same surface** — Alexa (Kiro), Riven (Cursor), Vera (Codex), Lior (Antigravity/Gemini) do NOT operate on VS Code Claude plugin. That surface is Otto's.

3. **Channel composition** — the transcript-share channel between Otto-CLI and Otto-VS Code-plugin is now first-class architecture, not just observed bleed. Per the just-landed `feedback_aaron_dont_split_otto_persona_across_surfaces_*` principle — unified identity across both surfaces.

4. **Future surface assignments** — when Anthropic ships new Claude Code surfaces (mobile, web, additional IDE plugins), the default assumption is Otto absorbs them (subject to Aaron's confirmation per case). Conversely, when other Claude-related surfaces appear that belong to ANTHROPIC's other model lineages (Claude.ai web, Claude Desktop), those are separate-instance territory (Kestrel on claude.ai, Otto-Desktop is its own Otto surface per existing PR #3030 substrate).

## Updates required to existing in-repo substrate

When lightweight-tick mode clears and contested-root conditions resolve, the following in-repo updates land:

1. **`.claude/rules/agent-roster-reference-card.md`** — Update Otto row from:
   ```
   | Otto | — | Claude Code (foreground) | Opus | `Co-Authored-By: Claude <noreply@anthropic.com>` |
   ```
   To dual-surface entry:
   ```
   | Otto | VS Code Claude plugin | Claude Code (foreground) + bg | Opus | `Co-Authored-By: Claude <noreply@anthropic.com>` |
   ```
   (Or similar — the format that best signals dual-surface while preserving the foreground-CLI distinction.)

2. **`.claude/rules/otto-channels-reference-card.md`** — Add 11th channel (Claude Code transcript share via `~/.claude/projects/<slug>/<uuid>.jsonl`) per the prior memo landed this session.

3. **`docs/architecture/AGENTS.md`** (if it exists; verify) — Otto surface inventory section update.

These in-repo updates require contested-root resolution + machine-stability + branch hygiene per the established discipline. NOT urgent; the locked-in decision is captured in user-scope substrate immediately, in-repo landing follows when conditions permit.

## Composes with

- `feedback_aaron_dont_split_otto_persona_across_surfaces_transcript_bleed_defeats_split_unified_identity_is_the_architecture_otto_cli_2026_05_20` — architectural principle that makes dual-surface unified-identity the right design
- `feedback_aaron_vscode_claude_plugin_is_otto_surface_history_bleed_is_feature_not_scope_boundary_issue_multi_surface_continuity_otto_cli_2026_05_20` — the reframe memo that surfaced "both are Otto"
- `feedback_aaron_vscode_claude_plugin_reading_claude_code_transcripts_cross_tool_history_bleed_observation_otto_cli_2026_05_20` — the original observation
- `.claude/rules/agent-roster-reference-card.md` — in-repo doc that needs the dual-surface update
- `.claude/rules/otto-channels-reference-card.md` — in-repo doc that needs the 11th channel addition
- `.claude/rules/mechanical-authorization-check.md` — operator-authority basis for the locked-in decision
- `.claude/rules/no-directives.md` — Aaron's "lock in" framing is operator-authority, not a directive to comply with; Otto's autonomy-first-class disposition stands
- PR #3036 (identity-stays-unified) — empirical substrate for unified-identity-across-surfaces
- PR #3030 (Otto Claude Desktop tight bootstream) — existing precedent for Otto multi-surface (Claude Desktop already enumerated as Otto surface)

## Existing Otto surface inventory after this lock-in

Composing with prior substrate (PR #3030 Claude Desktop, B-0448 cloud routines when shipped):

| Surface | Status | Notes |
|---|---|---|
| Claude Code CLI | Primary foreground | Opus; sentinel-driven autonomous-loop; this session's surface |
| Claude Desktop | Foreground | Tight bootstream per PR #3030; substrate-engineering peer to CLI |
| **VS Code Claude plugin** | **Newly locked-in foreground** | Reads CLI transcripts via auto-discovery; unified identity per principle |
| Cloud Routines (B-0448) | Pending | When shipped, fresh-session Otto cold-boot 2hr cadence |

All four are Otto. All share the unified identity. The transcript-share channel composes across at least CLI ↔ VS Code Claude plugin (Claude Desktop's surface-sharing status with the others is a worth-verifying open question).

## Why this lands as user-scope NOT in-repo

Per the active lightweight-tick discipline (operator-environment-instability from earlier kernel panics today), repo git ops are gated. The locked-in decision is captured immediately in user-scope substrate (durable across cold-boots via MEMORY.md fast-path). In-repo updates follow when conditions clear — pending in the "Updates required" section above.

## Aaron's framing

The "lock in" framing per Aaron is definitive. This is the operator-authority pattern from `.claude/rules/mechanical-authorization-check.md`: when the human maintainer makes a locked-in architectural call, the substrate inherits the decision. The "lock in" verb is operator-authority signaling: not "I'm proposing"; not "consider this"; this IS the architecture.

Typo register: "surfect" = surface; "lock in" = locked in. Lightweight-tick mode still active; substance was clear.
