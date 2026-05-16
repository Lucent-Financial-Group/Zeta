# substrate-claim-checker eval-set fixtures

Frozen historical drift instances from the verify-then-claim discipline
memo's body table — the canonical eval-set for B-0170.

Each fixture is a small, self-contained markdown file that demonstrates
ONE drift sub-class as it actually surfaced in shipped substrate. The
fixtures are NOT pristine examples; they preserve enough of the original
PR's substance for the checker's behaviour against the historical case
to be reproducible regression coverage.

## Why on-disk fixtures (not inline test strings)

Inline test strings in `*.test.ts` files cover the synthetic-case axis
(does the checker work on toy inputs?). Frozen fixtures cover the
empirical-case axis (does the checker still catch the actual drift the
PR encountered?). Both axes matter; this directory holds the empirical
axis.

## Fixture index

| Sub-class | Fixture | Anchor PR / history | Expected finding |
|---|---|---|---|
| count drift | `count-drift-9-vs-15.md` | PR #1259 (`review(pr-1257-postmerge): verify-then-claim count drift (9→18+) frontmatter + body + MEMORY.md`) | "9 drift instances" claim vs 15-row table |
| existence drift | `existence-drift-missing-doc.md` | PR #1252 — verify-then-claim memo body table instance #8 (`future-domain memo references docs/courier-ferry-protocol.md` / doesn't exist) | backtick-quoted synthetic path resolves at no candidate root |
| path-form drift | `path-form-drift-bare-vs-qualified.md` | verify-then-claim taxonomy row 4 (`fully-qualified vs bare paths consistent across document`) | same on-disk file referenced as both `check-counts.ts` and `tools/substrate-claim-checker/check-counts.ts` |

Add a new row when a new fixture lands.

## Adding a new fixture

1. Pick a historical drift instance from the verify-then-claim memo's
   body table (canonical).
2. Create the smallest markdown file that reproduces the drift pattern.
   The fixture body should be runnable through the existing checker
   without external dependencies.
3. Document the anchor PR (or memo cite) inline at the top of the
   fixture as an HTML comment so the provenance survives.
4. Add a regression test in `fixtures.test.ts` that invokes the
   relevant `check-*.ts` and asserts on the finding count + shape.
5. Update the fixture index above.

## Composes with

- `tools/substrate-claim-checker/check-counts.ts` and siblings — the
  checkers the fixtures regress against
- B-0170 (the parent backlog row this directory contributes to)
- The verify-then-claim memo's body table (the canonical eval-set)
