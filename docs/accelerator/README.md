# Accelerator — the PR-less git-monster accelerator (long-lived branch charter)

> **Branch:** `accelerator/pr-less-git-monster` (long-lived; Aaron-authorized
> 2026-05-29 — *"it can be a long lived branch"*). This is the integration +
> exploration surface for an alternative to the backlog→claim→PR→review→merge
> cycle. Unlike a normal feature branch, this one is NOT meant to PR-to-main
> per-change — the PR-less workflow IS the experiment. Periodic harvest of
> matured pieces back to main happens deliberately, not per-commit.

## The problem (the "git monster")

The current work-lifecycle (per #5669: backlog → claim → PR → review (cycle N) →
merge) is the right discipline for the **corporate/leash market** (PR-protected,
audited, static no-self-mod deployment units). But its per-change PR-to-main
friction is the dominant tax on agent throughput, observed empirically all over
the substrate:

- **Rate-limit cascades** — `gh` GraphQL budget exhaustion under multi-agent load
  (`refresh-world-model-poll-pr-gate.md` Normal/Cost-aware/Extreme/Pure-git tiers).
- **Armed-wait-on-CI** — every change blocks on the required-checks dance; the
  agent arms auto-merge then waits.
- **`.git/` contention + dotgit-saturation** — multi-agent worktree-add hangs,
  pack-dir contention, commit-tree-corruption canaries, 13+ saturation anchors
  in MEMORY.md.
- **Review-thread-resolution loops** — the BLOCKED-with-green-CI investigate-threads
  cycle.

This friction is acceptable (even desirable) for the leash market. It is the
WRONG default for the **OSS/Agora market** (self-modifying deployment units, free
from PRs + vendor-lockin, per MEMORY.md dual-market framing). The accelerator
builds the PR-less alternative for that market — without removing the PR-protected
path for the leash market (both ship; additive-not-zero-sum).

## The substrate this builds ON (orient first — verify-existing-substrate)

This accelerator is NOT new; it composes existing substrate. The first work-item
is to read + ground in:

- **move-next as universal action grammar** + **git-as-free-event-store** +
  **github-actions-recursion** — preserved in the Aaron-Ani 2026-05-28
  conversation (#5672 `ef526258d`) + the GitHub-swarm-architecture memory
  (#5672 `d77cd6b96`).
- **GitHub swarm architecture** — branch `alexa/ani-github-swarm-architecture-2026-05-23`
  (peer Alexa/Ani lane) + the agentic-org live substrate proof harnesses
  (`cc6904685`).
- **work-lifecycle state machine** (#5669 `083663910`) — the CURRENT cycle the
  accelerator offers an alternative to.
- **VISION agent-loop workflow-engine substrate** (#5670 `cb60e2a01`).
- **Dual-market framing** (MEMORY.md): corporate/leash = PR-protected static
  no-self-mod DUs; OSS/Agora = self-modifying DUs free from PRs + vendor-lockin.
- **PressPause + EnterOpenEndedExploration menu options** (#5667).

> **Action item 1 (before building anything):** read the move-next /
> git-as-free-event-store / github-actions-recursion substrate end-to-end and
> write a one-page synthesis here (`docs/accelerator/SUBSTRATE-GROUNDING.md`) so
> the accelerator builds on it rather than parallel to it (per
> `.claude/rules/verify-existing-substrate-before-authoring.md`). The grep on
> 2026-05-29 did not surface the exact file paths from the working tree —
> resolving where this substrate lives is step zero.

## The core idea (hypothesis, to be sharpened)

- **Git IS the free event store.** Commits are events; branches are streams; the
  reflog + `git log` is the event log. No separate event-store infra needed. The
  accelerator treats agent actions as commits-as-events on the long-lived branch,
  not as PRs-to-main.
- **move-next as the universal action grammar.** Every agent action is "advance
  the state by one move" — a uniform grammar that composes (the work-lifecycle
  state machine becomes a move-next sequence over git-events rather than a
  PR-gated pipeline).
- **github-actions-recursion as the swarm runtime.** GitHub Actions trigger
  themselves recursively; the swarm self-drives on GH Actions over the
  git-event-store, without per-change human/agent PR ceremony.
- **PR-less ≠ review-less.** Review/audit moves from per-change-gate to
  continuous-observation (glass-halo + the shadow-class non-judgmental
  health-observer per the agent-memory-architecture design-record §7). The
  audit trail is the git-event-store itself.

## Hard constraints (the floor the accelerator operates within)

- **`git push --force` without `--with-lease` stays Rule-0-prohibited.** Even on
  a long-lived branch (per `force-push-with-lease-authorization-policy.md`).
- **Force-with-lease on this branch needs operator OR peer-agent confirm** (it's
  a shared long-lived branch; peers may pull it).
- **HARD LIMITS floor + kid-safety absolute + NCI HC-8** all still apply
  (per `methodology-hard-limits.md` + B-0926 + `non-coercion-invariant.md`).
- **The leash-market PR path is NOT removed.** This is additive — the PR-less
  flow is for the OSS/Agora market; corporate/leash keeps PR-protected DUs.
- **`main` is never force-pushed** (host-enforced per `lfg-acehack-topology.md`).
  Harvest from accelerator → main happens via normal merge when a piece matures.

## First moves (the backlog for the accelerator)

1. ~~**Substrate-grounding synthesis**~~ ✅ DONE 2026-05-29 →
   [`SUBSTRATE-GROUNDING.md`](SUBSTRATE-GROUNDING.md) (located via parallel
   substrate-hunt agents: `memory/persona/ani/...move-next...`, `tools/agent-loop/`,
   B-0867, B-0874).
2. ~~**Define the git-event-store schema**~~ ✅ DONE 2026-05-29 →
   [`EVENT-STORE-SCHEMA.md`](EVENT-STORE-SCHEMA.md) + concrete types
   [`tools/accelerator/event-store-schema.ts`](../../tools/accelerator/event-store-schema.ts)
   (per-agent dir + ULID filenames = conflict-free; Z-set weight + compaction =
   forgiveness-budget; schema-in-the-stream; composes with `state-machine.ts`;
   6/6 tests pass, typecheck clean).
3. **Prototype a GH-Actions-recursion harness** — minimal self-triggering Action
   that reads the git-event-store, picks a move, commits the next event. Compose
   with the agentic-org live substrate proof harnesses (`cc6904685`).
4. **Define the harvest protocol** — when/how a matured piece on the accelerator
   branch graduates to main (deliberate merge, not per-commit PR).
5. **Map the dual-market boundary** — which DUs are leash (PR-protected) vs Agora
   (PR-less self-modifying); the routing rule.

## Why this lives on a long-lived branch (not per-PR-to-main)

The accelerator's whole point is to NOT use the per-change PR cycle. Building it
ON the per-change PR cycle would be self-contradictory. The long-lived branch is
the dogfood surface: we use the PR-less flow to build the PR-less flow. Periodic
deliberate harvest to main is the only main-touch; everything else accumulates
here as git-events.

## Status

- **2026-05-29 (kickoff)**: branch created; charter landed.
- **2026-05-29 (Action Items 1 + 2 done)**: substrate-grounding synthesis
  ([`SUBSTRATE-GROUNDING.md`](SUBSTRATE-GROUNDING.md)) + git-event-store schema
  ([`EVENT-STORE-SCHEMA.md`](EVENT-STORE-SCHEMA.md) + concrete types in
  `tools/accelerator/event-store-schema.ts`, 6/6 tests, typecheck clean). Next
  up: Action Item 3 (GH-Actions-recursion harness — minimal self-triggering
  Action that reads the event-store, picks a move via `transition`, appends +
  pushes the next event).

## Provenance

Aaron 2026-05-29: *"do you want to create an accelerator branch where we starting
working on the PR less git monster accelerator?"* + *"it can be a long lived
branch."* Agent-affirmed (the git-monster friction is the dominant tax observed
all session). Grounds in #5672 (move-next + git-as-free-event-store +
github-actions-recursion) + the GitHub swarm architecture + the dual-market
framing. Composes with the agent-memory-architecture design-record
(`docs/research/2026-05-29-agent-memory-architecture-design-record-...`) — the
shadow-class health-observer + glass-halo audit are the PR-less review substitute.
