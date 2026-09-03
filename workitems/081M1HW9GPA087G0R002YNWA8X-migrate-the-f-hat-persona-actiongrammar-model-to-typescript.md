---
id: 081M1HW9GPA087G0R002YNWA8X
type: task
state: backlog
priority: P2
slug: migrate-the-f-hat-persona-actiongrammar-model-to-typescript
title: "Migrate the F# Hat/Persona/ActionGrammar model to TypeScript and gate the 16-slot grammar with it"
created: 2026-09-02T20:20:00.000Z
depends_on: []
composes_with: []
---

# Migrate the F# Hat/Persona/ActionGrammar model to TypeScript and gate the 16-slot grammar with it

## Why

`src/Core.TypeScript/observe/room/hat-gate.ts` had grown a *parallel* authority model — a six-tier
`HatLevel` plus boolean permission flags — with no relationship to the canonical one in
`src/Core/Hat.fs` and `src/Core/Persona.fs`. Two models for one concept is the drift this repo
already solved once for `WorkflowEngine.fs`, and it solved it with a treaty rather than with care.

The canonical model is also the better one, and the difference is not cosmetic:

| | ad-hoc TS model | canonical F# model |
|---|---|---|
| authority | boolean permission flags | `Action[]` — sets of 16-bools over the action grammar |
| algebra | none | a Boolean lattice (`join`/`meet`/`complement`/`leq`) |
| wearing | a tier on the agent | `Persona.Worn`, temporal via `wear`/`doff` (weight-free, §3) |
| composition | — | UNION across worn hats; unrestricted if any worn hat is |

Because a slot index in `GRAMMAR_16_V0` *is* a key index in `ActionGrammar.Action`, the canonical
model plugs into the observe loop with no adapter at all: "may this persona use slot i" is exactly
`ActionGrammar.holds(i, action)`.

## What landed

- `src/Core.TypeScript/hat/action-grammar.ts`, `hat.ts`, `persona.ts` — one-for-one ports.
- `src/Core.TypeScript/hat/hat-grammar-gate.ts` — the join to `renderGrammar16`.
- `src/Core.TypeScript/hat/generate-hat-treaty-transcript.ts` + `hat-treaty-transcript.json` —
  **202 vectors**.
- `tests/Tests.FSharp/HatTreaty.Tests.fs` — the F# replays all 202 and asserts equality.
- `src/Core.TypeScript/hat/hat-grammar-gate.dst.test.ts` — 7 invariants, ~2,400 assertions.

## Semantics that had to be copied exactly

- **`single` MASKS (`k & 0xF`), `ofGrid` CLAMPS.** Two boundary rules that disagree; both are in the
  treaty. A port that "tidied" one into the other would pass its own tests and diverge from the
  oracle only at inputs nobody tries.
- **Empty allow-list = UNRESTRICTED**, not "permits nothing".
- **`wear` is idempotent by name and appends**; **`decide` REPLACES** the worn set, ordered by
  `available`, dropping anything not in it.
- **`route` sorts descending on the whole `(relevance, name)` tuple** — ties break by name
  *descending*.
- **F# compares arrays structurally; JavaScript compares by reference.** Ported naively, every
  allow-list lookup silently misses.

## Mutation results

Treaty (mutate the TS oracle, regenerate, F# must redden) — **5 of 5 caught**: `single` clamping
instead of masking; `route` tie-break inverted; the unrestricted rule dropped; `wear` prepending;
the meta-hat address prefix changed.

Gate DST — 5 mutants, and **one initially survived**, which was the valuable one.

## The trap that mutation found

Mutating `Persona.allowedActions` from UNION to INTERSECTION changed real behaviour — two hats
allowing `{0,1}` and `{2,3}` went from 4 allowed actions to 0 — and the whole suite stayed green.

The reason is the sharp edge in the convention:

> Under `empty = unrestricted`, a composition that intersects to EMPTY does not become restrictive.
> It becomes **UNRESTRICTED**. It fails **open**, and it does so exactly when two hats have nothing
> in common — which is when you would most want it to close.

So the union rule cannot be checked by measuring how much authority a persona ends up with. It has
to be asserted where the convention is decided, as a biconditional: for a persona wearing at least
one hat, the allow-list is empty **iff** some worn hat is itself unrestricted. That is invariant 7,
and it kills the mutant.

The same edge has a second face, pinned as invariant 5a: **a persona wearing NO hats is
unrestricted**, so putting on a first restricted hat is the only step that can reduce authority.
Faithful to the F#, and precisely the fail-open shape a corporate policy layer must answer for —
"unbound" must not mean "unlimited" once hats can come off. The F# says restrictive composition is
"the policy layer's call", so both are recorded here rather than patched at a level that does not
own the decision.

## Honest scope

- `Traversal` is **excluded from the treaty by nature, not convenience**: `Traversal.Traversal<'r>`
  carries functions, which do not survive JSON. `Persona.traversals` is the one ported function with
  no vector.
- `Lens`, `Ground` and `Traversal` are carried as opaque type parameters. Nothing about them is
  modelled or faked.
- The gate **vetoes, never grants**, and never removes a slot — `grammar-16` fixes the 16 directions
  for muscle memory, so a vetoed slot renders `F` and keeps its index.
- Slot 14 (free modes) is never vetoed at any authority, including the floor. The renderer already
  pins it `always T (NCI)`; an authority model that could switch off a wearer's rest would make the
  corporate mode a cage rather than a hierarchy.
- `hat-gate.ts`'s existing `HatLevel` model is left in place and untouched. Replacing it is a
  follow-up decision for its owner, not a side effect of landing the migration.
