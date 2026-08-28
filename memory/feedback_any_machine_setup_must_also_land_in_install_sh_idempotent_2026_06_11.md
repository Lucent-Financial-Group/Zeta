---
name: machine-setup-must-land-in-install-sh
description: "Aaron 2026-06-11: any setup I do on his Mac must ALSO be captured idempotently/reproducibly in tools/setup/install.sh — never a one-off mutation."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron: "any setup you have to do for my Mac — make sure it's idempotent and reproducible in
install.sh too."

**Why:** a hand-installed tool is dark to every other machine and traveler (the dark-desktop rule
for machine state); GOVERNANCE §24's one-install-script consumed three ways (dev/CI/devcontainer)
only works if EVERY mutation lands there.

**How to apply:** before running any `brew install`/`dotnet tool install`/config mutation on the
host, add it to the matching `tools/setup/manifests/*` (or a common/*.sh step) in the same PR,
idempotently — then run install.sh rather than the raw command when practical. Related:
[[doctrine-word-retired-twice]] (register), the dark-desktop handoffs rule.
