# Backlog-item start gate — proof required before starting

Carved sentence:

> Proof of prior-art-search + dependency-restructure is REQUIRED
> before starting any backlog item. Update the row with proof;
> then start.

## Operational content

Before beginning work on any `docs/backlog/P*/B-*.md` row,
complete a checklist directly on the row body:

1. **Prior-art-search** across the existing axes:
   wake-time-substrate + skill-router + orthogonal-axes +
   Otto-364 + PR #1701 + decision-archaeology + lost-files
   canonical at `tools/hygiene/LOST-FILES-LOCATIONS.md` + **the
   curated external prior-art surface at `references/upstreams/`**
   (humans who've solved similar problems; mix of cutting-edge
   and tried-and-true; prefer explicit-target subtree searches
   like `rg "pattern" references/upstreams/postgres/` for focused
   prior-art research; `rg` from repo root is also safe — it
   respects `.gitignore` and `references/upstreams/*` is gitignored
   — but explicit-target is recommended because it documents
   which upstream(s) you actually consulted on the backlog row;
   see `.claude/rules/references-upstreams-not-our-code-search-excludes.md`
   for the full two-modes table and the plain-grep caveats).
   The watchlist + category index lives at `docs/UPSTREAM-LIST.md`;
   the synthesis notes at `references/notes/`.
   Log surfaces searched, queries used, results found on the row.

2. **Dependency-restructure**:
   - Walk `depends_on:` chain.
   - Backfill reciprocal `composes_with:` pointers.
   - Reconstruct supersession history via decision-archaeology
     procedure (B-0169 P1).
   - Fix broken pointers.

3. **Update the row** with a "Pre-start checklist" section
   containing the proof before any code/substrate work begins.

This gate catches the failure modes the seven-rule cascade
lineage was designed to catch — at the *start of work* scope
rather than the *substrate-landing* scope.

## Companion: row-close gate — drift / partial / multi-slice triage

Mirror discipline at row-close time. Empirically (2026-05-16
session — Otto-CLI closed B-0506 + B-0530 + B-0535 + peer-Otto
closed B-0528 in one ~30-minute drift-catch burst), rows accumulate
in three distinct status-open states. Before flipping `status: open →
closed`, classify which state the row is in:

| State | What it looks like | Right move |
|---|---|---|
| **Pure drift** | Every acceptance criterion verifiably shipped in a merged PR + (for tools) the file exists at the proposed path + (for CI) the gate.yml job exists. Only the row's status flag was never flipped. | Close row + add Resolution section mapping N/N acceptance criteria to shipped artifacts. |
| **Partial completion** | Tool ships but a content-judgment slice is undone (e.g., B-0517 Phase 1 cleanup of 130 long entries; B-0537 Slice A cleanup of 100 entries). The mechanization-half landed; the cleanup-half didn't. | Do **NOT** close. Either pick up the remaining slice this tick or leave open with a "Status: Phase X done; Phase Y pending" note. |
| **Multi-slice with sub-rows** | Work proceeded via decomposition into child rows (B-0NNN.M or new B-NNNN). Original umbrella may legitimately stay open while children land, or may close iff all children close. | Cross-check via `composes_with:` / `depends_on:` chain or by-PR-grep. Close umbrella iff all children closed. |

### The 30-second triage that distinguishes them

For each row's `## Acceptance` / `## Proposed solution` / `## Slice` /
`## Phase` section, run:

1. **Existence check** — does each named file/path exist on `origin/main`?
2. **Wiring check** — for CI gate items: `grep -E '<job-name>' .github/workflows/gate.yml`
3. **Slice check** — does the row name multiple phases/slices? If yes, verify each one independently.
4. **PR check** — `gh pr list --state merged --search '<B-NNNN>' --limit 5` shows what shipped.

If steps 1+2 pass for ALL named items and step 3 finds no undone
slice → pure drift; close. If step 3 finds an undone slice → partial;
leave open. If step 4 shows decomposition into child rows → multi-slice;
audit children first.

### Naive sweep is dangerous

A "for B in $(grep -l 'status: open'); do close; done" automation
would incorrectly close partial-completion rows (e.g., B-0517 / B-0537
where the tool ships but the cleanup slice is still 50 minutes of
content-judgment work away).

The audit-distinction MUST be per-row and per-acceptance-criterion,
not per-row-and-per-feat-PR. The naive shape: "did any `feat(B-NNNN)`
PR merge?" is correlated with full completion but does NOT imply it.

### Composes with claim-acquire + existence-check

The `claim acquire` step (per
[`.claude/rules/claim-acquire-before-worktree-work.md`](claim-acquire-before-worktree-work.md))
+ an **existence-check** on the row's proposed-mechanization path BEFORE
writing implementation is the corresponding pre-impl-time discipline.
Existence-check cost is ~3 seconds; saves the entire tick if the work
already shipped.

## Composes with

- B-0169 (decision-archaeology procedure)
- B-0170 (substrate-claim-checker validates the proof)
- B-0173 (hook authoring — mechanization candidate)
- [`.claude/rules/claim-acquire-before-worktree-work.md`](claim-acquire-before-worktree-work.md) (sibling pre-impl discipline)

## Full reasoning

CLAUDE.md "Backlog-item start gate" bullet, origin 2026-05-05.

Row-close gate added 2026-05-16 after Otto-CLI + Otto-Desktop closed
4 drift rows (B-0506 PR #3733; B-0530 PR #3737; B-0528 by peer; B-0535
PR #3742) in one ~30-min session burst. The audit-distinction surfaced
when scanning sibling P3 status-open rows revealed at least two
partial-completion candidates (B-0517 Phase 1 cleanup undone; B-0537
Slice A cleanup undone) that a naive sweep would have miscategorized.
Empirical anchor: shards
[`docs/hygiene-history/ticks/2026/05/16/0425Z.md`](../../docs/hygiene-history/ticks/2026/05/16/0425Z.md)
+ [`0444Z.md`](../../docs/hygiene-history/ticks/2026/05/16/0444Z.md).
