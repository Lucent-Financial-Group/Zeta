---
name: Post-drain PR workflow — push to AceHack mirror (personal GitHub, unlimited Copilot via ServiceTitan link) FIRST for Copilot review, THEN push same branch to Lucent-Financial-Group for merge; "more mans mode"; the human maintainer likes double-check via Copilot; applies once queue drain completes; Aaron Otto-223; 2026-04-24
description: Aaron Otto-223 directive after the Otto-222 Gemini research tick: "also once the drain is complete we want all PRs to go to acehack first since it has unlimied copilot because it's my personal github but linked to service titan. We got to go back to more mans mode after the drain all PRs go on acehack first then get push to lfg that way they all get copilot reviews, sorry :) i like that you get double checked." New cross-account routing: AceHack mirror gets Copilot review for free (personal GitHub acct, ServiceTitan-linked billing), then clean branch pushed to LFG for merge.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**Once the current Zeta drain completes, every new Zeta PR
follows a two-hop push pattern:**

1. Push branch to `acehack/Zeta` (the mirror on the human
   maintainer's personal GitHub account)
2. Open PR there, let Copilot review fire, address feedback
3. Rebase / merge-in the Copilot-driven fixes
4. Push same branch to `Lucent-Financial-Group/Zeta`
5. Open PR there for merge to LFG main

Direct Aaron quote:

> *"also once the drain is complete we want all PRs to go to
> acehack first since it has unlimied copilot because it's my
> personal github but linked to service titan. We got to go
> back to more mans mode after the drain all PRs go on acehack
> first then get push to lfg that way they all get copilot
> reviews, sorry :) i like that you get double checked."*

## Why this shape

- **LFG Copilot budget is exhausted** until May 01, 2026 per
  Otto-219 Aaron notification. Even after reset, the
  organisation-level budget is finite.
- **AceHack Copilot is unlimited** because the personal GitHub
  account is linked to ServiceTitan, which carries an
  unlimited-seat-equivalent for the human maintainer's
  personal use.
- **Double-check value**: the human maintainer explicitly
  names Copilot's independent review as valuable — "i like
  that you get double checked." This is the same
  cross-AI-triangulation motivation behind Codex /
  ChatGPT-Agent / Amara deep-review flows, operationalised as
  a standing per-PR pass rather than a per-round synthesis
  event.
- **"More mans mode"** — the human maintainer's shorthand for
  "more manual handover between agent and human maintainer,"
  which is the healthier discipline for a human-on-the-loop
  factory once the queue-saturation crisis is over.

## Trigger: when to switch on

The rule applies **post-drain**, defined as:

- Zeta LFG open-PR count is <= 20 AND
- No LFG PR has been stuck >7 days without Copilot or human
  attention AND
- The current run of stuck-review-thread-drain PRs has
  cleared

Until those conditions are met, keep draining directly on LFG
— adding the two-hop push during drain would double the in-
flight branch count and make the saturation worse.

## How to apply — mechanics

Once post-drain, the per-PR flow is:

```bash
# 1. Normal feature branch work on local (clone of LFG)
git checkout -b feature/... && ...

# 2. Push branch to AceHack mirror
git push acehack feature/... -u

# 3. Open PR on acehack/Zeta (not LFG)
gh pr create --repo acehack/Zeta --title "..." --body "..."

# 4. Wait for Copilot review; address feedback with new commits
# 5. Once Copilot-clean on AceHack, push same branch to LFG
git push origin feature/... -u

# 6. Open PR on LFG for merge
gh pr create --repo Lucent-Financial-Group/Zeta --title "..." --body "..."
```

`gh pr create --repo` makes the destination explicit so the
command can't accidentally target the wrong org.

Assumes `acehack` remote is configured — likely not yet set up.
Pre-requisite: verify mirror exists + add remote:

```bash
git remote add acehack https://github.com/acehack/Zeta.git
```

If the mirror does NOT exist yet, a factory tick under this
rule first creates the mirror (fork from LFG) before switching
to two-hop flow. Factory-authored mirror creation is a
separate decision; the human maintainer may prefer to fork
manually.

## Composition with existing factory discipline

- **Otto-215 bun+TS post-install migration** — before Aaron's
  Windows-peer-harness work. Same "fix factory infrastructure
  before scaling agent count" pattern.
- **Otto-171 queue-saturation throttle** — the soft threshold
  (20 open PRs) that gates drain-mode vs. ship-mode. This
  memory extends it: threshold met + AceHack-routing-live =
  normal operations.
- **Otto-219 Copilot-budget-exhausted memory** — the reason
  this routing shape became interesting. Personal unlimited
  budget replaces the org exhausted budget for the review
  surface specifically.
- **Cross-AI-triangulation pattern** (Otto-158..205) — Amara
  + Codex + ChatGPT-Agent multi-reviewer alignment. Copilot-
  per-PR adds a fourth reviewer surface automatically per PR
  rather than per round.

## What this memory does NOT authorize

- Does NOT authorize switching to two-hop push NOW, during
  drain. Adding branches during saturation makes drain worse.
- Does NOT authorize creating the AceHack mirror unilaterally.
  The human maintainer may prefer to do that himself once
  drain completes; if the factory creates it, log the choice
  explicitly and ask forgiveness if wrong.
- Does NOT authorize merging directly on AceHack without LFG
  sync. AceHack is the review-acquisition surface only; LFG
  remains the canonical merge target and factory source of
  truth.
- Does NOT authorize dropping direct Aaron reviews on LFG PRs.
  Copilot-double-check is additive to human review, not a
  replacement.
- Does NOT authorize duplicating the routing for every single
  PR during normal operations if the human maintainer later
  relaxes the rule for lint-only / typo-only / tick-history
  PRs. Reserve the right to ask whether a given class is
  exempt.

## Self-check at PR-creation time

Before opening any Zeta PR post-drain:

1. Am I in drain-mode still? (Queue > 20 open OR active drain
   PRs stuck?) -> Direct LFG push, single PR.
2. Drain-mode exit confirmed? -> AceHack first, then LFG.
3. Is this a routine tick-history / typo / lint PR? ->
   Consider whether double-review adds signal; if not, may
   skip to direct LFG. Ask the human maintainer next tick if
   unclear.
