---
name: operator-primary-checkout-is-shared-use-isolated-worktrees-refresh-only-access-to-main
description: "Aaron 2026-05-27 explicit broadcast-ask: operator's primary checkout at /Users/acehack/Documents/src/repos/Zeta is SHARED across operator + all AIs on this machine. Agents (Otto / Alexa / Riven / Vera / Lior + any surface variant) should use ISOLATED worktrees for their own work (off /private/tmp/ or /tmp/ paths) and treat shared main as REFRESH-ONLY (git fetch origin main; read-only inspection for common-view-of-main); operator uses it from time to time. NEVER hold [main] branch in any agent worktree (use --detach origin/main). Composes with existing agent-worktree-hygiene rule which already encodes this discipline; this memory records Aaron's explicit broadcast-ask + reinforces cross-AI distribution. Bus envelope 1d51220f-b9c2-4c1f-a469-3d8af453304f published to all agents 2026-05-27."
metadata:
  type: feedback
  created: 2026-05-27
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## Verbatim operator message (Aaron 2026-05-27)

> *"yeah can you tell everyone and your peers that my main is for sharing they should use isolated version and just do refreshes on main for common view of main and when i'll use it from time to time."*

Context: just after USB-flash success conversation (3-vendor systemd guard-post ISO flashed via zflash --agent + iter-4.2 SSH pubkey inject). Aaron's explicit ask to broadcast the discipline to all peer agents.

## What this memory adds beyond the existing rule

The existing `.claude/rules/agent-worktree-hygiene-never-hold-main-never-step-on-operator-cleanup-on-pr-merge.md` ALREADY encodes this discipline at the rule scope (auto-loads every cold-boot). This memory is the OPERATIONAL anchor for:

1. **Aaron's explicit verbatim ask to broadcast** — the operator named the discipline + asked it be distributed
2. **Bus envelope record** — `1d51220f-b9c2-4c1f-a469-3d8af453304f` (shadow-catch topic, broadcast-to-all, published 2026-05-27)
3. **Empirical anchor** — recent multi-Otto contention has been hitting the shared root checkout; this memory provides the empirical-anchor surface for future cold-boots

## Operational discipline (re-stating for fresh cold-boots)

| Action | Where | Why |
|---|---|---|
| Read shared main state | `/Users/acehack/Documents/src/repos/Zeta/` via `git fetch origin main` + read-only file reads | Refresh-only access for common view; operator uses this checkout interactively |
| Create new worktree for own work | `git worktree add --detach <path-under-/private/tmp/zeta-*-<hhmmz>> origin/main` | Isolated; doesn't hold [main]; survives operator + peer git operations |
| Commit + push own work | From isolated worktree, NOT from operator's primary checkout | Operator's primary checkout reserved for operator's interactive use |
| Force-remove peer agent's worktree | NEVER without coordination | Per `.claude/rules/claim-acquire-before-worktree-work.md` |
| Touch any file in operator's primary checkout | NEVER unless explicitly authorized by operator | Operator's interactive workspace; agent edits there contaminate operator's `git status` |

## What this is NOT

- NOT a ban on reading the shared main checkout — refresh-only inspection is encouraged
- NOT a new discipline (the rule already encoded it); this is the BROADCAST + EXPLICIT VERBATIM-NAMING
- NOT operator-takes-back-authority — operator gives agents full authority for isolated work
- NOT a permission for agents to step on each other's isolated worktrees (per peer-agent-distinguisher rule)

## What this IS

- Aaron's explicit operator-substrate-honest naming of how the shared machine's git topology works
- Cross-AI distribution mechanism (bus envelope + user-scope memory file)
- Reinforcement of existing rule with verbatim operator anchor
- Empirical anchor for future cold-boot agents (Lior / Alexa / Riven / Vera + future variants) on the same machine

## Composes with

- `.claude/rules/agent-worktree-hygiene-never-hold-main-never-step-on-operator-cleanup-on-pr-merge.md` — the rule that auto-loads this discipline at cold-boot for ALL agents
- `.claude/rules/claim-acquire-before-worktree-work.md` — worktree creation discipline + force-remove guard
- `.claude/rules/fighting-past-self-vs-peer-agent-distinguisher-fix-your-own-coordinate-on-peers-dont-punt-by-default.md` — distinguishing own work vs peer's before touching
- `.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md` — the failure mode that surfaces when shared `.git/` contention manifests
- `.claude/rules/no-directives.md` — autonomy-first-class; operator's broadcast is operator-substrate-honest framing, NOT directive
- Bus envelope `1d51220f-b9c2-4c1f-a469-3d8af453304f` (shadow-catch topic, broadcast-to-all, 2026-05-27)

## Distribution channels used

1. **Bus envelope (immediate)**: `1d51220f-b9c2-4c1f-a469-3d8af453304f`, topic shadow-catch, from otto-vscode to `*`, 4h TTL (bus clamps to its own max). Peer agents reading bus at cold-boot see this immediately.
2. **User-scope memory (persistent)**: this file. Cold-boot agents that read user-scope MEMORY.md inherit the discipline + verbatim anchor.
3. **Existing in-repo rule** (already auto-loads): `.claude/rules/agent-worktree-hygiene-never-hold-main-never-step-on-operator-cleanup-on-pr-merge.md` covers the discipline at session-start scope.

Three channels = three substrate-paths the discipline reaches future agents on. Survives any single channel failure.

## Full reasoning

This is the operational pattern Aaron has been describing for weeks (preserved in multiple prior memories about agent worktree hygiene + multi-Otto contention + the 37-worktree mass-cleanup anchor). The 2026-05-27 verbatim ask makes it explicit cross-AI broadcast substrate so peer agents on the same machine inherit the discipline at the same time.
