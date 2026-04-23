#!/usr/bin/env bash
# tools/hygiene/audit-md032-plus-linestart.sh
#
# Detects markdown files where a line starts with `+ ` inside
# a paragraph (no blank line above) — the pattern that
# markdownlint MD032 treats as "list item missing blank line"
# and that caused Otto-35 + Otto-38 regressions in the
# autonomous-loop session 2026-04-23.
#
# The pattern triggers when an author writes prose continuation
# like:
#
#   Full treatment in the DBSP paper
#   + `docs/ARCHITECTURE.md` §operator-algebra.
#
# Markdownlint parses the second line as an unordered list
# item (unexpectedly) and flags MD032 ("list not surrounded
# by blank lines"). The author-time fix is to use "and" or
# similar continuation instead of `+`.
#
# FACTORY-HYGIENE row #56 (cadenced on-touch + round-cadence).
#
# Usage:
#   tools/hygiene/audit-md032-plus-linestart.sh              # summary
#   tools/hygiene/audit-md032-plus-linestart.sh --list       # list offending lines
#   tools/hygiene/audit-md032-plus-linestart.sh --enforce    # exit 2 on any gap
#
# Exit codes:
#   0 — no offending `+ `-at-line-start patterns (or --enforce
#       not set and gaps found)
#   2 — gaps found and --enforce was set

set -euo pipefail

mode="${1:-summary}"

# Find tracked `.md` files
md_files=$(git ls-files '*.md')

# Exclusion: files where `+ ` at line-start is intentional
# markdown (e.g., bullet lists using `+` as the marker).
# Detection heuristic: if the file uses `+ ` as consistent list
# marker (3+ occurrences), skip it.
exclude_pattern='^(docs/ROUND-HISTORY\.md|docs/hygiene-history/|docs/DECISIONS/|tools/hygiene/audit-md032-plus-linestart\.sh)'

gap_count=0
gap_lines=()

for file in $md_files; do
  if echo "$file" | grep -qE "$exclude_pattern"; then
    continue
  fi

  # Count `+ `-at-line-start lines in this file
  plus_lines_count=$(grep -c '^+ ' "$file" 2>/dev/null || true)
  plus_lines_count=${plus_lines_count:-0}

  # If the file uses `+ ` 3+ times, it's probably consistent
  # list markers — skip (user chose `+` as bullet style).
  if (( plus_lines_count >= 3 )); then
    continue
  fi

  # For each `+ `-at-line-start line, check whether the PREVIOUS
  # line is non-blank (which triggers MD032).
  while IFS=: read -r lineno _; do
    [[ -z "$lineno" ]] && continue
    # Get the previous line (lineno - 1)
    prev_lineno=$((lineno - 1))
    if (( prev_lineno >= 1 )); then
      prev_line=$(sed -n "${prev_lineno}p" "$file")
      # If the previous line is non-blank (has any non-whitespace),
      # the `+ ` pattern is an MD032 risk.
      if [[ -n "${prev_line// /}" ]]; then
        gap_count=$((gap_count + 1))
        gap_lines+=("$file:$lineno")
      fi
    fi
  done < <(grep -n '^+ ' "$file" 2>/dev/null || true)
done

case "$mode" in
  --list)
    if (( gap_count > 0 )); then
      printf '%s\n' "${gap_lines[@]}"
    fi
    ;;
  --enforce)
    if (( gap_count > 0 )); then
      echo "MD032 '+'-at-line-start gaps: $gap_count"
      printf '  %s\n' "${gap_lines[@]}"
      echo ""
      echo "Fix: replace '+' at line start with 'and' or similar prose"
      echo "continuation, OR add a blank line before the '+' to make it"
      echo "an intentional list (which markdownlint accepts)."
      exit 2
    fi
    echo "MD032 '+'-at-line-start gaps: 0 (clean)"
    ;;
  *)
    if (( gap_count > 0 )); then
      echo "MD032 '+'-at-line-start gaps: $gap_count"
      echo "run with --list to see offending file:line locations"
    else
      echo "MD032 '+'-at-line-start gaps: 0 (clean)"
    fi
    ;;
esac
