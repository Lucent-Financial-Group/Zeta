#!/bin/bash
# kiro-loop-wrapper.sh — launchd entry point for Kiro (Qwen Coder) autonomous loop
set -euo pipefail

# Resolve the repo root relative to the script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

# Run the Kiro loop tick script with bun
exec bun tools/kiro/kiro-loop-tick.ts
