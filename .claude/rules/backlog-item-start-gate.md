# Backlog-item start gate — proof required before starting

Carved sentence:

> Proof of prior-art-search + dependency-restructure is REQUIRED
> before starting any backlog item. Update the row with proof;
> then start.

## Operational content

Before beginning work on any `docs/backlog/P*/B-*.md` row,
complete a checklist directly on the row body:

0. **Substrate-drift discriminator** (~3 seconds; catches the
   "row says open but the work already shipped" pattern):
   - Read the row's **Acceptance** / **Proposed mechanization** /
     **Scope** sections (NOT `composes_with:` cross-refs — those
     are false-positive prone per the empirical catalog in
     [B-0553](../../docs/backlog/P3/B-0553-audit-backlog-status-drift-detection-2026-05-16.md))
   - Existence-check every primary-artifact path on disk
   - **If all primary artifacts exist AND every acceptance bullet
     has a corresponding merged PR** → row is drift, not work.
     Release the claim, open a close-row PR (`status: open` → `closed`
     + Resolution section + `BACKLOG_WRITE_FORCE=1 bun
     tools/backlog/generate-index.ts` regen). Skip the remaining
     gate steps.
   - **If artifacts exist but some acceptance bullets are
     pending** → row is in-progress, NOT drift. Leave it open,
     proceed with normal gate steps. (Canonical example: B-0537 —
     `audit-memory-index-entry-lengths.ts` shipped, but the row's
     "cleanup of 100 long entries + CI gate at --max 150" had
     not. Closing it would have hidden in-progress work.)
   - **If artifacts missing** → proceed with the gate steps below.

   Full reasoning + 4-catch empirical evidence + section-aware
   parsing rationale in
   [`memory/feedback_substrate_drift_catch_pattern_claim_acquire_plus_existence_check_otto_cli_2026_05_16.md`](../../memory/feedback_substrate_drift_catch_pattern_claim_acquire_plus_existence_check_otto_cli_2026_05_16.md).

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

## Composes with

- B-0169 (decision-archaeology procedure)
- B-0170 (substrate-claim-checker validates the proof)
- B-0173 (hook authoring — mechanization candidate)
- B-0553 (substrate-drift auditor — mechanizes step 0 across all open rows)
- [`memory/feedback_substrate_drift_catch_pattern_claim_acquire_plus_existence_check_otto_cli_2026_05_16.md`](../../memory/feedback_substrate_drift_catch_pattern_claim_acquire_plus_existence_check_otto_cli_2026_05_16.md) — step 0 origin substrate
- [`.claude/rules/wake-time-substrate.md`](wake-time-substrate.md) — the discipline this rule extension lands

## Full reasoning

CLAUDE.md "Backlog-item start gate" bullet, origin 2026-05-05.
