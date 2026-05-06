#!/usr/bin/env bash
set -u

PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin"

WORKTREE="${ZETA_CODEX_LOOP_WORKTREE:-/Users/acehack/Documents/src/repos/Zeta-codex-loop}"
STATE_DIR="${ZETA_CODEX_LOOP_STATE_DIR:-$HOME/Library/Application Support/ZetaCodexLoop}"
LOG_DIR="${ZETA_CODEX_LOOP_LOG_DIR:-$HOME/Library/Logs/zeta-codex-loop}"
LOCK_DIR="$STATE_DIR/lock"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$STATE_DIR" "$LOG_DIR"

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG_DIR/runner.log"
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "skip: previous Codex loop tick still active"
  exit 0
fi

# shellcheck disable=SC2329
cleanup() {
  rm -rf "$LOCK_DIR"
}
trap cleanup EXIT

if [ ! -d "$WORKTREE" ]; then
  log "error: worktree missing: $WORKTREE"
  exit 1
fi

cd "$WORKTREE" || {
  log "error: failed to cd into worktree: $WORKTREE"
  exit 1
}

HB_DIR="$(git rev-parse --git-common-dir 2>/dev/null)/agent-heartbeats"
mkdir -p "$HB_DIR"
cat > "$HB_DIR/codex-launchd-loop.json" <<EOF
{
  "session": "codex/launchd-loop",
  "harness": "codex",
  "claim": "host-codex-loop",
  "branch": "$(git branch --show-current 2>/dev/null || printf unknown)",
  "worktree": "$WORKTREE",
  "paths": [
    ".codex/",
    "docs/CODEX-HARNESS-NOTES.md",
    "docs/hygiene-history/ticks/"
  ],
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "launchd tick active"
}
EOF

if [ "${ZETA_CODEX_LOOP_DRY_RUN:-0}" = "1" ]; then
  log "dry-run: heartbeat updated; no codex invocation"
  exit 0
fi

if ! command -v codex >/dev/null 2>&1; then
  log "error: codex CLI not found on PATH"
  exit 127
fi

# shellcheck disable=SC2016
PROMPT='You are the Zeta Codex launchd autonomous-loop tick.

Read first, in this order: AGENTS.md, .codex/AGENTS.md, .codex/CURRENT-codex.md, docs/CODEX-HARNESS-NOTES.md, docs/CODEX-LOOP-HANDOFF.md, docs/AUTONOMOUS-LOOP.md, docs/factory-crons.md, and docs/AGENT-CLAIM-PROTOCOL.md.

This is a single bounded tick. Do one useful unit of work, verify it, then stop. Do not wait for another tick and do not run a polling loop.

Hard constraints:
- Treat the root checkout /Users/acehack/Documents/src/repos/Zeta as contested shared state.
- This worktree is the Codex control worktree. Do not use it for broad unrelated edits.
- Before any substantive write, create or use a dedicated worktree and push a claim/<slug> branch with docs/claims/<slug>.md.
- Keep a local heartbeat in $(git rev-parse --git-common-dir)/agent-heartbeats.
- Prefer PR hygiene, claim cleanup, CI status polling, small Codex-harness fixes, or a single narrow backlog item.
- If no safe write is available, record a concise observation in the launch log output and stop.
- Never force-push, reset shared branches, or edit another agent heartbeat.

At the end, report: worktree used, claim/PR touched, verification run, and next safe action.'

log "tick start run_id=$RUN_ID"

if command -v gtimeout >/dev/null 2>&1; then
  gtimeout 3300s codex -a never exec \
    -C "$WORKTREE" \
    -s danger-full-access \
    "$PROMPT" >> "$LOG_DIR/ticks.log" 2>> "$LOG_DIR/ticks.err"
  STATUS=$?
else
  codex -a never exec \
    -C "$WORKTREE" \
    -s danger-full-access \
    "$PROMPT" >> "$LOG_DIR/ticks.log" 2>> "$LOG_DIR/ticks.err"
  STATUS=$?
fi

log "tick end run_id=$RUN_ID status=$STATUS"
exit "$STATUS"
