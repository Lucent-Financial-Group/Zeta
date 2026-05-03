---
name: action SHA hallucination — check repo first before pinning
description: Author-time discipline: never invent an actions/SHA pair from training data; grep the repo for an existing authoritative pin
type: feedback
---

# Action-SHA hallucination is a real failure class

## What happened

When authoring `.github/workflows/stryker-mutation.yml` (PR #1417),
I pinned `actions/upload-artifact@9eaf0eba75d52b5e72c7a193fc2887e6caf95df0`
with the comment `# v5.1.0`. The SHA was hallucinated — it doesn't
resolve to any actual git object in `actions/upload-artifact`. The
version number was also wrong (the current major is v7, not v5).

Every workflow run after #1417 merged failed at the `Set up job`
step with `Unable to resolve action actions/upload-artifact@9eaf0eba...`.
Surfaced empirically on #1420's CI run (databaseId 25283000236).

## Why: training-data weights generate plausible-shaped SHAs

A 40-character hex string IS the shape of a git SHA. Training-data
patterns include lots of action SHAs from various Anthropic-trained
example workflows. When asked to pin an action SHA, the model
generates something SHA-shaped that LOOKS authoritative — but
generates from training-distribution rather than from any actual
upstream reality.

The version-number comment (`# v5.1.0`) makes this worse: a real
SHA + version pair is internally consistent only if both come from
the same upstream lookup. Generating both from training data
guarantees they're inconsistent — the model picks a plausible SHA
AND a plausible version, neither of which actually corresponds to
the real release map.

## How to apply: search-repo-first as primary authority

Author-time discipline for any `uses: <action>@<SHA> # <version>`
pin in a workflow file:

1. **Grep the repo first.** `grep -rn "<action>@" .github/workflows/`
   — if the action is already pinned somewhere, that pin is
   authoritative-by-use (it's been working in CI). Copy the SHA +
   version verbatim.
2. **If not in repo, WebSearch the upstream releases page.** Per
   Otto-364 search-first-authority. Get the SHA from
   `https://github.com/<owner>/<action>/releases/tag/<version>`
   directly.
3. **Never generate a SHA from training data.** A SHA-shaped string
   that LOOKS plausible is not the same as a SHA that resolves.
   Training data is historical truth at best; for action SHAs
   specifically, the values are version-tagged immutable refs that
   the model never has authoritative knowledge of.
4. **Cross-check the version-number comment.** If the major version
   in the comment doesn't match the current upstream major, that's
   a strong signal the pair was generated, not looked up.

## Composes with

- **Otto-364 search-first-authority** — generalized rule that
  load-bearing claims about tools / standards / APIs need current
  upstream verification, not training-data defaults. SHA pinning is
  one specific instance of the broader class.
- **Otto-247 version-currency-always-search-first** — narrower
  predecessor specifically for version numbers; this rule extends
  to the SHA<->version pair.
- **PR-review meta-classes memory** (2026-05-03) — sibling-pattern
  audit before authoring is the equivalent author-time discipline
  for code patterns. The action-SHA discipline is the same shape
  applied to workflow pins.

## Discriminating signal

When the very first CI run on a new workflow fails at "Set up job"
with `Unable to resolve action`, the failure class is action-SHA
hallucination. Real CI infrastructure failures (network, runner
allocation, etc.) fail with different error patterns. Resolution-
time errors specifically point at SHA + version mismatch.

## Carved sentence

*"A SHA-shaped string from training data is not a SHA. Verify
against the repo first, the upstream releases page second, never
the training prior."*
