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
# Usage:
#   tools/hygiene/check-tick-history-shard-schema.sh
#       — full-tree audit; scans every shard under
#         docs/hygiene-history/ticks/. Default mode used by
#         manual runs and full-tree audits.
#   tools/hygiene/check-tick-history-shard-schema.sh --files PATH...
#       — restricted audit; scans only the listed shard files.
#         Shape that pre-push hooks and per-PR CI jobs want, so
#         they can run only on changed shards instead of failing
#         on the 5 known-stale shards documented below. Each
#         path must be a real file ending in .md under the shard
#         directory; non-shard paths are silently skipped (so the
#         caller can pass a broader file list, e.g. all changed
#         files in a PR diff).
#
# What this checks (per shard):
#   1. Filename matches HHMMZ.md or HHMMSSZ-<hash>.md per the
#      schema in docs/hygiene-history/ticks/README.md.
#   2. First non-empty line is a 6-column markdown table row
#      starting with `| YYYY-MM-DDTHH:MM(:SS)?Z |` — exactly the
#      ISO timestamp, no parenthetical, no extra prose, no
#      leading whitespace beyond the standard `| `. Both the
#      with-seconds and no-seconds forms are valid ISO-8601 UTC.
#   3. The col1 timestamp's date + HH:MM matches the filename's
#      path date and HHMM.
#
# What this does NOT check:
#   - Body content (cols 4-6) — intentionally free-form prose.
#   - Strict col2/col3 enforcement — the lower columns have
#     drifted in practice (col3 commonly carries a commit SHA
#     instead of the cron sentinel); enforcing that would be
#     its own clean-up effort.
#   - The prefab pattern (col1 timestamp ≫ commit-author time)
#     — requires git-log access not available pre-push for the
#     current commit. See
#     `memory/feedback_tick_history_prefabricated_shards_codex_finding_audit_trail_integrity_2026_04_30.md`
#     for the deferred check.
#
# Exit codes:
#   0 — all checked shards valid
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
#   mode (full-tree); the --files mode IS safe to wire into
#   pre-push immediately because it only checks the caller's
#   stated set, not the full tree.

set -euo pipefail

ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)}"
SHARD_DIR="$ROOT/docs/hygiene-history/ticks"

# Argument parsing.
files_mode=0
files=()
if [ $# -gt 0 ] && [ "$1" = "--files" ]; then
  files_mode=1
  shift
  files=("$@")
fi

if [ "$files_mode" -eq 0 ] && [ ! -d "$SHARD_DIR" ]; then
  echo "error: $SHARD_DIR does not exist" >&2
  exit 2
fi

violations=0
total=0

# Per-shard validator. Echos VIOLATION lines on stderr and
# returns 0 if the shard is fine, 1 if a violation was found.
# Shellcheck note: this function uses early-return semantics
# instead of `continue` because it's invoked outside the find
# loop too (in --files mode).
scan_one() {
  local shard="$1"
  total=$((total + 1))
  local base path_rel parts yyyy rest_a mm rest_b dd hhmm hh mm_of_hour
  local first_line line ts ts_yyyy ts_mm ts_dd ts_hh ts_min

  base="$(basename "$shard" .md)"
  path_rel="${shard#"$ROOT/"}"

  # Extract YYYY/MM/DD from path components.
  parts="${path_rel#docs/hygiene-history/ticks/}"
  yyyy="${parts%%/*}"
  rest_a="${parts#*/}"
  mm="${rest_a%%/*}"
  rest_b="${rest_a#*/}"
  dd="${rest_b%%/*}"

  # Filename HHMM extraction. Per docs/hygiene-history/ticks/README.md
  # the accepted forms are:
  #   - `HHMMZ.md` — bare four-digit form (with optional disambiguator)
  #   - `HHMMSSZ-<hash>.md` — six-digit-with-hash form (the recommended
  #     high-concurrency form; the hash suffix is REQUIRED, not optional —
  #     bare `HHMMSSZ.md` would weaken the collision-avoidance rule the
  #     hash exists for)
  # Codex P2 review on PR #977 caught the earlier optional-hash regex.
  if [[ "$base" =~ ^([0-9]{4})Z(-[0-9a-f]+)?$ ]]; then
    hhmm="${BASH_REMATCH[1]}"
  elif [[ "$base" =~ ^([0-9]{4})([0-9]{2})Z-[0-9a-f]+$ ]]; then
    hhmm="${BASH_REMATCH[1]}"
  else
    echo "VIOLATION: $path_rel — filename does not match HHMMZ.md or HHMMSSZ-<hash>.md schema" >&2
    return 1
  fi
  hh="${hhmm:0:2}"
  mm_of_hour="${hhmm:2:2}"

  # First non-empty line.
  first_line=""
  while IFS= read -r line; do
    if [ -n "${line// }" ]; then
      first_line="$line"
      break
    fi
  done < "$shard"

  if [ -z "$first_line" ]; then
    echo "VIOLATION: $path_rel — file is empty or whitespace-only" >&2
    return 1
  fi

  # Schema rule: row must be a 6-column markdown table — col1
  # = ISO-8601 UTC timestamp, then 5 more columns (model id,
  # cron sentinel, body, PR ref, observation) per
  # docs/hygiene-history/ticks/README.md. Codex P2 review on
  # PR #977 caught that the col1-only check accepted rows
  # like `| <ts> | a |` with too few columns. The 6-column
  # enforcement runs first; the col1 regex only fires if the
  # column count is right.
  pipe_count=$(awk -F'|' '{print NF-1}' <<< "$first_line")
  # 6 columns => 7 pipes (one before col1, one between each pair, one
  # after col6). Allow 7 or 8 to tolerate trailing whitespace.
  if [ "$pipe_count" -lt 7 ]; then
    echo "VIOLATION: $path_rel — first row has $pipe_count pipe characters; schema requires 6 columns (7 pipes including the trailing one)" >&2
    echo "  got: $(echo "$first_line" | head -c 120)" >&2
    return 1
  fi

  # Schema rule: col1 must be `| YYYY-MM-DDTHH:MM(:SS)?Z |`
  # exactly, with no parenthetical or extra prose. Both ISO
  # forms are valid UTC; the schema doesn't pick a side.
  if [[ "$first_line" =~ ^\|\ ([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z)\ \|\  ]]; then
    ts="${BASH_REMATCH[1]}"
    ts_yyyy="${ts:0:4}"
    ts_mm="${ts:5:2}"
    ts_dd="${ts:8:2}"
    ts_hh="${ts:11:2}"
    ts_min="${ts:14:2}"

    if [ "$ts_yyyy" != "$yyyy" ] || [ "$ts_mm" != "$mm" ] || [ "$ts_dd" != "$dd" ]; then
      echo "VIOLATION: $path_rel — col1 timestamp $ts does not match path date $yyyy-$mm-$dd" >&2
      return 1
    fi

    if [ "$ts_hh" != "$hh" ] || [ "$ts_min" != "$mm_of_hour" ]; then
      echo "VIOLATION: $path_rel — col1 timestamp ${ts_hh}:${ts_min} does not match filename ${hh}:${mm_of_hour}" >&2
      return 1
    fi
  else
    echo "VIOLATION: $path_rel — col1 must be exactly '| YYYY-MM-DDTHH:MM(:SS)?Z | ...' (no parenthetical, no extra prose)" >&2
    echo "  got: $(echo "$first_line" | head -c 120)" >&2
    return 1
  fi

  return 0
}

if [ "$files_mode" -eq 1 ]; then
  # --files mode: scan only the listed paths. Skip non-shard
  # paths silently so callers can pass a broader file list
  # (e.g. all changed files from `git diff --name-only`).
  for f in "${files[@]}"; do
    case "$f" in
      docs/hygiene-history/ticks/*/*.md)
        # Resolve to absolute path so scan_one's $ROOT prefix
        # stripping works. Bash case `*` matches `/` so this
        # glob covers the YYYY/MM/DD/<file>.md depth — verified
        # via test on PR #977 (Copilot reported a P0 here based
        # on misreading bash case glob semantics; closed form-2
        # because `*` in case patterns is greedy across `/`,
        # confirmed by running the script against real shard
        # paths like docs/hygiene-history/ticks/2026/04/30/2018Z.md
        # which match correctly).
        abs="$ROOT/$f"
        # Per the script header's "silently skipped" contract,
        # missing or non-shard paths emit no diagnostic. Codex
        # P2 review on PR #977 caught the earlier "skipped (not
        # a file)" stderr message that contradicted the contract.
        if [ ! -f "$abs" ]; then
          continue
        fi
        if [ "$(basename "$f")" = "README.md" ]; then
          continue
        fi
        if ! scan_one "$abs"; then
          violations=$((violations + 1))
        fi
        ;;
      *)
        # Not a shard path; silently skip.
        ;;
    esac
  done
else
  # Default mode: full-tree audit.
  while IFS= read -r -d '' shard; do
    if ! scan_one "$shard"; then
      violations=$((violations + 1))
    fi
  done < <(find "$SHARD_DIR" -type f -name '*.md' \
    ! -name 'README.md' \
    -print0)
fi

echo "checked $total shard files; $violations violations" >&2

if [ "$violations" -gt 0 ]; then
  exit 1
fi
exit 0
