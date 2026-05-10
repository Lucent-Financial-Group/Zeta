# Playwright mutation drain log

Append-only JSONL audit trail for every GitHub UI mutation executed via
`tools/playwright/github-ui/mutate.ts`.

Each line in `log.jsonl` is a JSON object conforming to `DrainLogEntry`
from `tools/playwright/github-ui/drain-log.ts`.

## Status values

- `applied` — mutation was executed and is not yet reverted.
- `reverted` — a revert event was appended for this entry id; the original
  `applied` line is preserved for audit purposes.

## Revert semantics

Reverts are recorded by appending a new line with the same `id` as the
original entry and `status: "reverted"`. The file is never edited in place.
`listPending()` computes the effective status by taking the latest record
per id.
