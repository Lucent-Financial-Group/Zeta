# Claim - task-codex-launchd-loop

- **Session ID:** codex/20260506-loop1
- **Harness:** codex
- **Claimed at:** 2026-05-06T07:52:17Z
- **ETA:** 2026-05-06T08:30:00Z (host launchd job installed + repo substrate pushed)
- **Scope:** Install and document the Codex host-level launchd loop because Codex has no Claude-native `CronCreate` tool.
- **Durable target:** `.codex/bin/codex-loop-tick.sh`, `.codex/CURRENT-codex.md`, `docs/CODEX-HARNESS-NOTES.md`, local LaunchAgent `~/Library/LaunchAgents/com.zeta.codex-loop.plist`, and the PR carrying claim + work + release.
- **Platform mirror:** <none yet>

## Notes

The loop uses stable worktree `/Users/acehack/Documents/src/repos/Zeta-codex-loop`, label `com.zeta.codex-loop`, logs under `~/Library/Logs/zeta-codex-loop/`, and a lock directory under `~/Library/Application Support/ZetaCodexLoop/` to prevent overlapping ticks.
