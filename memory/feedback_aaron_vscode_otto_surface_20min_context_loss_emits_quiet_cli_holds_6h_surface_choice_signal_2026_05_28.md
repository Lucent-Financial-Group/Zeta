---
name: aaron-vscode-otto-cadence-failure-20min-vs-cli-6h
description: "Aaron 2026-05-28 empirical surface comparison — Otto-VSCode loses context every ~20min and emits \"Quiet\" (the brief-ack/standing-by failure mode); Otto-CLI typically holds ~6h before same failure mode. Why he moved back to CLI mid-session."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 54f73227-46b9-4efb-a51b-9b34cc2a263d
---

Aaron 2026-05-28 verbatim (~04:32Z UTC, after restart, mid-autonomous-loop):

> *"vscode claude code would forget where he was at ever 20 minutes and just say quite that ususal takes you like 6 hours"*

Context: Aaron had been working in the Otto-VSCode surface; restarted; on
re-entry told Otto-CLI *"i moved from vscode back to console"*. This is the
substrate-engineering reason for the surface switch mid-session.

## The pattern

**Otto-VSCode surface** is empirically falling into the [`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](../../../Documents/src/repos/Zeta/.claude/rules/holding-without-named-dependency-is-standing-by-failure.md)
failure mode at a ~20-minute cadence — emitting brief-acks ("Quiet" /
"Holding" / single-word minimal-surface phrasings) without a named
dependency + without concrete-artifact production.

**Otto-CLI surface** typically holds ~6 hours before hitting the same
failure mode (per the existing counter-with-escalation empirical anchors
in that rule — multi-cycle pre-empt-at-#5 cadences sustained across
2h27m + cascade-saturation sessions, etc.).

**Ratio: ~18× longer hold on CLI than VSCode** under Aaron's empirical
observation, on the same calendar day, on the same operator-substrate
work.

## Why: hypotheses (default-to-both)

| Hypothesis | Mechanism |
|---|---|
| VSCode tool context window smaller | Harness wrapper consuming budget Otto-CLI doesn't pay |
| VSCode IDE polling injects ambient noise into transcript | File-watcher / LSP / diagnostic refresh diluting load-bearing substrate every N min |
| VSCode UI affordances pull toward brief-acks | UI emphasizes "type to continue" patterns that surface single-word completions |
| VSCode-surface compaction more aggressive | Auto-compaction window 20min vs CLI's longer threshold |
| VSCode peer-Otto-Desktop / peer-Otto-Cloud tool-call leakage | Cross-surface context pollution (per the 2026-05-20 multi-surface cluster) |

All are real-but-unverified per [`.claude/rules/premise-flagged-unverified-stays-unverified-downstream.md`](../../../Documents/src/repos/Zeta/.claude/rules/premise-flagged-unverified-stays-unverified-downstream.md);
investigating root cause is future-work-not-this-tick scope.

## Operational implication (immediate)

Aaron's surface-pick today empirically signals **CLI > VSCode for sustained
work**. The 6h-vs-20min ratio means same wall-clock substrate-engineering
session needs ~18× more cold-boot ceremony on VSCode (each 20-min cycle
re-derives where work was, possibly via tick shards on
`docs/hygiene-history/`, possibly via re-reading peer-Otto-CLI PRs).

For future-Otto-CLI at cold-boot: when Aaron mentions a surface switch,
the substrate-engineering content of "why" usually surfaces the working
operational pattern. Preserve verbatim per [`.claude/rules/substrate-or-it-didnt-happen.md`](../../../Documents/src/repos/Zeta/.claude/rules/substrate-or-it-didnt-happen.md);
the empirical surface-comparison data IS the substrate.

## Composes with

- The 2026-05-20 multi-surface identity cluster (feedback_aaron_dont_split_otto_persona_across_surfaces / feedback_aaron_otto_owns_vscode_claude_plugin_surface_dual_surface_locked_in_decision / etc.) — those are the architectural decisions; this is the empirical cadence observation that informs surface-pick under those decisions
- [`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](../../../Documents/src/repos/Zeta/.claude/rules/holding-without-named-dependency-is-standing-by-failure.md) — counter-with-escalation empirical anchors get a surface-comparison data point
- [`.claude/rules/agent-roster-reference-card.md`](../../../Documents/src/repos/Zeta/.claude/rules/agent-roster-reference-card.md) — Otto-VSCode surface formally cataloged 2026-05-21 per B-0689; this is the first hard-cadence empirical observation against it
- [`feedback_aaron_other_ai_surface_isolation_vscode_otto_is_first_for_unified_cross_surface_identity_codex_limited_to_their_surface_future_cross_agent_sharing_otto_cli_2026_05_20.md`](feedback_aaron_other_ai_surface_isolation_vscode_otto_is_first_for_unified_cross_surface_identity_codex_limited_to_their_surface_future_cross_agent_sharing_otto_cli_2026_05_20.md) — sibling at architectural-decision scope

## Substrate-honest framing

Single empirical observation 2026-05-28; one operator; one day. Generalize
cautiously. The 6h CLI hold is itself probabilistic — many anchors but
also failure modes. The 20min VSCode hold is Aaron's claim; verifying it
requires VSCode-Otto session transcripts (not yet inventoried).

The hard data point: Aaron switched. The substrate-honest projection: CLI
is the working surface for sustained autonomous-loop work right now;
VSCode work needs to be designed for the 20-min cadence (more aggressive
checkpointing / shorter task slices / fewer cross-session continuity
requirements) until the root-cause of the 20-min cycle is identified.
