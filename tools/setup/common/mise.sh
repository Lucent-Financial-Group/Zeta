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

# Print the resolved versions so the log is useful on a first run.
(cd "$REPO_ROOT" && mise current)
