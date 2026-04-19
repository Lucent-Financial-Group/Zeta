#!/usr/bin/env bash
#
# tools/setup/common/mise.sh — trust the repo's .mise.toml and run
# `mise install` to pin dotnet + python to the declared versions.
#
# `.mise.toml` is the single source of truth for language-runtime
# pins. Adding a runtime = editing that file. See
# docs/research/build-machine-setup.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

if [ ! -f "$REPO_ROOT/.mise.toml" ]; then
  echo "error: no .mise.toml at repo root"
  exit 1
fi

# `mise trust` is idempotent and required before `install` will read
# a project-local .mise.toml. Silent on repeat runs.
mise trust "$REPO_ROOT/.mise.toml" >/dev/null

echo "↓ mise install (reading $REPO_ROOT/.mise.toml)..."
(cd "$REPO_ROOT" && mise install)
echo "✓ mise runtimes installed"

# Ensure mise shims are on PATH for the remainder of the install
# script's own process. shellenv.sh (step 9 in install.sh) handles
# propagation to subsequent shells and to $GITHUB_PATH under CI,
# but runs AFTER dotnet-tools.sh — so without this export, the
# `dotnet` invoked by dotnet-tools.sh resolves to the system pre-
# installed version, misses global.json's SDK pin, and errors.
#
# Probe the two known shim locations in order. mise across XDG
# variants (Linux default, macOS default, Homebrew, apt) picks
# one of these; we don't rely on `mise activate --shims` because
# its output format has drifted across mise versions.
for shim_dir in \
    "$HOME/.local/share/mise/shims" \
    "/opt/homebrew/opt/mise/shims" \
    "/opt/homebrew/share/mise/shims"; do
  if [ -d "$shim_dir" ]; then
    export PATH="$shim_dir:$PATH"
    echo "✓ mise shims on PATH: $shim_dir"
    break
  fi
done

# If none of the known paths exist, ask mise directly.
if ! command -v dotnet >/dev/null 2>&1 || [ "$(dotnet --version 2>/dev/null)" = "" ]; then
  MISE_DATA_DIR=$(mise settings get data_dir 2>/dev/null || echo "")
  if [ -n "$MISE_DATA_DIR" ] && [ -d "$MISE_DATA_DIR/shims" ]; then
    export PATH="$MISE_DATA_DIR/shims:$PATH"
    echo "✓ mise shims on PATH: $MISE_DATA_DIR/shims (via mise settings)"
  fi
fi

# Print the resolved versions so the log is useful on a first run.
(cd "$REPO_ROOT" && mise current)
