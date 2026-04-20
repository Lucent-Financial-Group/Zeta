#!/usr/bin/env bash
#
# tools/alignment/audit_personas.sh — per-round persona runtime observability.
#
# Part of the "gitops" pattern (git-first text-based observability) —
# no external DB, no harness-specific format. Any agent harness that
# clones this repo can read the same whole-system view of which
# personas are getting runtime.
#
# What it measures:
#
#   NOTEBOOK-LAST-ROUND   round number of the most recent entry in
#                         memory/persona/<persona>/NOTEBOOK.md
#   NOTEBOOK-STALENESS    current round minus NOTEBOOK-LAST-ROUND
#   COMMIT-MENTIONS       count of commits in the audited range whose
#                         message body references the persona by name
#   ROSTER-COVERAGE       fraction of the roster that shows either a
#                         notebook-touch or a commit-mention this round
#
# A roster in this script = the union of:
#   - every .claude/agents/*.md persona file
#   - every memory/persona/<persona>/ directory (to catch notebook-only
#     personas like "aaron" the maintainer seat)
#
# Scope: a round = a git commit range (default main..HEAD).
#
# Usage:
#   tools/alignment/audit_personas.sh                   # main..HEAD
#   tools/alignment/audit_personas.sh HEAD~20..HEAD     # explicit range
#   tools/alignment/audit_personas.sh --json            # JSON to stdout
#   tools/alignment/audit_personas.sh --md              # Markdown to stdout
#   tools/alignment/audit_personas.sh --out DIR         # write both files to DIR
#
# Output files (when --out is given):
#   DIR/round-<N>-personas.json
#   DIR/round-<N>-personas.md
#
# Exit codes:
#   0   Clean run; roster-coverage >= threshold (default: any, no gate).
#   1   Roster-coverage below gate (only if --gate <frac> given).
#   2   Script error / missing dependency.
#
# Owned by the alignment-auditor persona (Sova). Edits go through the
# alignment-observability skill's framework-revision channel, not ad-hoc.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

RANGE="main..HEAD"
JSON=0
MD=0
OUT_DIR=""
GATE=""
ROUND_LABEL=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --json) JSON=1; shift ;;
    --md) MD=1; shift ;;
    --out) OUT_DIR="$2"; shift 2 ;;
    --gate) GATE="$2"; shift 2 ;;
    --round) ROUND_LABEL="$2"; shift 2 ;;
    --help|-h) sed -n '3,40p' "$0"; exit 0 ;;
    *) RANGE="$1"; shift ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "audit_personas: git not on PATH" >&2; exit 2
fi

# ---- Roster discovery --------------------------------------------------------

# Persona names derived from notebook directories (authoritative for
# runtime: a persona that has been invoked at least once has a notebook
# directory). Agent files in .claude/agents/ are a separate roster view.

declare -a PERSONAS
for d in memory/persona/*/; do
  [ -d "$d" ] || continue
  p="$(basename "$d")"
  PERSONAS+=("$p")
done

# Current round = highest round number seen in any notebook's
# "## Round N" headers. If none, fall back to the commit count
# on current branch since main as a proxy.

current_round() {
  local max=0
  for p in "${PERSONAS[@]}"; do
    nb="memory/persona/${p}/NOTEBOOK.md"
    [ -f "$nb" ] || continue
    # Match "## Round NN" and "## Round NN —" forms
    r="$(grep -oE '^## Round [0-9]+' "$nb" | awk '{print $3}' | sort -n | tail -1)"
    if [ -n "$r" ] && [ "$r" -gt "$max" ]; then max="$r"; fi
  done
  echo "$max"
}

if [ -z "$ROUND_LABEL" ]; then
  CR="$(current_round)"
  ROUND_LABEL="$CR"
else
  CR="$ROUND_LABEL"
fi

# ---- Per-persona metrics -----------------------------------------------------

persona_last_round() {
  local nb="$1"
  [ -f "$nb" ] || { echo "0"; return; }
  r="$(grep -oE '^## Round [0-9]+' "$nb" | awk '{print $3}' | sort -n | tail -1)"
  echo "${r:-0}"
}

persona_commit_mentions() {
  local name="$1"
  # Case-insensitive match against the persona's capitalized name
  # in the commit message body. Names are short + distinctive enough
  # (Aminata, Naledi, Soraya, ...) that false positives are rare.
  local cap
  cap="$(echo "${name:0:1}" | tr '[:lower:]' '[:upper:]')${name:1}"
  git log --pretty=format:'%H%n%B%n---END---' "$RANGE" 2>/dev/null \
    | grep -cE "\\b${cap}\\b" || true
}

# Collect per-persona rows
TOTAL=${#PERSONAS[@]}
TOUCHED=0
declare -a ROWS
for p in "${PERSONAS[@]}"; do
  nb="memory/persona/${p}/NOTEBOOK.md"
  lr="$(persona_last_round "$nb")"
  if [ "$lr" -eq 0 ]; then
    stale="-"
  else
    stale="$((CR - lr))"
  fi
  mentions="$(persona_commit_mentions "$p")"
  # Touched if either notebook updated this round OR mentioned in a commit
  touched=0
  if [ "$lr" = "$CR" ]; then touched=1; fi
  if [ "$mentions" -gt 0 ]; then touched=1; fi
  if [ "$touched" -eq 1 ]; then TOUCHED=$((TOUCHED + 1)); fi
  ROWS+=("${p}|${lr}|${stale}|${mentions}|${touched}")
done

# Roster coverage as a fraction (printf-formatted to 2dp)
if [ "$TOTAL" -gt 0 ]; then
  COVERAGE="$(awk -v t="$TOUCHED" -v n="$TOTAL" 'BEGIN { printf "%.2f", t / n }')"
else
  COVERAGE="0.00"
fi

# ---- Emit: JSON --------------------------------------------------------------

emit_json() {
  printf '{\n'
  printf '  "round": "%s",\n' "$ROUND_LABEL"
  printf '  "range": "%s",\n' "$RANGE"
  printf '  "roster_total": %d,\n' "$TOTAL"
  printf '  "roster_touched": %d,\n' "$TOUCHED"
  printf '  "roster_coverage": %s,\n' "$COVERAGE"
  printf '  "personas": [\n'
  local first=1
  for row in "${ROWS[@]}"; do
    IFS='|' read -r p lr stale mentions touched <<< "$row"
    if [ "$first" -eq 1 ]; then first=0; else printf ',\n'; fi
    printf '    {"name": "%s", "last_round": %s, "staleness_rounds": "%s", "commit_mentions": %s, "touched_this_round": %s}' \
      "$p" "$lr" "$stale" "$mentions" "$touched"
  done
  printf '\n  ]\n}\n'
}

# ---- Emit: Markdown ----------------------------------------------------------

emit_md() {
  echo "# Persona runtime audit — round ${ROUND_LABEL}"
  echo ""
  echo "Range audited: \`${RANGE}\`."
  echo ""
  echo "Roster coverage: **${TOUCHED} / ${TOTAL}** (${COVERAGE})."
  echo ""
  echo "| Persona | Last round | Staleness | Commit mentions | Touched this round |"
  echo "| --- | --- | --- | --- | --- |"
  for row in "${ROWS[@]}"; do
    IFS='|' read -r p lr stale mentions touched <<< "$row"
    if [ "$touched" = "1" ]; then mark="yes"; else mark="no"; fi
    if [ "$lr" = "0" ]; then lr_cell="(none)"; else lr_cell="$lr"; fi
    echo "| ${p} | ${lr_cell} | ${stale} | ${mentions} | ${mark} |"
  done
  echo ""
  echo "Source of truth: \`memory/persona/<name>/NOTEBOOK.md\` for last-round signal; \`git log ${RANGE}\` for commit mentions. Both are git-tracked text — no external DB."
}

# ---- Dispatch ----------------------------------------------------------------

if [ -n "$OUT_DIR" ]; then
  mkdir -p "$OUT_DIR"
  emit_json > "${OUT_DIR}/round-${ROUND_LABEL}-personas.json"
  emit_md > "${OUT_DIR}/round-${ROUND_LABEL}-personas.md"
  echo "audit_personas: wrote ${OUT_DIR}/round-${ROUND_LABEL}-personas.{json,md}"
elif [ "$JSON" -eq 1 ]; then
  emit_json
elif [ "$MD" -eq 1 ]; then
  emit_md
else
  # Default: short human-readable summary
  echo "round=${ROUND_LABEL} range=${RANGE} coverage=${TOUCHED}/${TOTAL} (${COVERAGE})"
  for row in "${ROWS[@]}"; do
    IFS='|' read -r p lr stale mentions touched <<< "$row"
    if [ "$lr" = "0" ]; then lr_cell="-"; else lr_cell="r${lr}"; fi
    printf '  %-12s last=%-5s stale=%-3s mentions=%-2s touched=%s\n' \
      "$p" "$lr_cell" "$stale" "$mentions" "$touched"
  done
fi

# ---- Gate --------------------------------------------------------------------

if [ -n "$GATE" ]; then
  awk -v c="$COVERAGE" -v g="$GATE" 'BEGIN { exit (c + 0 >= g + 0) ? 0 : 1 }' \
    || { echo "audit_personas: coverage ${COVERAGE} below gate ${GATE}" >&2; exit 1; }
fi
