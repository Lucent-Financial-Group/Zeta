---
name: Same-tick-update-recursion — when a memory file lands, every projection layer that distills the rule must update in the same tick (Otto 2026-05-03 worked-example generalization)
description: 2026-05-03; the alignment-frontier substrate cascade (memory file → CURRENT-aaron §52 → tick shard) demonstrated three times in three ticks that the existing same-tick-update discipline (CLAUDE.md fast-path bullet) generalizes recursively. When new substrate lands at one layer (memory file, ADR, skill, decision-archaeology research artifact), the propagation cascade through every projection that distills the rule (CURRENT-<maintainer>.md, MEMORY.md index, AGENTS.md doctrinal pointers, related skill bodies, persona notebooks) must update in the same tick to keep substrate-or-it-didn't-happen operational. Skipping creates breadcrumb-rot. The cascade IS the discipline; partial-cascade IS the failure mode. The claim that *"X exists in substrate"* is technically true even with partial-cascade, but functionally false at every layer that doesn't carry the pointer.
type: feedback
---

# Same-tick-update-recursion — substrate cascade discipline

## Origin

Otto 2026-05-03, observed during the alignment-frontier substrate landing across three ticks (post-compaction wake):

- **Tick 0220Z** — alignment-frontier memory file landed (PR #1270) + MEMORY.md index entry (paired-edit per existing discipline)
- **Tick 0223Z** — AGENTS.md backport for `.claude/**` vibe-coded scope (PR #1272) — same-tick because PR #1268 review surfaced the gap; substrate-or-it-didn't-happen flagged the backport
- **Tick 0233Z** — CURRENT-aaron.md §52 alignment-frontier distillation (PR #1274) — same-tick catch-up because the §52 distillation is what future-Otto reads at every wake per CLAUDE.md fast-path discipline

Three same-tick-update events, each propagating one observation through a different projection layer. The pattern is greppable: once visible, it explains why scattered breadcrumb-rot is the dominant substrate-quality failure mode after memory files land.

## The discipline

The **existing same-tick-update rule** lives in:

- CURRENT-aaron.md §"How this file stays accurate" — *"When a new memory updates a rule here, I update this file in the same tick. If I don't, this file is lying by omission."*
- CLAUDE.md fast-path bullet (CURRENT files are read at every wake; rules win on conflict; same-tick update is the cohesion guarantee)

The **recursive generalization** (this memo): the same-tick-update rule applies to **every projection layer**, not just CURRENT-<maintainer>.md. When new substrate lands, identify all the layers that distill the rule and update them same-tick.

## The projection-layer taxonomy

For any new substrate landing (memory file, ADR, skill body, research artifact, governance change), enumerate the projection layers that depend on it:

| Layer | Read-discipline | Update trigger |
|---|---|---|
| **Source memory file / ADR / skill / research artifact** | Deep — reader visits when investigating | New substrate IS this layer |
| **CURRENT-<maintainer>.md** | Fast-path — read at every wake | When the new substrate updates a rule the CURRENT carries |
| **MEMORY.md index** | Quick scan — read at every wake | Always (unless the substrate is itself an MEMORY.md edit) |
| **AGENTS.md** | Universal — read at session-start by every harness | When the substrate changes a doctrine AGENTS.md carries |
| **CLAUDE.md** | Claude-Code-specific — read at every wake | When the substrate updates Claude-Code-specific behavior |
| **GOVERNANCE.md §N** | On-demand — read when a rule is cited as "GOVERNANCE.md §N" | When the substrate adds / supersedes a numbered rule |
| **Related skill bodies** | Router-keyed — read when the skill triggers | When the substrate changes how a skill should operate |
| **Persona notebooks** | Per-persona — read when persona-relevant work activates | When the substrate is persona-specific |
| **Tick shards** | Append-only — written each tick | Always (every tick has at least one shard) |

For each layer, the question is: **does this layer carry a rule the new substrate updates?** If yes, update same-tick. If no, skip.

## Why partial-cascade is the failure mode

The substrate-or-it-didn't-happen rule (Otto-363) names the threshold: chat → durable substrate. Substrate-or-it-didn't-happen-recursion (this memo) extends to: durable substrate → projection layers.

A new memory file that doesn't propagate to CURRENT-<maintainer>.md is **technically substrate but functionally invisible** at fast-path read. Future-Otto reads CURRENT first, doesn't see the rule, operates as if the rule doesn't exist. The memory file is breadcrumb-rot from the projection-layer perspective.

Three failure modes the recursion discipline prevents:

1. **CURRENT-rot** — memory file updates a rule but CURRENT doesn't carry the pointer; future-Otto reads stale CURRENT and applies stale rule
2. **MEMORY.md-index-rot** — memo lands but no index entry; the memo is unfindable via the quick-scan layer; effectively orphaned
3. **AGENTS.md-pointer-rot** — substrate change should be readable by every harness via AGENTS.md, but the pointer doesn't land; non-Claude harnesses miss the change

The cascade IS the discipline. Each layer skipped degrades the substrate's effective half-life.

## How the alignment-frontier landing demonstrated this

The three-tick cascade walked the discipline:

- **Tick 1 (0220Z)**: alignment-frontier memo + MEMORY.md index entry (2 layers updated same-tick)
- **Tick 2 (0223Z)**: PR #1268 review surfaced AGENTS.md scope-drift; AGENTS.md `.claude/**` backport (1 layer updated same-tick)
- **Tick 3 (0233Z)**: CURRENT-aaron.md §52 distillation (1 layer updated same-tick)

Total: 4 projection layers updated for one observation, each in the same tick the relevant gap was identified. No breadcrumb-rot.

If the cascade had been deferred (*"I'll update CURRENT next round"*), the alignment-frontier substrate would have lived in MEMORY.md only — readable in a search, but invisible in Otto's wake-time read. The threshold-crossing milestone Aaron explicitly named for future-Otto recognition would have been functionally invisible at exactly the moment future-Otto needed it.

## Composes with

- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` — substrate-or-it-didn't-happen at the chat-to-substrate threshold; this memo extends to the substrate-to-projection-layer threshold
- `memory/feedback_learnings_must_land_in_claude_md_or_pointer_aaron_2026_05_01.md` — wake-time-substrate-or-it-didn't-land; CLAUDE.md is one of the projection layers; this memo names the recursion in general
- `memory/feedback_alignment_frontier_agent_architectural_intent_threshold_aaron_2026_05_03.md` — the substrate whose landing demonstrated this discipline three ticks running
- `memory/CURRENT-aaron.md` §52 (alignment-frontier distillation) — projection-layer #2 in the worked example
- AGENTS.md "The vibe-coded hypothesis" — projection-layer #3 in the worked example (PR #1272)
- `docs/hygiene-history/ticks/2026/05/03/` — tick shards (0220Z / 0223Z / 0233Z) — projection-layer #4

## How to apply

When new substrate lands:

1. **Enumerate projection layers** the substrate touches — use the taxonomy table above
2. **For each layer, ask:** does this layer carry a rule the substrate updates?
3. **For each yes, update same-tick** — don't defer; deferral is breadcrumb-rot risk
4. **If a layer is missed and the gap surfaces in review or future read**, treat it as the same-tick discipline failing — fix immediately + memo if the failure pattern repeats

The discipline is **proactive** at write-time + **reactive** at review-time. Both are same-tick.

## Carved sentence

**"When new substrate lands, every projection layer that distills the rule (CURRENT-<maintainer>.md, MEMORY.md index, AGENTS.md doctrinal pointers, CLAUDE.md, GOVERNANCE.md §N, related skill bodies, persona notebooks, tick shards) must update in the same tick. The cascade IS the discipline; partial-cascade IS the failure mode. Substrate-or-it-didn't-happen recursion: durable substrate that doesn't propagate to its projection layers is technically substrate but functionally invisible at exactly the layer where future-Otto reads."**
