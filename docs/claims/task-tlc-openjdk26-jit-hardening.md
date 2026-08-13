# Claim - task-tlc-openjdk26-jit-hardening

- **Session ID:** codex/20260813-vera
- **Harness:** codex
- **Claimed at:** 2026-08-13T21:05:22Z
- **ETA:** 2026-08-13T23:05:22Z
- **Scope:** Prevent OpenJDK 26 native compiler crashes from turning completed TLC model checks into false .NET test failures.
- **Durable target:** TLC process policy, focused tests, and a pull request
- **Platform mirror:** pending pull request

## Notes

The local macOS/aarch64 JVM crashed in C2 `Compile::remove_speculative_types` after TLC completed a valid model. The existing heap, serialization, and SerialGC policy does not constrain that compiler path. This claim excludes TLA+ model changes and browser/database behavior.
