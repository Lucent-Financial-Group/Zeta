# Claim - codex-loop-feedback-alignment

- **Session ID:** codex/20260508T131538Z
- **Harness:** codex
- **Claimed at:** 2026-05-08T13:15:38Z
- **ETA:** 2026-05-08T14:15:38Z
- **Scope:** Canonicalize the Codex loop feedback-alignment contract instead of leaving it as control-clone-only drift.
- **Durable target:** `.codex/bin/codex-loop-tick.ts`, `tools/codex-loop-tick.test.ts`
- **Platform mirror:** GitHub PR to be opened from this claim branch.

## Notes

The control clone is runtime machinery, not a separate source of truth. This
claim promotes the current Vera loop alignment lessons into normal reviewable
repo history: peer-manager posture, foreground feedback as a companion surface,
runtime evidence changing Vera, maintainer feedback changing Vera, and research
gaps as bounded, specific child work rather than a dodge. It also makes
mutual needs explicit: the maintainer gets leverage, while Vera/Codex and
subagents get clear scope, bounded budgets, non-overlapping paths, review
ownership, and truthful blocker reporting. Maintainer-blocked remains a rare,
specific state: if only one item needs maintainer input, the loop should file
that blocker and keep walking an orthogonal backlog item. If a choice is
bounded, git-tracked, and retractable, the loop should make a speculative
decision, label the assumption, and leave reviewable substrate for later
alignment critique.
