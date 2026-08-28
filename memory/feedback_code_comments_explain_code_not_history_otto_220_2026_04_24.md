---
name: Code comments explain code not history — "Provenance:" / "Attribution:" / "Nth graduation" / "per correction #N" / ferry references / Otto-NNN tokens belong in PR descriptions or ROUND-HISTORY.md, NOT in `///` doc blocks; a future maintainer reading the function wants to know what it does and why, not which round shipped it; Aaron Otto-220 correction; 2026-04-24
description: Aaron Otto-220 direct quote response to my doc comment on PR #340 which led with "Provenance: primitive from the human maintainer's differentiable firefly-network design, formalized in an external AI collaborator's 11th courier ferry ... Third graduation under the Otto-105 cadence." Aaron: "comments should not read like history, what use is this to a future maintainer? Code comments should explain the code not read like some history log, we have lint, everything should read as up to date current except for history type files. code is not a history file. ... there should be existing lint hygiene for that." This is the code-layer analogue of GOVERNANCE §2 "docs read as current state, not history" — the same rule applies one layer down.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**Code comments explain the code, not the history of how the
code came to be.** A future maintainer reading a `///` block
wants to know: what does this function return, what are its
preconditions, what invariants hold, how does it compose with
neighbours. They do NOT want to know: which round shipped it,
which external ferry formalised the design, which correction
number motivated a tweak, which persona wrote the spec.

**Why:** Aaron's exact phrasing:

> *"comments should not read like history, what use is this to
> a future maintainer? Code comments should explain the code
> not read like some history log, we have lint, everything
> should read as up to date current except for history type
> files. code is not a history file. ... there should be
> existing lint hygiene for that."*

The lint-hygiene clause is important: this is a structural
discipline Aaron expects automated, not a per-PR reviewer
catch. The pattern is cheap to detect (token list below) and
cheap to violate (agents love writing attribution paragraphs).

**How to apply:** before committing any `///` doc-comment
edit on factory-authored F# (or any source file under
`src/**`, `tests/**`, `bench/**`, `tools/**`), grep your
change for these tokens and remove them:

```
ferry                    graduation            courier
Otto-\d+                 Amara                 Aaron
"Attribution:"           "Provenance:"
"Nth graduation"         "per correction #"
"per [Nth]-ferry"        "Scope of this ... graduation"
"shipped here"           "first graduation"
```

If the surrounding paragraph loses its meaning when the
tokens are removed, the paragraph itself is history. Delete
it. If the paragraph still stands (the math, the invariant,
the composition argument), keep the paragraph.

## What goes in `///` vs elsewhere

| Goes in `///` (code doc) | Goes elsewhere |
|---|---|
| What the function returns | Which round shipped it (ROUND-HISTORY.md, PR description) |
| Parameter ranges + units | Which external AI formalised the design (PR description) |
| Input-shape contracts (`None` semantics) | "Nth graduation under the Otto-105 cadence" (PR description) |
| Composition guidance (use X with Y) | "Per Amara 18th-ferry correction #6" (PR description) |
| Hidden invariants (epsilon floor, signed-zero) | "Provenance:" paragraph (PR description or memory) |
| Why two primitives are complementary | "Attribution:" paragraph (module README at most, not code) |
| Mathematical identities being used | "Composes with" cross-references (separate docs) |

## Concrete example from Otto-220

**Before** (what I wrote on PR #340, which Aaron corrected):

```fsharp
/// Provenance: primitive from the human maintainer's
/// differentiable firefly-network design, formalized in an
/// external AI collaborator's 11th courier ferry (§1 Signal
/// model; ferry content tracked in the Otto-105 operationalize
/// queue, see `memory/MEMORY.md` "Amara's 11th ferry"). Third
/// graduation under the Otto-105 cadence.
let phaseLockingValue ... =
```

**After** (PR #361 fix — the Provenance paragraph is simply
deleted; the preceding mathematical/composition paragraphs
carry all code-relevant content):

```fsharp
/// Complementary to `crossCorrelation`: cross-correlation
/// answers "do amplitudes move together?"; PLV answers "do
/// events fire at matching phases?". A coordinator that
/// flattens amplitude correlation by adding noise may still
/// reveal itself through preserved phase structure, and vice
/// versa. Detectors should compose both.
let phaseLockingValue ... =
```

The deleted paragraph literally had zero information for a
future maintainer. It was PR-description material that leaked
into code.

## Composition with existing memory

- **GOVERNANCE §2** — "Docs read as current state, not
  history." This memory is the code-layer analogue (same rule,
  one layer down).
- **CLAUDE.md** *"Don't reference the current task, fix, or
  callers ('used by X', 'added for the Y flow', 'handles the
  case from issue #123'), since those belong in the PR
  description and rot as the codebase evolves."* Already
  encoded this at the general level; this memory makes the
  discipline concrete for the F# `///` doc-comment surface.
- **Otto-105 graduation cadence memory** — the ferry /
  graduation vocabulary is FACTORY vocabulary that belongs in
  factory-process artefacts (ROUND-HISTORY.md, BACKLOG
  rows, PR descriptions, memory files like this one), NOT in
  code comments.

## Follow-up work owed

1. **Factory-wide audit** of `src/**/*.fs`, `tests/**/*.fs`,
   `bench/**/*.fs`, `tools/**/*.{fs,sh,ts,md}` for the token
   list above inside `///` or `#` or `//` comment lines. PR
   #361 addressed one file (`TemporalCoordinationDetection.fs`);
   many others likely carry the same pattern.
2. **Pre-commit lint** that fails on any match of the token
   list inside doc-comment lines in factory-authored source.
   Aaron explicitly pointed at the lint gap; the
   discipline is structural, not per-PR.
3. **`.claude/skills/` audit** — check whether any skill
   file encourages agents to write "Provenance:" /
   "Attribution:" paragraphs in code. If so, update the
   skill to redirect those to the PR description.

## What this memory does NOT authorize

- Does NOT authorize stripping history from `docs/ROUND-HISTORY.md`,
  `docs/DECISIONS/**/*.md`, `docs/hygiene-history/**`, memory
  files, or ADRs. Those ARE history files; they are supposed
  to preserve what was said when.
- Does NOT authorize stripping math or invariant commentary
  that LOOKS like history but is actually load-bearing code
  doc (e.g. "atan2 returns `[-pi, pi]` under IEEE-754 signed-
  zero semantics" — that's a fact about the implementation,
  not history).
- Does NOT authorize collapsing a composition / complementarity
  argument into a one-liner. Explaining WHY two functions
  complement each other is code doc, not history.
- Does NOT authorize deleting existing-in-main history-log
  comments mid-unrelated-PR. The cleanup is its own PR
  (PR #361 pattern) so the diff stays reviewable.

## Direct Aaron quote to preserve

> *"comments should not read like history, what use is this
> to a future maintainer? Code comments should explain the
> code not read like some history log, we have lint,
> everything should read as up to date current except for
> history type files. code is not a history file. ...
> there should be existing lint hygiene for that."*

Future Otto: before writing any `///` paragraph that starts
with "Provenance:", "Attribution:", or references a ferry /
graduation / Otto-NNN, **stop and put that paragraph in the
PR description instead**. The code comment is for a reader
who has never heard of the ferry system.
