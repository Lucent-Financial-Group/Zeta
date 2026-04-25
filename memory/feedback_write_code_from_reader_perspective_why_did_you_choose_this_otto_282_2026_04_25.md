---
name: WRITE CODE FROM READER PERSPECTIVE — when authoring code, think from the perspective of a human developer reading it later who will always ask "why did you choose this"; every non-obvious choice (magic number, algorithm pick, library selection, threshold value, API signature, perf trade-off, defensive-vs-assertive style) deserves an in-place rationale comment; Aaron Otto-282 2026-04-25 generalising from the SplitMix64 magic-number-comment lesson; subsumes the magic-numbers-deserve-comments rule and Otto-281 DST-exempt-needs-justification rule
description: Aaron Otto-282 general code-authoring discipline. Each non-obvious choice in code (constant, algorithm, structure, parameter) carries a "why" that is invisible to future readers unless captured in-place. The rule generalises several specific instances seen this session (SplitMix64 multipliers + shifts, DST-exempt deferred bug, HashCode.Combine production trade-offs).
type: feedback
---
## The rule

**When writing code, write for the future reader who will ask
"why did you choose this?" — and answer them in-place.**

Aaron's verbatim framing 2026-04-25:

> *"just in general when writing code, think from the perspective
> of a human developer who's looking at it, they will always ask
> why did you choose this?"*

The rule is not "comment everything." It's "anticipate the
reader's `why` questions and answer them where the choice lives."

## What counts as a non-obvious choice

If a future reader looking at the line could reasonably ask
*"why this and not something else?"*, the answer belongs next to
the code. Examples that this session surfaced:

1. **Magic numbers / constants.** `0x9E3779B97F4A7C15UL` (golden
   ratio), `30 / 27 / 31` (Vigna shift pairs), `epsilon = 0.01`
   (Count-Min default), `capacity = 200` (KLL default). Every
   one of those values is a *decision*. The reader will ask
   *"could we use 0.001? what changes?"* — answer it.
2. **Algorithm choice.** Picking Jump consistent hash over
   Rendezvous over Memento. Picking SplitMix64 finaliser over
   XxHash3 on the hot path. Picking median-row over min-row in
   CountMin estimate. Each choice has a trade-off the reader
   needs to understand to evaluate later changes.
3. **Library selection.** Picking `System.IO.Hashing.XxHash3`
   over a Murmur3 implementation. Picking xUnit over NUnit.
   Picking Apache.Arrow over a hand-rolled columnar format.
   Why this one and not the alternatives?
4. **API signatures + defaults.** `OfFixedBytes` taking
   `ReadOnlySpan<byte>` instead of `byte[]`. Default
   `logBuckets = 12` for HLL. Optional vs required arguments.
   Each shape has a reason that prevents future "wait, why
   not just take a byte[]?" questions.
5. **Performance trade-offs.** Inline vs extracted. Stack-alloc
   vs heap-alloc. Hot-path optimisations with caveats. Caching
   strategies. The reader needs to know what the trade-off was
   so they can preserve it under later edits.
6. **Defensive-vs-assertive style.** When you `invalidArg` vs
   when you `assert` vs when you trust callers. Why this
   particular boundary?
7. **Order of operations.** Why this validation before that
   validation. Why this lock acquisition order. Why this
   memory barrier here and not there.
8. **Code shape.** Why this is a `[<Sealed>]` class. Why this
   is a `[<Struct>]`. Why this uses `[<Literal>]`. Why this
   field is `static member val` vs `static let`.
9. **What was rejected.** "Why not X?" — sometimes the right
   answer is to call out the alternative explicitly so future
   readers don't waste time re-evaluating.
10. **Date- or version-sensitive choices.** "We pinned to .NET 10
    because Y" — the reader 6 months from now needs to know
    whether the pin is load-bearing or vestigial.

## What does NOT need a comment

The rule is "anticipate the why" — not "explain the what."

- Standard idioms a working developer in the language already
  knows: `let x = 5` doesn't need "this assigns 5 to x."
- Self-evident from naming + types: `let userId: Guid` doesn't
  need "this is a user identifier."
- Code that does exactly what its name says: a function called
  `getUserById` doesn't need to explain that it fetches a user
  by ID.

The bar is "does a competent reader pause and ask why?" If yes,
answer. If no, don't add noise.

## Why this rule matters

Code without provenance comments degrades by a slow process:

1. Author makes a deliberate choice (e.g. `0x9E3779B97F4A7C15UL`)
   based on knowledge that doesn't fit in the variable name.
2. Author moves on to the next thing. Their head holds the
   "why" but their fingers don't type it.
3. Reader 6 months later sees the line. Has no clue why this
   number. Either:
   - **Cargo-cults the constant**: copies it elsewhere
     "because the original code had it."
   - **"Optimises" the magic away**: replaces it with a
     readable-looking constant that breaks the math.
   - **Spends 2 hours on Wikipedia** rediscovering the
     provenance.
4. The original author's knowledge has effectively *evaporated*
   from the codebase. The code still works (or doesn't), but
   the *reasoning* is gone.

The cost is paid by every future reader, multiplied by every
edit, every audit, every code review. **One in-place comment
beats one hundred re-derivations.**

## Trigger pattern (write-time discipline)

When writing code, after each non-trivial decision, pause and
ask:

> *"If this line surfaces in a code review or a 6-months-from-
> now audit, would the reader be able to recover the rationale
> from the code itself?"*

If no, write the comment. If yes, move on.

This is a **write-time** discipline, not a review-time one.
Adding the comment costs ~10 seconds at write-time. Adding it
during a later review costs an hour of context-switching to
remember why.

## What this rule generalises

Several session-local instances all collapse into this rule:

- **Magic-numbers-deserve-comments** (Aaron earlier 2026-04-25,
  the `0x9E3779B97F4A7C15UL` discussion). Specific instance.
- **Shifts-also-deserve-comments** (Aaron 2026-04-25 on the
  `30, 27, 31` shift constants in `finalise`). Same shape;
  generalised here.
- **DST-exempt comments need full justification** (Otto-281).
  A *comment* explaining why we deviate from DST is itself
  the load-bearing artifact; the comment is the deferral
  marker.
- **Per-process-randomization caveat documented** (Otto-281
  audit on `HyperLogLog.Add`, `Shard.OfKey`,
  `InfoTheoreticSharder.Pick`). Trade-off rationale lives
  next to the choice.

## Composes with

- **Otto-281 (DST-exempt is deferred bug)** — comments are how
  trade-offs land, but trade-off comments are also a deferred-
  fix marker if the trade-off is "we know this is wrong."
- **Otto-272 (DST-everywhere)** — code that violates DST has a
  *strong* obligation to explain why; the rule applies most
  acutely there.
- **Otto-227 (signal-in-signal-out / verbatim preservation)** —
  comments are part of the signal; ferry content + reasoning
  must propagate together.
- **GOVERNANCE.md §code-style** — this rule is a *style*-level
  discipline that complements numbered rules.

## Pre-commit-lint candidate

A grep for newly-added literals (numbers ≥ 8 chars, regexes,
specific URLs) without an adjacent comment block could fire as
a write-time hint. Heuristic only; the rule is fundamentally a
human judgment call about "is this non-obvious?". Lint can
*flag* candidates; the author decides.
