#!/usr/bin/env bash
#
# tools/setup/install.sh — the one install script consumed three ways
# (dev laptops, CI runners, devcontainer images) per GOVERNANCE.md §24.
#
# Safe to run repeatedly — detect-first-install-else-update. Safe to
# run daily to keep tools fresh.
#
# Usage:
#   tools/setup/install.sh
#
# Exit 0 on success. Any failure is a dev-experience bug; the CI
# `gate.yml` workflow asserts this script completes twice in sequence.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SETUP_DIR="$REPO_ROOT/tools/setup"

echo "=== Zeta install — three-way parity script (GOVERNANCE.md §24) ==="
echo "Repo root: $REPO_ROOT"

os="$(uname -s)"
case "$os" in
  Darwin)
    echo "OS: macOS"
    "$SETUP_DIR/macos.sh"
    ;;
  Linux)
    echo "OS: Linux"
    "$SETUP_DIR/linux.sh"
    ;;
  *)
    echo "error: unsupported OS '$os' (macOS + Linux only this round; Windows backlogged)"
    exit 1
    ;;
esac

echo
echo "=== Install complete ==="
echo "If this is your first run, open a new shell or source"
echo "\$HOME/.config/zeta/shellenv.sh to pick up PATH changes."
