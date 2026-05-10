---
id: B-0078
priority: P2
status: resolved
title: Narrow markdownlint carve-out from `docs/research/2026-*-*.md` to verbatim-only pattern — Codex P1 on PR #663
effort: S
ask: narrow .markdownlint-cli2.jsonc ignore pattern to exclude only verbatim ferry absorbs, not all date-prefixed research docs
created: 2026-04-28
last_updated: 2026-05-10
depends_on: []
tags: [pr-663, codex, deferred, acehack-canonical, markdownlint]
type: friction-reducer
---

# B-0078 — Narrow markdownlint research-doc carve-out

## Source

Codex P1 on PR #663 (.markdownlint-cli2.jsonc:108):

> Adding `docs/research/2026-*-*.md` to markdownlint ignores disables linting for *all* date-prefixed research docs, not just verbatim ferry absorbs. If the date-prefix convention is ever used for author-edited research notes, they'll silently lose lint coverage.

Codex's suggested narrowing: `docs/research/2026-*-verbatim-*.md`.

## Why deferred (not fixed in PR #663)

PR #663 forwards AceHack's broader pattern as-is (preserve source-of-truth direction). Narrowing on the LFG side would invert direction; the next forward-sync would re-introduce the broader pattern.

## Pre-start checklist (B-0078, 2026-05-10)

Prior-art-search: reviewed `.markdownlint-cli2.jsonc` comment history, PR #663, PR #19,
aurora carve-out pattern, and existing `docs/research/2026-*.md` filenames (219 files).
No superseding substrate found; existing B-0078 row is the canonical tracker.

Dependency-restructure: no `depends_on` chain. Forward-sync to LFG is the sole
dependency — addressed by this PR targeting LFG/main directly (per topology rule:
all PRs open against LFG/main; AceHack is the backup mirror).

Audit result: all 219 existing date-prefixed research files pass markdownlint cleanly
under the project's disabled-rules profile (MD013/MD031/MD033/MD034/MD036/MD040/MD004/
MD041 off). No file renames are needed to avoid lint failures when the pattern is narrowed.

## Acceptance

- [x] Narrow the pattern on LFG to a verbatim-only convention (`docs/research/2026-*verbatim*.md`)
- [x] Audit existing `docs/research/2026-*-*.md` files: all 219 pass lint cleanly; no renames required
- [x] Pattern landed in LFG directly (topology rule: all PRs → LFG/main)

## Composes with

- PR #663
- Otto-227 signal-in-signal-out discipline (the rationale the carve-out exists in the first place)
