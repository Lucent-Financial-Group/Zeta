#!/usr/bin/env bash
#
# tools/hygiene/check-tick-history-shard-schema.sh — validates
# that per-tick shard files under docs/hygiene-history/ticks/
# match the schema declared in docs/hygiene-history/ticks/README.md.
#
# Why this exists (2026-04-30):
#   The col1 schema (first cell = exactly an ISO-8601 UTC timestamp)
#   was repeatedly violated across 15+ shards on main (April 28-30)
#   plus 6+ open PRs. Each violation was caught at PR-review time
#   by Copilot, weeks-to-days after the shard was written. The
#   structural fix is a hygiene check that catches it at write
#   time instead of relying on each tick author's vigilance.
#
#   This is the "structural fix beats process discipline" pattern
#   per Otto-341 + the rediscoverable-from-main invariant on
#   docs/AUTONOMOUS-LOOP.md (added in PR #969): the invariant
#   requires schema uniformity on main; this check is the
#   mechanism that preserves it.
#
# What this checks:
#   1. Shard file exists at the canonical path
#      docs/hygiene-history/ticks/YYYY/MM/DD/<HHMMZ>.md
#      (or the extended HHMMSSZ-<hash>.md form per the schema's
#      high-concurrency option).
#   2. First non-empty line is a 6-column markdown table row
#      starting with `| YYYY-MM-DDTHH:MM:SSZ |` — exactly the ISO
#      timestamp, no parenthetical, no extra prose, no leading
#      whitespace beyond the standard `| `.
#   3. The timestamp inside col1 matches the filename's `HHMMZ`
#      — i.e. a shard at `2026/04/30/2304Z.md` must carry a col1
#      timestamp of `2026-04-30T23:04:??Z` (any second).
#
# What this does NOT do:
#   - Does NOT validate body content (cols 4-6). The body is
#     intentionally free-form prose.
#   - Does NOT enforce that col2 = `<model id>` or col3 =
#     `<cron sentinel>` strictly. The schema's lower columns
#     have drifted in practice (col3 commonly carries a commit
#     SHA instead of the cron sentinel); enforcing that would
#     be its own clean-up effort.
#   - Does NOT detect the prefab pattern (col1 timestamp
#     significantly ahead of commit-author time). That requires
#     git-log access which isn't available pre-push for the
#     current commit. See
#     `memory/feedback_tick_history_prefabricated_shards_codex_finding_audit_trail_integrity_2026_04_30.md`
#     for the deferred check.
#
# Exit codes:
#   0 — all shards valid
#   1 — one or more violations found (details on stderr)
#   2 — invocation error (script bug or missing inputs)
#
# Composes with:
#   - tools/hygiene/check-tick-history-order.sh (the legacy
#     monolithic-table order check; this is the per-shard
#     analogue for the post-shard-transport surface)
#   - docs/hygiene-history/ticks/README.md (the schema this
#     check enforces)
#   - .github/workflows/gate.yml (where this should be wired
#     as a lint job; not yet done — that's a follow-up)
#
# Current-state note (2026-04-30):
#   On the main branch as of this script's introduction, ~5
#   historical shards from April 28 violate this check (col1
#   contains a parenthetical after the timestamp). Those 5
#   shards are also implicated in the prefab-shard finding
#   filed at
#   `memory/feedback_tick_history_prefabricated_shards_codex_finding_audit_trail_integrity_2026_04_30.md`
#   — fixing col1 mechanically would launder the body-level
#   prefab claim. The check is therefore landed in DORMANT
#   mode (not yet wired into CI); a future cleanup PR resolves
#   the prefab-vs-schema decision before the check goes
#   binding.

set -euo pipefail

ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)}"
SHARD_DIR="$ROOT/docs/hygiene-history/ticks"

if [ ! -d "$SHARD_DIR" ]; then
  echo "error: $SHARD_DIR does not exist" >&2
  exit 2
fi

violations=0
total=0

# Find every shard file (skip README.md and any schema/* docs).
while IFS= read -r -d '' shard; do
  total=$((total + 1))
  base="$(basename "$shard" .md)"
  path_rel="${shard#"$ROOT/"}"

  # Extract YYYY/MM/DD from path components.
  parts="${path_rel#docs/hygiene-history/ticks/}"
  yyyy="${parts%%/*}"
  rest_a="${parts#*/}"
  mm="${rest_a%%/*}"
  rest_b="${rest_a#*/}"
  dd="${rest_b%%/*}"

  # Pull the HHMM from the filename (handle both HHMMZ and
  # HHMMSSZ-<hash> forms).
  if [[ "$base" =~ ^([0-9]{4})Z(-[0-9a-f]+)?$ ]]; then
    hhmm="${BASH_REMATCH[1]}"
  elif [[ "$base" =~ ^([0-9]{4})([0-9]{2})Z(-[0-9a-f]+)?$ ]]; then
    hhmm="${BASH_REMATCH[1]}"
  else
    echo "VIOLATION: $path_rel — filename does not match HHMMZ.md or HHMMSSZ-<hash>.md schema" >&2
    violations=$((violations + 1))
    continue
  fi
  hh="${hhmm:0:2}"
  mm_of_hour="${hhmm:2:2}"

  # Read the first non-empty line.
  first_line=""
  while IFS= read -r line; do
    if [ -n "${line// }" ]; then
      first_line="$line"
      break
    fi
  done < "$shard"

  if [ -z "$first_line" ]; then
    echo "VIOLATION: $path_rel — file is empty or whitespace-only" >&2
    violations=$((violations + 1))
    continue
  fi

  # Schema rule: first cell must be `| YYYY-MM-DDTHH:MM(:SS)?Z |`
  # with no extra content before the next column boundary. Both
  # the with-seconds form (`...T23:04:00Z`) and the no-seconds
  # form (`...T23:04Z`) are valid ISO-8601 UTC; the schema
  # in docs/hygiene-history/ticks/README.md does not pick a side.
  # Capture the timestamp and verify it matches the path.
  if [[ "$first_line" =~ ^\|\ ([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z)\ \|\  ]]; then
    ts="${BASH_REMATCH[1]}"
    ts_yyyy="${ts:0:4}"
    ts_mm="${ts:5:2}"
    ts_dd="${ts:8:2}"
    ts_hh="${ts:11:2}"
    ts_min="${ts:14:2}"

    if [ "$ts_yyyy" != "$yyyy" ] || [ "$ts_mm" != "$mm" ] || [ "$ts_dd" != "$dd" ]; then
      echo "VIOLATION: $path_rel — col1 timestamp $ts does not match path date $yyyy-$mm-$dd" >&2
      violations=$((violations + 1))
      continue
    fi

    if [ "$ts_hh" != "$hh" ] || [ "$ts_min" != "$mm_of_hour" ]; then
      echo "VIOLATION: $path_rel — col1 timestamp ${ts_hh}:${ts_min} does not match filename ${hh}:${mm_of_hour}" >&2
      violations=$((violations + 1))
      continue
    fi
  else
    echo "VIOLATION: $path_rel — col1 must be exactly '| YYYY-MM-DDTHH:MM:SSZ | ...' (no parenthetical, no extra prose)" >&2
    echo "  got: $(echo "$first_line" | head -c 120)" >&2
    violations=$((violations + 1))
    continue
  fi

done < <(find "$SHARD_DIR" -type f -name '*.md' \
  ! -name 'README.md' \
  -print0)

echo "checked $total shard files; $violations violations" >&2

if [ "$violations" -gt 0 ]; then
  exit 1
fi
exit 0
