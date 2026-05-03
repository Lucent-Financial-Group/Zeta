# substrate-claim-checker

V0 of the substrate-claim-checker per the verify-then-claim discipline
memo (`memory/feedback_verify_then_claim_discipline_dominant_failure_mode_substrate_authoring_otto_2026_05_03.md`).

Catches one class of drift today: **count drift** between narrative
claims (e.g. "18+ drift instances", "13-row table", "5 procedure
skills") and the actual count of structured rows the claims reference.

## Usage

```bash
bun tools/substrate-claim-checker/check-counts.ts <file>
bun tools/substrate-claim-checker/check-counts.ts memory/feedback_*.md
```

Exit code 0 = no drift detected. Exit code 1 = drift detected (or
input error).

## What it does (v0)

- Scans narrative for patterns: `N <noun>` where `<noun>` is one of
  drift instances / rows / items / procedure skills / named-persona
  experts / tools / sub-classes.
- Counts `^| ... |$` data rows in the nearest markdown table within
  50 lines below the claim.
- Reports drift if claimed N differs from actual. **Special case for `N+` minimum-count claims:** drift fires only when `actual < N` (the `+` suffix indicates "at least N", so an undercount is drift but an overcount is not).

## Known v0 limitations

- **Nearest-table heuristic**: when a memo has multiple tables, the
  tool grabs the FIRST table below the claim. If a claim like "4
  named-persona experts" is followed by a procedure-skills table
  (7 rows) and then an experts table (4 rows), the tool flags the
  first as drift incorrectly. v1 should noun-match to the right
  table.
- **Rhetorical numbers**: `"100 rows"` in `"you can close 100 rows
  without invoking..."` is rhetorical, not a count claim. v0 flags
  these as false positives. v1 should distinguish summary-claim
  from rhetorical-illustration via context analysis.
- **Lists not counted**: only markdown-table data rows are counted.
  Bulleted lists with N items aren't counted yet (v1 candidate).
- **Top-level tables only**: lines must start with `|` in column 1 to
  be recognized as table rows. Indented tables (inside nested lists
  or blockquotes) aren't recognized yet. v1 candidate: relax the
  leading-anchor in `findTables` from `^\|` to `^\s*\|`.

## What this does NOT do (v0)

- **Existence drift** (file/dir/tool claimed to exist; doesn't) — v1
- **Semantic-equivalence drift** (command substitution claims) — v1
- **Empirical-output drift** (run-the-command-and-compare) — v1
- **Convention drift** (recommended pattern doesn't match canonical) — v1
- **Path-form drift** (fully-qualified vs bare paths inconsistent) — v1
- **Self-recursive drift** (the memo about drift contains its own drift) — v1

## Composes with

- `memory/feedback_verify_then_claim_discipline_dominant_failure_mode_substrate_authoring_otto_2026_05_03.md` —
  the discipline this tool mechanizes
- `memory/feedback_skills_as_carved_sentences_knowledge_in_docs_datavault_2_0_pattern_aaron_2026_05_03.md` —
  rule 2 (no dynamic commands in skills; use TS files); this tool
  IS one of the TS files for that purpose
- B-0170 (the backlog row this tool implements; see
  `docs/backlog/P1/B-0170-substrate-claim-checker-ts-tool-aaron-2026-05-03.md`)

## Eval set (drift instances catalogued in the verify-then-claim memo)

The verify-then-claim memo
(`memory/feedback_verify_then_claim_discipline_dominant_failure_mode_substrate_authoring_otto_2026_05_03.md`)
catalogues historical drift instances across 9+ PRs as the empirical
eval-set; the table-row count in that memo's body is the canonical
count (it grows with each new instance caught). v0 catches the count-drift sub-class
specifically; instances marked count-drift in the memo's
"Recurring sub-classes" section are this tool's primary regression
suite.

## Hooks integration (planned, not v0)

Per the verify-then-claim memo's mechanization-path section:

- **pre-commit** hook: validate staged-file content (memos, docs)
- **commit-msg** hook: validate the commit message itself
- **CI check**: validate PR descriptions on host

These will land in subsequent PRs once the tool's check-types are
mature enough to trust as gates.
