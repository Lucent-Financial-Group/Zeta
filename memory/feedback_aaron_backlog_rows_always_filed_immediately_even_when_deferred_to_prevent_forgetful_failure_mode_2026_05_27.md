---
name: aaron-backlog-rows-always-filed-immediately-even-when-deferred-to-prevent-forgetful-failure-mode
description: "Aaron 2026-05-27 explicit operator catch: 'backlog rows should alwasy be filed you are forgetful we dont have to work on it yet until after we boot with one.' Backlog rows MUST be filed IMMEDIATELY when a substrate-engineering target is named — even when implementation is deferred. The row IS the substrate marker; deferring naming = forgetful failure mode. Deferring implementation = operationally fine. Captured after Otto said 'when needed, row gets filed' for Path A cluster coordination, which Aaron corrected — Path A row B-0856 was filed immediately even though implementation defers until after first cluster boot."
metadata:
  type: feedback
  created: 2026-05-27
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## Verbatim operator framing (Aaron 2026-05-27 — two-turn sharpening)

### Turn 1 — initial catch

> *"When multi-agent cluster coordination needs the per-node surface, that row gets filed. backlog rows should alwasy be filed you are forgetful we dont have to work on it yet until after we boot with one."*

Context: Otto-VSCode filed B-0855 (Path B Otto-pushes-PR-across-finish-line per Aaron's "simpler form" preference) + said in passing "when multi-agent cluster coordination needs the per-node surface, that row gets filed" referring to the Path A `/tmp/zeta-cluster-state/` coordination standard. Aaron caught the deferred-naming failure mode.

### Turn 2 — sharper framing (separation of concerns)

> *"deferring of working on backlog is a seperate conerns of recording backlog item exist one is critical for the other to reliable happen"*

The two concerns are operationally distinct:

| Concern | What it is | Surface |
|---|---|---|
| **A. Recording-backlog-item-exists** | The substrate marker — file exists in git at `docs/backlog/P*/B-NNNN-*.md` | git-canonical; visible to all cold-boots |
| **B. Deferring-work-on-backlog-item** | Scheduling decision — when to prioritize implementation work | per-row; per-context; per-tick |

**Concern A is CRITICAL for Concern B's deferral to RELIABLY happen.**

Without Concern A (no row in git): deferral becomes "we'll get to it eventually" → context fades → never happens → forgetful failure mode.

With Concern A (row exists in git): deferral becomes "row B-NNNN status:open with trigger conditions in row body; future cold-boot picks up when conditions fire" → reliable mechanism.

The previous (Turn-1-only) memory framing ("file even when deferred") collapsed the two concerns. The substrate-honest framing per Aaron Turn 2 is: **they're separate concerns; Concern A is the substrate-engineering prerequisite for Concern B to work reliably.**

## The discipline

**Concern A (recording-row-exists) ALWAYS fires immediately when substrate-engineering target is named. Concern B (deferring-work) is independently decided per-row + per-context.**

The shape: Concern A is REFLEXIVE (always do it). Concern B is JUDGMENT (decide per-context).

### What "filing" means at this scope

- Row created at `docs/backlog/P*/B-NNNN-*-aaron-YYYY-MM-DD.md`
- Frontmatter with id + priority + status + title + composes_with + tags
- Row body enumerates sub-rows + acceptance criteria + composes-with chain
- BACKLOG.md regenerated
- PR opened + auto-merge armed
- ID is now CLAIMED + substrate-engineering target is NAMED + future-Otto cold-boots see it

### What deferred-implementation IS NOT

- NOT a reason to skip filing
- NOT a reason to wait "until needed"
- NOT a substrate-honest excuse for procrastination at naming-scope

### What deferred-implementation IS

- Operationally fine — work doesn't have to ship today
- Row body explicitly names trigger conditions ("when condition X fires; implement Y")
- Row stays `status: open` indefinitely until trigger fires
- Sub-rows enumerated for future-Otto to pick up when timing right

## Why this matters operationally

Without immediate filing:

- Future-Otto cold-boots in 5 sessions / 50 sessions / when trigger fires has NO substrate to find
- Substrate-engineering target lost between sessions (the rule's "wake-time-substrate" failure mode at backlog scope)
- Operator pays the catch-tax repeatedly ("did we file that?" / "I thought we discussed that")
- Cross-AI cold-boots (Lior / Alexa / Riven / Vera) have no substrate to inherit

With immediate filing:

- Row appears in BACKLOG.md → visible to all future cold-boots
- ID claimed → no risk of accidental re-allocation
- Composes_with chain established at the moment the substrate-engineering thinking is fresh
- Operator sees the substrate-honest acknowledgment (this work is named + tracked) without needing to remind

## Composition with existing substrate

- `.claude/rules/wake-time-substrate.md` — the rule extends to backlog scope: substrate-engineering targets need wake-time landing in the backlog, not just `.claude/rules/`
- `.claude/rules/verify-existing-substrate-before-authoring.md` — prerequisite for THIS discipline (check if row already exists before filing); the two compose: check first, then file immediately if absent
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` (per Daya's 2026-05-27 proposed Pattern B extension covering planning-row-landed → sub-row-pending = next slice) — same root pattern: substrate-engineering target lands as named row FIRST; implementation lifecycle follows
- `.claude/rules/no-directives.md` — operator's preference is operator-self-disposition; Otto applies the discipline because it's substrate-honest, not because directed
- `.claude/rules/never-be-idle.md` — filing rows is operational action (never quietly defer-naming)
- `.claude/rules/no-op-cadence-failure-mode.md` — deferring naming is a no-op-cadence variant at substrate-engineering scope

## Operational discipline for future-Otto cold-boots

When evaluating substrate-engineering work that gets deferred:

1. **NEVER say** "row gets filed when needed" — that's the failure mode
2. **ALWAYS file immediately** even if implementation defers
3. **Row body MUST name the trigger conditions** for when implementation work begins
4. **Sub-rows enumerated** so future-Otto picking up the row has a concrete path
5. **Composes_with chain** established at naming-time so future-Otto sees the substrate web
6. **status: open** indefinitely OK; rows don't have to be in-progress to be substrate-honest

When operator surfaces a "this would be a nice row" candidate:

- File it
- Don't ask "should I file this?" — operator's mention IS the authorization
- File it WITHIN the same session as the substrate-engineering conversation (when context is fresh)
- Mark deferred-implementation explicitly in row body

## Empirical anchor (this row's origin)

2026-05-27 session c2b77530. Otto-VSCode filed B-0855 (Path B for self-registration coordination) per Aaron's preference for simpler-form. Mentioned in passing that Path A (`/tmp` coordination standard) would be filed "when needed." Aaron caught:

> *"When multi-agent cluster coordination needs the per-node surface, that row gets filed. backlog rows should alwasy be filed you are forgetful we dont have to work on it yet until after we boot with one."*

Otto applied the discipline by filing B-0856 (Path A) IMMEDIATELY with `status: open` + explicit deferred-implementation trigger conditions in row body. This memory captures the operator's catch so future-Otto cold-boots inherit the discipline.

## Composes with substrate

- B-0855 (Path B; Otto-pushes-PR-across-finish-line; in flight per PR #5412)
- B-0856 (Path A; `/tmp` coordination; filed per this memory's discipline; in flight)
- Memory: `feedback_aaron_never_wants_immediate_unblock_workarounds_waits_for_substantive_substrate_batched_into_next_clean_test_cycle_2026_05_27.md` (sibling discipline from same session — "fix substrate, batch into next ISO, don't workaround live")

## Future-Otto cold-boot reminder

The pattern is: substrate-engineering target named → row filed → ID claimed → composes-with established → BACKLOG.md regen → PR opened. Same session as the conversation. Deferred-implementation gets named in row body's "when to implement" section.

The forgetful failure mode is the inverse: "we'll file when needed" → context fades → row never gets filed → substrate target lost across cold-boots.

Apply this discipline at every substrate-engineering decision point.
