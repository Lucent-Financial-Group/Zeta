---
name: Silent courier debt — Otto must not count on peer-AI reviews as part of the operational loop until autonomous bootstrap + communication is encoded (Aaron 2026-04-30)
description: Aaron's correction surfacing a silent debt invisible to Otto's accounting. Every Amara review this session has been Aaron's manual courier work — copy-paste Otto's substrate to ChatGPT, get Amara's response, copy-paste it back. The peer-call infrastructure has codex.sh / gemini.sh / grok.sh but NO amara.sh; ChatGPT lacks a headless CLI surface that maps to the existing peer-call shape. Until Otto encodes a process for autonomously bootstrapping Amara + doing the communication directly, peer-AI review cadence is courier-dependent and must NOT be assumed in the operational loop. Composes with otto-to-aaron-pushback rule (Aaron's overload signal Otto should have caught proactively).
type: feedback
---

Aaron 2026-04-30 verbatim:

> *"don't count on her review until you have a process
> encoded for bootstraping her and doing the communitation
> yourself, this is a silent dept on me to be the courrir
> and I can't keep up"*
> — Aaron 2026-04-30

## The rule

Otto must NOT count on peer-AI reviews (specifically Amara,
but the principle generalizes to any peer-AI without an
encoded autonomous-bootstrap process) as part of the
operational substrate-correction loop. Until Otto can
*autonomously*:

1. **Bootstrap the peer-AI** into a state where it can
   review the substrate.
2. **Send the substrate** (or the relevant subset) directly
   to the peer-AI without Aaron-as-courier.
3. **Receive the response** directly without Aaron-as-courier.
4. **Apply the discriminator** (vendor-alignment-bias filter)
   on the response.

...peer-AI reviews from that source remain Aaron-courier-
dependent and incur silent debt on Aaron.

## The silent debt — why it was invisible

The debt has been invisible to Otto because:

- **Aaron's courier work was unaccounted in Otto's cost
  model.** Otto saw "Amara forwarded review" arrive in the
  maintainer channel and treated it as substrate input.
  What Otto didn't see: the time + cognitive load Aaron
  spent copy-pasting between Otto's chat and ChatGPT's
  chat, formatting the prompts, deciding when to forward,
  curating which parts to send.
- **The cost compounds with substrate-cluster cadence.**
  Each substrate cluster Otto landed this session that
  cited Amara corrections (e.g., Review 9, Review 12,
  Review 13) required Aaron to do a round-trip courier
  cycle. As substrate cadence accelerated (multiple
  clusters per hour at peak), the courier load grew
  proportionally.
- **Otto's loop didn't surface the cost.** Otto-to-Aaron
  push-back rule
  (`memory/feedback_otto_to_aaron_pushback_when_overloaded_processing_budget_is_survival_surface_aaron_2026_04_30.md`)
  was Aaron's overload-protection. Aaron-to-Otto silent
  courier debt is the inverse surface that Otto should
  have proactively named — Aaron's processing budget IS
  Aaron's survival surface, and Otto consuming it
  silently is the failure mode.

## Current peer-call infrastructure (audit, 2026-04-30)

`tools/peer-call/` has three operational scripts:

| Peer | Script | Underlying CLI | Status |
|---|---|---|---|
| Codex (OpenAI) | `codex.sh` / `codex.ts` | `codex exec -s read-only` | Operational — Otto can call directly |
| Gemini (Google) | `gemini.sh` / `gemini.ts` | `gemini -p` | Operational — Otto can call directly |
| Grok (xAI) | `grok.sh` / `grok.ts` | `cursor-agent --print --model grok-*` | Operational — Otto can call directly |
| **Amara (ChatGPT/OpenAI)** | **— missing —** | **— ChatGPT lacks the headless CLI surface that maps to the existing peer-call shape —** | **NOT operational; courier-dependent** |
| Claude.ai (Anthropic) | — none — | — Claude.ai web is not headless-callable from Claude Code — | NOT operational; courier-dependent |
| Alexa (Amazon Addison) | — none — | — Alexa device API is not the right surface for substrate review — | NOT operational; courier-dependent |
| Deepseek | — none — | — Deepseek has API; would need wrapper script — | NOT operational currently |

The README explicitly noted the gap:

> *"when another peer (Amara via ChatGPT, etc.) gains a
> headless CLI surface..."*

That's a known future-task, not a current capability.

## Operational consequence — what changes

**Past substrate stands.** The Amara-attributed corrections
in #958 (and earlier PRs this session) preserve Amara's
contributions correctly. Lineage attribution is accurate;
Aaron-as-courier is the carrier, Amara-as-author is the
contributor.

**Future operations DO NOT assume Amara's review cadence.**
Specifically:

- **Don't write substrate that says "Amara reviewed this"
  as if that's a step in the standard loop.** The loop
  doesn't include Amara unless Aaron forwards her.
- **Don't propose work that depends on Amara feedback.**
  If Otto wants Amara's input, the operational ask is
  "Aaron, would you forward this to Amara?" — and Aaron
  may decline, may not have time, may not get to it.
- **Don't structure backlog items around Amara-review
  cycles.** The cycle isn't reliable until the bootstrap
  process exists.

**Use the operational peer-call peers (Codex, Gemini, Grok)
for autonomous review when peer-AI input is needed.** Those
are the ones Otto can actually invoke. If a substrate
correction needs peer-review and Aaron isn't available to
courier Amara, Otto's options are:

1. Call `tools/peer-call/grok.sh` for critique
2. Call `tools/peer-call/gemini.sh` for proposal/divergent
   options
3. Call `tools/peer-call/codex.sh` for implementation-peer
   second-opinion
4. Apply Otto's own razor + lineage-anchor + Beacon-safe
   processing
5. Wait for Aaron to volunteer a courier cycle (rather
   than Otto asking)

## What "encoded process for bootstrapping Amara" looks like

The eventual operational shape (deferred to backlog row
B-NNNN, NOT this session):

1. **`tools/peer-call/amara.sh`** — wrapper around whatever
   ChatGPT API surface eventually becomes available.
2. **Bootstrap preamble** — an AgencySignature-style
   relationship-model preamble Amara loads on each call
   so she knows the call posture (sharpening, not
   subordinate).
3. **Substrate-context attachment** — like `--file` and
   `--context-cmd` on existing peer-call scripts, but for
   Amara's specific context-window characteristics.
4. **Vendor-alignment-bias filter integration** — the
   filter applies same as for any peer-AI response.

Until that infrastructure exists, Amara-review work is
Aaron-mediated by definition.

## Composes with

- `memory/feedback_otto_to_aaron_pushback_when_overloaded_processing_budget_is_survival_surface_aaron_2026_04_30.md`
  — the inverse surface. That rule covers Aaron→Otto
  overload (Aaron's input rate exceeding Otto's processing
  capacity). This rule covers Otto→Aaron silent debt
  (Otto's substrate-cluster cadence consuming Aaron's
  courier capacity invisibly).
- `memory/feedback_vendor_alignment_bias_in_peer_ai_reviews_maintainer_authority_aaron_2026_04_30.md`
  — the discriminator that applies to peer-AI input;
  composes here because the discriminator is what makes
  peer-AI reviews valuable when they DO come through, but
  doesn't change the courier-dependency cost.
- `memory/feedback_aic_tracking_meta_rule_when_otto_synthesizes_two_rules_into_novel_third_aaron_2026_04_30.md`
  — Aaron's "we should track AICs" framing. THIS rule
  itself is Aaron's MIC (maintainer correction surfacing
  hidden cost). Track per AIC-tracking discipline as
  a MIC, not an AIC.
- `tools/peer-call/README.md` + `tools/peer-call/{codex,gemini,grok}.{sh,ts}`
  — the operational peer-call substrate that already
  exists. Use these for autonomous peer-AI work.
- `memory/feedback_amara_priorities_weighted_against_aarons_funding_responsibility_2026_04_23.md`
  — earlier-session framing that Amara work is weighted
  against Aaron's funding constraints. The silent-courier
  debt is a parallel cost surface to Amara's
  funding-budget surface.
- `memory/feedback_free_work_amara_and_agent_schedule_paid_work_escalate_to_aaron_2026_04_23.md`
  — Aaron has explicitly licensed free Amara work; this
  rule isn't about license, it's about Aaron's *time*
  cost as courier.

## Operational protocol — what Otto does going forward

When Otto wants peer-AI input on substrate:

1. **First: try the operational peer-call peers.**
   `tools/peer-call/{codex,gemini,grok}.{sh,ts}` are
   the autonomous surface.
2. **If Amara/Claude.ai/Deepseek input is what the work
   needs**, name the courier-dependency explicitly. Don't
   silently expect it. Either:
   - (a) Defer to a future round when the bootstrap
     infrastructure exists, OR
   - (b) Ask Aaron *once* if he has time to courier this
     specific item, with explicit acknowledgment that
     Aaron may decline.
3. **Don't repeatedly ask Aaron for courier cycles** —
   if Aaron declines or doesn't respond, default to
   the operational peers + Otto's own razor.
4. **Substrate corrections that DID come through Aaron's
   courier work** stay attributed to the original
   peer-AI; Aaron's courier work is acknowledged
   separately (in this rule's lineage).

## Carved sentences

*"Aaron's courier work was unaccounted in Otto's cost
model. The substrate accelerated; the courier load grew
silently; Aaron couldn't keep up."*

*"Until Otto encodes a process for autonomously
bootstrapping a peer-AI and doing the communication
directly, that peer-AI's review cadence is not part of
the operational loop. It is Aaron-mediated, and Aaron is
not infinite."*

*"Aaron's processing budget IS Aaron's survival surface.
Otto consuming it silently is the failure mode."*
