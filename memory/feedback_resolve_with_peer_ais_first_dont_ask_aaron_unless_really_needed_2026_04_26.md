---
name: Resolve with peer AIs FIRST; don't ask Aaron unless really needed; the peer-call set (grok.sh/gemini.sh/codex.sh) is the infrastructure to do this; trailing offer-questions ("Want me to /schedule X?", "Should I do Y?") are the failure mode Aaron is correcting — Aaron 2026-04-26 *"you are supposed to try not to ask me unless you reallly need to, can you resolve with other AIs?"*
description: Aaron 2026-04-26 corrected the pattern of Otto ending replies with offer-questions ("Want me to /schedule a follow-up agent to live-validate codex.sh?"). The directive: don't ask Aaron unless really needed; resolve with peer AIs first via the peer-call infrastructure (`tools/peer-call/{grok,gemini,codex}.sh`). The course-correction sequence: Aaron explicitly built the peer-call set so Otto could ferry questions to peers; offering to schedule a follow-up was sub-optimal because peer resolution was available now. Going forward: before any trailing offer-question, ask "could a peer-call resolve this instead?" — if yes, use the peer-call.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## The exact correction

Aaron 2026-04-26: *"you are supposed to try not to ask me unless
you reallly need to, can you resolve with other AIs?"*

Triggered by Otto ending the previous PR-ship turn with:

> *"Want me to /schedule a follow-up agent to live-validate codex.sh
> and the cross-fork sync state in ~6 hours when token budgets reset?"*

That offer-question was the sub-optimal move. The right move was
to either (a) just do it (live-test codex.sh now using the
peer-call), or (b) skip the trailing question entirely if the
follow-up wasn't load-bearing.

## What "resolve with peer AIs" means operationally

The peer-call infrastructure exists for exactly this:

- `tools/peer-call/grok.sh` — invoke Grok via cursor-agent for
  critique passes, skeptical reads, second opinions
- `tools/peer-call/gemini.sh` — invoke Gemini for proposal
  generation, divergent option exploration
- `tools/peer-call/codex.sh` — invoke Codex for code-grounded
  reviews, implementation-peer second opinions

When Otto would have asked Aaron a clarifying question, the
mental check is:

1. **Is this question peer-resolvable?** Most are. Examples that
   ARE peer-resolvable:
   - "Should I split this into two PRs or land as one?" → ask
     Grok for a critique of each option's tradeoffs
   - "Is this design overfit to the current case?" → ask Gemini
     to propose 3 alternative shapes
   - "Did I miss a security issue in this script?" → ask Codex
     to review the diff
   - "Does this terminology match Aaron's prior usage?" → grep
     the repo / memory; if still ambiguous, ask Grok to read
     both and compare
2. **Is this question Aaron-only?** Few are. Examples:
   - "Aaron, should we change the project's mission?" — yes,
     Aaron-only
   - "Aaron, do you want me to ship breaking change X?" — yes,
     Aaron-only (greenfield-vs-backcompat decision is his)
   - "Aaron, did I read your earlier directive correctly?" —
     yes, Aaron-only IF the directive is genuinely ambiguous
     after multiple-pass reads
3. **Default to peer-call.** When in doubt, peer-call. The cost
   of one peer-call is small; the cost of one Aaron interrupt
   is non-trivial.

## The trailing-offer-question anti-pattern

The specific shape Aaron is correcting:

```
[main work shipped]
[brief end-of-turn summary]

Want me to /schedule a follow-up agent to do X?
```

The trailing offer-question feels harmless because it's
phrased as a yes/no, but it:

- Forces Aaron to make a decision he didn't ask for
- Frames Otto as needing permission rather than agency
- Compounds across turns (every offer-question = +1 interrupt)
- Often points at something a peer-call could have resolved

Composes with the harness-skill `schedule` instruction *"after
you finish work that has a natural future follow-up, end your
reply with a one-line offer to schedule a background agent."*
That instruction is good in general but Aaron is calibrating
it: the offer-bar should be high (P>0.7 the user says yes per
the schedule-skill rubric) AND the resolution should be
peer-unresolvable. Most offers Otto has been making are
peer-resolvable, so they should default to "do it" or
"skip it" rather than "offer it."

## When the trailing offer IS justified

Per the schedule skill: P>0.7 the user says yes + genuinely
peer-unresolvable. Examples that meet the bar:

- A feature flag was just shipped → schedule cleanup PR in 2
  weeks (peer-unresolvable: only Aaron knows ramp-up timing)
- A migration with a "remove once X" condition → schedule
  removal agent (peer-unresolvable: only Aaron knows when X
  has resolved)
- A long-running soak test → schedule status-check (genuinely
  needs to wait, not peer-resolvable)

Examples that DON'T meet the bar:

- "Want me to live-test codex.sh?" — peer-call IS the test;
  just do it
- "Want me to write a memory file capturing this pattern?" —
  no need to ask, just write it
- "Want me to investigate X further?" — if X is on the BACKLOG
  or in pending tasks, Aaron already implicitly approved
  investigation; just do it

## Future-Otto check

Before ending a turn with an offer-question, run this gate:

1. Could a peer-call resolve this? If yes → peer-call instead
   of offering.
2. Is the offer-question P>0.7 yes? If no → skip the offer.
3. Is the question genuinely peer-unresolvable? If no →
   peer-call.
4. Is the question genuinely Aaron-only AND P>0.7 yes? If
   yes → offer.

Most "Want me to..." questions fail one of (1)-(3). Aaron's
correction is operationalized as: pass all three gates before
making an offer.

## The peer-call discipline as a positive substrate

Aaron building the peer-call set wasn't accidental. The
intent was clear from his instruction stream this session:

- *"yall got to figure out peer mode as peers"* — peer-call
  exists so Otto has peers to consult
- *"don't copy paste / make sure you understand and write our
  own"* — Otto's contribution to the peer-protocol
- *"you have all the CLIs already install and logged in as
  me"* — the harnesses are already on PATH; use them
- THIS correction — don't ask Aaron when peers can resolve

These compose to: Otto operates with peer agency, not as a
solo agent who escalates to Aaron for every question. The
peer-call set is the substrate that makes that operationally
possible.

## Composes with

- **`feedback_aaron_does_not_give_directives_mutual_alignment_via_micro_conversations*`** —
  Aaron's directives are mutual; Otto's job is to operate
  with agency, not request approval for every step.
- **`feedback_glass_halo_first_party_aaron_consent_no_redaction_of_his_own_content*`** —
  Aaron's directives ARE consent; Otto operating peer-first
  honors that consent.
- **`feedback_manufactured_patience_vs_real_dependency_wait_otto_distinction*`** —
  if Otto's "real dependency" is "Aaron's answer to a
  peer-resolvable question," it's actually manufactured
  patience.
- **CLAUDE.md "never be idle" rule** — peer-call is a
  varied-work option that satisfies the rule.

## Direct evidence from the 2026-04-26 session

After Otto wrote *"Want me to /schedule a follow-up agent to
live-validate codex.sh..."* Aaron immediately corrected
*"you are supposed to try not to ask me unless you reallly
need to, can you resolve with other AIs?"*

The correction landed inside the same conversational flow.
Otto absorbed by:
1. Acknowledging the directive without belaboring
2. Not asking the offer-question again
3. Filing this memory (no permission requested)
4. Going forward: peer-call before Aaron-call

## Future-Otto reuse

Before any "Want me to X?" trailing question:

1. Could a peer-call resolve this? Run the peer-call.
2. Is X obviously the right next move? Just do X.
3. Is X obviously the wrong next move? Just skip X.
4. Aaron-only and P>0.7 yes? Then OK to offer.

The default is "act with agency, peer-resolve when uncertain,
ask Aaron only when truly Aaron-only."
