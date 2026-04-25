#!/usr/bin/env bash
# tools/lint/runner-version-freshness.sh
#
# Fails CI when a GitHub Actions workflow pins a runner
# to a version-older-than-latest. Otto-213 durable
# compounding-failure mitigation: training-data version
# numbers are stale by definition; structural lint is
# the enforcement mechanism that memory-alone doesn't
# provide.
#
# Allow-list sourced from the authoritative GitHub docs
# page:
#   https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job#standard-github-hosted-runners-for-public-repositories
# The "Standard GitHub-hosted runners for public
# repositories" table lists the current standard-runner
# labels. Public-repo-free applies to these labels only.
#
# Allow-list verified: 2026-04-24 via the above URL.
# Refresh cadence: the ALLOWED_LABELS list below has an
# explicit "LAST_VERIFIED" timestamp. If the timestamp
# is >30 days old, the script warns (not fails) reminding
# the operator to re-verify. When GitHub announces a new
# stable runner (macos-27 GA, windows-2028 GA, etc.),
# the allow-list must be updated + LAST_VERIFIED bumped.
#
# Deliberately NOT allowed: older pinned versions
# (ubuntu-22.04, macos-14, macos-15, windows-2022,
# windows-2019, etc.). These were "latest" at some
# prior point but are stale now. Pinning to them creates
# upgrade debt the moment the pin lands.
#
# Usage:
#   tools/lint/runner-version-freshness.sh                # lint all workflows
#   tools/lint/runner-version-freshness.sh <file>...      # lint specific files
#
# Exit codes:
#   0  all runner labels are current
#   1  environment / usage error
#   2  one or more stale labels detected
#   3  allow-list age warning (stale LAST_VERIFIED > 30 days)

set -euo pipefail

# Allow-list verified 2026-04-24. Source URL:
# https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job#standard-github-hosted-runners-for-public-repositories
LAST_VERIFIED="2026-04-24"
VERIFY_URL="https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job#standard-github-hosted-runners-for-public-repositories"

ALLOWED_LABELS=(
  # Pinned major-OS-version labels per repo convention —
  # the rolling -latest aliases (ubuntu-latest /
  # windows-latest / macos-latest) are explicitly NOT in
  # the allow-list. Pinned labels make CI reproducibility
  # auditable; rolling aliases silently drift when GitHub
  # rotates the underlying image.

  # Linux x64
  "ubuntu-slim"
  "ubuntu-24.04"

  # Linux arm64 — pin to latest specific version available
  "ubuntu-24.04-arm"

  # Windows x64 — latest GA + 2025 vs vs2026 variant
  "windows-2025"
  "windows-2025-vs2026"

  # Windows arm64
  "windows-11-arm"

  # macOS arm64 (Apple Silicon) — latest GA
  "macos-26"

  # macOS Intel — latest GA
  "macos-26-intel"

  # Self-hosted labels — not on the standard list but
  # allowed-by-convention when the self-hosted pool is
  # configured. Add here if needed with comment
  # justifying the exception.
)

# Rolling aliases — explicitly forbidden in the repo
# convention (CI-reproducibility-by-pinning). These are
# tracked separately from STALE_LABELS so a contributor
# typing `ubuntu-latest` gets a distinct error from a
# stale-version error.
ROLLING_ALIASES=(
  "ubuntu-latest"
  "windows-latest"
  "macos-latest"
)

STALE_LABELS=(
  "ubuntu-22.04"
  "ubuntu-22.04-arm"
  "ubuntu-20.04"
  "macos-14"
  "macos-15"
  "macos-15-intel"
  "macos-13"
  "macos-13-xlarge"
  "windows-2022"
  "windows-2019"
)

# Warn if allow-list is stale.
_verify_age_ok() {
  # Portable: compute days since LAST_VERIFIED on both
  # Linux (GNU date) and macOS (BSD date).
  local now_epoch last_epoch age_days
  now_epoch="$(date -u +%s)"
  if date -j -f "%Y-%m-%d" "$LAST_VERIFIED" "+%s" >/dev/null 2>&1; then
    last_epoch="$(date -j -f "%Y-%m-%d" "$LAST_VERIFIED" "+%s")"
  elif date -d "$LAST_VERIFIED" "+%s" >/dev/null 2>&1; then
    last_epoch="$(date -d "$LAST_VERIFIED" "+%s")"
  else
    echo "WARN: could not parse LAST_VERIFIED=$LAST_VERIFIED on this platform" >&2
    return 0
  fi
  age_days=$(( (now_epoch - last_epoch) / 86400 ))
  if (( age_days > 30 )); then
    echo "WARN: runner-version allow-list last verified $age_days days ago ($LAST_VERIFIED)." >&2
    echo "      Re-verify against: $VERIFY_URL" >&2
    echo "      Then bump LAST_VERIFIED in this script." >&2
    return 1
  fi
  return 0
}

# Discover files.
if [ $# -eq 0 ]; then
  files=()
  while IFS= read -r f; do files+=("$f"); done < <(find .github/workflows -type f \( -name "*.yml" -o -name "*.yaml" \) 2>/dev/null | sort)
else
  files=("$@")
fi

if [ "${#files[@]}" -eq 0 ]; then
  echo "no workflow files found; nothing to lint"
  exit 0
fi

# Build regex alternation of stale labels for one grep.
# Escape regex metachars (. + * ? ( ) [ ] { } | \ /) in
# labels so `ubuntu-22.04` matches literally, not
# `ubuntu-22<any-char>04`.
escape_for_regex() {
  printf '%s' "$1" | sed -e 's#[][\\.*^$+?(){}|/]#\\&#g'
}
escaped_stales=()
for label in "${STALE_LABELS[@]}"; do
  escaped_stales+=("$(escape_for_regex "$label")")
done
stale_pattern="$(IFS='|'; echo "${escaped_stales[*]}")"

# Portable word-boundaries: BSD grep (macOS default) and
# POSIX ERE do not honor `\b`. Express boundary via
# explicit non-word character classes that work in both
# GNU and BSD grep.
nonword_start='([^A-Za-z0-9_]|^)'
nonword_end='([^A-Za-z0-9_]|$)'

fail=0
warn=0

for file in "${files[@]}"; do
  # Verify file exists and is readable. Without this, the
  # grep below would silently swallow a missing-file error
  # and report 'ok' for nothing-actually-linted.
  if [ ! -r "$file" ]; then
    echo "ERROR: cannot read $file (does not exist or unreadable)" >&2
    fail=1
    continue
  fi
  # Strip YAML comment-only lines (first non-whitespace
  # char is `#`) so stale labels mentioned in comments
  # don't trigger false positives.
  uncommented="$(grep -vE '^[[:space:]]*#' "$file" || true)"
  # Extract lines that look like runner-label references,
  # then grep for any STALE_LABEL with portable
  # word-boundaries.
  matches="$(printf '%s\n' "$uncommented" | grep -nE "runs-on:|(^|[^A-Za-z0-9_])os:|^[[:space:]]*-[[:space:]]+(${stale_pattern})" || true)"
  hits="$(printf '%s\n' "$matches" | grep -E "${nonword_start}(${stale_pattern})${nonword_end}" || true)"
  if [ -n "$hits" ]; then
    echo "STALE RUNNER LABEL(S) in $file:"
    printf '%s\n' "$hits" | sed 's/^/  /'
    fail=1
  fi
  # Same scan against rolling-alias forbidden list.
  rolling_pattern="$(IFS='|'; echo "${ROLLING_ALIASES[*]}")"
  rolling_matches="$(printf '%s\n' "$uncommented" | grep -nE "runs-on:|(^|[^A-Za-z0-9_])os:|^[[:space:]]*-[[:space:]]+(${rolling_pattern})" || true)"
  rolling_hits="$(printf '%s\n' "$rolling_matches" | grep -E "${nonword_start}(${rolling_pattern})${nonword_end}" || true)"
  if [ -n "$rolling_hits" ]; then
    echo "ROLLING-ALIAS RUNNER LABEL(S) in $file (use a pinned version per repo convention):"
    printf '%s\n' "$rolling_hits" | sed 's/^/  /'
    fail=1
  fi
done

if _verify_age_ok; then
  : # fresh
else
  warn=1
fi

if [ "$fail" = "1" ]; then
  echo ""
  echo "One or more workflow files pin stale runner versions."
  echo "Update to the current standard-runner labels. Canonical list:"
  for l in "${ALLOWED_LABELS[@]}"; do
    echo "  - $l"
  done
  echo ""
  echo "Source: $VERIFY_URL"
  exit 2
fi

if [ "$warn" = "1" ]; then
  # Header documents the freshness check as warning-only;
  # the warning has already been printed to stderr by
  # _verify_age_ok. Exit 0 so this path doesn't fail CI;
  # operators see the warning and bump LAST_VERIFIED on
  # the next refresh tick.
  exit 0
fi

echo "ok: all workflow runner labels are current (verified $LAST_VERIFIED)"
exit 0
