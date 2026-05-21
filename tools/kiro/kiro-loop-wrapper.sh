#!/bin/bash
# kiro-loop-wrapper.sh — launchd entry point for Kiro (Qwen Coder) autonomous loop
set -euo pipefail

cd /Users/acehack/Documents/src/repos/Zeta

# Run the Kiro loop tick script with bun
exec bun tools/kiro/kiro-loop-tick.ts
