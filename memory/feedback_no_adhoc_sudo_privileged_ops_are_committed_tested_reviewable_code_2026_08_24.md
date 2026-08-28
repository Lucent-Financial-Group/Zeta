---
name: no-adhoc-sudo-privileged-ops-are-committed-tested-code
description: "Aaron: anything raising a sudo prompt gets proper tested code around it — reviewable, testable, open-source-readable — never ad-hoc sudo at a call site"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2e864f45-aad5-4067-8d56-5f4c303f4f91
---

Aaron, 2026-08-24:

> "anything with sudo prompts we should have like proper tested code around them
> too, not just adhoc sudo, this way they can go through code review and be
> tested and open sourced so anyone can see the commands."

**Why:** it converts a discipline ("don't run ad-hoc sudo") into a structural
property. Four things follow, and the third is the one that is about trust rather
than hygiene:

1. **Reviewable** — the command that runs as root is a committed constant visible
   in a diff, not a string assembled at runtime.
2. **Testable** — behind an injectable door, exercisable without elevation.
3. **Auditable / open source** — anyone can read exactly what this software does
   with root.
4. **Byte-lockable** — a constant can carry a golden vector; an interpolated
   string cannot.

**This is the CLOSED COMMAND SET applied to privilege escalation** — Aaron's own
prior art, `.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md`: *"the
far side may **name** a command but can never **define** one."* As a sudo policy:
a caller invokes a **named, committed** privileged operation; nobody composes one
at a call site.

**The seam already exists in exactly one place:** `realSudoGateEffects()` in
`tools/setup/persona-keys/biometric.ts` — the privileged call behind a named
effects object with an injectable substitute, which is why that gate is testable
at all. The pattern is right and not universal.

**How to apply:** never add a bare `sudo` to a script or a call site. Route it
through the sanctioned seam, or say plainly that no seam covers it yet.

**Known scope limit, measured 2026-08-24:** ~15 live `sudo` sites in TS, plus
**174 across 37 `.sh` files** that eslint cannot see. A TS-only guarantee leaves a
hole that reads as coverage — state the gap rather than implying reach.

**Composes with, and is insufficient alone:** the binary must also be the real one
(absolute path, not `PATH`-resolved — P1 #14727). An absolute path to `sudo`
running an attacker-composed argv is still bad; a committed command invoked
through a shimmed `sudo` is also still bad.

Related: [[user-aaron-standing-authority-and-liability-split-2026-08-24]] — the
same day he granted broad access, which is *why* the structural guarantees matter
more, not less.
