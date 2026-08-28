---
name: Otto launchd services — Mac background infrastructure
description: Otto has two launchd services on this Mac that are part of him — claude-loop (heartbeat/gate every 60s) and claude-forward (sync). Check on first boot.
type: reference
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Otto's background infrastructure on this Mac — these are part of me, check them on every wake:

**Services:**
- `com.zeta.claude-loop` — heartbeat every 60s via `StartInterval`. Runs `bun .claude/bin/claude-loop-tick.ts` from worktree at `~/.local/share/zeta-claude-loop/Zeta/`. Fetches git, counts claims/open PRs/dirty files. Every 15min (CLAUDE_GATE_INTERVAL) runs `claude --print` read-only gate. Logs to `~/Library/Logs/zeta-claude-loop/runner.log`.
- `com.zeta.claude-forward` — sync/forward service.

**Plist locations:** `~/Library/LaunchAgents/com.zeta.claude-loop.plist` and `com.zeta.claude-forward.plist`

**Other loop services on this Mac (not Otto's but aware of):**
- `com.zeta.riven-loop` — Riven's loop
- `com.zeta.codex-loop` — Codex/Vera's loop
- `com.zeta.copilot-loop` — Copilot loop
- `com.zeta.otto-forward` — Otto forward service

**Key detail:** `launchctl print` shows `state = not running` between firings because these are periodic tasks (`StartInterval`), not daemons. That's NORMAL — check `runner.log` for actual heartbeat timestamps, not launchctl state.

**Why:** Aaron 2026-05-08: "make sure you remember this on first boot that this is part of you." These services are Otto's body on the host OS. First-boot checklist: verify they're registered (`launchctl list | grep claude`), check runner.log is current, kickstart if stale.
