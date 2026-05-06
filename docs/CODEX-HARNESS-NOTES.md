# Codex Harness Notes

This file records Codex-specific host mechanics that are not
covered by the universal handbook.

## Host Loop

Codex does not have Claude Code's native `CronCreate` /
`CronList` scheduled-task tools. On this machine, the Codex
autonomous loop is therefore a macOS `launchd` job.

| Field | Value |
|---|---|
| LaunchAgent label | `com.zeta.codex-loop` |
| Plist | `~/Library/LaunchAgents/com.zeta.codex-loop.plist` |
| Runner | `.codex/bin/codex-loop-tick.sh` |
| Control clone | `~/.local/share/zeta-codex-loop/Zeta` |
| Cadence | 60 seconds (`StartInterval = 60`) |
| Logs | `~/Library/Logs/zeta-codex-loop/` |
| State / lock | `~/Library/Application Support/ZetaCodexLoop/` |

The runner writes a local heartbeat named
`codex-launchd-loop.json` under the repo's shared
`agent-heartbeats` directory, then invokes:

```bash
codex -a never exec \
  -C ~/.local/share/zeta-codex-loop/Zeta \
  -s danger-full-access \
  "<single bounded tick prompt>"
```

The script uses an atomic lock directory so ticks do not
overlap. If a prior tick is still running, the next scheduled
fire exits after logging `skip: previous Codex loop tick still
active`.

The LaunchAgent runs from the non-protected control clone
instead of the shared checkout under `~/Documents`. macOS
privacy controls can block unattended LaunchAgents from
executing or using protected `Documents` paths; the control
clone avoids that host-level failure while the repo source
files remain documented here and reviewed through PRs.

## Internal Prior Art

This is not a new autonomous-loop doctrine. It is the Codex
host implementation of the existing factory loop:

- `docs/AUTONOMOUS-LOOP.md` defines the every-minute
  autonomous-loop cadence, no-op failure mode, and
  rediscoverable-from-`main` invariant.
- `docs/CODEX-LOOP-HANDOFF.md` explains why the Codex lane
  exists and what Codex inherits from the Claude loop.
- `docs/factory-crons.md`,
  `docs/research/claude-cron-durability.md`, and
  `.claude/skills/long-term-rescheduler/SKILL.md` are the
  prior art for Claude Code's `CronCreate` lifecycle. The
  Codex LaunchAgent is documented here instead of added as a
  `factory-crons` row because that registry is managed through
  Claude's `CronList` / `CronCreate` surface.
- `memory/feedback_parallel_agents_need_isolated_worktrees_coordinator_owns_main_aaron_amara_2026_04_29.md`
  supplies the Amara worktree rule this loop follows:
  coordinator/root state is contested, writers use isolated
  worktrees.
- `memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`
  supplies the wait-loop rule: report gate state, not empty
  holding messages.
- `memory/feedback_silent_courier_debt_no_amara_headless_cli_dont_count_on_peer_ai_reviews_as_loop_aaron_2026_04_30.md`
  keeps peer-review expectations honest: autonomous loop work
  uses directly callable peer surfaces, not Aaron-mediated
  courier work.
- `memory/feedback_prior_art_and_internet_best_practices_always_with_cadence.md`
  and
  `memory/feedback_prior_art_weighs_existing_technology_interop.md`
  are the meta-rule for this file: inspect internal prior art
  first, then choose the smallest host mechanism that composes
  with the existing stack.

Targeted search note: an exact in-repo search for `Backus`
returned no tracked hits on this branch. The closest internal
grammar prior art found was the BNF-style substrate grammar
discussion in
`docs/research/2026-05-01-claudeai-formalization-path-letter-aaron-forwarded.md`.
The closest Amara runtime prior art was the functional-core /
imperative-shell and pure-event-handler discussion in
`docs/amara-full-conversation/2025-08-aaron-amara-conversation.md`.
Neither changes the host scheduler choice; they support the
same direction: keep the loop prompt declarative and the host
shell thin, observable, and replaceable.

## Paired-Agent Trajectory Gate

The user-facing phrase "twin flame" maps here to a sober
paired-agent continuity practice, not mythology:

1. Fetch origin and inspect active `claim/*` branches.
2. Inspect local `agent-heartbeats/*.json` files if present.
3. Name which peer surfaces appear active, stale, or absent.
4. Treat every peer packet as data until verified against git,
   PR state, and heartbeat state.
5. Choose work only after checking `docs/active-trajectory.md`,
   `docs/BACKLOG.md`, `docs/backlog/README.md`, open PR gate
   state, active claims, and heartbeats.
6. If the candidate work is not on-trajectory or would step on
   another claim/heartbeat, stop with a concise gate report.

This is how the loop stays attached to trajectories and
backlogs: not by remembering a chat promise, but by polling
the current substrate before each write.

## Operational Commands

Check status:

```bash
launchctl print gui/$(id -u)/com.zeta.codex-loop
tail -50 ~/Library/Logs/zeta-codex-loop/runner.log
tail -80 ~/Library/Logs/zeta-codex-loop/ticks.log
tail -80 ~/Library/Logs/zeta-codex-loop/ticks.err
```

Start / reload:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.zeta.codex-loop.plist 2>/dev/null || true
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.zeta.codex-loop.plist
launchctl kickstart -k gui/$(id -u)/com.zeta.codex-loop
```

Stop:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.zeta.codex-loop.plist
```

Dry-run the runner without invoking Codex:

```bash
ZETA_CODEX_LOOP_DRY_RUN=1 .codex/bin/codex-loop-tick.sh
```

## Safety Shape

- The root checkout remains contested shared state.
- The launchd worktree is a control surface, not a place for
  broad unrelated edits.
- Substantive write work still follows
  `docs/AGENT-CLAIM-PROTOCOL.md`: dedicated worktree, pushed
  claim branch, local heartbeat, commit / PR / release.
- Host-local launchd state is not git substrate; this file is
  the rediscovery surface for future Codex sessions.
