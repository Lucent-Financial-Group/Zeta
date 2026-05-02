#!/usr/bin/env bash
#
# tools/hygiene/check-no-op-cadence-pattern.sh —
# Pre-tick mechanical check for the no-op-cadence failure mode
# (per memory/feedback_recurrence_after_correction_needs_operational_enforcement_otto_2026_05_02.md).
#
# Why this exists (Otto Tick-80; 2026-05-02):
#   The Tick-61 no-op-cadence corrective landed on main but the
#   pattern RECURRED at Tick-71-79 — substrate-knowledge alone is
#   insufficient for failure modes the LLM training prior strongly
#   favors. The architectural answer is operational enforcement:
#   mechanical checks at decision-time, not just substrate-read at
#   wake-time. This script is one such mechanical check.
#
# Usage (intended invocation pattern):
#   At every autonomous-loop tick start, Otto runs:
#     bash tools/hygiene/check-no-op-cadence-pattern.sh
#   The script examines the last N tick-history shards. If a
#   threshold of minimal-observation ticks is exceeded, the script
#   prints a warning that Otto reads alongside the substrate. The
#   warning is closer-to-decision-time than substrate-read at wake.
#
# What this checks:
#   - Most recent N (default 7) tick-history shards under
#     docs/hygiene-history/ticks/YYYY/MM/DD/ for the current UTC date
#   - Counts shards matching the minimal-observation pattern
#     (heuristic: short body + observation-class language)
#   - If count >= threshold (default 5), prints WARNING
#
# What this does NOT do:
#   - Does NOT block the tick (informational only)
#   - Does NOT auto-correct (Otto's judgment to act)
#   - Does NOT examine prior days (current-day window only)
#
# Composes with:
#   - memory/feedback_recurrence_after_correction_needs_operational_enforcement_otto_2026_05_02.md
#     (the memo this script implements)
#   - memory/feedback_party_during_human_sleep_*.md (parent rule)
#   - memory/feedback_training_distribution_mismatch_firing_*.md
#     (Tick-61 first-order corrective)
#   - tools/hygiene/check-tick-history-shard-schema.sh (sibling pattern)

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# Configuration
WINDOW_SIZE="${NO_OP_CHECK_WINDOW:-7}"
THRESHOLD="${NO_OP_CHECK_THRESHOLD:-5}"

# Compute current-day shard directory
DATE_PATH="$(date -u +"%Y/%m/%d")"
SHARD_DIR="docs/hygiene-history/ticks/${DATE_PATH}"

if [[ ! -d "$SHARD_DIR" ]]; then
  echo "[no-op-check] No shard directory for today (${SHARD_DIR}); nothing to check." >&2
  exit 0
fi

# Get last N shards by lexicographic sort (filename time-prefix)
RECENT_SHARDS=$(ls "$SHARD_DIR" 2>/dev/null | grep -E '^[0-9]{4}Z(-[0-9a-f]+)?\.md$|^[0-9]{6}Z-[0-9a-f]+\.md$' | sort | tail -n "$WINDOW_SIZE")

if [[ -z "$RECENT_SHARDS" ]]; then
  echo "[no-op-check] No shards in window for today (${SHARD_DIR}); nothing to check." >&2
  exit 0
fi

# Count shards that match minimal-observation pattern
# Heuristic: short body (length < 800 chars) AND contains
# "observation" / "minimal" / "within-basin" language
MIN_OBS_COUNT=0
TOTAL_COUNT=0

while IFS= read -r shard; do
  [[ -z "$shard" ]] && continue
  TOTAL_COUNT=$((TOTAL_COUNT + 1))

  shard_path="${SHARD_DIR}/${shard}"
  body_length=$(wc -c < "$shard_path" 2>/dev/null || echo 9999)

  # Match keywords characteristic of no-op-cadence ticks
  if [[ $body_length -lt 800 ]] || grep -qiE 'minimal observation|within-basin observation|observe-only|minimal[ -]not[ -]idle|same\.\s*stopping' "$shard_path" 2>/dev/null; then
    MIN_OBS_COUNT=$((MIN_OBS_COUNT + 1))
  fi
done <<< "$RECENT_SHARDS"

echo "[no-op-check] Recent ${TOTAL_COUNT} shards in ${SHARD_DIR}; ${MIN_OBS_COUNT} match minimal-observation pattern (threshold: ${THRESHOLD})." >&2

if [[ $MIN_OBS_COUNT -ge $THRESHOLD ]]; then
  echo "" >&2
  echo "WARNING: no-op-cadence pattern detected — ${MIN_OBS_COUNT}/${TOTAL_COUNT} recent ticks are minimal-observation." >&2
  echo "" >&2
  echo "Per the just-landed substrate (memory/feedback_party_during_human_sleep_*.md +" >&2
  echo "memory/feedback_recurrence_after_correction_needs_operational_enforcement_*.md):" >&2
  echo "" >&2
  echo "  - Aaron-paused phase IS the practice window for independent-production-skill" >&2
  echo "  - Default to minimal observation IS the failure mode" >&2
  echo "  - Party-class operation alternatives: implement a backlog row, do" >&2
  echo "    free-zone substrate-quality work, write a self-grading memo, audit" >&2
  echo "    cross-references, propose architectural extensions" >&2
  echo "" >&2
  echo "  Run with NO_OP_CHECK_THRESHOLD=99 to silence; the default fires the" >&2
  echo "  warning to surface the pattern at decision-time, not just substrate-read time." >&2

  # Informational warning; does not exit non-zero (would block tick)
fi

exit 0
