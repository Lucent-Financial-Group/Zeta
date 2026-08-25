# Claim - bug-rust-lockfile-lint-mutation

- **Session ID:** 019e9b66-4ea9-75e3-9452-c5816b3e945d-rust-lock
- **Harness:** codex
- **Claimed at:** 2026-08-25T07:33:35Z
- **ETA:** 2026-08-25T09:33:35Z
- **Scope:** Stop Rust lint from silently rewriting three stale transitive lockfiles.
- **Durable target:** `src/Core.TypeScript/lint/lint-rust.ts` and affected `src/Core.Rust.*/Cargo.lock` files
- **Platform mirror:** none

## Notes

Discovered while running the required preflight for the ZetaDB retention kernel.
The Merkle crate pins `xxhash-rust` 0.8.18, while three dependent lockfiles still
name 0.8.10; clippy currently updates them instead of failing closed.
