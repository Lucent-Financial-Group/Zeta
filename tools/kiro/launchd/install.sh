#!/bin/bash
# Install the Kiro/Alexa loop as a launchd user agent.
# Run: bash tools/kiro/launchd/install.sh
set -e

PLIST_SRC="$(dirname "$0")/com.lucent.zeta.kiro-loop.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.lucent.zeta.kiro-loop.plist"
LOG_DIR="$HOME/Library/Logs/zeta-kiro-loop"
STATE_DIR="$HOME/Library/Application Support/ZetaKiroLoop"

mkdir -p "$LOG_DIR" "$STATE_DIR" "$HOME/Library/LaunchAgents"

# Unload if already loaded
launchctl bootout "gui/$(id -u)/com.lucent.zeta.kiro-loop" 2>/dev/null || true

cp "$PLIST_SRC" "$PLIST_DST"
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"

echo "Kiro loop installed and running."
echo "  Logs: $LOG_DIR"
echo "  State: $STATE_DIR"
echo "  Unload: launchctl bootout gui/$(id -u)/com.lucent.zeta.kiro-loop"
