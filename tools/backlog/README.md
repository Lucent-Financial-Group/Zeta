# Backlog tooling — per-row files + generated index

Companion to `docs/backlog/` (per-row YAML-frontmatter files)
and the generated `docs/BACKLOG.md` index.

Origin: Aaron Otto-181 directive to split `docs/BACKLOG.md`
to eliminate the positional-append conflict cascade
documented in Otto-171 queue-saturation memory. Design spec:
`docs/research/backlog-split-design-otto-181.md`.

## Structure

```text
docs/
  BACKLOG.md                     ← generated index (DO NOT EDIT)
  backlog/
    README.md                    ← schema + how-to
    P0/B-<NNNN>-<slug>.md        ← one file per row
    P1/B-<NNNN>-<slug>.md
    P2/B-<NNNN>-<slug>.md
    P3/B-<NNNN>-<slug>.md
tools/
  backlog/
    README.md                    ← this file
    generate-index.sh            ← regenerates docs/BACKLOG.md
    new-row.sh                   ← scaffolds a new row file
```

## Per-row file schema

Each row is one markdown file with YAML frontmatter:

```markdown
---
id: B-0042
priority: P2
status: open
title: Server Meshing and SpacetimeDB deep research
tier: research-grade
effort: L
directive: Aaron Otto-180
created: 2026-04-24
last_updated: 2026-04-24
composes_with:
  - B-0031
  - B-0038
tags: [game-industry, sharding, multi-node]
---

# Server Meshing + SpacetimeDB — deep research on cross-shard communication patterns

...full row content as markdown...
```

## Frontmatter fields

| Field          | Required | Type         | Notes |
|----------------|----------|--------------|-------|
| `id`           | yes      | `B-NNNN`     | Zero-padded 4 digits, sequential. Factory-wide unique. |
| `priority`     | yes      | `P0..P3`     | Directory must match (`P2` row → `docs/backlog/P2/`). |
| `status`       | yes      | enum         | `open` / `closed` / `superseded-by-B-NNNN` / `deferred` |
| `title`        | yes      | string       | Short index-display title. |
| `tier`         | no       | string       | Free-form; e.g. `research-grade`, `active-substrate`. |
| `effort`       | no       | `S` / `M` / `L` | Size estimate. |
| `directive`    | no       | string       | Origin reference; e.g. `Aaron Otto-180`, `Amara 18th ferry #4`. |
| `created`      | yes      | YYYY-MM-DD   | First-landing date. |
| `last_updated` | yes      | YYYY-MM-DD   | Updated on every content edit. |
| `composes_with`| no       | list of `B-NNNN` | Cross-references; strict-lint-candidate Phase-2+. |
| `tags`         | no       | list of string | Free-form. Examples: `multi-node`, `dst`, `ui-rename`. |

## Adding a new row

```bash
tools/backlog/new-row.sh --priority P2 --slug server-meshing-research
```

Creates `docs/backlog/P2/B-NNNN-server-meshing-research.md`
with pre-filled frontmatter. `NNNN` auto-assigned as the
next unused integer across all priorities.

Edit the file to add your content + fill optional
frontmatter. Commit the new file. The generator
regenerates `docs/BACKLOG.md` at pre-commit (or via
`tools/backlog/generate-index.sh` manually).

## Regenerating the index

```bash
tools/backlog/generate-index.sh
```

Walks `docs/backlog/**/*.md`, parses frontmatter via
`yq` or a lightweight awk fallback, emits
`docs/BACKLOG.md` sorted by (priority ascending, id
ascending).

## CI drift check

`.github/workflows/backlog-index-integrity.yml` (Phase 1b)
will fail if the committed `docs/BACKLOG.md` doesn't
match the output of `generate-index.sh` run against the
committed row files. Same pattern as
`memory-index-integrity.yml`.

## Retirement

Per `CLAUDE.md` "honor those that came before — retired
SKILL.md files retire by plain deletion, recoverable
from git history" discipline: retired rows delete the
file. `git log --diff-filter=D -- docs/backlog/` surfaces
deleted rows for recovery. The `status: superseded-by-B-NNNN`
frontmatter is for rows that are retired-but-still-
referenced; once no live row references the retired ID,
delete the file.

## Phase status

- **Phase 1a (this PR):** generator + schema + placeholder
  directory. No content migration yet.
- **Phase 1b:** CI drift workflow + `new-row.sh`
  scaffolder.
- **Phase 2:** content split mega-PR — reads current
  `docs/BACKLOG.md`, generates per-row files, regenerates
  index. One-time conflict cascade cost. Recommended to
  drain queue to <10 BACKLOG-touching PRs first.
- **Phase 3:** convention updates in `CONTRIBUTING.md` /
  `AGENTS.md`.

## Cross-references

- `docs/research/backlog-split-design-otto-181.md` — full
  design spec + 6 open questions Aaron's call on (some
  answered by reasonable defaults in this phase).
- `memory/feedback_aaron_asked_for_backlog_split_three
  _times_hot_file_detector_pr_213_exists_*.md` — context
  on the 3rd-ask + hot-file-detector.
- `tools/hygiene/audit-git-hotspots.sh` (PR #213,
  BEHIND) — the detector that identified BACKLOG.md as
  the hotspot.
- `.github/workflows/memory-index-integrity.yml` —
  precedent for the drift-CI pattern.
