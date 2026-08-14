# Claim - task-zetaid-compare-reads-mumps

- **Session ID:** grok-20260814T160244Z-3c91
- **Harness:** grok
- **Claimed at:** 2026-08-14T16:02:44Z
- **ETA:** 2026-08-14T17:00:00Z
- **Scope:** Close zeta-id README Gap 2 — load `mumps-output.json` in `compare.ts` and pin it to `vectors.yaml`.
- **Durable target:** `tests/cross-verification/zeta-id/compare.ts`, `mumps-output.json`, README Gap 2
- **Platform mirror:** follow-on to merged PR #10614 (Gap 1)

## Notes

`mumps-output.json` is currently unread. It has 13 keys: 12 packed vectors that
already match the fixture, one stale `workitem-v1-standard` key, and it lacks
the four edge vectors (`all-zero`, `max-128`, `overflow-reject-1`,
`lenient-alias-1`). This slice loads the file, fails closed if it is missing,
and brings the committed output to the same 16-vector set as the other oracles.
The `.m` packer stays hand-regenerated; forget-to-regen now turns the gate red.
