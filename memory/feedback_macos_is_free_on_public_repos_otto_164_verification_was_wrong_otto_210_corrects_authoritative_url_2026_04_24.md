---
name: macOS IS FREE on public repos for standard runners — Otto-164 verification was WRONG; Otto-210 correction via authoritative GitHub docs URL ("Use of the standard GitHub-hosted runners is free and unlimited on public repositories"); macos-14 / macos-latest are standard runners; factory can run mac + windows + linux per-PR on public repos (Zeta canonical AND AceHack personal forks); Aaron-specified Windows is deferred but mac + linux go per-PR; 2026-04-24
description: Otto-210 authoritative-source correction of Otto-164 mistaken verification. GitHub docs page https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job#standard-github-hosted-runners-for-public-repositories states "Use of the standard GitHub-hosted runners is free and unlimited on public repositories" and lists macOS (macos-latest, macos-14, Intel + Apple Silicon variants) under the "Standard GitHub-hosted runners for public repositories" table. My Otto-164 verification read the BILLING page's pricing table as universal; that table applies to PRIVATE repos. Public repos have a separate policy at the above URL. This memory corrects the factory record so future Otto instances don't repeat the error.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The correction

**Otto-164 claim (WRONG):** "macOS runners are NOT free for
public repos — classified as larger runners, always billed
at $0.062/min even on public repos."

**Otto-210 correct answer:** macOS IS free on public repos.
Standard GitHub-hosted runners are free-and-unlimited on
public repos. macos-14 / macos-latest / Intel + Apple
Silicon variants are all in the standard-runners table for
public repos.

**Authoritative source:**
`https://docs.github.com/en/actions/how-tos/write-
workflows/choose-where-workflows-run/choose-the-runner-
for-a-job#standard-github-hosted-runners-for-public-
repositories`

**Exact quote:** *"Use of the standard GitHub-hosted
runners is free and unlimited on public repositories."*

## Why I got Otto-164 wrong

Otto-164 relied on the GitHub BILLING docs page which
showed a pricing table with macOS at $0.062/min. I read
that as universal pricing. Actual reality:

- Billing docs pricing table = PRIVATE repo rates (counts
  against plan minutes, then overage at listed rates).
- Public repos have a separate policy: standard runners
  free-and-unlimited regardless of runner OS.
- The "larger runners are always charged" clause applies
  specifically to the larger-runner tier (GitHub Team /
  Enterprise VMs with more RAM/CPU/disk/GPU), NOT to
  standard macOS runners despite the $0.062/min listing.

The confusion came from the billing-docs page conflating
tiers without saying "rates below apply to private-repo
billable usage only." The workflow-runners page (Otto-210
URL) is clearer.

## Impact of the correction

Factory decisions based on Otto-164 that need revisiting:

1. **PR #343** — closed as "macOS-declined per Otto-164
   pricing verification." The premise (Otto-164 wrong) is
   corrected; the specific PR close stands because the
   row it was closing elevated THEN declined; the decline
   rationale was wrong but the queue outcome (no BACKLOG
   row standing as open action) is still fine. The
   content is preserved in the branch history for
   recovery.

2. **PR #358** (just shipped, Otto-209) — nightly-only
   cross-platform workflow with cost-capped framing
   ("~$28/month worst-case for macOS"). This framing is
   OVER-CONSERVATIVE given Otto-210's correct reading.
   macOS can safely run per-PR on public repos. Either:
   (a) update #358 to explicitly state macOS is free +
       reduce the cost-capped narrative to "same as
       Linux/Windows: $0 per month"
   (b) convert #358 from nightly-only to PR-gate matrix
       (add macOS to gate.yml, matching Aaron's
       Otto-210 "mac windows and linux, windows later")
   (c) keep #358 as-is (nightly) AND also add macOS to
       gate.yml in a separate PR
   Aaron's Otto-210 directive points at (b) or (c) —
   per-PR runs, not nightly-only.

3. **gate.yml current state** — line 77 matrix uses
   `fromJSON` to limit canonical repo to `[ubuntu-22.04]`
   only, with macos-14 on forks. Under correct Otto-210
   verification, this is over-conservative. Canonical
   repo can include macos-14 in the matrix without
   billing concern.

4. **BACKLOG row Otto-161 / Otto-164 history** — the row
   is closed via PR #343 close. The NEW directive
   (Otto-210 / Otto-211) supersedes it with a concrete
   action: add macOS to PR-gate matrix.

## Aaron's Otto-210 directive (verbatim)

> *"mac is free to all standard tier are we can run mac
> windows and linux, windows will come later on both
> zeta and acehack https://docs.github.com/en/actions/
> how-tos/write-workflows/choose-where-workflows-run/
> choose-the-runner-for-a-job#standard-github-hosted-
> runners-for-public-repositories"*

Parse:

- macOS IS free for all standard-tier public-repo usage.
- Can run mac + windows + linux per-PR on public repos.
- Windows deferred to later (NOT added this round).
- Both Zeta canonical AND AceHack personal forks get
  this treatment (both are public, both free).

Scope for immediate action:

- Add macos-14 to PR-gate matrix on canonical repo.
  Remove the fork-only fromJSON gating for macOS.
- Linux already in PR-gate.
- Windows NOT added this round (explicitly deferred).

## ARC3-Compounded discipline

This is a second compounding-failure instance. Otto-164
verification was produced this same session (not a
prior-session carry-over). The failure mode was not
"prior lessons not integrated" but rather "verification
read the wrong docs page." Both are correctable via
careful primary-source discipline:

- Cite EXACT URLs of the docs I read.
- When a claim has two different docs pages saying
  opposing things, flag the contradiction and seek a
  third source rather than committing to one reading.
- Authoritative-source hierarchy for GitHub Actions
  runtime policy: workflow-runners page > billing
  page > marketing/pricing pages.

## What this memory does NOT authorize

- Does NOT retroactively rewrite history on already-
  closed PRs (PR #343 stays closed; PR #358 as-shipped
  remains a rollback-safe conservative implementation).
  Corrections land as FORWARD edits / new PRs, not
  history-rewriting.
- Does NOT treat Otto-164 as the factory record. This
  memory replaces it. MEMORY.md entry updates + old
  Otto-164 memory stays as history record of the error.
- Does NOT authorize Windows addition without
  maintainer sign-off. Otto-210 explicitly defers
  Windows; keep it deferred.
- Does NOT automatically add macos-14 to every repo.
  Zeta + AceHack fork-side changes need separate
  implementation; lucent-ksk parallel still needs its
  own workflow + coordination.

## Factory response sequencing

1. Save this memory (THIS action).
2. Update PR #358 to reflect Otto-210 correct reading:
   either close-and-replace or amend-in-place with
   cost-model correction.
3. Update gate.yml to add macos-14 to canonical-repo
   matrix.
4. File BACKLOG row for Windows-later.
5. Note lucent-ksk parallel is still queued.
