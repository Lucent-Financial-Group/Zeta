# Claim - task-zetaid-compare-reads-vectors

- **Session ID:** grok-20260814T151944Z-7f2a
- **Harness:** grok
- **Claimed at:** 2026-08-14T15:19:44Z
- **ETA:** 2026-08-14T16:30:00Z
- **Scope:** Pin zeta-id `compare.ts` to `vectors.yaml` so stale-but-consistent oracle outputs fail.
- **Durable target:** `tests/cross-verification/zeta-id/compare.ts`, `tests/cross-verification/zeta-id/README.md` Gap 1, `docs/BUGS.md` ZetaId row
- **Platform mirror:** (none — git-native claim; work is the documented Gap 1 in the zeta-id README)

## Notes

`tests/cross-verification/zeta-id/README.md` (verified 2026-08-11) records that
`compare.ts` compares committed `*-output.json` files against each other and
never opens `vectors.yaml`. A mutually consistent but fully stale set of
outputs therefore passes. The yaml primitive already pins fixture `expected`
in its `compare.ts`; this claim copies that shape onto zeta-id.

Edge vectors (`all-zero`, `max-128`, `overflow-reject-1`, `lenient-alias-1`)
already live in `vectors.yaml` and are replayed by the per-language oracles.
This slice does not add vectors — it makes the shared fixture the compare
gate's source of truth.
