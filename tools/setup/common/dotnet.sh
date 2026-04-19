#!/usr/bin/env bash
#
# tools/setup/common/dotnet.sh — installs the .NET SDK pinned in
# `global.json` to `$HOME/.dotnet` using Microsoft's official
# `dotnet-install.sh`. Idempotent: second run no-ops if the
# required SDK is already present.
#
# Why not mise for dotnet: mise's dotnet plugin uses a non-shim
# layout (all versions share `~/.local/share/mise/dotnet-root/`,
# dotnet lives at the top level not under `shims/`). This breaks
# the in-process PATH story on CI and needs special `DOTNET_ROOT`
# handling. SQLSharp's proven-green pattern installs dotnet
# directly via Microsoft's installer into `~/.dotnet` and sets
# `DOTNET_ROOT` + PATH explicitly — same file layout `actions/
# setup-dotnet` uses. Matched here.
#
# Python stays on mise (works fine on CI as of round 32).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

GLOBAL_JSON="$REPO_ROOT/global.json"
INSTALL_ROOT="$HOME/.dotnet"

if [ ! -f "$GLOBAL_JSON" ]; then
  echo "error: no global.json at $GLOBAL_JSON"
  exit 1
fi

# Pull the SDK version from global.json for a "does the right SDK
# already live at INSTALL_ROOT" short-circuit. Use a tiny grep
# rather than depending on jq being installed.
REQUIRED_SDK="$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "$GLOBAL_JSON" \
                | head -1 \
                | sed -E 's/.*"([^"]+)"$/\1/')"

if [ -z "$REQUIRED_SDK" ]; then
  echo "error: could not parse SDK version from $GLOBAL_JSON"
  exit 1
fi

if [ -x "$INSTALL_ROOT/dotnet" ] \
   && "$INSTALL_ROOT/dotnet" --list-sdks 2>/dev/null | grep -Fq "$REQUIRED_SDK ["; then
  echo "✓ .NET SDK $REQUIRED_SDK already at $INSTALL_ROOT"
  exit 0
fi

echo "↓ installing .NET SDK $REQUIRED_SDK to $INSTALL_ROOT..."
INSTALL_SCRIPT="$(mktemp)"
cleanup() { rm -f "$INSTALL_SCRIPT"; }
trap cleanup EXIT

curl -fsSL https://dot.net/v1/dotnet-install.sh -o "$INSTALL_SCRIPT"
bash "$INSTALL_SCRIPT" \
     --jsonfile "$GLOBAL_JSON" \
     --install-dir "$INSTALL_ROOT" \
     --no-path

echo "✓ .NET SDK installed: $("$INSTALL_ROOT/dotnet" --version 2>&1 || echo 'unknown')"
