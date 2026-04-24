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
  # Linux x64 — latest LTS + slim variant
  "ubuntu-slim"
  "ubuntu-latest"
  "ubuntu-24.04"

  # Linux arm64 — no -latest alias exists yet; pin to
  # latest specific version available
  "ubuntu-24.04-arm"

  # Windows x64 — latest GA + rolling alias + 2025 vs
  # vs2026 variant
  "windows-latest"
  "windows-2025"
  "windows-2025-vs2026"

  # Windows arm64
  "windows-11-arm"

  # macOS arm64 (Apple Silicon) — latest GA + rolling
  "macos-latest"
  "macos-26"

  # macOS Intel — latest GA
  "macos-26-intel"

  # Self-hosted labels — not on the standard list but
  # allowed-by-convention when the self-hosted pool is
  # configured. Add here if needed with comment
  # justifying the exception.
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
stale_pattern="$(IFS='|'; echo "${STALE_LABELS[*]}")"

fail=0
warn=0

for file in "${files[@]}"; do
  # Extract lines that look like runner-label references.
  # Match:
  #   runs-on: <label>
  #   runs-on: ${{ matrix.os }}  (ignored — the matrix
  #                                content is where the
  #                                labels live)
  #   os: [label1, label2, ...]
  #   - <label> (inside a matrix list continuation)
  #
  # Then grep for any STALE_LABEL in those lines.
  matches="$(grep -nE "runs-on:|\bos:\b|- ${stale_pattern}" "$file" 2>/dev/null || true)"
  hits="$(echo "$matches" | grep -E "\b(${stale_pattern})\b" || true)"
  if [ -n "$hits" ]; then
    echo "STALE RUNNER LABEL(S) in $file:"
    echo "$hits" | sed 's/^/  /'
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
  # Warn-only exit: CI can be configured to treat exit 3
  # as fail-soft if the allow-list freshness is itself
  # a hard requirement.
  exit 3
fi

echo "ok: all workflow runner labels are current (verified $LAST_VERIFIED)"
exit 0
