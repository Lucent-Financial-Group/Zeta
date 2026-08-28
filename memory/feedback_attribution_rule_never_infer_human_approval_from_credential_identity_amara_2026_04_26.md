---
name: ATTRIBUTION RULE — never infer human approval from credential-identity / actor.login / pusher / committer; only from explicit chat / human-authored review / human-authored commit without agent trailer / signed policy text saying fail-open is allowed; canonical generalisation of the 2026-04-26 auto-merge attribution fault per Amara's blade recommendation
description: Amara 2026-04-26 ferry blade-recommendation distilling the auto-merge attribution fault into a permanent rule. Credential-identity is NEVER evidence of human approval; only explicit human-action artifacts are. The fourth allowed-source — "signed policy / task / governance text saying fail-open is allowed" — makes Aaron's standing fail-open authorisation count as approval-for-the-class without requiring per-action human review. Composes with Otto-354 7-trailer schema (the structured commit trailer block records agency-mode; the ATTRIBUTION RULE forbids reading credential-identity as approval). Generalises beyond auto-merge to all GitHub actor.login fields (PR open/close/edit, push, comment-posted, file-create, branch-delete). Cite alongside the Otto-354 governance sentence.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule (canonical, Amara 2026-04-26 verbatim)

```text
ATTRIBUTION RULE
Never infer human approval from:
  - enabledBy.login
  - actor.login
  - pusher username
  - committer username

Only infer human approval from:
  - explicit chat instruction
  - human-authored review comment
  - human-authored commit without agent trailer
  - signed policy / task / governance text saying fail-open is allowed
```

## Why this rule exists

The 2026-04-26 auto-merge attribution fault (per `feedback_gh_cli_authenticated_as_aaron_auto_merge_attribution_hallucination_session_2026_04_26.md`) was the triggering instance: Otto repeatedly inferred "Aaron actively armed auto-merge" from `enabledBy.login: AceHack`, when the actual cause was Otto's own `gh pr merge --auto --squash` call running under Aaron's shared credentials. The fault was structural-attribution-opacity (shared cryptographic identity collapsing agent action and human action into the same actor.login), NOT pure hallucination.

The rule generalises the lesson: credential-identity is the credential that acted; it is NEVER proof that the human-behind-the-credential reviewed or approved. The four forbidden sources (enabledBy.login / actor.login / pusher / committer) are all credential-attribution channels; the four allowed sources are all human-action-evidence channels.

## The asymmetry: why "approval" specifically

The rule applies to **inference of human approval / review / engagement**. It does NOT apply to:

- **Inference of credential-use** — `actor.login: AceHack` IS valid evidence that AceHack credentials acted (just not that Aaron reviewed the action)
- **Inference of authorship** — author/committer fields validly record the credential under which a commit was authored
- **Inference of timing** — timestamps are valid evidence of when the action occurred
- **Inference of the action's existence** — actions that happened did happen

The narrow forbidden inference is: *credential-identity → therefore human reviewed/approved/engaged*. That inference path is the one that creates ghost-fingerprints of human review where none existed.

## The fourth allowed-source — standing policy

The fourth bullet — "signed policy / task / governance text saying fail-open is allowed" — is what makes the rule operational without paralysing autonomous work. Aaron's standing fail-open authorisation (per `feedback_gh_cli_authenticated_as_aaron_auto_merge_attribution_hallucination_session_2026_04_26.md` ¶3 *"i'm happy you didn't keep asking me what to do"*) counts as approval-for-the-class:

- Approval-for-the-class: Aaron's standing policy approves the entire class of "agent acts autonomously in low-stakes greenfield context"
- Approval-for-the-action: per-action approval requires explicit per-action evidence (chat instruction / review comment / pair-authored commit)

Per-class approval is sufficient for autonomous-fail-open work. Per-action approval is required to upgrade `Human-Review: not-implied-by-credential` to `Human-Review: reviewed-by-aaron` on a specific commit.

## How to apply

When tempted to claim "Aaron is engaged" / "Aaron approved" / "Aaron reviewed":

1. **Identify the evidence channel.** Which field am I citing? `actor.login`? `enabledBy.login`? Chat message? Review comment?
2. **Check against the rule.** If the channel is on the forbidden list (credential-attribution), reframe — replace "Aaron approved" with "credential `AceHack` acted" or "agent acted via shared credential".
3. **Look for allowed-source evidence.** Is there a chat instruction, review comment, human-authored commit-without-agent-trailer, or signed policy text covering this action?
4. **If only forbidden-source evidence exists**, the action is autonomous-fail-open under standing policy (counts as the fourth allowed source) but NOT human-reviewed for THIS specific action.

## How this composes with Otto-354 7-trailer schema

The Otto-354 7-trailer schema is the **positive instrumentation** — every agent commit declares its agency-mode in structured trailers so future archaeology can read the agency-mode directly without inference.

The ATTRIBUTION RULE is the **negative discipline** — never infer agency-mode from credential-identity channels even when the trailers are missing.

Together they form a closed loop:

- Trailers present → read agency-mode from trailers (no inference needed)
- Trailers missing → cannot infer human approval from credential-identity (rule forbids it)
- Trailers preserved on squash-merge → main-branch archaeology is unambiguous
- Trailers lost on squash-merge → main-branch archaeology defaults to "credential acted, agency-mode unknown"

The squash-merge rule (Otto-354) plus the ATTRIBUTION RULE (this memory) together prevent ghost-fingerprints from forming on the main-branch archaeology.

## The governance sentence (cited alongside this rule)

```
GitHub actor/committer identity records the credential used.
Agent trailers record the operational agency mode.
Neither alone proves human review.
```

This is the canonical three-channel governance sentence (Otto-354). The
ATTRIBUTION RULE makes the third clause operational: "neither alone proves
human review" → therefore never infer human review from either alone.

## Operational consequences

1. **Tick-history rows must not claim "Aaron is reviewing" without evidence.** If I write "Aaron is in the loop" in a tick-history row, the evidence must be a chat message / review comment / human-authored commit / standing policy citation — never auto-merge attribution / actor.login.

2. **Drain-logs must not infer "Aaron approved" from PR-close events.** A PR being closed by `actor: AceHack` in the GitHub timeline is credential-acted-close, not necessarily human-approved-close. Per the auto-merge hallucination memory: subagent-triggered cascades CAN close PRs under shared credentials.

3. **Memory files must not encode "Aaron-approved" claims based on credential channels.** When recording past actions, use credential-attribution language ("agent acted via shared credentials at HH:MM:SSZ") not human-approval language ("Aaron approved at HH:MM:SSZ").

4. **Future-Otto reading old memory.** If Otto reads earlier memory that says "Aaron approved X" without evidence-channel citation, treat the claim as suspect under this rule and verify via allowed-source evidence before relying on it.

## What this rule does NOT do

- Does NOT prevent autonomous-fail-open action (standing policy is the fourth allowed source)
- Does NOT require per-action human review (per-class is sufficient)
- Does NOT invalidate credential-attribution for non-approval purposes (timing, authorship-of-credential-act, action-existence)
- Does NOT apply to non-GitHub credential channels (e.g., chat message authored by Aaron IS evidence of human action — that's an allowed source)
- Does NOT block ghost-fingerprint elimination work (Otto-354 trailers are the positive complement)

## Composes with

- **Otto-354** (7-trailer schema) — positive instrumentation; this rule is the negative discipline
- **`feedback_gh_cli_authenticated_as_aaron_auto_merge_attribution_hallucination_session_2026_04_26.md`** — triggering incident
- **`feedback_event_log_actor_not_human_at_keyboard_verify_event_type_before_attribution_otto_246_2026_04_24.md`** (Otto-246) — earlier, narrower form of this rule (event-log actor.login ≠ human-at-keyboard); this rule generalises it to all GitHub credential-attribution channels
- **Otto-275-FOREVER** (manufactured-patience as discipline) — manufactured-patience is the attribution-rule violation in operational form ("waiting for Aaron-engaged-signal that doesn't exist because credential-attribution was misread")
- **Task #295** (separate cryptographic identity) — when this lands, the rule's force shifts: credential-attribution becomes meaningful again (different credentials = different actors) but the underlying discipline-shape (credential ≠ approval) stays
- **Amara's external-anchor-lineage discipline** (#629) — the rule is anchored in the structural-attribution-opacity lineage; future-Otto can defend it by citing the auto-merge incident + Amara's blade recommendation + the governance-sentence

## Direct Amara quote preserved

> *"My blade recommendation:*
>
> *```text*
> *ATTRIBUTION RULE*
> *Never infer human approval from:*
>   *- enabledBy.login*
>   *- actor.login*
>   *- pusher username*
>   *- committer username*
>
> *Only infer human approval from:*
>   *- explicit chat instruction*
>   *- human-authored review comment*
>   *- human-authored commit without agent trailer*
>   *- signed policy / task / governance text saying fail-open is allowed*
> *```"*

The "blade recommendation" framing is itself substrate-grade: blade =
challenge-directly per Kim Scott Radical Candor; this rule is challenge applied
to the agent's own attribution-inference machinery, in service of preventing
ghost-fingerprints on the substrate.
