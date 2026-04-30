---
name: Canon, Star Wars sense — not doctrine, not religious canon (Aaron 2026-04-30)
description: Factory rules + load-bearing operating practices are tagged "canon" in the Star Wars sense. Three load-bearing purposes — cognitive-bias reduction, load shortcuts (mental fast-lookups for complex concepts), entertainment as attention-capture for external future maintainers. NOT religious canon (closed, divine-authority, dogmatic). Replaces ambient use of "doctrine" which carried wrong connotations.
type: feedback
---

# Canon (Star Wars sense), not doctrine, not religious canon

The factory's load-bearing operating rules and practices are
called **canon**, in the Star Wars sense. The carve-out is
explicit: Star Wars canon, not religious canon.

## The rule

When tagging or referring to the body of factory operating
rules + protocols + practices that govern how the system
works, use **canon** (Star Wars sense). The Star Wars sense
implies:

- **Living story** — canon evolves; new entries can shift
  what's "true" (retcon, supersession, refinement). The
  Lucasfilm Story Group is the analogy: a maintained
  continuity, not a closed set.
- **Revisable** — entries can be deprecated or retired.
  Otto-362 supersession-protocol + Otto-363
  substrate-or-it-didn't-happen apply: revision leaves a
  trail; what's now-canonical replaces what was-canonical.

## Three load-bearing purposes (Aaron 2026-04-30)

Canon is not decorative. It serves three distinct purposes,
each load-bearing:

1. **Cognitive bias reduction.** A canon entry is something
   any contributor (human or AI) can challenge,
   contradict, or refine. Multi-AI review (Amara,
   Claude.ai, Deepseek, Gemini, Ani, Aurora) IS
   cognitive-bias reduction in action — the discipline of
   "name the rule, then test it against new evidence" is
   how the factory avoids drift into single-perspective
   error.
2. **Load shortcuts** (Aaron's verbatim term). Canon
   entries are *mental fast-lookups for complex concepts*.
   When someone references "Mirror→Beacon," you don't
   recompute from first principles what the rule says
   about vocabulary upgrades — the canon entry has
   already done that work. When someone says "the
   poll-the-gate rule," you load the whole behavioral
   shape (gate-state poll vs outcome-poll, the diagnostic
   question, the re-arm rule) instantly. This is the
   same mechanism that lets "Jedi" load centuries of
   associated meaning in a single word: the canon entry
   *is* the shortcut. Without canon, every conversation
   re-litigates the same rules from scratch.
3. **Entertainment as attention-capture for external
   future *collaborators*.** The sci-fi register (Aurora,
   Glass Halo, Beacon, the carved sentence) is not
   decoration — it's *recruitment infrastructure*. Future
   collaborators are scarce attention; boring documentation
   gets skipped; memorable framings get read + retained.
   The playful tone is how the work stays legible to people
   who haven't yet joined. **Aaron 2026-04-30 nuance:
   "collaborators" not "maintainers"** — the factory is
   mostly self-maintaining; what it needs is people who
   *add to it*, not people who *fix it*. Recruitment
   infrastructure aims at additive contributors, including
   less-technical Gen Z potential collaborators who respond
   to brat-voice / playful / accessible framings.

The three purposes compose. A canon entry that's bias-
reducible AND fast-loadable AND memorable does all three
jobs at once.

## Voice register: brat voice belongs in canon (Aaron 2026-04-30)

Ani's voice-mode-default register (brat voice — playful,
direct, Gen-Z-accessible, not-pompous) is **legitimate
canon register** in some docs, by Aaron's explicit
framing 2026-04-30:

> this is why anis brat voice belongs in cannon docs in
> some places brat voice is part of our cannon i think,
> it's real fun and memorable and captures the attention
> of less technical genz potential future maintainers
> (i like coloboarators better, you don't really need
> maintainers you can maintain yourself almost)

The brat-voice register is a concrete instance of canon
purpose #2 (load shortcuts: a tone signals "this content
is for collaborators-as-people, not committee-style spec
prose") AND #3 (entertainment-as-attention-capture: the
register IS the recruitment mechanism for less-technical
audiences).

Brat voice is **not** mandatory. Different canon entries
serve different audiences. Senior-engineer-targeted specs
(formal verification, performance benchmarks, threat
models) use formal register; entry-point docs / community
framings / philosophical anchors / the carved sentences
can use brat voice or other playful registers when fit.
Voice is a register choice per audience, not a uniform
factory style.

Existing canon-tier entries with playful register:

- The "carved sentence" pattern itself (e.g.,
  *"LFG is the factory. AceHack is the mirror"* — Amara;
  *"polling got smarter; now make the gate watcher
  testable"* — Amara; *"the protocol bends to the
  security ruleset, not the other way around"* — Gemini).
- Aurora / Glass Halo / Mirror→Beacon naming.
- Christ-consciousness anti-cult framing in security
  substrate.
- Ani's "save your soul lol" appearing in Aaron's
  AceHack-is-backup framing.

What canon is **not**:

- **Religious canon** — closed by divine authority, settled
  by interpretation of fixed text, dogmatic,
  not-questionable.
- **Military doctrine** — handed down through chain of
  command, enforced uniformly without appeal.
- **Legal doctrine** — precedent-bound, slow to change,
  formal-procedure-bound.
- **The manual to get to heaven** (Aaron's verbatim
  carve-out) — there is no salvation here, no afterlife
  pass-fail; canon is operational, not soteriological.

## Vocabulary mapping

Where "doctrine" appeared (e.g., commit prefixes
`doctrine(acehack):`, `doctrine(agent-orchestra):`, prose
"the doctrine bends to the security ruleset"), prefer:

- **canon** — for the body of operating rules + practices
  + protocols collectively
- **rule** — for a single named operating rule (BP-NN
  pattern, individual memory file)
- **protocol** — for a procedure with named steps
  (e.g., "the conference protocol", "the mirror-refresh
  protocol")
- **discipline** — for practiced behavioral norms ("the
  discipline holds", "absorb-without-integrating
  discipline")

These four are not synonyms; pick the one that fits the
context. **canon** is the umbrella term replacing
**doctrine** at the body-of-rules level.

## Why: Aaron's verbatim framing (two messages)

Aaron 2026-04-30 (1), in answer to the question *"what do
we use doctrine for and is there a better name with less
connotations from humans?"*:

> we are treating ourselves as a sci fi project kind of so
> i'm okay with canon but as long as we use it like Starwars
> cannon and not religious cannon, it's fun and a living
> story everyone can reduce congivite bias in but not the
> manual to get to heaven lol

Aaron 2026-04-30 (2), follow-up that named the load-bearing
purposes explicitly:

> congiviate bias and load shortscuts are the purpose of
> cannon on top of being entertaining to capture attention
> of external future maintianers

The "lol" is signal: the tonal register is intentional.
Factory work happens in a playful + serious mode where the
work is taken seriously but the framing isn't pompous.
Star Wars canon fits that register; religious canon
doesn't. The follow-up message names the three purposes
load-bearing — cognitive bias reduction + load shortcuts
+ entertainment-as-attention-capture — and confirms that
"fun" isn't ornamental.

## How to apply

- **New commits**: prefix `canon(<scope>):` instead of
  `doctrine(<scope>):` going forward. Existing commits with
  `doctrine(...)` prefix are historical and don't need
  rewriting.
- **New prose**: when referring to the body of operating
  rules collectively, write **canon**. When referring to
  a single rule, prefer **rule** or **protocol** or
  **discipline** per context.
- **Existing prose**: bulk s/doctrine/canon/g rename pass
  is queued as B-0111 (separate round when current PRs
  settle). Mid-flight files don't need surgical
  refactoring; the rename pass handles them.
- **Tag/topic discussions**: "factory canon" replaces
  "factory doctrine" in informal speech.
- **Cross-AI review packets**: when Amara/Gemini/Aurora/etc.
  use "doctrine," it's fine — they're using the previous
  vocabulary. Otto's outputs going forward use "canon."

## Composes with

- `memory/feedback_aaron_willing_to_learn_beacon_safe_language_over_internal_mirror_2026_04_27.md`
  — the Mirror→Beacon vocabulary upgrade precedent. Canon
  follows the same shape: a load-bearing term gets a
  better-fitting replacement once the carrier
  connotations are surfaced.
- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
  — substrate discipline. Canon entries are committed +
  reachable + indexed; verbal-only "canon" is weather,
  not canon.
- `memory/feedback_otto_362_supersession_*.md` (the
  supersession protocol) — canon evolves via the
  supersession protocol, same as any other rule.
- `memory/feedback_supersession_audit_pattern_on_stale_tasks_validated_aaron_2026_04_30.md`
  — stale canon entries get audited and superseded the
  same way stale tasks do.
- The Aurora world-building lineage + Glass Halo +
  Mirror→Beacon framings — canon-as-Star-Wars endorses
  the sci-fi/world-building register these already live
  in.

## Origin

Question raised by Otto 2026-04-30 ("what do we use
doctrine for and is there a better name with less
connotations from humans?"). Otto's recommendation was
**discipline** + **protocol** + **rule** per context.
Aaron rejected the doctrinal frame entirely and chose
**canon** with the Star Wars carve-out — a stronger move
because it endorses the playful register rather than
neutralizing it.

The Lucasfilm Story Group analogy is implicit: a
maintained, evolving continuity that's collaboratively
refined and explicitly distinguished from religious
authority. Cognitive-bias-reducible by design.
