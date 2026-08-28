---
name: Windows cross-platform via peer-agent Aaron-runs-on-Windows-PC (not CI matrix); bun+TS post-install migration must land BEFORE Windows peer-harness work begins so we don't add more .ps1 duplicates; pre-install .ps1 twins stay (bootstrap exception) + post-install = bun/TS only; Aaron Otto-215 directive; 2026-04-24
description: Aaron Otto-215: "we don't need nightlys, i told you once you had peer agent mode working i would run it on my windows machine to build out the windows cross platofrm stuff, you also should get the bun /ts done befroe then so we don't need so many pwsh duplactes just pre install pwsh and no post instll pwsh just bun/ts." Sets the strategy: Windows cross-platform support lands via Aaron driving a Codex or Claude Code harness on his Windows PC (Otto-86 "telephone line" arc), not via a GitHub Actions Windows matrix leg. Pre-requisite: bun+TS infra for post-install scripts is done first, eliminating post-install .ps1 duplicates. Pre-install .ps1 twins are the ONE exception (can't run bun/TS before bun is installed).
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## Directive sequence

Aaron Otto-215, responding to the nightly-cross-platform
workflow being mentioned:

> *"nightly-cross-platform.yml is this a github workflow?
> we don't need nightlys, i told you once you had peer
> agent mode working i would run it on my windows machine
> to build out the windows cross platofrm stuff, you also
> should get the bun /ts done befroe then so we don't
> need so many pwsh duplactes just pre install pwsh and
> no post instll pwsh just bun/ts."*

Parse:

1. **No nightly workflows.** `nightly-cross-platform.yml`
   already deleted via PR #359.
2. **Windows cross-platform NOT via CI matrix.** The plan
   is Aaron driving Codex / Claude Code on his Windows
   PC as a peer-agent harness (Otto-86 4-stage arc:
   single → multi-Claude → multi-harness-with-Codex →
   Windows-support-real-workload).
3. **Peer-agent mode is now validated.** PR #354 invited
   Codex review; PR #355 absorbed the 4-report return.
   Stage (c) of Otto-86 is complete. Aaron can proceed
   to Stage (d) whenever he wants.
4. **Bun+TS post-install migration is the prerequisite.**
   Before Aaron drives the Windows harness, Zeta's
   post-install scripts should migrate from `.sh`+`.ps1`
   twin-obligation to `bun`+TypeScript single-source.
   Eliminates needing to write/maintain both `.ps1` and
   `.sh` for every post-install tool.
5. **Pre-install `.ps1` twins STAY.** Bootstrap cannot
   run bun/TS before bun is installed (chicken-and-egg).
   Pre-install = the code that installs bun itself +
   any other preconditions.

## Scope mapping

### Pre-install (`tools/setup/` pre-bootstrap layer)

**Keep `.sh`+`.ps1` twins** per the existing FACTORY-
HYGIENE row #51 cross-platform parity audit. Reason:
these scripts run BEFORE bun/TS is available. Can't
collapse to bun+TS.

### Post-install (`tools/` general tooling layer)

**Migrate to bun+TypeScript single-source.** Specifically:

- Inventory current post-install `.sh` scripts under
  `tools/` that have `.ps1` twins.
- For each: port to TypeScript, exercise under bun on
  both Linux and macOS, DELETE both the `.sh` and `.ps1`
  (once bun+TS port is validated).
- Any thin-wrapper-over-CLI scripts that are legitimately
  shell-native can be exempted with an explicit comment
  + FACTORY-HYGIENE row amendment.

Eventual end state:

- `tools/setup/**` — `.sh` + `.ps1` twins (bootstrap)
- `tools/**/*.ts` executable via bun (post-install
  substrate)
- Nothing under `tools/` that's NOT in `setup/` has a
  `.ps1` twin

### Windows cross-platform via peer-agent

Once bun+TS migration is done, Aaron runs the
Claude-Code-CLI + Codex-CLI dual-harness on his
Windows PC per Otto-79 / Otto-86 / Otto-93 progression.
The Windows harness builds Windows-specific things that
Zeta needs (pwsh-equivalent pre-install scripts,
Windows-specific test runners if any, Windows-specific
CI configurations if any).

Factory-side: Otto's job is to make the bun+TS
migration complete so when Aaron's Windows harness
opens a PR, it doesn't inherit a tangled .sh/.ps1 mess.

## Status of the three prerequisite arcs

- **Peer-agent mode (Otto-86 stage c):** VALIDATED
  (PR #354 invited → PR #355 absorbed). Stage (c) done;
  Stage (d) is Aaron's move.
- **Bun+TS post-install migration:** NOT STARTED.
  Blocker for Windows work per Otto-215.
- **Windows cross-platform harness:** WAITING on
  bun+TS. No Otto action required until Aaron drives
  Stage (d).

## BACKLOG rows required (file next tick; not this tick)

Queue is saturated; filing a row now adds pressure. Next
tick when queue has drained (or at Aaron's explicit
direction), file:

1. P1 — Post-install `.sh`+`.ps1` → bun+TS migration.
   Inventory + port + delete cadence across `tools/`
   (excluding `tools/setup/`). Predicate: bun+TS is
   installable from Zeta's existing install pipeline.
2. P2 — Windows cross-platform via Aaron-on-Windows-PC
   peer-harness. Documents the Otto-86 Stage (d)
   handoff shape + what Otto supports before/after.

## Composition with prior memory

- **Otto-79 / Otto-86 / Otto-93** — peer-harness
  progression memories; this memory is the Stage-d
  concrete plan.
- **FACTORY-HYGIENE row #51** — cross-platform parity
  audit; this memory refines the audit's "enforce-
  when-baseline-green" path into "baseline becomes
  bun+TS post-install + .sh/.ps1 twins for pre-
  install only."
- **Otto-213 version-numbers-websearch memory** —
  parallel discipline: training data is stale; don't
  assume ubuntu-22.04 is latest. Migration work
  must WebSearch current bun + TS versions at
  implementation time.
- **PR #338 parser-tech directive (Otto-160)** —
  related long-term choice: bun+TS is the long-term
  factory direction, same-pattern-across-languages.

## What this memory does NOT authorize

- Does NOT authorize deleting `tools/setup/*.ps1` files.
  Pre-install .ps1 twins STAY per Aaron's explicit
  "pre install pwsh" clause.
- Does NOT authorize starting bun+TS migration this
  tick. Queue-saturation discipline + the bun-infra-
  not-landed-yet blocker both apply.
- Does NOT authorize Otto opening a Windows-cross-
  platform PR. That's Aaron's Stage (d) move per
  Otto-86.
- Does NOT authorize filing the two BACKLOG rows
  this tick (queue pressure). File next tick when
  queue has drained.

## Direct Aaron quote to preserve

> *"i told you once you had peer agent mode working i
> would run it on my windows machine to build out the
> windows cross platofrm stuff, you also should get
> the bun /ts done befroe then so we don't need so many
> pwsh duplactes just pre install pwsh and no post
> instll pwsh just bun/ts."*

Future Otto: this is Aaron's concrete Windows strategy +
the bun+TS prerequisite. Don't re-propose adding a
Windows CI matrix leg.
