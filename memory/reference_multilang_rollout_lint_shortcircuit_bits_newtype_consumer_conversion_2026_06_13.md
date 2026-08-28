---
name: reference-multilang-rollout-lint-shortcircuit-bits-newtype-consumer-conversion
description: "Multi-language rollouts that skip local lint redden main one language at a time (the gate's lint job short-circuits); and generated newtypes (Bits) need explicit conversion at hand-written consumers per language"
metadata: 
  node_type: memory
  type: reference
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

From restoring main-green after the 6-language zeta-id codegen (#8087) + mixin
(#8115) rollouts (2026-06-13). Took 4 Otto PRs: #8113 (markdownlint), #8117 (Go),
#8120 (C#), #8122 (Rust + Python).

## Two reusable lessons

**1. The gate's `lint (F#, C#, Go, Python, Rust)` job short-circuits.** The steps
run sequentially (`lint-fsharp.ts` → `-csharp` → `-go` → `-python` → `-rust`); the
first non-zero step fails the job and SKIPS the rest. So when a multi-language
change lands broken, you see ONE language's red, fix it, and the next CI run
reveals the NEXT language's red — whack-a-mole across CI cycles. **When fixing a
multi-language lint red, run ALL the `src/Core.TypeScript/lint/lint-*.ts` scripts
locally first** (you have the toolchains: cargo/clippy, ruff/mypy, go/golangci,
dotnet format, fantomas) to find every language's breakage in one pass.
golangci-lint isn't installed by default — `GOBIN=/tmp/gobin go install
github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.12.2` (match CI version).

**2. Generated newtype vs hand-written consumer (the systematic bug).** The
zeta-id generator (`src/Core.TypeScript/zeta-id/zeta-id-generator.ts`) emits a
`Bits` newtype (Rust `struct Bits(pub u32)`, Go `type Bits uint32`) for the
`*Offset`/`*Width` constants in the `*.gen.*` files. Hand-written consumers
(`zeta_id.go`, `bit_layout.rs`) declare struct fields as the NATIVE int (`uint` /
`u32`). Go and Rust have no implicit numeric conversion → compile errors. Fix at
the **hand-written consumer** (`uint(VERSION_OFFSET)` / `VERSION_OFFSET.0`), NOT
the regenerated `.gen` file (overwritten on regen). Clippy `-D missing-docs` also
bit the generated `pub struct Bits` once it compiled — fixed by emitting a doc
comment in the generator + regenerating.

**Process recommendation (filed in #8122):** multi-language rollouts should run a
pre-merge local lint pass; the short-circuiting gate otherwise keeps main red for
multiple cycles.

Related: [[reference-pumpable-synccontext-must-own-and-restore-thread-context-or-caller-deadlocks]]
(also caught via running the real toolchain locally rather than trusting CI alone).
