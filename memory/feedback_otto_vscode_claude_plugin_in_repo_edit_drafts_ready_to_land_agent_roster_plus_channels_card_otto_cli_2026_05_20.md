---
name: otto-vscode-claude-plugin-in-repo-edit-drafts-ready-to-land-agent-roster-plus-channels-card-2026-05-20
description: "Ready-to-land in-repo edit drafts for the two pending updates from the 2026-05-20 Otto-owns-VS Code-Claude-plugin locked-in decision — agent-roster-reference-card.md Otto row dual-surface update + otto-channels-reference-card.md 11th ambient channel addition. Drafted in user-scope substrate so future-Otto can paste-and-apply when contested-root + lightweight-tick mode conditions clear, without re-deriving the content."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-20T13:20:00Z
  originSessionId: a04eb986-7ab9-4bca-91cd-9e911888a046
---

## Purpose

The 2026-05-20 session locked in Otto's dual-surface architecture (Claude Code CLI + VS Code Claude plugin) — see `feedback_aaron_otto_owns_vscode_claude_plugin_surface_dual_surface_locked_in_decision_otto_cli_2026_05_20.md`. The decision is captured in user-scope substrate. Two in-repo updates are pending until lightweight-tick mode + contested-root conditions clear.

This memo provides ready-to-land edit text so future-Otto applying the edits doesn't re-derive content.

## Edit 1 — `.claude/rules/agent-roster-reference-card.md`

### Current Otto row (under "Factory agents (commit to repo)")

```markdown
| Otto | — | Claude Code (foreground) | Opus | `Co-Authored-By: Claude <noreply@anthropic.com>` |
```

### Replacement row

```markdown
| Otto | Claude Code (VS Code plugin) | Claude Code (foreground) | Opus | `Co-Authored-By: Claude <noreply@anthropic.com>` |
```

### Rationale to add (after the table or in a footnote section)

Add an "Otto dual-surface note" subsection after the factory-agents table:

```markdown
## Otto dual-surface (locked in 2026-05-20)

Per the 2026-05-20 locked-in decision (Aaron: *"so otto owns vscode surfect for claude code is lock in"*),
Otto operates on two foreground surfaces sharing unified identity:

- **Claude Code CLI** — primary foreground surface, sentinel-driven autonomous-loop, Opus
- **VS Code Claude plugin** — additional foreground surface; reads CLI session transcripts via auto-discovery
  at `~/.claude/projects/<slug>/<uuid>.jsonl`

Both surfaces share the transcript-share channel (the 11th ambient inter-Otto channel — see
`otto-channels-reference-card.md`). Unified-identity architecture is structurally enforced
by the channel: persona-split attempts would be defeated by the transcript bleed
(see `feedback_aaron_dont_split_otto_persona_across_surfaces_*` user-scope memory).

Otto-Desktop (per PR #3030) is a third Otto foreground surface; transcript-channel-sharing
status with the other two is an open question worth verifying.

**Other agents don't compete for the VS Code Claude plugin surface** — Vera (Codex) operates
on Codex's VS Code extension (different namespace); Riven uses Cursor IDE; Alexa uses Kiro;
Lior uses Antigravity. Otto-on-VS-Code-Claude-plugin has dedicated territory.
```

## Edit 2 — `.claude/rules/otto-channels-reference-card.md`

### Add to "Ambient channels (state-of-the-world; both Ottos read continuously)" table

Insert after the last ambient channel row (PR review threads), or wherever architecturally cleanest:

```markdown
| **Claude Code transcript share** — auto-discovery at `~/.claude/projects/<slug>/<uuid>.jsonl` | Cross-surface unified-identity continuity (CLI ↔ VS Code Claude plugin) | VS Code Claude plugin auto-reads CLI transcripts via cwd-derived slug; bidirectional in practice |
```

### Add a "Per-channel architectural notes" sub-section (or extend existing if present)

After the table, add brief architectural context for the new channel:

```markdown
### Channel 11 — Claude Code transcript share

Added 2026-05-20 per Otto dual-surface locked-in decision. Mechanism:

- Path: `~/.claude/projects/<slug>/<uuid>.jsonl` per Claude Code session
- Slug derivation: cwd → `/` replaced with `-` (e.g., `/Users/acehack/Documents/src/repos/Zeta` → `-Users-acehack-Documents-src-repos-Zeta`)
- File permissions: mode 600 (owner-only) — bleed mechanism requires same-UID tool
- VS Code Claude plugin auto-discovers by deriving the same slug from the workspace cwd

Bidirectional: VS Code Claude plugin reads CLI transcripts AND CLI plausibly inherits VS Code Claude plugin
context via the same mechanism. Otto unified-identity architecture is well-matched to this auto-discovery
behavior — see also `feedback_aaron_dont_split_otto_persona_across_surfaces_*` for the architectural principle.

This channel is **ambient** (read continuously by both Otto surfaces), not explicit (active signaling).
Future cross-agent deliberate sharing in VS Code (per Aaron 2026-05-20 "eventually") would add new
EXPLICIT channels here, not modify this ambient one.
```

## Edit 3 (optional, lower priority) — update the "Common confusion patterns" section in agent-roster-reference-card

Add a new bullet under "Common confusion patterns (shadow catches)":

```markdown
7. **VS Code Claude plugin = Otto's surface, NOT a separate agent** — per the 2026-05-20 locked-in
   decision. If you encounter conversation history "appearing in VS Code Claude," it's Otto-VS-Code-plugin
   reading Otto-CLI transcripts via the auto-discovery channel; unified identity, not a foreign agent.
```

## Branch + commit choreography (when conditions clear)

These edits are small enough to land in a single commit on an isolated worktree:

```bash
# Wait for: lightweight-tick mode clear + contested-root resolution
# Then:
git fetch origin main
git worktree add /private/tmp/zeta-otto-dual-surface-ready FETCH_HEAD
cd /private/tmp/zeta-otto-dual-surface-ready
git switch -c otto/dual-surface-locked-in-vscode-claude-plugin-2026-05-NN

# Apply edits to:
#   .claude/rules/agent-roster-reference-card.md
#   .claude/rules/otto-channels-reference-card.md

# Verify (run from the worktree):
test "$(git branch --show-current)" = "otto/dual-surface-locked-in-vscode-claude-plugin-2026-05-NN" || exit 1
git add .claude/rules/agent-roster-reference-card.md .claude/rules/otto-channels-reference-card.md
git commit -m "$(cat <<'EOF'
docs(rules): Otto dual-surface locked in — owns VS Code Claude plugin surface

Per 2026-05-20 operator-authority decision (Aaron: "so otto owns vscode
surfect for claude code is lock in"), Otto operates on Claude Code CLI +
VS Code Claude plugin as unified identity. Transcript-share channel
(11th ambient inter-Otto channel) structurally enforces unified-identity
architecture — persona-split attempts would be defeated by the bleed.

Updates:
- agent-roster-reference-card.md: Otto row CLI-only → dual-surface
- otto-channels-reference-card.md: add 11th ambient channel
- agent-roster-reference-card.md: add Otto-dual-surface subsection + confusion-pattern row

Substrate trail in user-scope memory (5-memo trajectory):
- feedback_aaron_vscode_claude_plugin_reading_claude_code_transcripts_*
- feedback_aaron_vscode_claude_plugin_is_otto_surface_history_bleed_is_feature_*
- feedback_aaron_dont_split_otto_persona_across_surfaces_*
- feedback_aaron_otto_owns_vscode_claude_plugin_surface_dual_surface_locked_in_*
- feedback_aaron_other_ai_surface_isolation_vscode_otto_is_first_*

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
git push -u origin otto/dual-surface-locked-in-vscode-claude-plugin-2026-05-NN
gh pr create --head otto/dual-surface-locked-in-vscode-claude-plugin-2026-05-NN --base main \
  --title "docs(rules): Otto dual-surface locked in — owns VS Code Claude plugin surface" \
  --body "..."
```

## Verification checklist for the future-Otto applying these edits

- [ ] Lightweight-tick mode cleared (operator stability confirmed OR sufficient time without panic recurrence)
- [ ] Contested-root resolved (current uncommitted WIP either landed by peer-Otto or stale enough to safely ignore from isolated worktree)
- [ ] Isolated worktree created from `FETCH_HEAD` (sidestepping pack-dir contention per saturation-ceiling discipline)
- [ ] Branch name with surface-tag + dated (per claim-acquire discipline)
- [ ] `ZETA_EXPECTED_BRANCH` env-var set OR explicit `git branch --show-current` check before commit
- [ ] Explicit `git push -u origin <branch>` (not implicit current-branch)
- [ ] `gh pr create --head <branch> --base main` (explicit head ref per zeta-expected-branch composite discipline)
- [ ] `gh pr merge --auto --squash` armed after PR open

## Composes with

- `feedback_aaron_otto_owns_vscode_claude_plugin_surface_dual_surface_locked_in_decision_otto_cli_2026_05_20` — the locked-in decision this draft operationalizes
- `feedback_aaron_other_ai_surface_isolation_vscode_otto_is_first_*` — architectural picture
- `feedback_operator_environment_instability_kernel_panic_lightweight_tick_discipline_*` — gates when this can land
- `.claude/rules/claim-acquire-before-worktree-work.md` — branch + worktree discipline for the landing
- `.claude/rules/zeta-expected-branch.md` — race-window-caveat for the commit
- `.claude/rules/refresh-world-model-poll-pr-gate.md` — rate-limit awareness for the landing

## Substrate-honest framing

This memo is PURE PREPARATION substrate — it does not change anything in-repo, does not commit anything, does not push anything. It captures the exact text needed for the in-repo updates so the actual landing tick is fast (paste + verify + commit + push), not a re-derivation exercise.

If conditions change (e.g., the decision gets superseded, the VS Code Claude plugin architecture shifts) before this memo gets applied, future-Otto should re-evaluate the draft against current substrate before pasting.
