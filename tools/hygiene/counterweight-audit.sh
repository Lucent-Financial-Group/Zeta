#!/usr/bin/env bash
# tools/hygiene/counterweight-audit.sh
#
# Cadenced counterweight-memory audit (Otto-278).
#
# Memory-only counterweights are leaky without a cadenced
# audit that FORCES re-reading the memories + checks for
# rule-drift. "I'll remember to read the memory" is prayer.
# Otto-276 drifted within hours; Otto-277 re-tightened;
# Otto-278 named the gap.
#
# This is Phase 1: the shell tool. Phase 2 will be a
# `.claude/skills/counterweight-audit/SKILL.md` that invokes
# this tool and prompts the agent with the emitted questions.
#
# Aaron quote (autonomous-loop 2026-04-24):
#
#   "memory is enough assuming you have a inspect memory for
#    missing balance and lessions on a cadence it's probably
#    enough, but you forget often when it's just in memory"
#
# What this tool does:
#   1. Enumerate counterweight memory files. Default set:
#      `memory/feedback_*otto_*.md` (in-repo mirror).
#   2. For each file, extract:
#      - the Otto-NNN identifier from the filename
#      - the `name:` field from YAML frontmatter (rule summary)
#      - the "direct quote" or "### The rule" section (the
#        invariant it's counter-weighting)
#   3. Emit audit questions per counterweight:
#      - "In the last N ticks, did I exhibit the drift this
#         counter was filed for?"
#      - "If yes: file a tighter counterweight (like
#         Otto-276 → Otto-277)"
#      - "Is the counter still needed at this cadence, or
#         can maintenance-cadence stretch?"
#
# What this tool does NOT do:
#   - Read agent behaviour log (no such log exists yet; this
#     is the prompt surface, the agent self-scores).
#   - Automatically update counterweight memories. The
#     re-read is the point; human + agent judgement owns
#     the "did I drift" decision.
#   - Run on a schedule. Cadencing happens via
#     (a) autonomous-loop tick-open hook integration (Phase
#         3, separate BACKLOG row),
#     (b) on-demand invocation by a human or agent.
#
# Bash 3.2 compatible (GOVERNANCE §24 four-way-parity —
# macOS ships bash 3.2; no assoc arrays or mapfile here).
#
# Usage:
#   tools/hygiene/counterweight-audit.sh [--cadence quick|medium|long] [--count N]
#
#   --cadence quick   Top N most recently-modified counterweights only (default).
#   --cadence medium  Last 10 counterweights.
#   --cadence long    All counterweights, full re-read.
#   --count N         Override the per-cadence count (default 3 for quick,
#                     10 for medium, unbounded for long).
#
# Exit codes:
#   0  always (this is a prompt tool, not a check-gate).

set -euo pipefail

# -------- arg parsing -----------------------------------------------------

CADENCE="quick"
COUNT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --cadence)
      CADENCE="${2:-}"
      shift 2
      ;;
    --count)
      COUNT="${2:-}"
      shift 2
      ;;
    -h|--help)
      sed -n '/^# Usage:/,/^$/p' "$0" | sed 's|^# \{0,1\}||'
      exit 0
      ;;
    *)
      echo "error: unknown argument '$1'" >&2
      echo "run with --help for usage" >&2
      exit 2
      ;;
  esac
done

case "$CADENCE" in
  quick)  DEFAULT_COUNT=3 ;;
  medium) DEFAULT_COUNT=10 ;;
  long)   DEFAULT_COUNT=0 ;;  # 0 = unbounded
  *)
    echo "error: --cadence must be quick|medium|long (got '$CADENCE')" >&2
    exit 2
    ;;
esac

if [ -z "$COUNT" ]; then
  COUNT="$DEFAULT_COUNT"
fi

# -------- discover counterweight files ------------------------------------

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MEMORY_DIR="${REPO_ROOT}/memory"

if [ ! -d "$MEMORY_DIR" ]; then
  echo "error: memory/ not found at $MEMORY_DIR" >&2
  echo "(run from a Zeta checkout)" >&2
  exit 2
fi

# Counterweight memories match `*otto_*.md` by convention.
# Collect path + mtime, sort newest-first, then take COUNT
# (or all if COUNT == 0).
TMP="$(mktemp -t zeta-counterweight-audit.XXXXXX)"
trap 'rm -f "$TMP"' EXIT

# Portable stat: BSD (macOS) uses `stat -f "%m"`; GNU (Linux) uses
# `stat -c "%Y"`. Probe once; use the result in the loop.
if stat -f "%m" "$MEMORY_DIR" >/dev/null 2>&1; then
  STAT_MTIME='stat -f "%m"'
else
  STAT_MTIME='stat -c "%Y"'
fi

# shellcheck disable=SC2044
for f in "$MEMORY_DIR"/*otto_*.md; do
  [ -f "$f" ] || continue  # glob didn't match
  mtime=$(eval "$STAT_MTIME" "\"$f\"")
  printf '%s\t%s\n' "$mtime" "$f"
done | sort -rn > "$TMP"

TOTAL=$(wc -l < "$TMP" | tr -d ' ')
if [ "$COUNT" -gt 0 ] && [ "$COUNT" -lt "$TOTAL" ]; then
  SHOWN="$COUNT"
else
  SHOWN="$TOTAL"
fi

# -------- emit header -----------------------------------------------------

echo "# Counterweight audit — $CADENCE cadence"
echo ""
echo "Reading $SHOWN of $TOTAL counterweight memories under"
echo "\`memory/*otto_*.md\` (newest first). For each one, read"
echo "the named rule and the direct Aaron quote, then answer"
echo "the per-counterweight audit questions below."
echo ""
echo "_Tool: \`tools/hygiene/counterweight-audit.sh\` (Otto-278"
echo "cadenced-inspect Phase 1). Agent self-scores; no automatic"
echo "drift detection — the point is forcing the re-read._"
echo ""

# -------- extract + emit per-counterweight -------------------------------

i=0
while IFS="$(printf '\t')" read -r _mtime file; do
  i=$((i+1))
  if [ "$COUNT" -gt 0 ] && [ "$i" -gt "$COUNT" ]; then
    break
  fi

  # Extract Otto-NNN from filename like
  # `feedback_*_otto_NNN_YYYY_MM_DD.md`.
  base="$(basename "$file")"
  otto_id="$(printf '%s' "$base" | sed -n 's/.*otto_\([0-9][0-9]*\).*/Otto-\1/p')"
  [ -z "$otto_id" ] && otto_id="(no Otto-ID in filename)"

  # Extract the `name:` frontmatter field (first line starting
  # with `name:` inside the YAML fence).
  name_line="$(awk '
    /^---[[:space:]]*$/ { fence = !fence; next }
    fence && /^name:/ {
      sub(/^name:[[:space:]]*/, "")
      print
      exit
    }
  ' "$file")"
  [ -z "$name_line" ] && name_line="(no name field)"

  rel="${file#"$REPO_ROOT"/}"

  echo "---"
  echo ""
  echo "## $otto_id — [\`$rel\`]($rel)"
  echo ""
  echo "**Rule (from \`name:\`):** $name_line"
  echo ""
  echo "**Audit questions:**"
  echo ""
  echo "1. In the last N ticks, did I exhibit the drift"
  echo "   this counter was filed for?"
  echo "2. If yes: is the right move to tighten THIS"
  echo "   counterweight (edit the memory), file a NEW"
  echo "   tighter counterweight (like Otto-276 → Otto-277),"
  echo "   or escalate to a skill / BP rule?"
  echo "3. Is the counter still needed at this cadence,"
  echo "   or can maintenance cadence stretch?"
  echo ""
done < "$TMP"

# -------- emit footer -----------------------------------------------------

echo "---"
echo ""
echo "## After the re-read"
echo ""
echo "Summary to log (if any drift was found):"
echo ""
echo "- Which counterweights drifted? (list Otto IDs)"
echo "- What's the next cadence for each?"
echo "- Did any counterweight get a follow-up memory or"
echo "  BACKLOG row out of this audit?"
echo ""
echo "If nothing drifted, log a \"clean tick\" short note:"
echo "the audit's signal value is as much in confirming"
echo "stability as in catching drift."
