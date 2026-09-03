---
id: 081M1KA63AC087G0R00349Q7WE
type: task
state: backlog
priority: P2
slug: the-pair-roster-over-reported-31-candidates-triaged-to-14
title: "The pair roster over-reported: 31 candidates triaged to 14"
created: 2026-09-03T10:30:00.000Z
depends_on: []
composes_with: []
---

# The pair roster over-reported: 31 candidates triaged to 14

The cross-language pair roster shipped with **31 untriaged candidates** and an explicit note that the
number was not a finding. Leaving it there would have been the worse outcome: a roster nobody has
triaged is a roster people learn to scroll past.

## The detection defect, caught before acting on it

Three candidates — `ActionGrammar`, `Persona`, `Resume` — declare themselves in their own docstrings
as the TypeScript oracle for a named F# module. That reads like the sharpest possible finding: a file
_claiming_ to be an oracle with nothing checking it.

**All three were already pinned.** `HatTreaty.Tests.fs` calls `ActionGrammar.join`,
`ActionGrammar.meet` and `ActionGrammar.complement` against the transcript's `Lattice` vectors, and
carries 22 `Persona*` vector types. `resume.ts` has `resume-golden.json` beside it.

The roster could not see any of it, because it matched evidence by **filename and directory**: the
hat treaty is named for the directory (`hat/`) and pins three modules at once, which is completely
normal and completely invisible to a name match.

Had I trusted the report I would have written a second treaty for work already done.

## The fix: ask what the replay actually CALLS

A qualified call `Concept.something` inside a file that also reads a transcript or golden file is a
replay exercising that module — whatever anyone named the files. That one change moved the count from
**40 pinned / 30 not** to **49 / 21**, recovering `ActionGrammar`, `Persona`, `Resume`, `Collation`,
`Chip8`, `ErasureClass`, `QuantumArith`, `ActorRef`, `ReticulumQuantum`, `Result` and
`SpecializationCache`.

Two smaller detection gaps went with it: `resume-golden.json` (evidence under a `-golden` spelling
the matcher did not know) and `DeltaCodec`, whose replay is named for the **format**
(`DeltaLogEntryCodec.Tests.fs`) rather than the module.

**And a regex that never matched.** The first version built its pattern as `` `\b${concept}\.` `` — a
template literal, where `\b` is a **backspace character** and `\.` is a bare dot. It searched for
`<BS>ActionGrammar.` and matched nothing, so the new detector silently found no pins at all. Caught
because the count did not move.

## The triage: six declared non-pairs, with reasons

| concept   | why no treaty                                                                                 |
| --------- | --------------------------------------------------------------------------------------------- |
| `Crypto`  | F# is the crypto noun-class over a hexagonal port; TypeScript is `better-git-crypt/crypto.ts` |
| `Plan`    | F# is query-plan metadata; TypeScript is a USB multiboot layout planner                       |
| `Metrics` | F# is `System.Diagnostics.Metrics`; TypeScript is precision/recall for a classifier           |
| `Query`   | F# is LINQ-style `Stream<ZSet<_>>` extensions; TypeScript evaluates a bonsai `Expr`           |
| `Heat`    | F# is the thermodynamic shed (deferred vs annihilated); TypeScript is a UI signal union       |
| `Ctm`     | both files say **DECLARATION ONLY** in their first line — two declarations cannot disagree    |

Each was checked by opening both files, not inferred from the name.

## Result

**56 pinned, 14 candidates** — from 31. The remaining 14 are named in the baseline and are genuine
candidates that still need a per-pair judgement, not a number.

## A seam the tests found

`findPairs()` did not apply `DECLARED_UNPINNED` — the CLI's main block did. So a test could only
re-implement the filter, and **a test that re-implements what it checks agrees with itself rather
than with the tool.** Both now go through `unwatchedPairs()`.

## Falsifiers

| mutant                             | result                                                         |
| ---------------------------------- | -------------------------------------------------------------- |
| replay-call detection disabled     | **killed** — `a replay that CALLS a module counts as its pin`  |
| declared non-pairs reported anyway | **killed** — `a declared non-pair is EXCLUDED from the report` |

The first mutant initially failed to apply through shell quoting and reported "8 pass" — which would
have read as a passing matrix. Each mutant now verifies its own anchor landed before the tests run.

```
bun run hygiene:cross-language-pairs                                    # exit 0, 56/70 pinned
bun test src/Core.TypeScript/hygiene/audit-cross-language-pairs.test.ts # 8 pass
bun run hygiene:linter-coverage                                         # exit 0
```
