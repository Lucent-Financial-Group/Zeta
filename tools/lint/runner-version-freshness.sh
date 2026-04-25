#!/usr/bin/env bash
# tools/lint/runner-version-freshness.sh
#
# Fails CI when a GitHub Actions workflow pins a runner
# to a label that is not on the current allow-list. The
# allow-list is sourced from the authoritative GitHub
# standard-runners docs page; structural lint is the
# enforcement mechanism that prevents stale-version pins
# (whose "latest at training time" decays the moment they
# land) from accumulating in CI.
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
# is >30 days old, the script prints a warning to stderr
# but still exits 0 (warning-only — it does NOT fail CI).
# When GitHub announces a new stable runner (macos-27 GA,
# windows-2028 GA, etc.), the allow-list must be updated
# + LAST_VERIFIED bumped.
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
#   0  all runner labels are current (or only freshness
#      warning printed to stderr — non-fatal)
#   1  environment / usage error (unreadable file, missing
#      tool, etc.) — distinct from stale-label findings so
#      callers can tell the two apart
#   2  one or more stale / rolling-alias labels detected
#      (or a label not on the allow-list)

set -euo pipefail

# Resolve REPO_ROOT and cd there so the default
# `find .github/workflows ...` discovery works regardless
# of the caller's cwd. Aligns with other tools/lint/*.sh
# scripts that establish the same invariant.
if ! REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  echo "ERROR: not inside a git working tree" >&2
  exit 1
fi
cd "$REPO_ROOT"

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
  # Both branches must compute UTC epoch to avoid TZ skew
  # between now (UTC) and last (locally-interpreted). BSD
  # date treats the input as local-time by default; force
  # UTC via `TZ=UTC` so age_days is computed in a single
  # timezone.
  if TZ=UTC date -j -f "%Y-%m-%d" "$LAST_VERIFIED" "+%s" >/dev/null 2>&1; then
    last_epoch="$(TZ=UTC date -j -f "%Y-%m-%d" "$LAST_VERIFIED" "+%s")"
  elif TZ=UTC date -d "$LAST_VERIFIED" "+%s" >/dev/null 2>&1; then
    last_epoch="$(TZ=UTC date -d "$LAST_VERIFIED" "+%s")"
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

fail=0       # 1 = stale / rolling / not-allow-listed label
env_error=0  # 1 = unreadable file or other env/usage problem

for file in "${files[@]}"; do
  # Verify file exists and is readable. Without this, the
  # grep below would silently swallow a missing-file error
  # and report 'ok' for nothing-actually-linted. Tracked
  # in env_error (exit 1) NOT fail (exit 2) so callers can
  # distinguish 'usage problem' from 'stale-label finding'.
  if [ ! -r "$file" ]; then
    echo "ERROR: cannot read $file (does not exist or unreadable)" >&2
    env_error=1
    continue
  fi
  # Two-pass YAML comment stripping. Both grep and sed must
  # tolerate "no match" without aborting under set -euo
  # pipefail:
  #   - `grep -vE '^[[:space:]]*#'` exits 1 if EVERY line is
  #     a comment (no output). `|| true` neutralises that
  #     into exit 0.
  #   - The `sed` second pass always emits its input, so
  #     the whole pipeline's exit code is sed's, not grep's.
  #     But `set -o pipefail` propagates the leftmost non-
  #     zero, so we still need the `|| true` on the grep
  #     side to be safe.
  uncommented="$(
    grep -vE '^[[:space:]]*#' "$file" \
      | sed -E 's/[[:space:]]+#.*$//' \
      || true
  )"
  # Extract lines that look like runner-label references,
  # then grep for any STALE_LABEL with portable word-
  # boundaries. Matrix-entry prefilter accepts both bare
  # `- <label>` AND quoted `- "<label>"` / `- '<label>'`
  # forms (common YAML matrix syntax).
  matrix_prefix='^[[:space:]]*-[[:space:]]+(['"'"'"]?)'
  matches="$(printf '%s\n' "$uncommented" | grep -nE "runs-on:|(^|[^A-Za-z0-9_])os:|${matrix_prefix}(${stale_pattern})" || true)"
  hits="$(printf '%s\n' "$matches" | grep -E "${nonword_start}(${stale_pattern})${nonword_end}" || true)"
  if [ -n "$hits" ]; then
    echo "STALE RUNNER LABEL(S) in $file:"
    printf '%s\n' "$hits" | sed 's/^/  /'
    fail=1
  fi
  # Same scan against rolling-alias forbidden list.
  rolling_pattern="$(IFS='|'; echo "${ROLLING_ALIASES[*]}")"
  rolling_matches="$(printf '%s\n' "$uncommented" | grep -nE "runs-on:|(^|[^A-Za-z0-9_])os:|${matrix_prefix}(${rolling_pattern})" || true)"
  rolling_hits="$(printf '%s\n' "$rolling_matches" | grep -E "${nonword_start}(${rolling_pattern})${nonword_end}" || true)"
  if [ -n "$rolling_hits" ]; then
    echo "ROLLING-ALIAS RUNNER LABEL(S) in $file (use a pinned version per repo convention):"
    printf '%s\n' "$rolling_hits" | sed 's/^/  /'
    fail=1
  fi

  # Allow-list validation: any runner label NOT in
  # ALLOWED_LABELS or in expression form (`${{ ... }}` /
  # matrix expansion) is flagged as not-on-allow-list.
  # This catches future-stale labels (e.g., `ubuntu-30.04`
  # invented after this script was last verified) that
  # don't appear in the explicit STALE_LABELS subset.
  allowed_pattern="$(IFS='|'; echo "${ALLOWED_LABELS[*]}")"
  rolling_or_allowed="${allowed_pattern}|${rolling_pattern}"
  # Extract the value after `runs-on:`, then check whether
  # it's on the union of allowed + rolling lists. Skip
  # expression-form labels (`${{ ... }}`) which the workflow
  # author explicitly templated.
  unknown_hits="$(printf '%s\n' "$uncommented" \
    | grep -nE 'runs-on:[[:space:]]*[A-Za-z0-9_-][A-Za-z0-9._-]*' \
    | grep -vE 'runs-on:[[:space:]]*\$\{\{' \
    | grep -vE "runs-on:[[:space:]]*(${rolling_or_allowed})($|[[:space:]]|#)" \
    || true)"
  if [ -n "$unknown_hits" ]; then
    echo "NOT-ON-ALLOW-LIST RUNNER LABEL(S) in $file (label is neither stale nor allowed; allow-list may need refresh):"
    printf '%s\n' "$unknown_hits" | sed 's/^/  /'
    fail=1
  fi
done

if _verify_age_ok; then
  : # fresh
else
  warn=1
fi

if [ "$env_error" = "1" ]; then
  echo "" >&2
  echo "Environment / usage error encountered (see ERROR" >&2
  echo "lines above). This is distinct from stale-label" >&2
  echo "findings; exit 1 reserves an out-of-band code so" >&2
  echo "callers can distinguish 'something broke' from" >&2
  echo "'stale labels found'." >&2
  exit 1
fi

if [ "$fail" = "1" ]; then
  echo ""
  echo "One or more workflow files pin stale / rolling /"
  echo "not-on-allow-list runner labels. Update to current"
  echo "standard-runner labels. Canonical list:"
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
