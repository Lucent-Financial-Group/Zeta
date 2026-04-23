#!/usr/bin/env bash
# tools/hygiene/audit-git-hotspots.sh
#
# Identifies high-churn files in the repo over a configurable
# window — the "hotspots" the human maintainer named on
# 2026-04-23 Otto-54:
#
# > cadence for checking github hotspots too this is a hygene
# > issues points of friction and bottlenecks, we are
# > frictionless... git hotspots i mean... we are gitnative
# > with github as our first host
#
# High-churn shared files are the paradigmatic friction surface
# (routine merge conflicts, reviewer burden, serialization
# bottleneck). The audit surfaces candidates; the action
# (split / freeze / archive / watch) is a judgment call the
# author or architect makes from the report.
#
# Part of the Otto-54 directive cluster in BACKLOG.md §
# "P1 — Git-native hygiene cadences". Composes with:
# (Naming the human maintainer as "Aaron" inline in the
# verbatim quote above is deliberate — the quoted directive
# is attribution, not prose reference. Outside the quote
# block, prose uses role references per the
# no-name-attribution rule.)
# - BACKLOG-per-swim-lane split row (one remediation option)
# - CURRENT-maintainer freshness audit row (one remediation
#   option for memory/MEMORY.md hotspots)
#
# Usage:
#   tools/hygiene/audit-git-hotspots.sh               # default window: 60 days, top 20
#   tools/hygiene/audit-git-hotspots.sh --window 30d  # custom window
#   tools/hygiene/audit-git-hotspots.sh --top 40      # show more rows
#   tools/hygiene/audit-git-hotspots.sh --report PATH # write markdown report
#
# Exit codes:
#   0 — always (detect-only, no enforcement yet; see Otto-54
#       NOT-list: detection-first, action-second)

set -euo pipefail

window="60 days"
top=20
report=""

require_value() {
  # require_value FLAG VALUE — aborts with a clear message if VALUE is empty.
  if [[ -z "${2:-}" ]]; then
    echo "error: $1 requires a value" >&2
    exit 64
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --window)
      require_value "$1" "${2:-}"
      window="$2"
      shift 2
      ;;
    --top)
      require_value "$1" "${2:-}"
      top="$2"
      shift 2
      ;;
    --report)
      require_value "$1" "${2:-}"
      report="$2"
      shift 2
      ;;
    -h|--help)
      # Skip the shebang line so --help output doesn't start with
      # `!/usr/bin/env bash`. The sed rewrite strips the leading
      # `# ` / `#` markers so the doc block reads as plain prose.
      grep '^#' "$0" | grep -v '^#!' | sed 's/^# //;s/^#//'
      exit 0
      ;;
    *)
      echo "unknown arg: $1" >&2
      exit 64
      ;;
  esac
done

# Count per-file touches in the window, excluding paths we
# deliberately expect to be hot:
# - docs/hygiene-history/**: append-only fire logs; churn is
#   by design (one row per tick).
# - openspec/changes/**: OpenSpec staging surface (by design
#   high-churn during spec backfill).
# - references/upstreams/**: vendored external repos; not
#   ours to audit.
excluded_prefixes=(
  'docs/hygiene-history/'
  'openspec/changes/'
  'references/upstreams/'
)

# Count touches: one row per (commit, file) pair. Note that
# `git log --name-only` also lists files touched by deletion
# commits (the path appears even though the file no longer
# exists at HEAD). That's correct for a hotspot report —
# frequent deletion of a path is still friction — so we
# deliberately include deletions in the count rather than
# filter them out.
raw=$(git log --since="$window" --pretty=format: --name-only \
      | grep -v '^$' || true)

# If the window is empty (new repo, tight window), bail
# gracefully rather than aborting under `set -euo pipefail`.
if [[ -z "$raw" ]]; then
  echo "no commits in window '$window' (or all filtered)" >&2
fi

# Apply exclusions.
filtered="$raw"
for prefix in "${excluded_prefixes[@]}"; do
  filtered=$(printf '%s\n' "$filtered" | grep -v "^$prefix" || true)
done

# Tally by file.
ranked=$(printf '%s\n' "$filtered" | sort | uniq -c | sort -rn)

# Unique author / PR-count per file — best-effort (may undercount
# in squash-merge workflow where PR number appears in the
# commit subject rather than the file touch).
file_summary() {
  local file="$1"
  local touches="$2"
  local authors pr_count
  # `|| true` guards against empty git log output aborting
  # the pipe under `set -euo pipefail`; `grep -c` still
  # yields "0" in that case via `wc -l`.
  authors=$(git log --since="$window" --pretty=format:'%an' -- "$file" 2>/dev/null | sort -u | grep -c . || true)
  pr_count=$(git log --since="$window" --pretty=format:'%s' -- "$file" 2>/dev/null | grep -oE '#[0-9]+' | sort -u | grep -c . || true)
  printf '| %s | %s | %s | %s |\n' "$file" "$touches" "$authors" "$pr_count"
}

render() {
  printf '# Git hotspots report\n\n'
  printf -- '- **Window:** last %s\n' "$window"
  printf -- '- **Generated:** %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf -- '- **Top:** %s files by touch count\n' "$top"
  printf -- '- **Excluded prefixes:** %s\n\n' "${excluded_prefixes[*]}"

  printf '## Ranking\n\n'
  printf '| file | touches | unique authors | PR count |\n'
  printf '|---|---:|---:|---:|\n'

  printf '%s\n' "$ranked" | head -n "$top" | while read -r line; do
    [[ -z "$line" ]] && continue
    touches=$(awk '{print $1}' <<<"$line")
    file=$(awk '{$1=""; sub(/^ /,""); print}' <<<"$line")
    [[ -z "$file" ]] && continue
    file_summary "$file" "$touches"
  done

  printf '\n## Suggested actions\n\n'
  printf 'Detection-first. The action below is a prompt for human\n'
  printf 'or Architect judgment, not an enforcement.\n\n'
  printf -- '- **split** — file has become a shared bottleneck; consider\n'
  printf '  per-swim-lane / per-subsystem decomposition\n'
  printf -- '- **freeze** — historical content is append-only; freeze\n'
  printf '  older rows to an archive and keep recent rows hot\n'
  printf -- '- **audit** — hotness may reflect real work; investigate\n'
  printf '  whether churn is healthy or pathological\n'
  printf -- '- **watch** — hot but not yet a problem; leave for next\n'
  printf '  audit cadence\n\n'
  printf '## What this report is NOT\n\n'
  printf -- '- Not an enforcement. The audit exits 0 regardless of\n'
  printf '  findings.\n'
  printf -- '- Not a blame tool. Author counts are descriptive of\n'
  printf '  collaboration shape, not performance.\n'
  printf -- '- Not a complete merge-conflict predictor. Two PRs can\n'
  printf '  conflict on a rarely-touched file; conversely, a\n'
  printf '  very hot file with careful coordination (append-only\n'
  printf '  rows) may see zero conflicts.\n'
}

if [[ -n "$report" ]]; then
  render > "$report"
  echo "Report written: $report" >&2
else
  render
fi
