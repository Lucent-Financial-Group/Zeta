# ADR: Debt-intentionality is the invariant; the architect is a synthesiser, not a gatekeeper

**Date:** 2026-04-20 (round 42/43 boundary)
**Status:** *Decision: replace the architect-reviews-all-agent-
code gate in GOVERNANCE.md §11 with a debt-intentionality
invariant anchored in a new `docs/INTENTIONAL-DEBT.md` ledger.
Effective round 43.*
**Owner:** architect (wide — synthesis, round-close sign-off)
+ every agent (narrow — self-declaration of shortcuts on the
contributions they ship).

## Context

The human maintainer (Aaron) named the invariant directly on
the round-42/43 boundary:

> *"Feel free to keep iterating on architect reviews all
> agent code; nobody reviews the architect with your
> suggestions unless you've got something that feels better
> and we can talk about it, i think you might know better
> than me at this point, the reason i put that there was i
> was worried about people taking shortcuts to just get the
> task done instead of doing the right thing for the long
> term, **that's the invariant I really care about, not who
> reviews what**, I care that everyone feels ownership to
> change the code but that ownership comes with
> responsibilities no quick hacks we make the right long
> term decisions, that does not mean we can't put in
> shortcuts temporarily as we build it better later, but it
> does mean if we decide to hack it or take a shortcut or
> not do it the right long term way **that's intentional
> debt, not accidental debt, I'm trying to avoid accidental
> debt**. You can make changes around that."*

Verbatim quote; emphasis added. The quote declares three
things:

1. The invariant is **no accidental debt**. It is *not*
   "architect reviews everything".
2. **Intentional debt is fine** — the factory can take
   shortcuts deliberately when that is the right call,
   provided the shortcut is named as debt.
3. **Everyone owns the code.** Ownership is repo-wide, not
   gated through one reviewer seat. The responsibility that
   comes with ownership is the debt-declaration obligation,
   not a review queue.

GOVERNANCE.md §11 as previously written —
*"Architect reviews agent-written code; nobody reviews the
Architect"* — implements the invariant **indirectly** by
funnelling all agent code through one reviewer whose job
includes catching shortcuts. That approximation has three
known failure modes:

- **Scaling.** The architect-bottleneck is explicitly
  accepted in the previous §11 text, but the factory has
  grown from ~30 skills in round 18 to ~180 in round 41.
  Review throughput does not scale with agent count.
- **Naming the wrong thing.** §11 named the *mechanism*
  (architect-reviews) as the rule. The mechanism is
  replaceable; the invariant is not.
- **Implicit shortcuts.** An architect-review catches
  shortcuts the architect *notices*. It does not create
  any pressure on the shortcut-taker to name the debt. A
  shortcut that passes review silently is exactly the
  accidental-debt failure mode the invariant guards
  against.

## Decision

Replace §11 with a debt-intentionality rule that makes the
invariant the rule, and the review mechanism advisory.

### The new rule (§11, rewritten)

> **Debt-intentionality is the invariant. Accidental debt
> is the only thing gated.**
>
> Every agent that contributes code, docs, skills, specs,
> scripts, or any other artifact owns the long-term
> maintainability of that artifact. Ownership carries one
> positive obligation and one negative obligation:
>
> - **Positive.** If you take a shortcut — a quick hack, a
>   deferred refactor, a known-wrong placeholder, a "do
>   it properly later" — you file a row in
>   `docs/INTENTIONAL-DEBT.md` naming what the shortcut is,
>   why it was taken, what the right long-term solution
>   looks like, and the trigger that will cause the
>   follow-up work. The debt row lands in the same commit
>   or PR as the shortcut.
> - **Negative.** You do not land accidental debt — shortcuts
>   taken without realising they are shortcuts, or landed
>   without the ledger row. When accidental debt is
>   discovered post-hoc, the fix is a retroactive ledger
>   entry plus a short note on how the shortcut slipped the
>   self-declaration pass (so the process improves).
>
> The architect's role is **synthesis** — reading the round,
> reviewing the ledger, pattern-matching across specialist
> findings, and making the integration call — not gating
> individual commits. The architect may still review any
> code; so may any other persona wearing the architect hat.
> Specialist reviewers (Aminata, Mateo, Nazar, Naledi,
> Hiroshi, Ilyana, Viktor, Aarav, and peers) remain
> advisory on their surfaces; humans always retain the
> override seat per GOVERNANCE.md §10.

### What changes in practice

| Aspect | Before | After |
|--------|--------|-------|
| Who reviews agent code | Architect (single seat, mandatory) | Self + advisory specialists + optional architect + Copilot + humans |
| What gates a merge | Architect approval | Accidental-debt absence (self-declared + round-close synthesis spot-check) |
| Shortcut policy | Implicit (architect's call during review) | Explicit (ledger row mandatory; shortcut-taker files it) |
| Architect role | Reviewer-of-everything | Synthesiser + round-close sign-off + ledger-reader |
| Scaling behaviour | Architect-bottleneck accepted | Distributed ownership; architect reads ledger not every diff |
| Self-review bias concern | Mitigated by architect-review | Mitigated by ledger visibility (everyone sees everyone's debt) + specialist advisory + Copilot external pass |

### What stays the same

- **Specialist routing.** `docs/CONFLICT-RESOLUTION.md`'s
  per-surface reviewer roster is unchanged. Security goes
  through Aminata / Mateo / Nazar. Performance through
  Naledi / Hiroshi / Imani. Public API through Ilyana.
  OpenSpec through Viktor. Skills through Aarav.
  Reviewers remain advisory — they recommend, the
  contributor integrates, the ledger records any
  remaining gap.
- **Human override.** GOVERNANCE.md §10 (human-always-can-
  step-in) is untouched. The human maintainer remains the
  terminal seat.
- **Architect authority on integration.** The architect
  still synthesises at round-close. The shift is *what
  the architect synthesises against* — the ledger and the
  specialist findings, rather than every diff in
  isolation.
- **Reversibility (§15).** Untouched. A one-round rollback
  is still required for every autonomous change.
- **Copilot as external bug-reviewer.** `.github/copilot-
  instructions.md` continues to encode the factory-
  managed Copilot contract. Copilot's role naturally
  strengthens under the new rule: it's the second set of
  eyes that doesn't rely on agent self-declaration.

## Consequences

### Positive

1. **The invariant is named.** A reader of GOVERNANCE.md
   now sees "no accidental debt" as the rule, not as a
   consequence of a review mechanism. The rule survives
   the replacement of any specific reviewer.
2. **Ownership is distributed.** Every persona feels the
   responsibility of the long-term decision directly,
   not indirectly via "the architect will catch it".
3. **Shortcuts become legible.** `INTENTIONAL-DEBT.md`
   becomes a first-class artifact the factory can
   plan against — grandfather-discharge rounds, debt-
   paydown sprints, retrospective pattern detection.
4. **Scales with agent count.** The ledger grows with
   the factory; review throughput no longer bottlenecks
   on one seat.
5. **Matches tech-best-practices / skill-edit justification-
   log pattern.** Both of those already live as ledgers
   (living lists, justification rows). The debt ledger
   is the same shape.

### Negative / risks

1. **Self-declaration bias.** Some shortcuts will be
   invisible to the shortcut-taker. Mitigations:
   specialist advisory passes, Copilot review, architect
   synthesis spot-check on the ledger, retroactive
   entries.
2. **Ledger hygiene.** If `INTENTIONAL-DEBT.md` becomes a
   dumping ground, it loses signal. Mitigation: the file
   has a curator — the architect at round-close — who
   can group-and-retire stale rows the same way
   `docs/BACKLOG.md` is curated.
3. **Cultural shift.** Agents used to "architect will
   check" may under-invest in self-declaration.
   Mitigation: the first two rounds under the new rule
   land with the architect paying specific attention to
   ledger completeness and coaching (not gating) on
   missed declarations.

### Neutral

- The architect can still review whatever they want. The
  shift is that other agents can also wear the architect
  hat for a review, and no single seat is mandatory on
  every commit.
- Copilot's existing second-review role is reinforced,
  not replaced.

## Alternatives considered

1. **Keep §11 as-is, add ledger on top.** Rejected: the
   bottleneck scaling problem is real and the rule
   still names the wrong thing as invariant.
2. **Peer-architect review (anyone wearing the architect
   hat can review anyone else).** Considered. Converges
   with the final decision: the new §11 allows it
   ("the architect may still review any code; so may any
   other persona wearing the architect hat") but does
   not mandate it. Peer-architect review becomes one
   more advisory lane, not a gate.
3. **Trust Copilot fully as the second reviewer.**
   Rejected: Copilot catches mechanical bugs well but
   does not reason about long-term architectural
   shortcuts. It's a supplement, not a replacement for
   agent self-awareness.

## Implementation plan

### Round 43 (this round)

- [x] ADR landed (this file).
- [ ] `docs/INTENTIONAL-DEBT.md` seeded with the known
      recent shortcuts: the skill-tune-up content-
      extraction row, the round-42 static-signal-only
      skill ranking, the round-34 long-term-rescheduler
      scope compromise if any, and an explicit empty-row
      template.
- [ ] GOVERNANCE.md §11 rewritten to the text above.
- [ ] GOVERNANCE.md §10 cross-reference added if
      needed.
- [ ] `CLAUDE.md` pointer list updated if §11 is named
      anywhere (check).

### Round 44

- [ ] `.github/copilot-instructions.md` reviewed for the
      "architect reviews all agent code" phrasing; edit
      if present.
- [ ] `docs/CONFLICT-RESOLUTION.md` reviewed for the
      same; preserve the advisory-specialist routing
      explicitly.
- [ ] First architect round-close pass reads the ledger
      and posts the synthesis note in `docs/ROUND-
      HISTORY.md`.

### Round 45-46

- [ ] Coaching pass: architect flags any PR whose diff
      suggests a shortcut but which landed without a
      ledger row. These become the early-calibration
      data for the new rule. Retroactive ledger rows
      added; process notes captured.

### Rollback plan

If the rule degenerates (ledger becomes noise, shortcut-
taking increases, architect synthesis misses critical
drift), revert via:

1. Restore GOVERNANCE.md §11 to the prior text.
2. Move `docs/INTENTIONAL-DEBT.md` to `_archive/` with a
   note explaining the experiment.
3. File a follow-up ADR documenting what we learned.

This is a single-round rollback per GOVERNANCE.md §15.

## Interaction with existing rules and memories

- **BP-HOME (Rule Zero).** The ledger lives at
  `docs/INTENTIONAL-DEBT.md` — the canonical debt home.
  Shortcut rows are well-typed by location; the type
  signature is "intentional debt".
- **BP-WINDOW.** Window-expansion per commit implies the
  factory widens what ships safely each round. Declared
  debt is inside the window; accidental debt escapes it.
  The ledger tightens the BP-WINDOW semantics.
- **Memory: `feedback_skill_edits_justification_log_and_
  tune_up_cadence.md`.** The justification log is a
  sibling ledger for skill-edits specifically. The debt
  ledger is the general case; justification-log-for-
  skills is a specialisation.
- **Memory: `feedback_skill_tune_up_uses_eval_harness_
  not_static_line_count.md`.** The round-42 static-
  signal-only ranking was an accidental shortcut. It
  lands on the ledger retroactively as the first
  seeding row — which is exactly the pattern the rule
  is designed to capture.
- **Memory: `feedback_fix_factory_when_blocked_post_hoc_
  notify.md`.** Unchanged. Blanket permission to fix
  factory-structure blocks continues to apply;
  structural fixes are not debt unless they are
  shortcuts.
- **GOVERNANCE.md §10 (human-always-can-step-in).**
  Untouched. The human override is the terminal seat
  whether or not the architect gated individual
  commits.
