#!/usr/bin/env bash
#
# tools/setup/common/verifiers.sh — downloads formal-verifier jars
# (TLC, Alloy) to `tools/tla/` and `tools/alloy/` respectively.
#
# Manifest format: `<target-dir>/<target-file>  <url>` per line,
# comments starting with `#`. Per Aaron's round-29 call we do not
# verify checksums (trust-on-first-use); when upstream provides a
# published SHA256SUMS we may revisit.
#
# This replaces the legacy tools/install-verifiers.sh in the same
# commit (greenfield — no alias per GOVERNANCE.md §24 fallout).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MANIFEST="$REPO_ROOT/tools/setup/manifests/verifiers.txt"

if [ ! -f "$MANIFEST" ]; then
  echo "✓ no verifiers manifest; skipping"
  exit 0
fi

# Assert the JVM is present — TLC + Alloy both need it. The manifest
# has nothing to do unless Java is available.
if ! command -v java >/dev/null 2>&1; then
  echo "error: java not on PATH; install JDK 21 (brew openjdk@21 or apt openjdk-21-jdk)"
  exit 1
fi

grep -vE '^(#|$)' "$MANIFEST" | while IFS= read -r line; do
  target="$(echo "$line" | awk '{print $1}')"
  url="$(echo "$line" | awk '{print $2}')"
  dest="$REPO_ROOT/$target"
  mkdir -p "$(dirname "$dest")"
  if [ -f "$dest" ]; then
    # Trust-on-first-use: if the file exists we assume it's intact.
    # Per Aaron's round-29 call we do not re-verify.
    echo "✓ $target already present"
  else
    echo "↓ downloading $target from $url"
    curl -fsSL -o "$dest" "$url"
    echo "✓ $target"
  fi
done
