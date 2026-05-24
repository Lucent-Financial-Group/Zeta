# Playwright mutation drain log

Append-only JSONL audit trail for every GitHub UI mutation executed via
`tools/playwright/github-ui/mutate.ts`.

Each line in `log.jsonl` is a JSON object conforming to `DrainLogEntry`
from `tools/playwright/github-ui/drain-log.ts`.

## Status values

- `applied` — mutation was executed and is not yet reverted.
- `indeterminate` — a revert attempt crossed the boundary where the inverse
  mutation might have succeeded, but no final `reverted` marker exists yet;
  retry only after manual verification of the target surface.
- `reverted` — a revert event was appended for this entry id; the original
  `applied` line is preserved for audit purposes.

## Revert semantics

Reverts first append an `indeterminate` line with the same `id` as the original
entry, then execute the inverse mutation, then append a final `reverted` line.
The file is never edited in place. `listPending()` computes the effective
status by taking the latest record per id.
