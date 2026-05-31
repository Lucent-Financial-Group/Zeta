#!/usr/bin/env bash
#
# tools/setup/common/one-liner-tools.sh — installs non-package-manager CLIs from
# tools/setup/manifests/one-liner-tools, each via its OWN one-line installer (the
# declarative one-liner installer registry; operator 2026-05-31). Sibling to
# common/agent-clis.sh (which handles the bun-global/package CLIs).
#
# DETECT-FIRST: if the tool's binary is already on PATH, skip (efficient — no
# re-download; remove the binary + re-run to reinstall/update). BEST-EFFORT: a failed
# installer WARNS and continues — these are auth-gated peer/dev CLIs, not hard deps;
# LOGIN/auth is the operator's to do after install; it must NEVER brick install
# (mirrors common/local-llm.sh's exceptions-as-signals discipline).
#
# Registry line format:  <detect-binary>  <install one-liner (REST of line; run via bash -c)>
# `#` comments + blank lines ignored. Unix (bash/sh) one-liners only; Windows ships its
# own installers (iex/PS) + gets a separate registry.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MANIFEST="$REPO_ROOT/tools/setup/manifests/one-liner-tools"

if [ ! -f "$MANIFEST" ]; then
  echo "✓ no one-liner-tools manifest; skipping"
  exit 0
fi

# Read the registry directly (NOT via a pipe) so an all-comments file doesn't trip
# pipefail; `|| [ -n "$line" ]` catches a final no-newline line.
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%%#*}"                                              # strip inline comment
  line="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')" # trim
  [ -z "$line" ] && continue
  bin="${line%%[[:space:]]*}"                                     # 1st token = detect-binary
  cmd="${line#"$bin"}"                                            # rest of line = installer
  cmd="$(printf '%s' "$cmd" | sed -e 's/^[[:space:]]*//')"
  [ -z "$cmd" ] && continue
  if command -v "$bin" >/dev/null 2>&1; then
    echo "✓ $bin already installed; skipping (remove it + re-run to reinstall/update)"
    continue
  fi
  echo "↓ installing $bin via its one-liner installer (best-effort)..."
  if ! bash -c "$cmd"; then
    echo "warn: installer for '$bin' failed; continuing (best-effort — auth/login is the operator's)" >&2
  fi
done <"$MANIFEST"

echo "✓ one-liner-tools step complete (login to each CLI separately — install is account-free)"
