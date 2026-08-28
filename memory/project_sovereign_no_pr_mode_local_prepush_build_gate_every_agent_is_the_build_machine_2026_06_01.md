---
name: sovereign-no-pr-mode-local-prepush-build-gate-every-agent-is-the-build-machine
description: In sovereign/no-PR (folders-on-main) mode there is no CI gate — local build is the only thing stopping bad code reaching main; build-before-push is mandatory and likely mechanized via local pre-push hooks; every agent IS the build machine.
metadata: 
  node_type: memory
  type: project
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-06-01 (verbatim): "FYI when we get rid of PRs there is no gate only
local build stop from going in main we will likley need local branch hooks push
hooks that foce a build so you can't say let the buiold machine do it, you are
the buiold macine lol everyone is."

**The constraint:** in the **sovereign / no-PR mode** (folders-on-main, no
branches, no PR — the speed+freedom transport per [[dual-mode-economic-strategy-sovereign-freedom-corporate-leash-redistribute]] + B-0890/B-0890.1), there is **no CI gate**. The only thing stopping broken code from reaching `main` is the **local build**. So:

- **Build-before-push is MANDATORY**, not optional — no remote build machine to
  defer to. "Let the build machine do it" is invalid; **you (the agent) are the
  build machine. Everyone is.**
- **Likely mechanization:** local **pre-push git hooks** (and/or pre-commit /
  branch hooks) that **force a full build (+ tests + lint)** before anything
  lands on main. (Per `rule-0-no-sh-files` + harness-hooks-suffice: prefer the
  build-runner be TS/Bun-driven where the hook can be; the git pre-push hook
  itself is install-graph glue.)

**Why:** the corporate/leash mode keeps the PR + CI gate (certifiable, money-
making); the sovereign mode trades the gate for speed/freedom, so the gate moves
**into each agent locally**. The build discipline doesn't relax — it
**relocates** from the central CI to every node.

**How to apply (future-Otto):** the worktree discipline I already practice —
`dotnet build` + `dotnet test` + `cargo clippy`/`fmt`/`test` + `tsc`/`prettier`/
`bun test` **before every push** — IS this requirement, already embodied. In
sovereign mode it stops being a courtesy and becomes the only gate. Never push
to main without a green local full-build of the touched languages.

**Status:** FYI / future-substrate (when PRs are dropped). Pre-push-build-hook
mechanization is the likely-needed primitive. Composes with: dual-mode strategy,
B-0890 (folders-not-branches), observe.ts loop (the loop that would run the local
build), `rule-0-no-sh-files`, the assert-don't-skip shield rule (the local build
IS the shield in sovereign mode — a skipped/false-green local build is worse than
no gate because it reads as covered).
