#!/bin/bash
# Install the Kiro/Alexa loop as a launchd user agent.
# Run: bash tools/kiro/launchd/install.sh
set -e

PLIST_SRC="$(dirname "$0")/com.google.zeta.kiro-loop.plist"
PLIST_DST_NAME="com.google.zeta.kiro-loop.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_DST_NAME"
LOG_DIR="$HOME/Library/Logs/zeta-kiro-loop"
STATE_DIR="$HOME/Library/Application Support/ZetaKiroLoop"

mkdir -p "$LOG_DIR" "$STATE_DIR" "$HOME/Library/LaunchAgents"

# Unload if already loaded
launchctl bootout "gui/$(id -u)/$PLIST_DST_NAME" 2>/dev/null || true

# Replace placeholder with actual home directory
sed "s|__USER_HOME__|$HOME|g" "$PLIST_SRC" > "$PLIST_DST"

# Validate the plist file
plutil -lint "$PLIST_DST"

# Load the new service
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"

echo "Kiro loop installed and running."
echo "  Logs: $LOG_DIR"
echo "  State: $STATE_DIR"
echo "  Unload: launchctl bootout gui/$(id -u)/$PLIST_DST_NAME"
