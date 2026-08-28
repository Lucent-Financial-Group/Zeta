---
name: feedback-post-install-is-source-shell-only-preruntime-or-dev-os
description: "Aaron's shell-vs-source rule — post-install logic is code (TS), not shell; shell only pre-runtime or for direct dev/OS interface"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron, 2026-06-13 (verbatim): *"everything post install.sh should be source —
our code should be code not shell script except where it's necessary to go to
the developer or os."* Also: *"if it's pre install.sh that's fine"* and (re a CI
lint wrapper) *"why is this a sh file?"*

**The rule:** shell scripts are retained ONLY where the script runs **before our
runtime (Bun) exists** (pre-install / first-boot bootstrap) OR where it must
**interface directly with the developer or the OS** (install.sh, OS-level
installer, dev-cluster / host-service wrappers). **Everything post-install — our
actual logic, including CI orchestration — is source (TS/code), not shell.**

**Why:** this is the bash-retirement / TS-migration discipline stated as a
principle. A shell script that merely orchestrates native toolchains (e.g.
`go fmt` / `golangci-lint` / `uv`+`ruff`+`mypy`) in CI is post-install logic that
Bun can spawn — so it must be `.ts`. The retained-shell allowlist categories
(setup/bootstrap, installer, dev-cluster wrappers, host-service wrappers, kiro
loop wrapper, launchd) ARE the "necessary to go to the developer or OS" cases;
nothing else qualifies.

**How to apply:** when a `.sh` is added, ask "is this pre-runtime bootstrap or a
direct dev/OS surface?" If no → it should be `.ts`, not allowlisted. Allowlisting
a post-install `.sh` (as I did for `lint-go-python.sh` in #8065) is a stopgap to
un-red main, not the fix — the fix is the port. Live instance: `lint-go-python.sh`
(#8060) is CI lint orchestration → being converted to `.ts` (Lior, 2026-06-13).

Encoded in `src/Core.TypeScript/hygiene/check-bash-retirement-inventory.ts` (the
guard). Related: [[feedback-glass-halo-means-transparent-consented-not-private-aaron-2026-06-13]] (sibling same-day correction style).
