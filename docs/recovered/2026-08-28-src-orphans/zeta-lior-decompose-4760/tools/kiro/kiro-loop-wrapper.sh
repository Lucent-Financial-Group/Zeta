#!/bin/bash
# kiro-loop-wrapper.sh — launchd entry point for Kiro (Qwen Coder) autonomous loop
set -euo pipefail

# Ensure standard tool paths are on the PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.bun/bin:$PATH"

# Load the local Zeta shell environment if available to get the correct node/bun paths
if [ -f "$HOME/.config/zeta/shellenv.sh" ]; then
    # shellcheck disable=SC1090
    source "$HOME/.config/zeta/shellenv.sh"
fi

# Resolve the repo root relative to the script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

# Run the Kiro loop tick script with bun
exec bun tools/kiro/kiro-loop-tick.ts
