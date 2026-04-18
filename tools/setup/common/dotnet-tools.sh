#!/usr/bin/env bash
#
# tools/setup/common/dotnet-tools.sh — installs/updates dotnet global
# tools from the manifest. Idempotent: `dotnet tool install --global`
# on an already-installed tool errors, so we branch on `dotnet tool
# list -g`.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MANIFEST="$REPO_ROOT/tools/setup/manifests/dotnet-tools.txt"

if [ ! -f "$MANIFEST" ]; then
  echo "✓ no dotnet-tools manifest; skipping"
  exit 0
fi

if ! command -v dotnet >/dev/null 2>&1; then
  echo "error: dotnet not on PATH (mise should have put it there)"
  exit 1
fi

# Cache the current global-tool listing once — a dozen `dotnet tool
# list -g` invocations is slower than one grep loop.
INSTALLED="$(dotnet tool list -g 2>/dev/null || echo '')"

grep -vE '^(#|$)' "$MANIFEST" | while IFS= read -r line; do
  # Manifest lines are "<tool> <version>" or just "<tool>".
  tool="$(echo "$line" | awk '{print $1}')"
  version="$(echo "$line" | awk '{print $2}')"
  if echo "$INSTALLED" | grep -qi "^${tool}\b"; then
    if [ -n "$version" ]; then
      dotnet tool update -g "$tool" --version "$version" >/dev/null 2>&1 || true
    else
      dotnet tool update -g "$tool" >/dev/null 2>&1 || true
    fi
    echo "✓ $tool already installed; updated if possible"
  else
    if [ -n "$version" ]; then
      dotnet tool install -g "$tool" --version "$version"
    else
      dotnet tool install -g "$tool"
    fi
    echo "✓ $tool installed"
  fi
done
