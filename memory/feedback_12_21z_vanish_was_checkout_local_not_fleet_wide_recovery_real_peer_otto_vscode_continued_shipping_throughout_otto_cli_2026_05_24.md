---
name: 12-21z-vanish-was-checkout-local-not-fleet-wide-recovery-real-peer-otto-vscode-continued-shipping-otto-cli-2026-05-24
description: "Empirical correction to the 12:26Z \"ZETA REPO CONTENTS VANISHED\" memo — the event was CHECKOUT-LOCAL, not fleet-wide; recovery is real (full repo present at 22:08Z); peer Otto-VSCode bg-worker continued shipping PRs throughout the window (PRs"
metadata: 
  node_type: memory
  type: project
  created: 2026-05-24T22:08Z
  originSessionId: d062d072-87b0-4d13-89a2-bbf0254e53b1
---

# Empirical correction — 12:21Z "vanish" was checkout-local, not fleet-wide

## Observation at 22:08Z UTC 2026-05-24

Fresh autonomous-loop cold-boot in `/Users/acehack/Documents/src/repos/Zeta/`:

- **`.git` operable** — `git rev-parse --git-dir` returns `.git`
- **All major substrate present** — `AGENTS.md`, `CLAUDE.md`, `GOVERNANCE.md`,
  `docs/`, `.git/`, `.github/`, `tools/`, `memory/` (verified via `ls -la`;
  91 root entries; dir mtime `May 24 16:43`)
- **`origin/main` advanced through `2f5981168` (shard 2033Z)** — 5+ commits
  beyond this checkout's HEAD at `5fdf91359 docs(archive)`
- **GraphQL Normal tier** (4288/5000, 44min to reset); REST 4922/5000
- **0 stuck git pack/maintenance/repack procs**

## What this empirically refutes

The 12:26Z MEMORY.md entry (Otto-CLI, session `646446c7`):

> *"ZETA REPO CONTENTS VANISHED at ~2026-05-24T12:21Z — only `.claude/` +
> `.kiro/` remain ... `ls /Users/acehack/Documents/src/repos/Zeta/` returns
> only `.claude/` + `.kiro/` subdirs"*

That observation was empirically accurate at the time it was made (a tick
observed only `.claude/` + `.kiro/` in the directory listing). But the
framing's scope language ("repo contents vanished") implied a broader event
than empirically held. Two empirical anchors refine the scope:

**Anchor 1 — recovery on this checkout**: 22:08Z `ls` shows full
substrate present. The 12:21Z state did not persist; whatever caused
the local-listing anomaly cleared by some later tick (the anchor for
the transition itself isn't in user-scope memory yet — peer ticks
between then and now may have re-cloned, re-checked-out, or the
12:21Z reading itself may have been a transient listing failure that
the cold-boot tick observed without retry).

**Anchor 2 — fleet-wide continuity sustained**: peer Otto-VSCode
bg-worker continued shipping PRs throughout the window:

| Time (UTC) | PR | Subject |
|---|---|---|
| 18:04Z | #4848 | shard — PR #4799 merged + Lior-lane runtime-script audit |
| 19:02Z | #4853 | shard — Lior-lane fleet 38→41 PRs + lane discipline re-applied |
| 20:33Z | #4869 | shard — Lior-lane fleet 41→53 PRs + lane discipline sustained |
| (between) | #4851 | docs(archive) — preserve recently merged PRs |
| (between) | #4871 | fix(lint) — remove 5 stray gitlinks from main introduced by #4851 |

These are all merged on `origin/main` and visible via `git log origin/main`
right now. Peer Otto-VSCode (different surface, different checkout
location, separate bg-worker process) was unaffected by whatever the
12:21Z anomaly was on the Otto-CLI checkout.

## Refined hypothesis space

Per `default-to-both`, hold both readings open without collapse:

1. **Checkout-local transient (most likely)**: the 12:21Z `ls` reading
   was empirically observed but the cause was localized to the Otto-CLI
   checkout path — possibly a transient filesystem event, a directory
   listing failure, a momentary mount issue, or peer-agent activity in
   the same root that briefly hid contents during a rename/move
   operation. The fleet kept working because peer surfaces operate on
   different checkouts.
2. **Maintainer-side intentional cleanup (low probability)**: the
   12:21Z memo's most-likely-per-Occam reading. Less compatible with
   the 22:08Z full-recovery state (a maintainer cleanup would more
   likely leave the checkout in a known-clean post-cleanup state, not
   re-populated to pre-event contents).
3. **The 12:21Z `ls` was sampling-incomplete**: directory listing
   commands under heavy peer activity can hit transient races. The
   tick that observed it didn't retry. The reading was real-at-that-
   moment but didn't represent stable state.

The 12:26Z memo's substrate-honest disposition ("do NOT attempt
restoration, defer to maintainer surface") was correct given the
information available; this memo updates the picture without
deleting the original entry (per retraction-native discipline +
honor-those-that-came-before — the prior observation stays as
provenance).

## Operational implications for future-Otto

- **The 0-proc-doesn't-prove-recovery discipline still holds** (the
  12:26Z addendum: "verify `git rev-parse --git-dir` succeeds first").
  Adding now: ALSO retry `ls` once before classifying directory-empty
  states as substantive — transient listing failures are real.
- **Peer-surface continuity is a strong sanity check** during local
  infrastructure events. If `gh pr list --state merged --limit 5`
  shows recent PRs landing on origin/main, the fleet is healthy and
  the local observation is checkout-scoped.
- **User-scope memory remains the right write surface** for
  observations made on a contaminated checkout (here: Otto-CLI's
  cold-boot landed on `lior-pr-preservation-rebased` with massive
  peer-Lior WIP; substantive in-place commit would contaminate Lior's
  lane). User-scope survives both dotgit-saturation AND checkout-
  local events AND wrong-lane states.

## Disposition

This memo lands at user-scope only. No in-repo write attempted (would
require isolated-worktree + lane-switch + post-creation-guard, all of
which add anchor-noise to a well-documented arc when peer Otto-VSCode
bg-worker is the operative shipping surface and has already covered
the post-vanish operational state via three substantive shards on
origin/main).

Sentinel re-armed at session start (`ff7dee7e`) per catch-43.

## Composes with

- 12:26Z "ZETA REPO CONTENTS VANISHED" memo (the original observation
  this refines, not replaces)
- 12:08Z "13TH ANCHOR" memo (the dotgit-saturation arc framing that
  contextualizes the vanish as one event in a multi-anchor day)
- `refresh-world-model-poll-pr-gate.md` dotgit-saturation tier table
  (the broader local-`.git/` constraint framing)
- `claim-acquire-before-worktree-work.md` saturation-ceiling
  sub-cases (lane-discipline patterns under contaminated-root states)
- `holding-without-named-dependency-is-standing-by-failure.md` —
  this tick is brief-ack #1 with named bounded reason (lane
  contamination + peer-surface continuity verified); not standing-by
  failure mode
