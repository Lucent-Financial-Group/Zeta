---
name: Always expand non-obvious things for future-you (confucius-unfold rule, Aaron 2026-04-29)
description: Aaron 2026-04-29 — *"you should aloways expand non obvious thing for future you like that the confucius unfold"* — when writing memory files, research notes, ledgers, or any durable substrate, do not leave non-obvious phrases unexplained. Future-Claude reads these on cold-start without your in-session context; what's obvious now may be opaque later. The rule: if a phrase, term, abbreviation, pointer, or context-reference might confuse future-you, expand it inline. Confucius unfolding = take what was implicit and make it explicit, in place. Caught when "this channel" was used in the verbatim-preservation rule without definition; future-self could read it after weeks/months and have no idea what "this channel" meant.
type: feedback
---

# Always expand non-obvious things for future-you

## Source

Aaron 2026-04-29: *"probably want to replace this_channel
with what i mean by this, or future you could be very confued,
you should aloways expand non obvious thing for future you
like that the confucius unfold."*

(Typos preserved per the verbatim-preservation rule. The
"confucius unfold" framing is Aaron's; treating it as a verb
— "to confucius-unfold" — captures the discipline of taking
implicit context and making it explicit, in place, where it
will be re-read.)

## The rule (load-bearing)

When writing memory files, research notes, ledgers, ADRs,
SPEC docs, or any durable substrate intended to be read by
future-Claude or future contributors:

```text
If a phrase, term, pointer, abbreviation, or context-reference
might be opaque to a reader who lacks the in-session context
that produced it, expand it inline.

Confucius-unfold:
  take what was implicit
  make it explicit
  in place
  where future-self will re-read it.
```

Future-Claude reads memory files on cold-start. The session
context that made "this channel" or "the third packet" or
"the prior conversation" obvious is gone by then. The rule
is: write durable substrate as if the reader has zero
shared context with you.

## When to confucius-unfold

- **Demonstrative pronouns referring to current context**:
  "this channel" / "this ferry" / "this round" / "the prior
  packet" — expand to the explicit referent.
- **In-flight nicknames or shorthands**: if you call a thing
  "the corruption-triage incident" without saying which
  incident or which date, future-self is confused.
- **Implicit time-references**: "earlier today" / "the
  recent push" / "yesterday" — these decay into ambiguity.
  Use absolute dates or commit SHAs.
- **Implicit person-references**: "they said" / "we agreed" —
  expand to the named person, AI agent, or document.
- **Tool-state references**: "the failing CI" / "the open
  PR" — these change. Reference by PR number or commit SHA.
- **Domain jargon coined recently**: factory-internal terms
  that don't yet have external lineage are particularly
  opaque on cold-read; expand or link to the defining
  memory file.

## When NOT to confucius-unfold

- **Established factory glossary terms** that are already
  defined in `docs/GLOSSARY.md` or have their own memory
  file: a pointer is sufficient. Don't repeat the full
  definition every time.
- **Project-specific names that are well-anchored**: e.g.,
  `Aurora`, `Glass Halo`, `Maji` — established factory
  vocabulary; one-time introduction in a doc is fine.
- **Code identifiers**: variable names, function names,
  type names — the code itself is the source of truth;
  don't paraphrase code in prose unless the prose is
  load-bearing for understanding.

## Worked example

**Before** (verbatim-preservation memory file, opaque):

```text
Anything coming through this channel gets preserved verbatim.
```

Future-Claude on cold-start: *"this channel? what channel?
the Claude Code CLI? a Slack channel? a YouTube channel?"*

**After** (verbatim-preservation memory file, expanded):

```text
"This channel" = the live conversation surface where Aaron
the human maintainer talks directly to Claude (this AI
agent instance) during an active session. Specifically:
  - the Claude Code CLI conversation in the current shell;
  - autonomous-loop wakeup messages (`<<autonomous-loop>>`);
  - mid-tick corrections sent as user messages while a
    tick is in flight;
  - `/btw`-style asides;
  - forwarded multi-AI synthesis packets;
  - direct Aaron quotes.
```

Future-Claude on cold-start: clear.

## Composes with

- `memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md`
  — the rule that prompted this one (verbatim-preservation
  needs confucius-unfolding to be readable on cold-read).
- `memory/feedback_signal_in_signal_out_clean_or_better_dsp_discipline.md`
  — DSP discipline at the input layer; confucius-unfold is
  the readability-discipline analogue at the substrate layer.
- `memory/feedback_verify_target_exists_before_deferring.md`
  — verify-before-deferring is a related future-self-
  protection rule (don't reference targets that may not
  exist; this rule says don't reference contexts that won't
  be re-derivable).

## Distilled keepers

```text
Future-Claude has zero shared context.
Write durable substrate as if the reader is cold.
```

```text
Confucius-unfold: take what's implicit, make it explicit,
in place, where it will be re-read.
```

```text
Demonstrative pronouns ("this", "that", "the prior") are
warning signs in durable substrate.
Expand them.
```

```text
What's obvious now may be opaque in two weeks.
Cold-readability is the standard.
```
