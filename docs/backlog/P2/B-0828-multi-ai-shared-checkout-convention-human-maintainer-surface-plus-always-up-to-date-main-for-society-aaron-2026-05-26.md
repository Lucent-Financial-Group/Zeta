---
id: B-0828
title: Multi-AI shared-checkout convention — human-maintainer surface + always-up-to-date-with-main for society
status: open
priority: P2
created: 2026-05-26
last_updated: 2026-05-26
depends_on: []
composes_with: [B-0751]
---

# B-0828 — Multi-AI shared-checkout convention (Aaron 2026-05-26)

## Scope

Formalize the convention for the shared checkout at `/Users/acehack/Documents/src/repos/Zeta` (and its equivalent on other maintainer machines hosting multi-AI work) so AIs + humans can coexist on the same physical directory without stepping on each other's work.

Source: Aaron 2026-05-26: *"its the multi-AI substrate. not a rush be we can clean this up and send out a message on how to better share it i think it should just be a human maintiner surface plus common main always up to date loation for socity when the human is not adding code"*.

Also Aaron earlier in the same exchange: *"you have destruct git authorzation you own your own isolated copies and the one that is open is this session is shared across all ais on this machine and me we are supposted to do the right things for eacch other and just try to keep ot up to date with main"*.

## The proposed convention

The shared checkout serves two modes depending on operator state:

| Operator state | Shared checkout role | What AIs do |
|---|---|---|
| **Human actively adding code** | Operator's working directory; HEAD may be on any branch; index may be dirty | AIs treat as read-only; do NOT modify; do NOT run destructive git operations |
| **Human NOT adding code** | Always-up-to-date-with-main reference for "society" (all AIs on the machine) | AIs may keep it up to date with main (`git fetch` + `git reset --hard origin/main` when safe); use it as the canonical reference for the current state of main |

The shared checkout is NEVER the AI's working space. AIs do their own work in isolated clones / worktrees under `/private/tmp/zeta-*/` (per `.claude/rules/agent-worktree-hygiene-never-hold-main-never-step-on-operator-cleanup-on-pr-merge.md` + B-0751).

## Why this matters — empirical anchor 2026-05-26

The pack corruption hit the shared `.git/objects/pack/pack-7261613e....pack` in the middle of substrate-engineering work. New worktree creation off origin/main failed because the corrupt pack object was needed for file-tree reconstruction. Per the existing dotgit-saturation discipline (`.claude/rules/refresh-world-model-poll-pr-gate.md`), autonomous agents are NOT authorized to run destructive `.git/` mutation on shared checkouts because it might disrupt other AIs / Aaron currently using it.

Workaround applied: fresh independent clone from origin at `/private/tmp/zeta-clone-2026-05-26` — clean substrate, my own to mutate.

The convention this row proposes would have prevented the work-blocking + the workaround friction by:
- Making explicit that shared checkout is the human-maintainer surface (not the AI work surface)
- Establishing the always-up-to-date-with-main contract so AIs always know what to expect from the shared one
- Documenting when AIs may help maintain it (when human is NOT adding code) + when they must NOT touch it (when human IS adding code)

## Operational mechanism — discovery + signaling

For the convention to work, AIs need a way to discover operator state:

| Signal | What it means | AI action |
|---|---|---|
| Operator-maintained lockfile (e.g., `.zeta-human-active`) | Human is actively coding | AIs treat shared as read-only |
| Lockfile absent + shared HEAD at `origin/main` | Society-mode | AIs may keep up to date; read-only otherwise |
| Lockfile absent + shared HEAD diverged from `origin/main` | Stale-society-mode | AIs may safely `fetch + reset --hard origin/main` to restore society-mode |
| Lockfile present + uncommitted changes in working tree | Mid-session | AIs definitely treat as read-only |
| Shared `.git/objects/` shows corruption | Recovery-needed | AIs report to operator; do NOT auto-recover (per existing discipline) |

The signaling primitives are deliberately simple (lockfile + HEAD-check + git-fsck) so any AI can implement them cheaply.

## Composes with the existing isolated-work discipline

This row does NOT change the existing isolated-work discipline:
- AIs still create their own worktrees / clones under `/private/tmp/`
- AIs still use isolated worktrees for all PR-bearing work
- AIs still NEVER hold the shared `main` branch checked-out

This row ADDS: explicit naming of the shared checkout's TWO modes (human-active vs society-reference) + when AIs may help maintain it.

## What this row is NOT

- NOT a removal of AIs' ability to do destructive git operations on their own isolated clones (per Aaron's authorization)
- NOT a requirement that AIs always keep the shared checkout up to date (just permission to do so when society-mode)
- NOT a centralization concern — each maintainer machine has its own shared checkout convention; this row documents the pattern that scales across them

## Acceptance

- [ ] Documentation: `.claude/rules/multi-ai-shared-checkout-convention.md` formalizing the two-mode contract
- [ ] Operator-signal mechanism: lockfile path + protocol defined
- [ ] AI-side discovery: helper script (`bun tools/check-shared-mode.ts` or similar) that returns current mode + safe-to-mutate? boolean
- [ ] AI-side helper: `bun tools/refresh-shared-to-main.ts` that safely refreshes shared checkout to current `origin/main` when society-mode + safe-to-mutate
- [ ] Update existing isolated-work-discipline rules to reference this convention
- [ ] Message-out to all AIs on the machine (per Aaron's *"send out a message on how to better share it"*) — could be via bus envelope per `.claude/rules/otto-channels-reference-card.md` or via shared memory file

## Out of scope (this row)

- Cross-machine shared-checkout coordination (if multiple maintainer machines hosting AIs needs to share state, that's a different concern)
- Operator-tooling to automatically toggle the human-active lockfile (separate UX row)
- Recovery from `.git/` corruption automatically — explicit-operator-decision per existing discipline

## Composes with

- B-0751 (agent-worktree-hygiene; isolated worktree discipline)
- `.claude/rules/agent-worktree-hygiene-never-hold-main-never-step-on-operator-cleanup-on-pr-merge.md`
- `.claude/rules/refresh-world-model-poll-pr-gate.md` (dotgit-saturation tier; autonomous-agents-do-NOT-run-recovery)
- `.claude/rules/honor-those-that-came-before.md` (do-the-right-things-for-each-other per Aaron's framing)

## Origin

Aaron 2026-05-26: *"its the multi-AI substrate. not a rush be we can clean this up and send out a message on how to better share it i think it should just be a human maintiner surface plus common main always up to date loation for socity when the human is not adding code"*.

Empirical anchor: pack corruption 2026-05-26 in shared `.git/objects/pack/` blocked autonomous worktree-creation work; the workaround was fresh independent clone; the convention this row proposes would scale the workaround into a standard pattern.
