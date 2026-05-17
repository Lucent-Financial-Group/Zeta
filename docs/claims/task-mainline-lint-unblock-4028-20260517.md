# Claim - task-mainline-lint-unblock-4028-20260517

- **Session ID:** codex/20260517-0256-9f4c
- **Harness:** codex
- **Claimed at:** 2026-05-17T02:56:30Z
- **ETA:** 2026-05-17T04:00:00Z
- **Scope:** Fix the inherited mainline lint blockers keeping PR #4028 in draft: tick-shard relative links in the 0221Z shard and TypeScript errors in the Amazon order extractor.
- **Durable target:** `docs/hygiene-history/ticks/2026/05/17/0221Z.md`, `tools/inventory/amazon-orders-extract.ts`, PR #4028 unblock.
- **Platform mirror:** https://github.com/Lucent-Financial-Group/Zeta/pull/4028

## Notes

PR #4028 only changes `docs/hygiene-history/ticks/2026/05/16/0758Z.md`.
Its required CI currently fails on inherited paths outside that diff:
`lint (tick-shard relative-paths)` for the 0221Z shard and
`lint (tsc tools)` for the Amazon extractor. This claim intentionally
keeps the fix separate from the replacement tally PR.
