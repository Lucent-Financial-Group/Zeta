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
# Use `mise activate --shims` rather than a hardcoded shim path so
# homebrew / apt / curl-installed mise all work — each puts the
# shim directory at a slightly different XDG path.
eval "$(mise activate bash --shims)"

# Print the resolved versions so the log is useful on a first run.
(cd "$REPO_ROOT" && mise current)
