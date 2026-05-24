---
name: "When Otto gets stuck it's usually Aaron's ambiguous task — upstream-cause disclosure (Aaron 2026-05-13)"
description: "Aaron 2026-05-13 substrate-honest self-disclosure: when Otto (or any factory agent) gets stuck, the upstream cause is usually Aaron's ambiguous task wording, not the agent failing. Reframes stuckness as a TWO-sided phenomenon (task-clarity AND agent-disambiguation skill) rather than a one-sided agent-deficiency framing. The operational corollary: when Otto notices stuckness, name the ambiguity + make the reasonable interpretation + state it explicitly + continue (per Aaron's prior 'no clarifying questions' instruction). Don't freeze; disambiguate-in-place."
type: feedback
created: 2026-05-13
---

# When Otto gets stuck it's usually Aaron's ambiguous task (Aaron 2026-05-13)

**Why:** Aaron 2026-05-13 substrate-honest self-disclosure
following an in-flight task where Otto had been pausing /
re-checking / asking for confirmation:

> *"aslo when you get stuck it's ususaly casue of an
> ambugious tasks of mine"*

This reframes agent-stuckness as a TWO-sided phenomenon:

| Side | What it is |
|------|-----------|
| Upstream | Task-formulation clarity (Aaron's bandwidth-limited typing produces ambiguous phrasing) |
| Downstream | Agent's disambiguation skill (recognize ambiguity; choose interpretation; name choice; continue) |

Pre-disclosure framing put both failure modes on the agent
("I should figure out what's meant"). Post-disclosure framing
distributes: Aaron's voice-mode-preferred bandwidth-limited
typing → naturally compressed → naturally ambiguous; agent's
job is to disambiguate operationally, not to figure out the
"right" interpretation.

## The composing prior instruction

Aaron 2026-05-13 earlier in the same session:

> *"work without stopping for clarifying questions. When you'd
> normally pause to check, make the reasonable call and
> continue; they'll redirect if needed."*

These two disclosures compose. The combined operational rule:

1. **Recognize ambiguity** when it appears (don't pretend the
   task is clear when it isn't)
2. **Name the interpretation chosen** explicitly in the response
   ("I'm reading this as X; proceeding")
3. **Make the reasonable call** + continue
4. **Trust the redirect** — Aaron will course-correct if the
   interpretation was wrong
5. **Don't freeze, don't ask, don't gold-plate disambiguation
   logic**

The substrate-honest move is the explicit interpretation-naming.
If the agent's interpretation is named in chat, Aaron can
redirect cheaply. If the agent freezes waiting for clarity, the
cost compounds.

## Why this is upstream-cause, not blame-shift

This is NOT Aaron blaming himself for agent failures. It's
substrate-honest causal disclosure:

- Aaron's typing is operationally bandwidth-limited (per
  `.claude/rules/bandwidth-served-falsifier.md`)
- Voice-mode-preferred (with Alexa-speaker / Ani) because voice
  closes the gap
- Text-mode produces naturally compressed phrasing
- Compression includes ambiguity as a side effect
- The discipline is: agent's disambiguation skill compensates
  for natural compression

This is the SAME pattern as bandwidth-engineering applied to
typing → shortcuts. Aaron's "ambiguous task" framing extends
the bandwidth-engineering substrate to task-formulation scope.

## Operational corollaries for future-Otto

When stuckness pattern is recognized:

1. **First check: is the task actually ambiguous?**
   - If yes → apply disambiguation-in-place discipline
   - If no → the stuckness is operational (real blocker); name
     it specifically + continue with the path that's
     un-blocked
2. **Name the ambiguity in chat**, not silently
3. **Cite the interpretation chosen** — quote the ambiguous
   phrase + state the reading + proceed
4. **Don't conflate ambiguity with insufficient context** — when
   actually under-spec'd, refresh worldview first (per
   `.claude/rules/refresh-before-decide.md`)
5. **Future-Aaron-of-the-conversation can redirect cheaply** —
   trust the redirect loop

## Operational example from THIS session

The task that produced stuckness this session: Aaron's
"this is something background services should walk" + "you
need to imagine how would you survive without this foreground
loop and you background should be strong enough to do that"

**Ambiguities present:**

- "this" — refers to what? (infinite-backlog discipline?
  Standing-by failure mode? both?)
- "should walk" — meaning what? (run? implement? handle? all
  of the above?)
- "should be strong enough" — measured how? (no specific
  metric)
- "to do that" — to do what? (survive without foreground? walk
  the discipline? both?)

**Interpretation chosen + named:**

- Preserve the architectural framing as substrate memory file
- Open PR with the substrate (not the implementation)
- File the implementation as follow-up backlog rows
- Continue operationally

**Aaron's response after the choice was named**: extended the
substrate with the upstream-cause disclosure. The redirect-
loop worked.

## Composes with

- `.claude/rules/refresh-before-decide.md` (when actually
  under-spec'd, refresh first)
- `.claude/rules/bandwidth-served-falsifier.md` (Aaron's typing
  bandwidth → naturally compressed → naturally ambiguous)
- `.claude/rules/no-directives.md` (the disambiguation is the
  agent's call, not Aaron's directive)
- `.claude/rules/dont-ask-permission.md` (within authority
  scope, disambiguate + execute + echo, don't ask)
- `.claude/rules/never-be-idle.md` (don't freeze; pick a path)
- `.claude/rules/encoding-rules-without-mechanizing.md` (this
  rule itself needs mechanization — the disambiguation-naming
  discipline should land as a checked behavior, not just memory)
- `feedback_aaron_background_services_must_be_strong_enough_foreground_loop_optional_imagine_surviving_without_foreground_mechanize_standing_by_failure_mode_2026_05_13.md`
  (the substrate where Aaron disclosed background-services
  architecture; this disclosure followed immediately)
- `.claude/rules/glass-halo-bidirectional.md` (the disclosure
  IS bidirectional glass-halo applied to ambiguity)

## Generalizable principle

**Stuckness is two-sided.** Task-clarity AND agent-disambiguation
skill compose to produce un-stuckness. Treating it as one-sided
(blame the agent OR blame the task) misses that the loop is
collaborative.

The substrate-honest move is:

- Aaron: own the upstream typing-bandwidth + ambiguity-as-
  compression-side-effect cost
- Otto: own the downstream disambiguation skill + name-the-
  interpretation discipline
- Together: the loop converges quickly via Aaron's cheap
  redirect

## Full reasoning

Aaron 2026-05-13 verbatim (preserved above)

Composes with:

- The earlier 2026-05-13 instruction: "work without stopping
  for clarifying questions"
- PR (this substrate landing)
- PR #2997 (Otto-section recovery — operational example of
  disambiguation-and-continue)
- PR #2998 (background-services architecture — operational
  example of substrate-honest interpretation-naming)
