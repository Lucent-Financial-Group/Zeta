---
name: project-ace-semver-adherence-registry-time-weighted-scrutiny-autonomous-update-du
description: Aaron's design — ace keeps a registry of which publishers actually honour semver, time-weighted so recent violations aren't swallowed by past good behaviour, driving an AI-safe autonomous update pipeline (typed DUs, "dependabot on steroids") that also prices supply-chain risk.
metadata:
  type: project
---

Aaron 2026-08-26, verbatim:

> *"in a perfect world everyone would follow symver, we should have a registry of
> who tries to follow this in ace and based our update mechancies based on previous
> update precidence, more violations means more scrutany when updating to minor
> version or patch versions, based on a time weighed averaage not all history or
> else recent non adheriance can get swallowed by lots of past adheriance, let make
> sure we save this somewhere. We want to pin versions but have an AI safe non human
> intervention discrimanted unions / workflows like dependabot on steroids that
> update automatically while taking supply chain attacks into account"*

## The core insight

**A semver range is a CLAIM, not a guarantee.** `^1.2.3` encodes an assertion by
the publisher that minors won't break you. Every existing tool treats that claim as
binding. Aaron's inversion: **measure whether each publisher's claims have
historically been true, and let the measured record set the scrutiny.** This is the
repo's own toy/unmetered/metered discipline pointed at dependencies — an unverified
compatibility claim is a toy; a claim with a track record is metered.

## Time-weighting: the estimator is ALREADY BUILT here

Aaron is right that a plain average lets a long good history swallow recent bad
behaviour. The better answer than EWMA is already in-tree:

`src/Core/TravelerRankLedger.fs` — TrueSkill (Herbrich-Minka-Graepel 2006) over
(traveler x hat-domain). A publisher's semver adherence is the same shape:
**(publisher x ecosystem)** with a rating AND an uncertainty. TrueSkill's dynamics
factor inflates sigma with time since last observation, so stale evidence decays in
*confidence* rather than being arbitrarily discounted in value — more principled
than a decay constant nobody can justify.

It also already closes the **whitewash window by construction**: a fresh identity
starts at an honest prior, not at zero. That matters here because a publisher who
burns their reputation could otherwise re-publish under a new name.

## The limit that keeps this honest — TWO VERIFICATION QUESTIONS, no intent

Aaron 2026-08-26, correcting my framing (I had written "adherence prices breakage,
never betrayal"):

> *"we never assume betrayal unless it's self declared by the betrayer and even
> then the game continues we don't end playing"*

**"Betrayal" was my word and it was wrong** — naming an intent where the mechanism
reports a fact, i.e. `ForgerCaught` instead of `SameSourceAsKnown`. See
[[.claude/rules/dual-use-detection-is-neutral-oracle-decides.md]] and
[[.claude/rules/never-assume-malice-where-mistake-is-possible.md]]. Note the DU rows
below were already neutral; only the prose label was not.

Two signals, both **verification** questions, neither about motive:

| signal | asks | measured by |
|---|---|---|
| semver adherence | did this publisher's PAST CLAIMS hold? | the registry above |
| provenance / continuity | is this artifact WHAT IT SAYS IT IS? | sigstore / in-toto / npm provenance, reproducible builds, maintainer-change + cadence-shift detection |

Conflating them into one "trust score" is the classic error.

**xz-utils (CVE-2024-3094) is the falsifier, restated neutrally — and it works
BETTER this way.** Its adherence record was spotless; a time-weighted score would
have been *rising* right up to the backdoor. What actually changed was **who was
building it and how** — a provenance discontinuity, observable with no claim about
anyone's motives. Looking for a discontinuity beats looking for a villain, because
the discontinuity is in the data and the actor is not.

So adherence must never be sufficient authority to auto-update.

**Escalation must be RECOVERABLE — the infinite-game property.** A publisher flagged
for discontinuity re-establishes standing the ordinary way (re-attest, restore
provenance, accumulate new observations). **Never a permanent blocklist.** Aaron:
the game continues. Also correct on the base rate — most discontinuities are benign
handoffs, new CI, or a job change, so permanent exclusion would be wrong far more
often than right. Same shape as tit-for-lesser-tat and as privacy-budget-is-hard-money
(never confiscated).

## Related

[[user-aaron-mran-cran-time-machine-is-his-reproducibility-high-water-mark]] — pinning
is the floor this sits on; you can only reason about update *transitions* if the
current state is pinned. Also: the root flake carried EOL `nixpkgs`/`nix-darwin`
24.11 and floating `nixos-hardware@master` — the concrete instance that prompted this.
