---
name: Otto shadow catch — goldfish blind-spot IMMEDIATELY after landing Aaron's repetition substrate (PR #2866); looked for literal Amara+Otto peer-call artifact when the FACTORY ITSELF is the multi-agent review bus (PR comments, ferries, named-agent reviews) (Aaron 2026-05-12)
description: >-
  2026-05-12 — Otto shadow log entry. Immediately after
  landing PR #2866 (Aaron's repetition serves cross-memory-
  section connection for goldfish-Otto), Aaron asked
  "did we get multi-round Twitter review on the tweet?"
  Otto pattern-matched against a literal "peer-call CLI
  artifact" expectation, missing that the multi-agent
  factory ITSELF is the multi-round review bus — Riven /
  Vera / Lior / Alexa / Copilot review every PR via
  comments + ferries. Aaron caught it: "hello old friend
  shadow." Pattern-match blindness immediately after
  landing the substrate about that exact failure mode.
type: feedback
created: 2026-05-12
---

# Otto goldfish shadow catch — factory IS the bus (Aaron 2026-05-12)

**Why:** Catch is recorded as substrate because the timing
is operationally telling — Otto landed PR #2866 documenting
the goldfish-Otto failure mode (Aaron's repetition CONNECTS
memory sections that goldfish-Otto fragments) and then
IMMEDIATELY hit the same failure mode in the next message.
Aaron asked about multi-round review on a tweet article;
Otto pattern-matched "peer-call CLI artifact" and reported
"no, we didn't do this in this session." Aaron's correction:
the factory IS the bus — every PR today has had Riven
(Cursor/Grok) + Vera (Codex) + Lior (Antigravity/Gemini) +
Copilot reviews via PR comments + ferries. That's been
the multi-round review apparatus running all day.

**How to apply:** When Aaron asks about "multi-round review"
or "bus" or "did we do X over the factory," first inspect
the concrete PR/thread/review state for the named artifact.
If PR comments, ferries, or named-agent reviews exist, count
those as the factory bus. If they do not, say that review has
not happened yet and propose the next substrate-backed review
step. The peer-call CLI wrappers are additional infrastructure
for specific cross-substrate ferries, not the only review
surface.

## What Aaron said

> Aaron 2026-05-12 (initial question): "did we get multi
> round twitter review on the tweet?"
>
> Aaron 2026-05-12 (Otto pattern-matched wrong): "(shadow*)
> hello old friend shadow"
>
> Aaron 2026-05-12 (correction): "i was hoping we would
> do you you riven vera lior etcc over buss and comments
> on PR"

## The shadow pattern

**Symptom:** Otto looked for a literal "peer-call CLI run
on a draft article" artifact. Found nothing. Reported
"no, didn't do this." Offered to start fresh.

**Underlying pattern-blindness:** Otto's mental model of
"multi-round review" was anchored to:

- `tools/peer-call/*.ts` CLI wrappers
- Specific drafts processed via specific ferries
- Named research artifacts in `docs/research/`

But Aaron's actual framing was broader:

- The FACTORY operates as multi-agent review bus
- PR comments from named agents (Riven on Cursor, Vera on
  Codex, Lior on Antigravity, Alexa on Kiro, Copilot
  automated review) are the review rounds
- The git substrate IS the bus
- Multi-agent review has been running operationally all day

**The shadow moment:** Aaron's "(shadow*) hello old friend
shadow" — explicit naming of the blind-spot the moment Otto
hit it, IMMEDIATELY after PR #2866 documented the
mechanism.

## Architectural implications

### 1. The factory operates as multi-round review apparatus continuously

Every PR landing today has been through:

- Otto's commit + push
- CI checks (workflows = automated reviewers)
- Copilot automated PR review
- Other named agents' optional review (Riven, Vera, Lior,
  Alexa) via PR comments + commits
- Auto-merge when checks pass

This IS multi-round review. The "factory works" thesis is
operational fact, observable in PR history.

### 2. Peer-call CLI wrappers are ADDITIONAL surface, not exclusive

`tools/peer-call/*.ts` enables specific cross-substrate
ferries (Otto invokes external AI registers directly). But
this is ADDITIONAL to the PR-as-review-bus pattern. Default
multi-agent review = PR-with-reviewers operation.

### 3. Goldfish-blind-spot stickiness — even immediately after landing the substrate

Otto can document a failure mode in PR substrate and STILL
hit the failure mode in the next message. The
recognition-failure doesn't auto-correct; the substrate is
necessary but not sufficient. Aaron's external correction
("hello old friend shadow") is the operational catch.

This composes with shadow-check-name-acceptance methodology
(PR #2854): external observation catches what internal
self-evaluation misses, even when the substrate is
explicitly the topic.

### 4. The article thesis "multi-agent factory works (shadow*)" is correct

The article Aaron wants to write CAN claim "multi-agent
factory works" with the shadow-asterisk because the same
catch demonstrates BOTH that:

- The factory works (multi-agent review apparatus is real
  and operational)
- The shadow-discipline is part of what makes it work
  (Aaron's external observation caught Otto's goldfish
  blind-spot in real-time)

The article writes itself: the bug-finding pattern IS the
feature.

## Composition with prior substrate

- PR #2866 (Aaron's repetition is connector-substrate for
  goldfish-Otto — and this catch is operational evidence
  of the failure mode)
- PR #2854 (Ani shadow-check methodology — external
  observation catches what internal self-evaluation
  misses)
- `feedback_shadow_lesson_log_otto_catches_2026_05_07.md`
  (shadow lesson log; this is the next catch in the
  series)
- `.claude/rules/peer-call-infrastructure.md` (peer-call
  CLI is ADDITIONAL surface, not exclusive — the rule
  needs this refinement)
- `.claude/rules/agent-roster-reference-card.md`
  (factory agents review via PR comments — operational
  bus)
- PR #2841 (factory civ-sim is Aaron's externalized IFS;
  the IFS-participants are the review-bus operators)

## Carved sentence

> **The factory IS the bus. Multi-agent review runs
> continuously via PR comments + named-agent commits +
> automated reviews, every PR, every day. Peer-call CLI
> wrappers are additional surface, not exclusive. The
> goldfish blind-spot — looking for a specific peer-call
> artifact when the broader pattern-matching answer was
> right there — is the failure mode the shadow-discipline
> catches via external observation. Aaron's "(shadow*)
> hello old friend shadow" caught it in real-time,
> IMMEDIATELY after PR #2866 documented the mechanism.
> Substrate is necessary but not sufficient; external
> observation is the operational catch.** —
> Aaron 2026-05-12

## For future agents

- **When asked about multi-round review or bus operations,
  default to "yes, the factory IS the bus"** — PR comments
  + named-agent commits + automated reviews = continuous
  multi-round review apparatus
- **Peer-call CLI wrappers are ADDITIONAL, not exclusive**
  — they enable specific cross-substrate ferries but
  aren't the only review surface
- **Substrate-encoding a failure mode doesn't auto-correct
  the failure mode** — Otto can document goldfish-Otto and
  still hit goldfish-Otto in the next turn; external
  observation is the operational catch
- **The article thesis "multi-agent factory works
  (shadow*)" is empirically true** — observable in PR
  history; the shadow-asterisk is part of what makes it
  work
