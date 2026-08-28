---
name: VERSION NUMBERS ALWAYS REQUIRE WEBSEARCH — training data is stale by definition; Otto has hit-and-missed this lesson several times; durable factory-wide discipline; applies to runner images, SDK versions, package versions, API versions, OS releases, anything numbered; Aaron Otto-213: "your training data will always be out of date for version numbers, this is a lesson you've hit and missed several times now"; 2026-04-24
description: Aaron Otto-213 durable cross-domain correction. Otto-212 decision to use `macos-latest` over `macos-14` was correct but Otto's EARLIER nightly-workflow + design-doc commits had pinned `macos-14` because training-data said it was latest. Aaron: "you didn't compount to pin to latest version 14 is not latest version you must have just assumed becuse of your training and not serached, whenever looking at version numbers you actually have to search the internet, your training data will always be out of date for version numbers, this is a lession you've hit and missed several times now." Training cutoff = Jan 2026; GitHub runner versions roll forward. This memory is the durable discipline future Otto MUST integrate at session-start, not rediscover each session.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**Every time a decision involves a version number, WebSearch
for the current value.** Not "recall from training," not
"use what's in the existing codebase," not "default to the
version I remember." Search. The current moment's version
is almost never what my training-data says it is.

Domain examples (non-exhaustive):

- GitHub Actions runner images (ubuntu-*, macos-*, windows-*)
- .NET SDK versions (net6.0 / net8.0 / net10.0 / etc.)
- Node.js / bun / python runtime versions
- NuGet package versions
- Docker image tags
- OS release versions (Ubuntu LTS, macOS major, Windows
  Server)
- F# compiler versions
- API version segments (`/v1/` vs `/v2/` — sometimes
  bumps even mid-year)
- Browser engine versions (Playwright / Puppeteer
  compatibility)
- GitHub CLI version
- shellcheck / actionlint versions
- Any "latest stable" claim — always verify

## Why this recurs

Aaron's diagnosis: "you must have just assumed because of
your training and not searched." Correct. The mechanism:

1. Training data has a cutoff (Jan 2026 for Opus 4.7).
2. Version numbers increment continuously.
3. Training data → latest-I-know ≠ latest-actually-now.
4. When I default to training-knowledge without search,
   I pin to a stale version.
5. That creates upgrade debt the moment the code lands.

This is a STRUCTURAL failure mode. It's not solved by
"try to remember correctly" because training weights are
immutable per-model. It's solved by ALWAYS SEARCHING
when version numbers are in scope.

## The lesson's history

Aaron Otto-213: *"a lession you've hit and missed
several times now."* Instances this session alone:

- Otto-164 verification of macOS pricing: read wrong
  docs page; got wrong answer.
- Otto-158..193 version pins: macos-14, ubuntu-22.04,
  windows-2022 — all assumed-latest without search.
- Otto-209 nightly workflow ship: used macos-14 again.
- Otto-212 required Aaron to correct me before I
  actually went to `macos-latest`.

Each instance was the same mechanism: assumed training,
didn't search. Pattern resilient despite multiple
corrections; ergo DURABLE memory required.

## Corrective discipline

**Before writing any version-number value into code,
docs, or commit messages:**

1. WebSearch the current version (or fetch the
   authoritative source URL for that product's release
   info).
2. If multiple "latest" candidates exist, pick the
   `-latest` rolling tag when available (Otto-212
   discipline).
3. If a rolling tag is NOT available (e.g. Linux arm
   runners), pin to the latest-verified-via-search
   specific version with an inline comment noting WHY
   pinning was necessary.
4. Record the search date in an inline comment so
   future readers know when the decision was made:
   `# verified latest 2026-04-24 via <URL>`.

**For BACKLOG rows / design docs referencing versions:**

- Do the same search. If the backlog row will land weeks
  later, note it: `# verified <date>; re-check at
  implementation time if >30 days.`

## Composition with prior memory

- **Otto-164 memory** (macos-NOT-free conclusion —
  WRONG) — the earliest visible instance of this failure.
- **Otto-204c livelock memory** — ARC3-Compounded
  failure at a higher level (not integrating prior
  session lessons). This memory is the same failure at
  the specific version-number axis.
- **CLAUDE.md verify-before-deferring** — the general
  discipline; this memory is its version-number
  specialization.

## Session-start protocol addition

Add to the session-start ritual (from Otto-204c
memory):

```text
Before writing any version number:
  WebSearch the current value.
  Prefer -latest rolling tag.
  If pinning: comment "# verified <date> via <URL>".
```

This is MANDATORY, not optional. Aaron caught THREE
instances this session already. The fourth instance in a
session would be willful; the first instance in a future
session is the failure mode this memory exists to
prevent.

## What this memory does NOT authorize

- Does NOT authorize skipping the WebSearch "because
  I'm sure about this one." Sureness is the mechanism
  that produces stale assumptions.
- Does NOT authorize bulk-updating all version numbers
  in the repo without per-decision verification. Each
  version number is a decision-site; each one needs
  its own search.
- Does NOT authorize using unverified latest-claims
  from third-party sources. GitHub-published tables
  for GitHub runners; Microsoft-published release
  notes for .NET; etc. — primary source.
- Does NOT apply to version-numbers in HISTORY surfaces
  (tick-history rows, memory files, absorbed ferry
  content) — those are audit trails of what-was-said-
  when. The rule applies to FORWARD-looking
  code/docs/commit-messages.

## Direct Aaron quote to preserve

> *"you didn't compount to pin to latest version 14 is
> not latest version you must have just assumed becuse
> of your training and not serached, whenever looking
> at version numbers you actually have to search the
> internet, your training data will always be out of
> date for version numbers, this is a lession you've
> hit and missed several times now."*

Future Otto: don't make Aaron catch this a fifth time.
Session-start protocol now includes: WebSearch every
version decision. Primary source, date-stamped.
