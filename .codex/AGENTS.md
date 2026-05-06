# Codex Addendum

This is the OpenAI Codex harness addendum for Zeta. It is
additive only: [`../AGENTS.md`](../AGENTS.md) and
[`../GOVERNANCE.md`](../GOVERNANCE.md) remain authoritative
for repo-wide rules.

## Read Order

At session start:

1. Read `AGENTS.md`.
2. Read `docs/ALIGNMENT.md`.
3. Read `.codex/README.md`.
4. Read `.codex/CURRENT-codex.md`.
5. For Codex host-loop mechanics, read
   `docs/CODEX-HARNESS-NOTES.md`.
6. For autonomous-loop work, read `docs/CODEX-LOOP-HANDOFF.md`
   and `docs/AUTONOMOUS-LOOP.md`.
7. For write work, read `docs/AGENT-CLAIM-PROTOCOL.md` and
   follow its shared-machine / shared-folder mode when other
   agents are active on the same machine.

## Codex Worktree Discipline

Codex sessions write from dedicated worktrees. The repository
root checkout is treated as contested shared state unless the
human maintainer explicitly assigns it to this session.

Before editing:

- Push a `claim/<slug>` branch with `docs/claims/<slug>.md`.
- Create a local heartbeat at
  `$(git rev-parse --git-common-dir)/agent-heartbeats/<session>.json`.
- Name intended path prefixes in the heartbeat.
- Do not commit heartbeat files.

## Ownership Boundary

Codex owns `.codex/**` content and Codex-authored skills.
Claude Code and other harnesses may review these files, but
routine edits should come from a Codex session or be explicitly
delegated by the human maintainer.

Codex may read `.claude/**` skill bodies as data when needed,
but does not treat Claude-specific files as Codex instructions
unless the same rule is promoted into `AGENTS.md`,
`GOVERNANCE.md`, or another harness-agnostic surface.

## Background Agents

Codex-spawned subagents are part of the Codex execution lane.
They inherit the same scope and worktree discipline as the
parent session. A subagent may inspect broadly, but write work
needs a bounded file set and must not overlap another active
writer's heartbeat path unless explicitly coordinated.

## Current State

Use `.codex/CURRENT-codex.md` for the compact state handoff
for future Codex sessions. Keep it factual and operational:
active PRs, active worktrees, current hazards, and next safe
actions. Do not store doctrine there unless the doctrine is
also promoted to a canonical repo surface.
