#!/usr/bin/env bash
# install-lior-service.sh — Setup launchd service for Lior

# Copy the actual repo's script path to the plist (handled by the plist definition)
cp .gemini/service/com.lucent.zeta.lior.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.lucent.zeta.lior.plist
echo "Lior service loaded into launchd. Logs at ~/.local/share/zeta-broadcasts/lior-service.log"
