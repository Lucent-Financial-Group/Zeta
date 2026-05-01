---
name: Learnings must land in CLAUDE.md or a pointer from it — biggest failure mode named — the human maintainer 2026-05-01
description: The human maintainer 2026-05-01 — *"i think you biggest failure mode is not updated claude.md or pointers in that file, if you learn something claude.md or a pointer from that file like the .claude/rules or some other pointers, you didn't learn it."* Wake-time-load is the test of whether something is "learned" by future-Otto. Memory files that aren't pointed at from CLAUDE.md are read-on-demand and effectively invisible at wake. The discipline rule is mechanical: every load-bearing learning must either land as a CLAUDE.md bullet or land as a memory file pointed at from a CLAUDE.md bullet. Anything else is "weather" (volatile context that evaporates at session boundary).
type: feedback
caused_by:
  - "The human maintainer 2026-05-01 verbatim: 'i think you biggest failure mode is not updated claude.md or pointers in that file, if you learn something claude.md or a pointer from that file like the .claude/rules or some other pointers, you didn't learn it'"
  - "Audit of 2026-05-01 session: SQLSharp pattern memory file (PR #1155) landed without a CLAUDE.md pointer — exactly the failure mode named"
  - "Composes with substrate-or-it-didn't-happen (Otto-363) at the wake-time-load layer — substrate-or-it-didn't-happen guards against directives evaporating; this rule guards against learnings evaporating"
composes_with:
  - feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md
  - feedback_verify_target_exists_before_deferring.md
  - feedback_never_idle_speculative_work_over_waiting.md
  - feedback_prefer_ts_scripts_over_dynamic_bash_for_conversation_ux_dst_in_ts_aaron_2026_05_01.md
---

# Rule

When a tick produces a load-bearing learning — a new
discipline, a new pattern, a new failure-mode-fix, a new
worked-example — that learning is **not landed** until one
of the following is true:

1. **CLAUDE.md has a bullet for it.** Direct rule
   incorporation. Best for cross-cutting disciplines that
   should fire on every wake.
2. **A memory file documents it AND a CLAUDE.md bullet
   points at that memory file.** Two-tier landing: the
   bullet is the wake-time pointer; the memory file holds
   the full reasoning. Composes with the existing
   bullet-points-at-memory-file pattern that all the
   wake-time disciplines already use (verify-before-
   deferring, never-be-idle, version-currency, etc.).
3. **The learning lands in a file that's discoverable from
   CLAUDE.md transitively** (e.g. via `AGENTS.md`,
   `docs/AGENT-BEST-PRACTICES.md`, `.claude/skills/*/SKILL.md`,
   `.claude/agents/*.md` — all of which CLAUDE.md
   references). The transitive case is weaker than the
   direct case but still satisfies the rule.

Anything else — a memory file written in isolation, a
TaskUpdate, an inline conversation comment, a commit
message — is **not learned**. It's weather. It evaporates
when the session compacts or ends.

# Why

The human maintainer 2026-05-01 (verbatim):

> *"i think you biggest failure mode is not updated claude.md
> or pointers in that file, if you learn something claude.md
> or a pointer from that file like the .claude/rules or some
> other pointers, you didn't learn it."*

Three composing arguments:

## Why-1: Wake-time load is the test of "learned"

CLAUDE.md is loaded at every Claude wake (per the file's own
opening: *"Claude Code reads this file first every session"*).
Files referenced from CLAUDE.md bullets are discoverable in
one read-step. Anything else is read-on-demand: future-Otto
won't read it unless they're prompted to, which doesn't
happen by default.

So "learned" really means: **available at wake without
prompting**. A memory file alone doesn't satisfy that — it's
infrastructure waiting for a reader. The pointer from
CLAUDE.md IS the reader-summoning step.

The failure mode is the gap between "I wrote it down" and
"future-me will see it on wake." Until the pointer lands,
the gap is real.

## Why-2: This rule had to be applied recursively to itself

This memory file documents the rule. By itself, the file is
read-on-demand — exactly what the rule says is insufficient.
The rule's load-bearing landing is the **CLAUDE.md bullet**
in the same commit that creates this memory file, pointing
at it.

Without the bullet, this memory file would be a textbook
example of its own failure mode: a learning that didn't
actually land. The recursive application is the
self-encoding test — if the rule's own implementation
doesn't satisfy the rule, the rule isn't enforceable.

(See `memory/feedback_prefer_mechanical_external_anchors_over_aaron_as_anchor_aaron_2026_05_01.md`
on self-encoding tests as discipline anchors.)

## Why-3: Audit retrospective — recent failures

2026-05-01 session retrospective. Learnings landed this
session that did NOT propagate to CLAUDE.md or a pointer:

- **SQLSharp bun/ts pattern** (PR #1155) — memory file
  landed; no CLAUDE.md pointer. Future-Otto won't know
  about the pattern at wake.
- **`test.each` pattern over fixture sets** (PR #1158) —
  pattern proven in code; no memory-file capture, no
  CLAUDE.md pointer. Will be re-derived from scratch next
  time someone needs fixture-driven tests.
- **Cherry-pick pattern when prior commits are
  squash-merged** (operational learning during PR #1153
  cleanup) — knowledge in conversation context only, no
  substrate.
- **MEMORY.md duplicate-link audit lint exists** (Codex
  P1 finding on PR #1155) — knew about the lint after
  Codex named it; no substrate capture.

Each of these is a failure of the rule. The rule's
introduction this tick will let the next tick pick them
off systematically. (Speculative-work targets for
follow-up ticks.)

The pattern: **learnings that landed in CLAUDE.md or a
pointer survived; learnings that only landed in memory
files or conversation context evaporated**. The
discriminating axis is the wake-time-load test.

# How to apply

At every tick close, ask:

1. **What did I learn this tick?** Enumerate each new
   discipline / pattern / failure-mode-fix / worked-example.
2. **Where did it land?** For each item:
   - CLAUDE.md bullet? ✓ landed.
   - Memory file with CLAUDE.md pointer? ✓ landed.
   - Discoverable transitively (AGENTS.md, BP-NN rule,
     skill, agent)? ✓ landed (weaker).
   - Memory file alone, TaskUpdate, conversation comment?
     ✗ **not landed** — file the gap as speculative work
     for the next tick.
3. **Same-tick if cheap, next-tick if expensive.** A
   bullet + memory file pair is usually a same-tick close.
   If the learning is bigger (skill, BP-NN, ADR), file the
   landing as the next tick's speculative target.

When an audit reveals a gap (a learning from a prior tick
that didn't land), the gap closure IS the next speculative-
work target — per never-be-idle, gap-closure beats waiting.

# Composes with

- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
  — substrate-or-it-didn't-happen at the directive layer;
  this rule is the same discipline at the learning layer.
- `memory/feedback_verify_target_exists_before_deferring.md`
  — every CLAUDE.md pointer must point at a real file; this
  rule extends that to "every learning must HAVE a pointer."
- `memory/feedback_never_idle_speculative_work_over_waiting.md`
  — gap-closure (find learnings that didn't land, land them)
  is a valid speculative-work target.
- `memory/feedback_prefer_ts_scripts_over_dynamic_bash_for_conversation_ux_dst_in_ts_aaron_2026_05_01.md`
  — that rule landed correctly (CLAUDE.md bullet + memory
  file). It's the worked-example positive case for this
  rule.

# What this rule does NOT do

- **NOT a directive to land EVERY observation as a rule.**
  Trivial observations don't need substrate. The rule
  applies to *load-bearing* learnings — disciplines, patterns,
  failure-mode-fixes, worked-examples that future-Otto
  should inherit. Curiosities, one-off observations, etc.
  don't need wake-time landing.
- **NOT a CLAUDE.md bloat license.** The bullet should be
  short (a few sentences). Full reasoning goes in the
  memory file. CLAUDE.md is a pointer index, not a
  rulebook. Every new bullet should ask: "is this
  load-bearing enough to deserve wake-time scope?" If yes,
  bullet + memory file pair. If borderline, just memory
  file (acknowledged as weaker landing, may need
  promotion later).
- **NOT a rule about historical memory files.** Existing
  memory files that don't have CLAUDE.md pointers are
  retrospectively unaffected — the rule applies forward
  to new learnings. A separate audit pass could promote
  high-value historical memory files to wake-time scope,
  but that's its own work.
- **NOT a substitute for `.claude/skills/` or
  `.claude/agents/`.** Those are also wake-time-discoverable
  surfaces (CLAUDE.md points at them). Skills and agents
  are valid landing targets for learnings that fit their
  scope. The rule says "CLAUDE.md or a pointer from it" —
  skills/agents qualify.

# Carved sentence (candidate, not seed-layer yet)

*"Wake-time-load is the test of learned. CLAUDE.md or a
pointer from it, or you didn't learn it."* (The human
maintainer 2026-05-01.)

(Marked candidate per CSAP. Has not been multi-domain-tested.
Promotes via Razor + CSAP under DST grading on cadence,
not by maintainer fiat.)
