#!/usr/bin/env bash
#
# tools/alignment/audit_skills.sh — per-round skill runtime observability.
#
# Third artefact in the gitops audit trio. The first two live beside it:
#
#   audit_commit.sh       per-commit alignment clause lint (HC-2, HC-6, SD-6)
#   audit_personas.sh     per-round persona runtime (notebook + commit mentions)
#   audit_skills.sh       per-round skill runtime (this file)
#
# Pattern-elevation: DORA 2025 is Zeta's starting point for build/delivery
# measurement (see memory feedback_dora_is_measurement_starting_point.md).
# This script adapts the DORA ten outcome variables to skill scope. Not every
# DORA outcome maps cleanly; columns present here are the honestly-measurable
# subset from the existing gitops substrate (skill files + notebooks + git log).
# Un-measurable DORA columns appear as explicit "-" rather than invented
# numbers, keeping the schema DORA-faithful without lying.
#
# DORA column -> skill-scope adaptation:
#
#   #4 Software delivery throughput  -> skill-invocation throughput =
#                                       notebook_mentions + commit_mentions
#                                       in the audited range.
#   #5 Software delivery instability -> skill file-churn =
#                                       count of commits touching
#                                       .claude/skills/<skill>/SKILL.md.
#   #9 Friction (lower = better)     -> rounds-since-last-notebook-mention
#                                       for the skill's owning persona
#                                       (the best proxy without a
#                                       dedicated invocation log yet).
#   #7 Individual effectiveness      -> mentioned-but-not-edited signal
#                                       (skill fired without needing a
#                                       tune-up edit in the same round).
#
# The remaining six DORA columns (organizational performance, team
# performance, product performance, code quality, valuable work, burnout)
# do not have reliable skill-scope signals in today's substrate; they
# appear in the schema as columns but emit "-" until signals are chosen.
# This is explicit per the memory: "Zeta has measurement axes DORA
# doesn't ... These extend DORA, they don't replace it."
#
# Scope: a round = a git commit range (default main..HEAD).
#
# Usage:
#   tools/alignment/audit_skills.sh                   # main..HEAD, terse
#   tools/alignment/audit_skills.sh HEAD~20..HEAD     # explicit range
#   tools/alignment/audit_skills.sh --json            # JSON to stdout
#   tools/alignment/audit_skills.sh --md              # Markdown to stdout
#   tools/alignment/audit_skills.sh --out DIR         # write both files to DIR
#   tools/alignment/audit_skills.sh --stale N         # only list stale >= N
#
# Output files (when --out is given):
#   DIR/round-<N>-skills.json
#   DIR/round-<N>-skills.md
#
# Exit codes:
#   0   Clean run.
#   1   Stale-gate tripped (only if --gate <rounds> given; fails if any
#       skill has friction >= gate).
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
STALE_MIN=0
ROUND_LABEL=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --json) JSON=1; shift ;;
    --md) MD=1; shift ;;
    --out) OUT_DIR="$2"; shift 2 ;;
    --gate) GATE="$2"; shift 2 ;;
    --stale) STALE_MIN="$2"; shift 2 ;;
    --round) ROUND_LABEL="$2"; shift 2 ;;
    --help|-h) sed -n '3,60p' "$0"; exit 0 ;;
    *) RANGE="$1"; shift ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "audit_skills: git not on PATH" >&2; exit 2
fi

# ---- Skill roster ------------------------------------------------------------

declare -a SKILLS
for d in .claude/skills/*/; do
  [ -d "$d" ] || continue
  s="$(basename "$d")"
  # Skip retired / draft subtrees
  case "$s" in
    _retired|_drafts|_*) continue ;;
  esac
  [ -f "${d}SKILL.md" ] || continue
  SKILLS+=("$s")
done

# ---- Current round -----------------------------------------------------------
#
# Same convention as audit_personas.sh: the max "## Round N" header across
# every persona notebook is the authoritative current round.

current_round() {
  local max=0
  for nb in memory/persona/*/NOTEBOOK.md; do
    [ -f "$nb" ] || continue
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

# ---- Per-skill metrics -------------------------------------------------------

# Extract the owning-persona path from a skill file's "Reference patterns"
# or "Owned by" block. A skill without an explicit owner maps to "-".
skill_owner() {
  local skill="$1"
  local md=".claude/skills/${skill}/SKILL.md"
  # Look for `memory/persona/<name>/NOTEBOOK.md` references in the file.
  local hit
  hit="$(grep -oE 'memory/persona/[a-z0-9_-]+/NOTEBOOK\.md' "$md" 2>/dev/null | head -1 || true)"
  if [ -z "$hit" ]; then
    echo ""
    return
  fi
  echo "$hit" | sed -E 's|memory/persona/([^/]+)/NOTEBOOK\.md|\1|'
}

# Last-round signal for the skill's owning persona.
owner_last_round() {
  local owner="$1"
  [ -n "$owner" ] || { echo "0"; return; }
  local nb="memory/persona/${owner}/NOTEBOOK.md"
  [ -f "$nb" ] || { echo "0"; return; }
  r="$(grep -oE '^## Round [0-9]+' "$nb" | awk '{print $3}' | sort -n | tail -1)"
  echo "${r:-0}"
}

# Commit mentions of the skill name or its SKILL.md path in the range.
skill_commit_mentions() {
  local skill="$1"
  local out
  out="$(git log --pretty=format:'%B' "$RANGE" 2>/dev/null \
    | grep -cE "(\\.claude/skills/${skill}/|\\b${skill}\\b)" 2>/dev/null || true)"
  echo "${out:-0}"
}

# File-churn: commits in range that touched this skill's SKILL.md.
skill_file_churn() {
  local skill="$1"
  local path=".claude/skills/${skill}/SKILL.md"
  local out
  out="$(git log --pretty=format:'%H' "$RANGE" -- "$path" 2>/dev/null | grep -c . 2>/dev/null || true)"
  echo "${out:-0}"
}

# Notebook mentions of the skill name in any persona notebook.
skill_notebook_mentions() {
  local skill="$1"
  local total=0
  local c
  for nb in memory/persona/*/NOTEBOOK.md; do
    [ -f "$nb" ] || continue
    c="$(grep -cE "\\b${skill}\\b" "$nb" 2>/dev/null || true)"
    c="${c:-0}"
    # Normalise to a single integer (grep -c on one file returns one line).
    total=$((total + c))
  done
  echo "$total"
}

# Collect per-skill rows.
TOTAL=${#SKILLS[@]}
TOUCHED=0
declare -a ROWS
for s in "${SKILLS[@]}"; do
  owner="$(skill_owner "$s")"
  lr="$(owner_last_round "${owner:-}")"
  if [ "$lr" -eq 0 ]; then
    friction="-"
  else
    friction="$((CR - lr))"
  fi
  mentions="$(skill_commit_mentions "$s")"
  nb_mentions="$(skill_notebook_mentions "$s")"
  churn="$(skill_file_churn "$s")"
  throughput="$((mentions + nb_mentions))"
  # Mentioned-but-not-edited = individual-effectiveness proxy
  if [ "$throughput" -gt 0 ] && [ "$churn" -eq 0 ]; then
    effectiveness=1
  else
    effectiveness=0
  fi
  # Touched = fired this round (any mention OR any edit).
  if [ "$throughput" -gt 0 ] || [ "$churn" -gt 0 ]; then
    touched=1
    TOUCHED=$((TOUCHED + 1))
  else
    touched=0
  fi
  # Apply stale filter if asked
  if [ "$STALE_MIN" -gt 0 ]; then
    if [ "$friction" = "-" ] || [ "$friction" -lt "$STALE_MIN" ]; then
      continue
    fi
  fi
  ROWS+=("${s}|${owner:-"-"}|${lr}|${friction}|${throughput}|${churn}|${effectiveness}|${touched}")
done

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
  printf '  "schema": "DORA-2025-skill-scope-v1",\n'
  printf '  "roster_total": %d,\n' "$TOTAL"
  printf '  "roster_touched": %d,\n' "$TOUCHED"
  printf '  "roster_coverage": %s,\n' "$COVERAGE"
  printf '  "skills": [\n'
  local first=1
  for row in "${ROWS[@]}"; do
    IFS='|' read -r s owner lr friction throughput churn effectiveness touched <<< "$row"
    if [ "$first" -eq 1 ]; then first=0; else printf ',\n'; fi
    printf '    {"name": "%s", "owner": "%s", "owner_last_round": %s, "dora_friction_rounds": "%s", "dora_throughput": %s, "dora_instability": %s, "dora_individual_effectiveness": %s, "touched_this_round": %s, "dora_unmeasured": ["organizational_performance","team_performance","product_performance","code_quality","valuable_work","burnout"]}' \
      "$s" "$owner" "$lr" "$friction" "$throughput" "$churn" "$effectiveness" "$touched"
  done
  printf '\n  ]\n}\n'
}

# ---- Emit: Markdown ----------------------------------------------------------

emit_md() {
  echo "# Skill runtime audit — round ${ROUND_LABEL}"
  echo ""
  echo "Range audited: \`${RANGE}\`. Schema: \`DORA-2025-skill-scope-v1\`."
  echo ""
  echo "Roster coverage: **${TOUCHED} / ${TOTAL}** (${COVERAGE})."
  echo ""
  echo "DORA columns adapted to skill scope (the six columns with no"
  echo "reliable skill-scope signal today emit \`-\`; see header comment"
  echo "in \`tools/alignment/audit_skills.sh\` for the mapping rationale):"
  echo ""
  echo "| Skill | Owner | Last round | Friction (#9) | Throughput (#4) | Instability (#5) | Ind. effectiveness (#7) | Touched |"
  echo "| --- | --- | --- | --- | --- | --- | --- | --- |"
  for row in "${ROWS[@]}"; do
    IFS='|' read -r s owner lr friction throughput churn effectiveness touched <<< "$row"
    if [ "$touched" = "1" ]; then mark="yes"; else mark="no"; fi
    if [ "$lr" = "0" ]; then lr_cell="(none)"; else lr_cell="$lr"; fi
    echo "| ${s} | ${owner} | ${lr_cell} | ${friction} | ${throughput} | ${churn} | ${effectiveness} | ${mark} |"
  done
  echo ""
  echo "Source of truth:"
  echo ""
  echo "- \`.claude/skills/<skill>/SKILL.md\` for roster + owner mapping;"
  echo "- \`memory/persona/<owner>/NOTEBOOK.md\` for owner-last-round;"
  echo "- \`git log ${RANGE}\` for commit mentions and file-churn."
  echo ""
  echo "No external DB. Replaces no existing skill-audit surface;"
  echo "pairs with \`audit_personas.sh\` for a full runtime view."
}

# ---- Dispatch ----------------------------------------------------------------

if [ -n "$OUT_DIR" ]; then
  mkdir -p "$OUT_DIR"
  emit_json > "${OUT_DIR}/round-${ROUND_LABEL}-skills.json"
  emit_md > "${OUT_DIR}/round-${ROUND_LABEL}-skills.md"
  echo "audit_skills: wrote ${OUT_DIR}/round-${ROUND_LABEL}-skills.{json,md}"
elif [ "$JSON" -eq 1 ]; then
  emit_json
elif [ "$MD" -eq 1 ]; then
  emit_md
else
  # Default: short human-readable summary
  echo "round=${ROUND_LABEL} range=${RANGE} coverage=${TOUCHED}/${TOTAL} (${COVERAGE})"
  for row in "${ROWS[@]}"; do
    IFS='|' read -r s owner lr friction throughput churn effectiveness touched <<< "$row"
    if [ "$lr" = "0" ]; then lr_cell="-"; else lr_cell="r${lr}"; fi
    printf '  %-40s owner=%-20s last=%-5s friction=%-3s thru=%-3s churn=%-3s eff=%s\n' \
      "$s" "${owner}" "$lr_cell" "$friction" "$throughput" "$churn" "$effectiveness"
  done
fi

# ---- Gate --------------------------------------------------------------------

if [ -n "$GATE" ]; then
  FAIL=0
  for row in "${ROWS[@]}"; do
    IFS='|' read -r s owner lr friction throughput churn effectiveness touched <<< "$row"
    [ "$friction" = "-" ] && continue
    if [ "$friction" -ge "$GATE" ]; then
      echo "audit_skills: ${s} friction=${friction} >= gate ${GATE}" >&2
      FAIL=1
    fi
  done
  [ "$FAIL" -eq 0 ] || exit 1
fi
