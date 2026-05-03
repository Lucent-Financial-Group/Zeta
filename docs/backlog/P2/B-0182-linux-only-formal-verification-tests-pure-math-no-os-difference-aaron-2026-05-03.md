---
id: B-0182
priority: P2
status: open
title: Filter formal-verification tests to standard Linux only — TLC + Alloy + Lean are pure-math computation; no OS-specific behavior
tier: ci-architecture
effort: M
ask: Aaron 2026-05-03 — *"we don't have to run formal verifical on all the oses, we can run that just on linux it does not have differents between OS like scirpt and code that touch the enviroment. just the standard linux too don't need it to run on slim"*
created: 2026-05-03
last_updated: 2026-05-03
depends_on: []
composes_with: [docs/research/2026-05-03-math-proofs-honest-assessment.md, B-0017]
tags: [ci, formal-verification, tlc, alloy, lean, cost-optimization, linux-only, tests]
---

# Filter formal-verification tests to standard Linux only

## Problem

Currently the F# test suite runs the same formal-verification tests on:

- **gate.yml**: `macos-26`, `ubuntu-24.04`, `ubuntu-24.04-arm` (every PR)
- **low-memory.yml**: `ubuntu-slim` (every push to main + nightly)

But formal verification (TLC, Alloy, Lean) is pure-math computation:
no OS-specific behavior, no environment touching, no script differences.
Running TLC on macOS produces the same result as Linux. Running Alloy
on ARM produces the same result as x64. The duplication wastes CI
time + cost.

## Aaron 2026-05-03 verbatim

> *"we don't have to run formal verifical on all the oses, we can run
> that just on linux it does not have differents between OS like scirpt
> and code that touch the enviroment. just the standard linux too
> don't need it to run on slim"*

## Scope

Filter to standard `ubuntu-24.04` only. Skip on:

- `macos-26` (gate.yml)
- `ubuntu-24.04-arm` (gate.yml)
- `windows-2025` / `windows-11-arm` (gate.yml post-merge)
- `ubuntu-slim` (low-memory.yml)

Affected test classes:

- `tests/Tests.FSharp/Formal/Tlc.Runner.Tests.fs` — 9 [Fact] entries
- `tests/Tests.FSharp/Formal/Alloy.Runner.Tests.fs` — 3 [Fact] entries
- (Future) Lean integration tests if any are added at the F# layer

## Implementation options

### Option A — Runtime OS check in `toolchainReady()`

Cheapest. Add `Environment.OSVersion.Platform` check to the existing
`toolchainReady()` helpers; return false on non-Linux so tests
silent-no-op (matches existing skip-on-missing-toolchain pattern).

Pros: minimal code change; consistent with existing skip discipline
(no java → silent skip).
Cons: macOS dev local runs would silent-skip even though TLC works
locally (regression vs current behavior; devs lose local validation).

Mitigation: gate the OS check on `CI=true` env var so dev laptops
still run them.

### Option B — Custom `[<LinuxOnly>]` xunit attribute

More structured. Custom xunit `Theory`/`Fact` decorator that skips
the test on non-Linux runners.

Pros: explicit intent at each test; easy to grep for skipped tests.
Cons: more code; needs xunit collection-attribute machinery.

### Option C — Separate test project `Tests.FSharp.Formal`

Most invasive. Move TLC + Alloy tests to a dedicated project that
the build matrix only includes on Linux.

Pros: cleanest separation; doesn't run formal-verification build
on macOS/ARM at all (saves more time than just skipping).
Cons: substantial refactor; affects build matrix.

**Recommendation**: Option A with `CI=true` env-gate. Smallest change;
preserves dev-local validation.

## Composes with

- `docs/research/2026-05-03-math-proofs-honest-assessment.md`
  (the assessment doc; CI cost is implicit context for "runs in CI"
  A-grade gating)
- B-0017 Operational Resonance Dashboard (when CI cost becomes a
  visible dashboard metric)

## Effort estimate

M (1-2 days):
- Half day: pick Option, implement
- Half day: verify CI matrix shape unchanged (dotnet test still runs;
  just specific tests skip); confirm dev local still validates
- Doc updates: math-proofs assessment B1/A4 sections + low-memory.yml
  + gate.yml comments
