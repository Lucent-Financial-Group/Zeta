# Claim - codex-b0213-receipt-optional-fields-fix-20260526

- **Session ID:** codex/20260526T2306Z
- **Harness:** codex
- **Claimed at:** 2026-05-26T23:06:00Z
- **ETA:** 2026-05-26T23:16:00Z
- **Scope:** Fix B-0213 local-broadcast receipt optional fields after PR #5344 merged without the post-merge tsc fix.
- **Durable target:** `tools/broadcast-local/schema.ts`, `tools/broadcast-local/schema.test.ts`
- **Platform mirror:** https://github.com/Lucent-Financial-Group/Zeta/pull/5344

## Notes

PR #5344 merged at stale head `802bd5935`; background-service commit `40db4be37`
contains the deterministic `exactOptionalPropertyTypes` fix but is not on
`origin/main`.
