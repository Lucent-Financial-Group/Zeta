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
   and tried-and-true; explicit-target searches only per
   `.claude/rules/references-upstreams-not-our-code-search-excludes.md`
   — e.g., `rg "pattern" references/upstreams/postgres/`, never
   unscoped `rg "pattern" .` which would runaway-scan the whole
   mirror tree). The watchlist + category index lives at
   `docs/UPSTREAM-LIST.md`; the synthesis notes at
   `references/notes/`.
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

## Composes with

- B-0169 (decision-archaeology procedure)
- B-0170 (substrate-claim-checker validates the proof)
- B-0173 (hook authoring — mechanization candidate)

## Full reasoning

CLAUDE.md "Backlog-item start gate" bullet, origin 2026-05-05.
