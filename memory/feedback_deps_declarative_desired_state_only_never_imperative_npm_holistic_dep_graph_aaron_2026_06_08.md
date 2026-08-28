---
name: feedback-deps-declarative-desired-state-only-never-imperative-npm
description: All deps are declarative desired-state config (holistic dep graph); never imperative npm/package installs
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron, 2026-06-08: **"We would never `npm install` directly. We do our deps declaratively — everything is
desired-state config for deps so we can holistically track our dependency graph."**

**Why:** an imperative package command (`npm install`, `pip install`, `dotnet add`, `apt install` ad hoc) creates
a dependency node that lives *outside* the tracked graph — unpinned, unhashed, invisible to whole-graph queries.
Declarative desired-state config makes the *entire* dependency graph (the four language toolchains + tools like
the Octo CHIP-8 assembler + everything else) a single queryable, pinnable, hash-verifiable, diffable artifact.

**How to apply:** declare every dependency (including build tools / toolchains like Octo) in the desired-state
manifest, pinned + hash-checked. `install.sh` (Dejan, GOVERNANCE §24) *realizes/converges* the machine to that
declared state — it never runs an imperative package-install. New tool/lang/dep → add a declaration, never a
`<pkgmgr> install` line. This is desired-state-config / GitOps-style convergence applied to the whole dep graph.

**The deeper WHY (Aaron, 2026-06-08): closing over the OS to replace it.** "We are trying to close over the
operating system eventually so we can replace it — so tracking every dep is important for closing over
host→compiler→os." Tracking *every* dep declaratively builds the complete **dependency closure**; once the closure
spans host→compiler→OS, the whole stack is self-described and reproducible, which is the precondition for
*replacing* the host OS with our own. A single untracked imperative install breaks the closure — that's why
`npm install` is forbidden: it punches a hole in the very closure we're trying to complete.

**Anchors (Beacon):** Nix/Guix dependency *closures* + hermetic declarative builds; **Guix full-source
bootstrap** / **GNU Mes** / **live-bootstrap** / **stage0** (bootstrappable.org — shrink the trusted binary seed,
reproduce the toolchain from near-nothing); Ken Thompson, *Reflections on Trusting Trust* (1984 — why the
compiler→OS trust chain must be closed); unikernels (replacing the OS with a closed, app-specific stack).

Origin: the CHIP-8 Octo-toolchain spec (#7113 → corrected #7114). Relates to ace (the declarative package manager,
separate TS repo) and `docs/research/2026-06-08-chip8-octo-toolchain-via-ace-declarative-install.md`. Load-bearing
project vector, not just a deps convention.
