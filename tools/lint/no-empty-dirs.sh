#!/usr/bin/env bash
#
# tools/lint/no-empty-dirs.sh — fail the build if an empty directory
# exists in the repo that is (a) not git-ignored and (b) not on the
# explicit allowlist. Born round 35 after Aaron noted agent-created
# skill folders occasionally slipped through without a SKILL.md.
#
# Rationale: a committed empty directory is almost always a forgotten
# artefact — a skill folder with no SKILL.md, a research folder with no
# report, a spec folder with no .tla. Git doesn't track empty dirs, but
# agents can and do create them via tooling that mkdirs-then-fails
# before writing the file. This check catches that class of regression.
#
# Usage:
#   tools/lint/no-empty-dirs.sh          # exit 1 iff an unexpected
#                                        # empty dir is found
#   tools/lint/no-empty-dirs.sh --list   # list every empty dir
#                                        # (allowlisted + flagged)
#                                        # without failing
#
# Allowlist: tools/lint/no-empty-dirs.allowlist — one path per line,
# relative to repo root, `#` comments allowed. Paths listed there are
# legitimate runtime-output scratch dirs that `install.sh` creates and
# that stay empty until a tool fills them (Alloy compile output, TLC
# state output, coverage report). If you add a path to the allowlist,
# add a reason comment so the next reviewer knows why it was allowed.
#
# Excluded from scan entirely (never flagged, even without allowlist):
#   - .git/ internals
#   - references/upstreams/** (vendored mirrors; not our discipline)
#   - any path matched by .gitignore (bin/, obj/, .venv/, node_modules/
#     etc. — so local caches don't trip the check)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

ALLOWLIST_FILE="tools/lint/no-empty-dirs.allowlist"
MODE="${1:-check}"

if [ ! -f "$ALLOWLIST_FILE" ]; then
  echo "no-empty-dirs: allowlist missing at $ALLOWLIST_FILE" >&2
  exit 2
fi

# ---- Collect candidates ------------------------------------------------------
# `find` with hard excludes for trees we never scan. Upstream mirrors
# are excluded because they are third-party code we don't own; .git is
# excluded because its internal objects/refs layout legitimately has
# empty leaf dirs. Build outputs are excluded here AND also fall under
# .gitignore below.
# Portable to macOS bash 3.2 (no `mapfile`): read into array via
# while-read loop fed by process substitution.
CANDIDATES=()
while IFS= read -r line; do
  CANDIDATES+=("$line")
done < <(
  find . -type d -empty \
    -not -path './.git' -not -path './.git/*' \
    -not -path './references/upstreams/*' \
    -not -path '*/bin' -not -path '*/bin/*' \
    -not -path '*/obj' -not -path '*/obj/*' \
    -not -path '*/.vs' -not -path '*/.vs/*' \
    -not -path '*/.venv' -not -path '*/.venv/*' \
    -not -path '*/node_modules' -not -path '*/node_modules/*' \
    -not -path '*/__pycache__' -not -path '*/__pycache__/*' \
    -not -path '*/TestResults' -not -path '*/TestResults/*' \
    -not -path './tools/lean4/.lake' -not -path './tools/lean4/.lake/*' \
    -not -path './.claude/plugins' -not -path './.claude/plugins/*' \
    -not -path './artifacts' -not -path './artifacts/*' \
    2>/dev/null | sed 's|^\./||' | sort
)

# ---- Filter: drop gitignored paths -------------------------------------------
# `git check-ignore -v` returns 0 if the path is ignored. We batch-check
# to avoid per-path fork overhead on large trees.
FILTERED=()
if [ "${#CANDIDATES[@]}" -gt 0 ]; then
  # shellcheck disable=SC2016
  IGNORED=$(printf '%s\n' "${CANDIDATES[@]}" | git check-ignore --stdin 2>/dev/null || true)
  for dir in "${CANDIDATES[@]}"; do
    if ! grep -Fxq -- "$dir" <<<"$IGNORED"; then
      FILTERED+=("$dir")
    fi
  done
fi

# ---- Load allowlist (strip comments + blanks) -------------------------------
ALLOWED=()
while IFS= read -r line; do
  ALLOWED+=("$line")
done < <(
  grep -vE '^[[:space:]]*(#|$)' "$ALLOWLIST_FILE" | sed 's|[[:space:]]*$||'
)

is_allowlisted() {
  local dir="$1"
  local allowed
  for allowed in "${ALLOWED[@]}"; do
    if [ "$dir" = "$allowed" ]; then
      return 0
    fi
  done
  return 1
}

# ---- Report ------------------------------------------------------------------
FLAGGED=()
ALLOWLISTED_PRESENT=()
for dir in "${FILTERED[@]}"; do
  if is_allowlisted "$dir"; then
    ALLOWLISTED_PRESENT+=("$dir")
  else
    FLAGGED+=("$dir")
  fi
done

if [ "$MODE" = "--list" ]; then
  echo "=== Empty directories (allowlisted) ==="
  if [ "${#ALLOWLISTED_PRESENT[@]}" -eq 0 ]; then
    echo "  (none)"
  else
    printf '  %s\n' "${ALLOWLISTED_PRESENT[@]}"
  fi
  echo
  echo "=== Empty directories (flagged) ==="
  if [ "${#FLAGGED[@]}" -eq 0 ]; then
    echo "  (none)"
  else
    printf '  %s\n' "${FLAGGED[@]}"
  fi
  exit 0
fi

if [ "${#FLAGGED[@]}" -eq 0 ]; then
  echo "no-empty-dirs: OK (${#ALLOWLISTED_PRESENT[@]} allowlisted, 0 flagged)"
  exit 0
fi

echo "no-empty-dirs: FAIL — ${#FLAGGED[@]} unexpected empty director(y/ies):" >&2
printf '  %s\n' "${FLAGGED[@]}" >&2
echo >&2
echo "Fix options:" >&2
echo "  1. Populate the directory with its intended file(s)." >&2
echo "  2. Delete the directory if it was created in error." >&2
echo "  3. If it is a legitimate scratch/output dir, add it to" >&2
echo "     $ALLOWLIST_FILE with a reason comment." >&2
exit 1
