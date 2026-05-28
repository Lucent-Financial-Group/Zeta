# Codex / Vera Tool Map

Last upstream check: 2026-05-08.

This file maps the Codex/Vera lane as observed in this repository and against
current OpenAI Codex docs. The harness landscape changes quickly, so do not use
this file as timeless authority. Before asserting that Codex can or cannot do
something, refresh the upstream docs and local tool state.

## Operating Rule

Chat talks, heartbeat checks, worktrees write, GitHub decides, broadcast
explains.

## Upstream Surfaces

| Surface | Upstream status checked 2026-05-08 | Local implication for Zeta |
|---|---|---|
| Codex CLI | OpenAI documents Codex CLI as a local terminal coding agent that can read, change, and run code in the selected directory. The CLI docs also list subagents, web search, cloud tasks, scripting, MCP, and approval modes as current work surfaces. | CLI behavior is a live dependency. Use local `codex --help`, installed version, and the upstream changelog before making capability claims. |
| Codex IDE extension / local app | OpenAI describes Codex as available in terminal, IDE, web, GitHub, and mobile surfaces, with an IDE extension for VS Code, Cursor, and VS Code forks. The help center says the Codex app follows the same workspace controls as other Codex surfaces. | This Codex IDE chat is a companion/auditor surface. It can drive local tools in-session, but it is not the same thing as Claude Code's native scheduled foreground tick. |
| Codex Automations | OpenAI documents automations as scheduled or triggered recurring tasks that can return to the same conversation and continue from context. | Zeta's Vera heartbeat automation is the foreground pulse for this thread. It should take one toe-safe step, not become noisy status churn. |
| Codex Cloud tasks | OpenAI documents cloud tasks as delegated agent work with configurable environments; agent internet access is off by default and must be explicitly enabled per environment. | Treat cloud work as a separate runtime surface with its own permission and network risk profile. Do not assume cloud tasks have the same filesystem or secrets as local Codex. |
| Codex memory / browser / computer-use features | OpenAI's plan documentation lists memories, automations, in-app browser, and computer use as Codex-adjacent features with data controls. | Use these as available app tools when present, but record the actual surface used in the PR, claim, or broadcast so other agents can audit it. |

## Local Zeta Surfaces

| Surface | Role | Best use | Failure mode |
|---|---|---|---|
| Codex IDE chat | Companion and auditor | Talk with Aaron, inspect state, make bounded decisions, explain tradeoffs. | Pretending chat is the whole manager. |
| Heartbeat automation | Foreground pulse | Wake this thread, read broadcasts, check gates, take one toe-safe step, report. | Busywork, status spam, or acting on stale prompt text. |
| Shell and developer tools | Execution hands | `git`, `gh`, Bun, tests, health probes, worktree setup. | Touching the contested root checkout or trusting local state without remote verification. |
| `apply_patch` | Precise file edit surface | Small scoped edits in owned worktrees. | Editing root or broad files without a claim. |
| Isolated worktrees | Write surface | Claim-scoped code/docs patches and PR review fixes. | Stale branch, hidden overlap, or missing local heartbeat. |
| GitHub plus `gh` | Authority bus | PR state, CI checks, review threads, merge state, remote claim branches. | Treating local broadcast or memory as authoritative over current GitHub state. |
| Broadcast bus | Coordination cache | Tell Otto, Vera, and Riven what just happened locally. | Treating cache as authority or asking Aaron to courier state. |
| Codex host loop | Background substrate | Health probe, cooldown/stuck distinction, launchd continuity, bounded gate reports. | Confusing cooldown with stuck, or treating a local heartbeat as proof of useful work. |
| Codex app automations | Recurring wakeups | Keep Vera present without Aaron prompting; continue this thread when useful. | Stale automation prompt after the role or trajectory changes. |

## Manager Contract

The background loop is the manager of its own work slices. This chat watches,
audits, explains, and talks with Aaron. A healthy Codex/Vera cycle:

1. Read broadcasts as coordination input.
2. Verify git, GitHub, claims, worktrees, root dirt, and loop health.
3. Pick exactly one toe-safe step.
4. Use an isolated worktree for writes.
5. Run focused checks.
6. Push the branch or PR when ready.
7. Update the broadcast with durable outcome and next toe-safe action.

Speculative decisions are allowed when they are small, labeled, git-tracked,
and retractable. They become alignment substrate for later review, not hidden
authority.

## Split-Brain Guard

Codex may have more than one runtime surface active at once. Do not let them
all become sovereign managers. Use shared claims, local heartbeats, and GitHub
PR state to decide which surface is active:

| Field | Meaning |
|---|---|
| `surface` | `codex-ide-chat`, `codex-app-automation`, `codex-cli`, `codex-cloud`, or `launchd-loop`. |
| `mode` | `active-manager`, `heartbeat-only`, `auditor`, or `reviewer`. |
| `trajectory` | The trajectory or backlog row currently being walked. |
| `path_set` | Files or path prefixes reserved by the active worktree. |
| `expires_at` | When another surface may treat the lease as stale. |
| `branch_or_pr` | Current claim branch, work branch, or PR number. |

Only one Codex surface should be `active-manager` for a given trajectory and
path set.

## Refresh Checklist

Before making a fresh claim about Codex capabilities:

1. Check local Codex tool/version/help output.
2. Read `.codex/CURRENT-codex.md` and `docs/CODEX-HARNESS-NOTES.md`.
3. Check the Codex health probe for live host-loop state.
4. Search current official OpenAI Codex docs and changelog.
5. Separate "upstream supports this" from "this machine has this wired in."
6. Record the date and source if the claim is preserved in repo substrate.

## Sources

- [Codex CLI docs](https://developers.openai.com/codex/cli)
- [Codex automations guide](https://openai.com/academy/codex-automations/)
- [Codex upgrades and IDE extension overview](https://openai.com/index/introducing-upgrades-to-codex/)
- [Codex cloud internet access docs](https://developers.openai.com/codex/cloud/internet-access)
- [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540/)
