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
#     docs/hygiene-history/ticks/YYYY/MM/DD/ for today AND yesterday
#     UTC (window survives midnight rollover)
#   - Counts shards matching the minimal-observation pattern.
#     Heuristic (OR-semantic): the shard's BODY column (5th pipe-
#     separated field) is < 600 chars, OR the row contains
#     observation-class language ("minimal observation",
#     "within-basin observation", "observe-only",
#     "minimal not idle", "same. stopping"). Either signal counts.
#   - If count >= threshold (default 5), prints WARNING
#
# What this does NOT do:
#   - Does NOT block the tick (informational only — exit 0 always)
#   - Does NOT auto-correct (the agent's judgment to act)
#   - Does NOT examine days older than yesterday
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

# Configuration with numeric validation. A typo like
# `NO_OP_CHECK_WINDOW=foo` would otherwise make `tail -n` fail under
# `set -e` and defeat the "informational only" promise.
WINDOW_SIZE="${NO_OP_CHECK_WINDOW:-7}"
THRESHOLD="${NO_OP_CHECK_THRESHOLD:-5}"

# `10#$VAR` forces base-10 interpretation in arithmetic context. Without
# it, a zero-padded value like `08` would be parsed as octal (and fail
# with "value too great for base"), defeating the validation guard.
if ! [[ "$WINDOW_SIZE" =~ ^[0-9]+$ ]] || (( 10#$WINDOW_SIZE < 1 )); then
  echo "[no-op-check] Invalid NO_OP_CHECK_WINDOW='${WINDOW_SIZE}' (need positive integer); using default 7." >&2
  WINDOW_SIZE=7
fi
if ! [[ "$THRESHOLD" =~ ^[0-9]+$ ]] || (( 10#$THRESHOLD < 1 )); then
  echo "[no-op-check] Invalid NO_OP_CHECK_THRESHOLD='${THRESHOLD}' (need positive integer); using default 5." >&2
  THRESHOLD=5
fi
# Normalize to base-10 (strip leading zeros) so subsequent arithmetic
# comparisons + tail -n usage are unambiguous regardless of input format.
WINDOW_SIZE=$((10#$WINDOW_SIZE))
THRESHOLD=$((10#$THRESHOLD))

# Compute today + yesterday shard directories.
# `date -u -v-1d` is BSD/macOS; `date -u -d "yesterday"` is GNU/Linux.
# Both supported per Otto-235 4-shell target.
TODAY_DATE_PATH="$(date -u +"%Y/%m/%d")"
TODAY_DATE_FLAT="$(date -u +"%Y%m%d")"
TODAY_DIR="docs/hygiene-history/ticks/${TODAY_DATE_PATH}"

if YESTERDAY_DATE_PATH="$(date -u -v-1d +"%Y/%m/%d" 2>/dev/null)"; then
  YESTERDAY_DATE_FLAT="$(date -u -v-1d +"%Y%m%d")"
elif YESTERDAY_DATE_PATH="$(date -u -d "yesterday" +"%Y/%m/%d" 2>/dev/null)"; then
  YESTERDAY_DATE_FLAT="$(date -u -d "yesterday" +"%Y%m%d")"
else
  YESTERDAY_DATE_PATH=""
  YESTERDAY_DATE_FLAT=""
fi
YESTERDAY_DIR=""
if [[ -n "$YESTERDAY_DATE_PATH" ]]; then
  YESTERDAY_DIR="docs/hygiene-history/ticks/${YESTERDAY_DATE_PATH}"
fi

# Collect candidate shards from a directory, emitting tab-separated
# `<primary-key>\t<disambiguator>\t<full-path>` lines. Primary key is
# YYYYMMDDHHMMSS (parsed timestamp, NOT raw filename) so mixed-format
# shards order correctly per the README mixed-format-sort caveat.
# Disambiguator is the suffix (empty for unsuffixed `HHMMZ.md`) so a
# base shard sorts BEFORE same-minute disambiguators (`HHMMZ.md` <
# `HHMMZ-01.md`) — empty disambiguator sorts first because the field
# separator (tab) is lower-ASCII than any hex character.
#   - HHMMZ.md           → primary=YYYYMMDDHHMM00, disambiguator=""
#   - HHMMZ-<hex>.md     → primary=YYYYMMDDHHMM00, disambiguator="<hex>"
#   - HHMMSSZ-<hex>.md   → primary=YYYYMMDDHHMMSS, disambiguator="<hex>"
collect_shards() {
  local dir="$1"
  local date_flat="$2"
  [[ -d "$dir" && -n "$date_flat" ]] || return 0
  local shard_path shard_name primary disamb
  shopt -s nullglob
  for shard_path in "$dir"/*.md; do
    shard_name="${shard_path##*/}"
    if [[ "$shard_name" =~ ^([0-9]{4})Z(-([0-9a-f]+))?\.md$ ]]; then
      primary="${date_flat}${BASH_REMATCH[1]}00"
      disamb="${BASH_REMATCH[3]:-}"
      printf '%s|%s|%s\n' "$primary" "$disamb" "$shard_path"
    elif [[ "$shard_name" =~ ^([0-9]{6})Z-([0-9a-f]+)\.md$ ]]; then
      primary="${date_flat}${BASH_REMATCH[1]}"
      disamb="${BASH_REMATCH[2]}"
      printf '%s|%s|%s\n' "$primary" "$disamb" "$shard_path"
    fi
  done
  shopt -u nullglob
}

# Combined list, sorted by primary key then disambiguator, last N entries.
# Field separator is `|` (non-whitespace) because bash's IFS-whitespace
# collapsing rule would silently merge an empty disambiguator field with
# the surrounding tabs and corrupt the read loop below.
COMBINED="$( { collect_shards "$YESTERDAY_DIR" "$YESTERDAY_DATE_FLAT"; collect_shards "$TODAY_DIR" "$TODAY_DATE_FLAT"; } | sort -t'|' -k1,1 -k2,2 | tail -n "$WINDOW_SIZE" )"

if [[ -z "$COMBINED" ]]; then
  echo "[no-op-check] No shards in window for today (${TODAY_DIR}) or yesterday; nothing to check." >&2
  exit 0
fi

# Count shards that match minimal-observation pattern.
# Heuristic (OR-semantic, matching the header docstring):
#   short BODY column (length < 600 chars) OR observation-class language
#   anywhere in the row.
# Body is the 5th pipe-separated field per shard schema:
#   `| timestamp | model | cron-id | <body> | <PR ref> | <observation> |`
# Measuring whole-file size (previous behavior) inflated the length
# count when the observation column was long, masking terse-body ticks.
MIN_OBS_COUNT=0
TOTAL_COUNT=0

while IFS='|' read -r _primary _disamb shard_path; do
  [[ -z "${shard_path:-}" ]] && continue
  TOTAL_COUNT=$((TOTAL_COUNT + 1))

  body=$(awk -F'|' 'NR==1 {print $5}' "$shard_path" 2>/dev/null || echo "")
  body_length=${#body}

  if (( body_length < 600 )) || grep -qiE 'minimal observation|within-basin observation|observe-only|minimal[ -]not[ -]idle|same\.\s*stopping' "$shard_path" 2>/dev/null; then
    MIN_OBS_COUNT=$((MIN_OBS_COUNT + 1))
  fi
done <<< "$COMBINED"

echo "[no-op-check] Recent ${TOTAL_COUNT} shards across today+yesterday; ${MIN_OBS_COUNT} match minimal-observation pattern (threshold: ${THRESHOLD})." >&2

if [[ $MIN_OBS_COUNT -ge $THRESHOLD ]]; then
  echo "" >&2
  echo "WARNING: no-op-cadence pattern detected — ${MIN_OBS_COUNT}/${TOTAL_COUNT} recent ticks are minimal-observation." >&2
  echo "" >&2
  echo "Per the just-landed substrate (memory/feedback_party_during_human_sleep_*.md +" >&2
  echo "memory/feedback_recurrence_after_correction_needs_operational_enforcement_*.md):" >&2
  echo "" >&2
  echo "  - The human-paused phase IS the practice window for independent-production-skill" >&2
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
