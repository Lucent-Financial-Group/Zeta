#!/usr/bin/env bash
#
# tools/setup/common/one-liner-tools.sh — installs non-package-manager CLIs from
# tools/setup/manifests/one-liner-tools. Sibling to common/agent-clis.sh (bun-global CLIs).
#
# B-0063 DOWNLOAD-THEN-EXEC (NOT pipe-to-shell): for each registry entry the runner downloads the
# install script to a temp file via curl_fetch (retry-equipped), verifies it is non-empty, then
# executes it with the named interpreter. NEVER `curl … | bash`: a truncated/interrupted download
# is caught by the non-empty check before any code runs, and a failed download surfaces as a
# non-zero curl_fetch exit — unlike `curl … | bash`, where bash exits 0 on an empty pipe even when
# the download failed (the pipefail trap Codex flagged on the prior revision). Same shape as the
# Homebrew bootstrap in macos.sh. Trust anchor: HTTPS + the vendor's domain (these installers track
# HEAD with no published per-release checksum, same as Homebrew's install.sh).
#
# DETECT-FIRST: skip if the tool's <detect-binary> is already on PATH (efficient — no re-download;
# remove the binary + re-run to reinstall/update). BEST-EFFORT: a failed installer WARNS and
# continues — these are auth-gated peer/dev CLIs, not hard deps; LOGIN/auth is the operator's to do
# after install; it must NEVER brick install (mirrors common/local-llm.sh exceptions-as-signals).
#
# Registry line:  <detect-binary>  <installer-url>  [interp=bash|sh]  [os=mac,linux]
# (defaults: interp=bash, os=all). `#` comments + blank lines ignored. See manifests/one-liner-tools.

set -euo pipefail

# curl_fetch (file-output download with retries) — the B-0063 helper that replaced the old
# pipe-to-shell pattern. Sourced from the sibling common/curl-fetch.sh.
# shellcheck source=tools/setup/common/curl-fetch.sh
# shellcheck disable=SC1091  # path is constructed from BASH_SOURCE at runtime; the source= above
# tells shellcheck where the file lives so it follows the include for static analysis.
source "$(dirname "${BASH_SOURCE[0]}")/curl-fetch.sh"

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MANIFEST="$REPO_ROOT/tools/setup/manifests/one-liner-tools"

if [ ! -f "$MANIFEST" ]; then
  echo "✓ no one-liner-tools manifest; skipping"
  exit 0
fi

# Current OS token for the os= qualifier (uname -s: Darwin -> mac, Linux -> linux).
case "$(uname -s)" in
  Darwin) CURRENT_OS="mac" ;;
  Linux)  CURRENT_OS="linux" ;;
  *)      CURRENT_OS="other" ;;
esac

# Read the registry directly (NOT via a pipe) so an all-comments file doesn't trip pipefail;
# `|| [ -n "$line" ]` catches a final no-newline line.
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%%#*}"                                                       # strip inline comment
  line="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')" # trim
  [ -z "$line" ] && continue

  # Split the whitespace-separated registry line into fields.
  # shellcheck disable=SC2086  # intentional word-split of the trusted, space-delimited registry line
  set -- $line
  bin="${1:-}"
  url="${2:-}"
  [ -z "$bin" ] && continue
  if [ -z "$url" ]; then
    echo "warn: registry entry '$bin' has no installer URL; skipping" >&2
    continue
  fi
  shift 2

  # Parse optional key=value qualifiers (order-independent).
  interp="bash"
  os_filter="all"
  for tok in "$@"; do
    case "$tok" in
      interp=*) interp="${tok#interp=}" ;;
      os=*)     os_filter="${tok#os=}" ;;
      *)        echo "warn: unknown qualifier '$tok' for '$bin'; ignoring" >&2 ;;
    esac
  done

  # OS filter: skip if the registry restricts to OSes that don't include the current one.
  if [ "$os_filter" != "all" ]; then
    case ",$os_filter," in
      *",$CURRENT_OS,"*) : ;;  # current OS is in the allowed list — proceed
      *) echo "✓ $bin: skipping on $CURRENT_OS (registry restricts to os=$os_filter)"; continue ;;
    esac
  fi

  # Detect-first: skip if already installed.
  if command -v "$bin" >/dev/null 2>&1; then
    echo "✓ $bin already installed; skipping (remove it + re-run to reinstall/update)"
    continue
  fi

  # Download-then-exec (B-0063): fetch installer to temp, verify non-empty, exec with interpreter.
  echo "↓ installing $bin via $url (download-then-exec, best-effort)..."
  tmp="$(mktemp)" || { echo "warn: mktemp failed for '$bin'; skipping" >&2; continue; }
  if ! curl_fetch --output "$tmp" "$url"; then
    echo "warn: download failed for '$bin' ($url); continuing (best-effort)" >&2
    rm -f "$tmp"
    continue
  fi
  if [ ! -s "$tmp" ]; then
    echo "warn: installer for '$bin' downloaded empty; refusing to exec; continuing (best-effort)" >&2
    rm -f "$tmp"
    continue
  fi
  if ! "$interp" "$tmp"; then
    echo "warn: installer for '$bin' failed; continuing (best-effort — auth/login is the operator's)" >&2
  fi
  rm -f "$tmp"
done <"$MANIFEST"

echo "✓ one-liner-tools step complete (login to each CLI separately — install is account-free)"
