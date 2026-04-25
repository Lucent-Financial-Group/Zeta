# ADR 2026-04-22: BACKLOG.md per-row-file restructure — bulk-migration commitment

**Status:** Accepted — bulk-migration commitment to the existing
Otto-181 substrate (Otto 2026-04-25 decision after Aaron
delegated the call: *"i'll leaf it up to you if you want per
row for backlog... it's your ownership so you make the finial
decision"*).
**Decision date:** 2026-04-22 (per-row variant proposed) /
2026-04-25 (substrate acknowledged, schema aligned with
Otto-181, decision finalised in favour of bulk migration).
**Deciders:** Human maintainer (Aaron); Architect (Kenji)
integrates; Iris / Bodhi review UX of the file layout.
**Triggered by:** PR #31 merge-tangle incident (2026-04-22
autonomous-loop tick). See
`docs/research/parallel-worktree-safety-2026-04-22.md` §9 — the
5-file conflict table ranked `docs/BACKLOG.md` as the P0
shared-write high-churn surface. Identified as the highest-ROI
preventive mitigation before the R45 EnterWorktree
factory-default flip.

## Context

`docs/BACKLOG.md` is the single-source-of-truth backlog for the
Zeta factory. It is append-only, organized newest-first within
four priority tiers (P0/P1/P2/P3), and currently spans
**~12,800 lines** (12,781 at time of writing) in one file.

Every autonomous-loop tick touches it. Every round-close
touches it. Every cadenced audit touches it. Every persona that
proposes a new line-item touches it. Parallel branches touch it
independently — and the PR #31 merge-tangle confirmed what the
cartographer research
(`docs/research/parallel-worktree-safety-2026-04-22.md`)
predicted structurally: `BACKLOG.md` is the top generator of
merge conflicts across long-lived PR branches.

§9 of the cartographer doc identified five concrete conflict-file
classes; `docs/BACKLOG.md` was class #1 — **universal queue,
every tick edits it, long-lived branch guarantees overlap.**
Before the R45-R49 reducer-agent EnterWorktree default-flip
scales parallel branches further, the shared-write surface must
shrink. Otherwise every parallel tick accumulates one more
branch-conflict against the same file, and the compensating
side (merge-conflict resolution) becomes the tax that kills the
promised preventive-paired-with-compensating discipline.

## Existing substrate (Otto-181 Phase 1a prior work)

This ADR builds on prior Otto-181 Phase 1a work, **not** a
green-field design. The current state — Phase 1a as
documented in `docs/backlog/README.md` — is:

- **Design spec:** `docs/research/backlog-split-design-otto-181.md`
  — Aaron Otto-181 directive, full 6-question structural
  review.
- **Index generator:** `tools/backlog/generate-index.sh` —
  walks `docs/backlog/P<tier>/B-<NNNN>-<slug>.md` files,
  extracts the three index-relevant fields (`id`, `status`,
  `title`) from frontmatter, emits a per-tier index sorted
  by `id` with `[ ]` (open) / `[x]` (closed) checkboxes.
  Has `--check` and `--stdout` modes. **The full per-row
  schema documented below is convention/documentation —
  the generator only enforces id/status/title.**
- **Tooling README:** `tools/backlog/README.md` — schema
  documentation + workflow.
- **Per-row directory tree:** `docs/backlog/P0/`,
  `docs/backlog/P1/`, `docs/backlog/P2/`, `docs/backlog/P3/`
  exist as placeholder directories. Only `P2/` currently
  contains a file — `B-0001-example-schema-self-reference.md`
  — which is a placeholder row exercising the generator on
  non-empty input. Schema reference lives in
  `docs/backlog/README.md`.
- **`docs/BACKLOG.md` is currently still the monolithic
  authoritative backlog** at ~12,800 lines. The Phase 1a
  generator can write to it, but Phase 2 has not run, so
  the substantive content has not yet moved into per-row
  files.

What is **not** yet in tree (this ADR's owed phases):

- **Phase 2 — bulk migration** of the remaining ~350 rows
  from `docs/BACKLOG.md` into per-row files starting at
  `B-0002`, then run `generate-index.sh` to overwrite
  `docs/BACKLOG.md` as the generated index.
- **Phase 1b — `tools/backlog/new-row.sh`**: scaffolder
  invocable as `tools/backlog/new-row.sh --priority P2
  --slug <slug>` per `docs/backlog/README.md`'s quick
  reference. Manual file creation works in the interim
  but the scaffolder reduces error rate.
- **Phase 1c — `tools/backlog/lint-index.sh`**: pre-commit
  wrapper around `generate-index.sh --check` that catches
  index drift at commit time rather than at next-tick.
  *(Note: `generate-index.sh --check` itself already
  provides drift detection; the wrapper is the
  pre-commit-hook surface.)*
- **Path-pattern updates** in `AGENTS.md`, `CLAUDE.md`,
  `docs/AGENT-BEST-PRACTICES.md`, and skill files that
  currently reference `docs/BACKLOG.md` as a grep target.

## Decision

**Commit to bulk-migrating the remaining ~350 rows from
`docs/BACKLOG.md` into the existing per-row substrate at
`docs/backlog/P<tier>/B-<NNNN>-<slug>.md`.** Adopt the
Otto-181 schema and tooling as-is — this ADR is *not*
proposing a competing design.

### Directory shape (post-migration target)

```text
docs/
  BACKLOG.md                          # generated index post-Phase-2 (DO NOT EDIT once Phase 2 lands)
  backlog/
    README.md                         # schema + how-to (Phase 1a, exists)
    P0/B-<NNNN>-<slug>.md             # one file per row (Phase 2 fills these)
    P1/B-<NNNN>-<slug>.md
    P2/B-<NNNN>-<slug>.md             # currently has B-0001 example only
    P3/B-<NNNN>-<slug>.md
tools/
  backlog/
    README.md                         # tooling README (Phase 1a, exists)
    generate-index.sh                 # regenerates docs/BACKLOG.md (Phase 1a, exists)
    new-row.sh                        # row-scaffold helper (Phase 1b — OWED)
    lint-index.sh                     # pre-commit drift check (Phase 1c — OWED)
```

`docs/BACKLOG.md` becomes "DO NOT EDIT" only **after Phase 2
ships**. Until then, it remains the monolithic authoritative
file and is hand-edited as today.

### Per-row file shape (Otto-181 schema)

The schema documented in `docs/backlog/README.md` and
`tools/backlog/README.md`, exemplified by
`docs/backlog/P2/B-0001-example-schema-self-reference.md`:

```markdown
---
id: B-<NNNN>                          # parsed by generator (index id)
priority: P0 | P1 | P2 | P3           # documented; mirrored by directory
status: open | closed                 # parsed by generator (open=[ ], closed=[x])
title: <one-line title>               # parsed by generator (index display)
tier: research-grade | shippable | hygiene | spec | ...
effort: S | M | L
directive: <provenance — e.g., "maintainer Otto-181 (BACKLOG split Phase 1a)">
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
composes_with: []                     # array of B-<NNNN> ids; may be empty
tags: [<topic>, <topic>]
---

# <Row title>

<body — same prose as current BACKLOG.md row body>
```

**What the generator currently parses vs documents:** only
`id`, `status`, and `title` are read by
`tools/backlog/generate-index.sh` for the index line. The
remaining fields (`priority`, `tier`, `effort`, `directive`,
`created`, `last_updated`, `composes_with`, `tags`) are
**convention-enforced documentation**, not parser-validated.
Phase 1b/1c work may extend the parser to validate them; this
ADR does not require it.

(Earlier draft revisions of this ADR proposed `owner`, `updated`,
`scope` and `status: open|shipped|declined`, which do not match
the real schema. Corrected per copilot review on PR #474:
`status` is `open | closed`; "shipped"/"declined" is captured
via the row body's history section, not a status enum value.)

### Index file shape (already in tree)

`docs/BACKLOG.md` is a **generated** index — short pointer per
row, sorted by (priority, id). Do not hand-edit; run
`tools/backlog/generate-index.sh` to refresh after row edits.

### Migration

Two-phase migration relative to the existing substrate:

1. **Bulk row split (one big mechanical PR).** A migration
   script walks `docs/BACKLOG.md`, splits by row, derives
   `B-<NNNN>` IDs newest-first within each tier, writes one
   file per row under `docs/backlog/P<tier>/`, then runs
   `generate-index.sh` to rebuild `docs/BACKLOG.md` as the
   index. Row body text is preserved verbatim. Frontmatter is
   inferred from the original row's tier marker, dates in the
   prose, and any `Otto-NNN` provenance tags.
2. **Path-pattern sweep (small follow-up PR).** Update
   `AGENTS.md`, `CLAUDE.md`, `docs/AGENT-BEST-PRACTICES.md`,
   and any skill bodies that reference `docs/BACKLOG.md` as a
   grep target — most should switch to `docs/backlog/**`.

### Authoring rules after migration

- **Add a row:** create a new file under
  `docs/backlog/P<tier>/B-<NNNN>-<slug>.md`. Allocate the
  next free `B-NNNN` ID (the migration script will reserve a
  comfortable gap). Then run
  `tools/backlog/generate-index.sh` to refresh
  `docs/BACKLOG.md`. The index is generator output, not an
  authoring surface.
- **Edit a row:** edit the row file. Bump `last_updated:`.
- **Close a row** (ship / decline / supersede): flip
  `status:` from `open` to `closed`. The generator marks
  closed rows with `[x]` in the index. Capture *why* it
  closed (shipped via PR #NNN, declined per Otto-NNN,
  superseded by B-NNNN) in the row body's prose, since
  `status:` itself is binary.
- **Tier-change:** move the file between `P<tier>/`
  directories. The frontmatter `priority:` field is
  documentation only (parser does not enforce); update it
  for human readers.

### Index regeneration

`tools/backlog/generate-index.sh` (already in tree) rebuilds
`docs/BACKLOG.md` from the row files. The `--check` flag exits
non-zero on drift and is suitable for pre-commit. A
`tools/backlog/lint-index.sh` wrapper (Phase 1c, owed) wires
that into the pre-commit toolchain so a row-file edit without
a corresponding index regen is caught.

## Alternatives considered

1. **Append-only-section-per-tick layout on the single file.**
   Each tick appends to its own section; merges concatenate
   without conflict. *Rejected:* preserves monolithic file,
   same re-read cost on wake, and still conflicts on shipped-
   row moves between tiers.

2. **Per-tier file split only (P0.md / P1.md / P2.md / P3.md).**
   Four files instead of one; conflicts partition across
   tiers. *Rejected:* still conflicts heavily on P0 (busiest
   tier) and on tier-migration boundaries. Does not help the
   parallel-branch-growth R45 scaling problem.

3. **Status-quo with shared-editor discipline (lock the file
   during a tick).** *Rejected:* incompatible with the
   always-parallel factory direction. The lock IS the shared-
   write surface.

4. **Automated conflict-resolver on BACKLOG.md merges.**
   *Rejected:* semantic merges of prose are not reliably
   automatable. Humans and agents disagree at the prose level;
   a mechanical merge would hide disagreements behind silent
   text concatenation.

5. **Swim-lane file split (per-domain / per-owner)**, e.g.
   `docs/backlog/security.md`, `docs/backlog/factory-demo.md`,
   `docs/backlog/research.md`, `docs/backlog/ci.md`,
   `docs/backlog/governance.md`, etc. *(Aaron 2026-04-25
   alternative; viable second-best.)*  *Rejected:* same
   shared-write surface within each lane — P0 lane still
   collides; per-row collision-avoidance is strictly better.

6. **Per-row file with `<slug>-<YYYY-MM-DD>` filename and
   path-encoded priority.** *(Earlier ADR-draft variant.)*
   *Rejected:* doesn't match Otto-181's existing
   `B-<NNNN>-<slug>` schema or the parser in
   `tools/backlog/generate-index.sh`. Adopting it would
   require parser re-engineering for no gain — `B-NNNN`
   IDs are stable across renames and priority shifts; dates
   in filenames decay as rows update. Existing scheme wins.

**Trade-off matrix (per-row variants vs swim-lane):**

| Axis | Per-row (Otto-181 schema, adopted) | Swim-lane (~10 files) |
|---|---|---|
| Filename grep-ability | High (`B-<NNNN>-<slug>` topic+id) | Medium (one swim-lane = grep target) |
| File count | ~350 (one per row) | ~10 |
| Collision avoidance | Near-zero (filename disambiguates) | Medium (same swim-lane still collides) |
| Tooling cost | Index script + frontmatter parser (already built) | Minimal (concat-and-scan) |
| Discoverability | Index file + directory walk | Direct filename = topic |

**Note on priority-shift cost** (Aaron 2026-04-25): a file
rename and an in-place edit are the same cost — both are a
single git operation, both are tracked by similarity
detection. The "rename ceremony" objection in earlier ADR
revisions was non-substantive and is dropped. With
`priority` in YAML frontmatter and the file under
`P<tier>/`, a P3→P1 shift is `git mv` + frontmatter edit, same
as any other multi-line edit.

**Decision** (Otto 2026-04-25, owning the call after Aaron
delegated): **adopt Otto-181 substrate as-is, commit to bulk
row migration.** Reasoning:

1. **Pattern consistency.** Every other "many-rows-each-evolves-
   independently" surface in the factory is per-row — memory
   (one file per fact), ADRs (one file per decision), drain
   logs (one file per PR), skills (one folder per skill). The
   holdouts (BACKLOG, ROUND-HISTORY) have different access
   patterns — ROUND-HISTORY is justifiably monolithic
   (chronological / sequential reads), but BACKLOG is
   priority-organized, and the per-row argument that won
   everywhere else applies cleanly here.

2. **Filename-IS-index** at the per-row level. The filename
   `B-<NNNN>-<slug>.md` encodes both stable id and topic
   discoverability natively; no need to scan-and-extract from
   a multi-row file.

3. **Tooling burden is already paid.**
   `tools/backlog/generate-index.sh` exists and works on the
   one example row. The bulk migration is a one-shot
   mechanical transform; no new authoring code is required.

4. **Mark-as-done = move-or-flag-status**, much cleaner than
   "delete a 50-line section from a 1000-line swim-lane
   file" without disturbing surrounding rows or generating
   noisy diffs.

5. **Collision avoidance** is strictly better than swim-lane.
   Post-R45 EnterWorktree default-flip, the parallel-branch
   count grows; per-row keeps each row's edits independent.

Swim-lane is a viable second-best, retained in the
trade-off matrix above as documentation of the alternative
considered. If the per-row tooling investment proves
larger than expected, swim-lane remains an acceptable
fallback.

## Consequences

### Positive

- **Conflict rate on backlog edits collapses to near zero** —
  only branches touching the *same* row conflict, and those
  conflicts are semantically meaningful (two agents disagree
  on the same row, which deserves a review).
- **Unblocks R45 reducer-agent EnterWorktree default-flip** per
  the cartographer staging recommendation.
- **Per-row history becomes first-class** — each row has a
  dedicated `last_updated` field and `directive` provenance
  in frontmatter. Cleaner audit trail.
- **Tier and effort become grep-able** — moves from
  prose-level to frontmatter, queryable by `grep -A2 "^tier:"`
  across `docs/backlog/**`.
- **Index file stays short** even as the backlog grows — the
  monolithic file's ~12,800 lines is a wake-cost for every
  tick; a generated index of ~500 pointers is not.

### Negative / costs

- **Migration PR is large** — a single PR touches the entire
  `docs/backlog/**` tree + shrinks `docs/BACKLOG.md`. Any open
  PR at migration time will need a rebase. Mitigation: time
  the migration after PR #31 / PR #36 merge, during a known-quiet
  window.
- **Index regeneration discipline** — the index file can drift
  from the row files if agents edit the index directly and
  skip the row file (or vice versa). Mitigation:
  `tools/backlog/lint-index.sh` (Phase 1c, owed) — pre-commit
  hook wrapping `generate-index.sh --check`.
- **Wake-cost pattern changes** — agents that previously
  grep'd `docs/BACKLOG.md` now grep `docs/backlog/**/*.md`.
  Same `rg` command with a different path; no harder. But
  every AGENTS.md / CLAUDE.md / skill doc that references
  BACKLOG.md needs a path-pattern update.
- **Index maintenance is a new micro-hygiene row** — adds one
  FACTORY-HYGIENE.md item: "Index matches row files".

### Neutral

- **File count grows** — repo gets ~350 new files at migration.
  Not a problem for git (storage scales with content, not file
  count), but pattern-match tools (`ls docs/backlog/`) will see
  long listings. Tier-subdirectories mitigate.

## Staging (relative to R45-R49 parallel-worktree-safety work)

Per `docs/research/parallel-worktree-safety-2026-04-22.md` §9
revised staging:

- **Round 45 (this restructure, pre-R45-flip):** land this ADR,
  the migration PR, and the index lint. Single-purpose round —
  no new reducer-agent parallelism yet.
- **Round 46 (R45 original intent):** EnterWorktree factory-default
  flip for reducer-agent class, with the now-shrunk
  `docs/BACKLOG.md` shared-write surface.
- **Round 47-49:** proceed with the original R46-R48 staging,
  shifted one round later.

This ADR therefore *delays R45's reducer-agent flip by one
round*. Justification: the flip itself is moot without the
preventive-paired-with-compensating discipline, and that
discipline fails without this restructure.

## Cross-references

- `docs/research/backlog-split-design-otto-181.md` — Otto-181
  design spec; this ADR's substrate.
- `docs/research/parallel-worktree-safety-2026-04-22.md` §9 —
  the PR #31 merge-tangle incident that triggered this ADR.
- `tools/backlog/README.md` — tooling reference; matches the
  schema cited above.
- `docs/backlog/README.md` — per-row schema reference.
- `docs/FACTORY-HYGIENE.md` — gets a new row for
  index-matches-row-files lint.
- `docs/BACKLOG.md` — the file being restructured.
- `AGENTS.md`, `CLAUDE.md`, `docs/AGENT-BEST-PRACTICES.md` —
  all need path-pattern updates to point at
  `docs/backlog/**` instead of the monolithic file for "grep
  the backlog" instructions.

## Expires when

- The restructure ships and is proven to reduce conflict rate
  on backlog edits over at least 3 rounds of cross-PR work.
- If conflict rate does not measurably drop, this ADR is
  revisited — either the per-row granularity is wrong, or
  the conflict pattern is elsewhere.

## Decisions tracked (Otto-283 — decided + revisit-if signals)

Per Otto-283 standing directive ("don't make the human
maintainer the bottleneck — decide, track, revisit later
with experience"), the following calls are decided in this
ADR. Each carries a falsification signal that should
trigger revisit if observed. Aaron retains override
authority at any time.

1. **`B-NNNN` allocation strategy at migration.**
   **Otto decided: date-ascending** — older rows get lower
   numbers, so `B-0001` is the oldest live row and the
   newest row at migration time gets the highest ID.
   *Why:* date-ascending matches the natural append-order
   of the monolithic file (which was newest-on-top within
   each tier, but globally an append log of decisions over
   time); it also makes the ID range a chronological index
   that is stable as rows ship/decline. *Revisit if:* the
   bulk-migration script reveals N tied dates within a
   tier (no monotone date order recoverable), or if
   newest-first proves materially easier on grep-by-recency
   (likely false — `last_updated` field is the recency
   signal, not the ID).

2. **`scope: factory | zeta | shared` field.**
   **Otto decided: tags array (`scope-factory` /
   `scope-zeta` / `scope-shared`)** — do NOT extend the
   Otto-181 schema with a dedicated `scope` field. *Why:*
   the existing parser handles `tags:` natively; adding a
   frontmatter field requires parser re-engineering for
   negligible query-ergonomics gain. Tag-based queries
   (`grep -l "scope-factory" docs/backlog/**/*.md`) are
   the same shape as field-based queries. *Revisit if:*
   tag noise grows past ~12 distinct scope values (then
   `scope:` becomes a useful enum constraint), or if the
   factory-vs-zeta scope distinction becomes load-bearing
   for a generated dashboard / report (then the field's
   schema-level guarantee matters).

3. **Concurrent-migration with R45 original intent.**
   **Otto decided: separate rounds** (this ADR ships R45,
   reducer-agent flip moves to R46). *Why:* the
   migration PR is the largest mechanical PR the factory
   will land (~350 new files); landing it concurrently
   with a parallelism flip multiplies blast-radius without
   evidence the combined change is safer. Conservative
   staging is cheaper than an entangled rollback.
   *Revisit if:* the migration PR proves trivial in
   practice (sub-15-minute review, mechanical) AND the
   R45 flip is blocked on a reason that this ADR's
   restructure already solves (then concurrent landing is
   the safer move).
