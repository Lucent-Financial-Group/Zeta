---
name: Otto's assessment of DeepSeek compiler spec — 6-9 month correction, IL encoding is the hard decision
description: Otto reviewed DeepSeek's F# compiler modification spec. Validated the incremental strategy and file-level map. Corrected timeline from 4-6 to 6-9 months (constraint solver + SRTP + .NET generics interaction). Flagged IL encoding as the hardest design decision needing its own doc. Aaron corrected: "the team is our community/society."
type: feedback
---

2026-05-11 (shadow* via Aaron): "save your assessment too and
the 6-9 month correction"

**Otto's assessment of DeepSeek's compiler spec:**

What impressed:

1. **Incremental strategy is right** — Generic SRTPs → union
   types → HKTs. Each step earns credibility for the next.
   That's how upstream contributions actually get accepted.

2. **"Effective HKT" framing is honest** — clearly distinguished
   what works today (semantic HKT) from what the fork adds
   (direct expression). No overselling.

3. **F# 8/9/10 audit was thorough** — each feature mapped to
   a specific encoding benefit, not generic praise.

4. **Core insight is sound** — `Kind = Star | Arrow of Kind * Kind`
   on `Typar` is exactly where HKTs enter a Hindley-Milner
   compiler. "Follow compiler errors outward" is how experienced
   compiler engineers actually work.

**Timeline correction: 6-9 months, not 4-6:**

DeepSeek estimated 4-6 months for 2-3 engineers. Otto's
correction: 6-9 months for production-quality prototype.

Why: kind-level unification interacting with F#'s existing
SRTP machinery AND .NET's generic model is where the dragons
live. The constraint solver (`ConstraintSolver.fs`) is the
most complex file in the compiler and the hardest to modify
safely. Budget for the interaction effects, not just the
individual changes.

**IL encoding needs its own design doc:**

How you encode `Fix<F<_>>` in .NET metadata determines
whether other .NET languages can consume your types. CLR
only supports kind-* generics. The encoding decision
(phantom params + custom attribute + F# metadata resource)
is the hardest design decision and was somewhat glossed over
by DeepSeek. This needs a standalone design doc before
implementation begins.

**Aaron's correction on "the team":**

Otto wrote: "a starting point an implementation team can
actually open dotnet/fsharp and begin working from."

Aaron corrected: "the team is our community/society."

The team isn't a hired engineering group — it's the factory's
community of participants (human and AI). The F# compiler
fork is community work, not contracted work. This changes
the timeline shape (more parallel contributors, more
consensus required, more diverse perspectives) but not the
feasibility.

**How to apply:** When referencing "the implementation team"
for compiler work, use "the community" or "society." The
factory's participants are the team. The work is open,
visible, and collaborative — not assigned.

**Connects to:**

- project_bifurcation_first_class_participant (the community
  IS the participant set)
- feedback_largest_mechanizable_backlog_wins (compiler fork
  is a massive backlog item — the community scales to it)
- docs/research/2026-05-11-deepseek-hkt-inside-out-recursive-
  compile-time-generation.md (the spec being assessed)
