# Claim - task-typescript-bun-runtime-hardening

- **Session ID:** codex/20260813-typescript-bun-runtime
- **Harness:** codex
- **Claimed at:** 2026-08-13T22:38:49Z
- **ETA:** 2026-08-14T00:38:49Z
- **Scope:** Run the repository TypeScript compiler under Bun directly instead of entering Node through the package executable shebang.
- **Durable target:** TypeScript lint launcher, package typecheck script, focused regression test, current scripting guidance, and a pull request
- **Platform mirror:** pending pull request

## Notes

Three local Node 24.16.0 arm64 crash reports fault in V8 garbage-collection workers, including one immediately after a successful Bun test and before `bun x tsc` produced diagnostics. The same checked-in TypeScript compiler succeeds when Bun executes `node_modules/typescript/bin/tsc` directly. This slice changes only that runtime boundary; it does not change TypeScript semantics, versions, dependencies, or diagnostic handling.
