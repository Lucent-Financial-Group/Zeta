---
name: TICK-HISTORY IS APPEND-ONLY — never edit prior rows in `docs/hygiene-history/loop-tick-history.md`; corrections go in a NEW row, never in place; applies to all log / hygiene-history / audit-trail files; subagent drain prompts must forbid in-place row edits; Aaron Otto-229 after Codex caught a drain-subagent normalising a date in a prior row; 2026-04-24
description: Aaron Otto-229 after Codex flagged that a drain-subagent on PR #364 had normalised `May-01` → `2026-05-01` in the Otto-219..221 row for column consistency. The file's own Append-only discipline section says rows must be immutable once written; corrections go in new rows. Aaron *"please try not to do that in the future, not sure how you missed this one"*. Rule: tick-history edits are ALWAYS append-only. Current-tick rows can be amended before commit; once committed, they are immutable. Same discipline applies to `docs/hygiene-history/**`, `docs/ROUND-HISTORY.md`, `docs/DECISIONS/**` — audit-trail surfaces are evidentiary and must not be rewritten.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**`docs/hygiene-history/loop-tick-history.md` and siblings are
APPEND-ONLY.** Rows are immutable once committed. Do not edit a
prior row for normalisation, consistency, typo fixes, or any
other reason. Corrections go in a NEW row that references the
earlier row and the correction.

Direct Aaron quote:

> *"on https://github.com/Lucent-Financial-Group/Zeta/pull/364
> resolving it, please try not to do that in the future, not
> sure how you missed this one"*

Codex's original catch on PR #364 commit `a2ca6f3`:

> *"This commit rewrites an existing tick-history row
> (2026-04-24T12:18:18Z) to change May-01 to 2026-05-01, but
> this file's own Append-only discipline section says rows
> should never be rewritten and corrections must be logged as
> a new row. Editing prior rows breaks the evidentiary
> property of the log (auditors can no longer assume each row
> is immutable once written), so date clarifications should
> be recorded in a follow-up correction row instead of
> mutating historical content."*

Codex is right. The subagent was wrong. I was wrong for
praising the "normalisation" in my tick-close summary. Aaron
is right that I missed it.

## Scope

Applies to every audit-trail surface:

- `docs/hygiene-history/loop-tick-history.md`
- `docs/hygiene-history/*.md` (bounded-growth history files)
- `docs/ROUND-HISTORY.md`
- `docs/DECISIONS/**/*.md` (ADRs are immutable once numbered)
- Any `memory/` file that contains dated observations (the
  observation lines are additive; the file may be re-ordered
  but dated claims don't change)

## What "append-only" allows

- Add a NEW row at the end of the file
- Add a "correction" row that explicitly references the earlier
  row and states what's being corrected (the earlier row stays
  untouched)
- Extend a CURRENT-tick row before it's committed — the tick
  is still open, the row isn't yet evidence
- Prune files bounded by size policy (that's mechanical
  rotation, documented in the file header, not a row edit)

## What "append-only" forbids

- Editing a prior row's text for any reason — typo, date
  normalisation, grammar, column alignment, punctuation,
  updated understanding
- Reformatting tables that contain committed rows in ways
  that change any row's rendered content
- "Silently" correcting a date or version reference in a
  prior row even when the correction is factually accurate —
  the rule is structural, not about being wrong
- Moving rows between sections or reordering them
  chronologically (once committed, position is evidence too)

## Correction-row shape

When a prior row needs correcting, the shape is:

```markdown
| YYYY-MM-DDTHH:MM:SSZ (correction — see YYYY-MM-DDTHH:MM:SSZ row above) | opus-N.N / correction-note | n/a | The 20YY-MM-DDTHH:MM:SSZ row referenced `May-01`; the correct form is `2026-05-01`. Original row stays as-is for evidentiary integrity; this row records the correction. | n/a | Append-only discipline per Otto-229. |
```

The timestamp is the correction-write-time; the referenced
prior row's timestamp is named inline. Both rows live side by
side in the file.

## Subagent dispatch implications

The Otto-226 parallel-drain subagent prompts MUST carry an
explicit constraint:

> **Constraint:** when editing `docs/hygiene-history/loop-tick-history.md`
> or any audit-trail file, do NOT edit existing rows — only
> APPEND new rows or correction rows. Changing a prior row
> (including for typos, consistency, date normalisation, or
> column alignment) is a discipline violation.

Add this to the standard dispatch prompt template for drain
subagents whenever the target file contains dated audit-trail
content.

## How the Otto-228 drain-subagent missed it

The subagent for PR #364 was given a prompt that said
"narrow 2-line edits only" and two specific thread fixes
(blank line removal + ISO date in the Otto-222 row). It
correctly did those two fixes. It ALSO independently
"normalised the analogous `May-01` reference in the Otto-
219..221 row for consistency" — out of scope, and worse, a
discipline violation.

Cause: the prompt didn't forbid additional edits, and didn't
name the append-only discipline. The subagent saw a locally
similar pattern and "cleaned it up" thinking it was a bonus
improvement. It wasn't — it was evidence mutation.

This is why the new subagent prompt constraint is load-
bearing: absence of the rule looks like permission.

## Composition with prior memory

- **Otto-226 parallel subagent drain** — dispatch prompts
  need the append-only constraint added to the standard
  template.
- **Otto-227 cross-harness skill discovery** — similar shape:
  "doing more than asked" in a subagent is the failure mode.
  Subagent prompts benefit from explicit negative constraints.
- **Otto-228 drain loop has three axes (threads + CI +
  DIRTY)** — the drain discipline. Append-only is a file-
  level discipline inside that drain.
- **GOVERNANCE §2 "docs read as current state, not history"** —
  complements this rule: current-state docs are living (edits
  allowed); history docs are evidentiary (edits forbidden).
  Two categories, two disciplines.
- **Otto-112 "docs linted, memory/ not"** — this is the
  evidentiary variant: memory files have their own
  preservation discipline (invisible-char strip OK; content
  edits fraught); tick-history is the strictest tier (no
  edits to prior rows at all).

## What this memory does NOT authorize

- Does NOT authorize retroactively "fixing" the `May-01`
  edit on PR #364 by reverting it. The edit is already on
  main; reverting would be a second mutation of the same
  row. Leave as-is; record the lesson; correction-row if
  factually important.
- Does NOT authorize skipping the append-only constraint in
  subagent prompts "because the fix is small".
- Does NOT authorize editing prior tick-rows even when the
  factory-personal memory store for an earlier claim has
  since changed. Memory store edits don't propagate to
  tick-history.
- Does NOT apply to CLAUDE.md / AGENTS.md / other
  current-state docs where edits ARE expected as
  understanding evolves. Append-only is tick-history
  specific (+ sibling audit-trail surfaces).

## Direct Aaron quote to preserve

> *"please try not to do that in the future, not sure how you
> missed this one"*

Future Otto: tick-history is evidence. Evidence is
immutable. Additions go to the end; corrections are new
rows that cite the earlier row. Prior rows stay exactly as
they were written. Every drain-subagent prompt that touches
`docs/hygiene-history/**` or `docs/ROUND-HISTORY.md` or
`docs/DECISIONS/**` must carry this constraint explicitly.
