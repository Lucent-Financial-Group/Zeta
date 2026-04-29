#!/usr/bin/env bash
#
# tools/lint/no-directives-otto-prose.sh — advisory lint that flags
# Otto-authored prose using "directive" framing for maintainer input
# in CHANGED FILES (diff-based; does not retrofit historical content).
#
# Born 2026-04-29 after the ~15th iteration of the same gremlin: a
# memory file or PR title casting maintainer correction/framing/input
# as "the maintainer's directive," which collapses self-provenance
# into bot-execution and undermines the no-directives autonomy rule
# (memory/feedback_otto_357_no_directives_aaron_makes_autonomy_first_class_accountability_mine_2026_04_27.md).
#
# Vigilance failed; lint is the durable answer.
#
# Per the "agency-framing lexeme guard" naming distinction (this is
# a LEXEME GUARD, not a LANE LOCK; lane locks stop classes of work,
# lexeme guards stop repeated wording drift) — the corresponding
# external-anchor / observer-legibility rule lives in
# memory/feedback_beacon_promotion_load_bearing_rules_earn_external_anchors_aaron_amara_2026_04_28.md.
#
# Per the B-0105 consolidation-pass carve-out: "tiny enforcement
# patches are allowed when they directly prevent repeated
# consolidation-gate violations."
#
# (Named-attribution carve-out: tooling-surface comments use
# role-refs per docs/AGENT-BEST-PRACTICES.md §named-attribution-
# carve-out. Persona names + dated review rounds belong on history
# surfaces — research notes, memory files, commit messages, tick
# shards — not in tooling source.)
#
# PORTABILITY (per Amara round-8 honest-naming catch):
#   This is a Bash + GNU-grep oriented advisory lint. NOT POSIX.
#   - Uses Bash here-strings (`<<<`), `set -euo pipefail`, etc.
#   - Uses GNU-grep `\b` word boundaries (extension, not POSIX).
#   - Targets: Linux CI runners + the 4-shell developer target
#     (macOS bash 3.2+ / Ubuntu / git-bash / WSL).
#
# SCOPE — two modes (per Amara round-8 pre-commit-vs-PR-diff catch):
#   pr (default)         — diff between BASE_REF and HEAD; matches
#                           the CI/PR-check use case. Misses local
#                           working-tree edits before commit.
#   worktree             — includes unstaged + staged + committed
#                           changes; matches the local pre-commit
#                           use case.
#
# Diff-based scope (both modes — avoids retrofitting historical):
#   - changed files (per SCOPE)
#   - intersected with Otto-authored prose surfaces:
#     - memory/*.md (top-level; not memory/persona/)
#     - docs/hygiene-history/ticks/**/*.md (tick shards)
#     - docs/research/*.md (research notes)
#     - .github/copilot-instructions.md
#
# Pattern (per Amara's narrowed regex):
#   "Aaron's directive" / "maintainer directive" / "QoL directive" /
#   "human directive" / "directive from Aaron" / etc.
#
# Whitelist (NOT flagged in changed files):
#   - lines starting with `> ` (markdown blockquote — usually quoted
#     third-party text)
#   - the rule-documentation files themselves
#   - HTML comments and paired-edit markers ARE in scope (the
#     paired-edit comment with "directive" in MEMORY.md was the
#     proof-case that motivated this lint).
#
# Usage:
#   tools/lint/no-directives-otto-prose.sh                 # PR-diff advisory
#   tools/lint/no-directives-otto-prose.sh --strict        # PR-diff strict
#   SCOPE=worktree tools/lint/no-directives-otto-prose.sh  # local pre-commit
#
# Env:
#   BASE_REF — base ref to diff against in pr mode (default: origin/main).
#              CI should set BASE_REF=$BASE_SHA.
#   SCOPE    — "pr" (default) or "worktree".

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

MODE="${1:-advisory}"
BASE_REF="${BASE_REF:-origin/main}"
SCOPE="${SCOPE:-pr}"

# Compute changed files per SCOPE. NOTE: do NOT suppress git-diff
# errors with `2>/dev/null || true` — that turns "couldn't resolve
# BASE_REF" into "no changed files; skipping" silently and makes
# the lint look clean when nothing was actually checked.
if [ "$SCOPE" = "worktree" ]; then
  CHANGED_FILES=$(
    {
      git diff --name-only --diff-filter=AM
      git diff --cached --name-only --diff-filter=AM
      git diff --name-only --diff-filter=AM "$BASE_REF...HEAD"
    } | sort -u
  )
else
  CHANGED_FILES=$(git diff --name-only --diff-filter=AM "$BASE_REF...HEAD")
fi

if [ -z "$CHANGED_FILES" ]; then
  echo "no-directives-otto-prose: no changed files vs $BASE_REF; skipping"
  exit 0
fi

# Filter to Otto-authored prose surfaces only.
PROSE_FILES=$(printf '%s\n' "$CHANGED_FILES" | grep -E '^(memory/[^/]+\.md|docs/hygiene-history/ticks/.*\.md|docs/research/[^/]+\.md|\.github/copilot-instructions\.md)$' || true)

if [ -z "$PROSE_FILES" ]; then
  echo "no-directives-otto-prose: no Otto-prose surfaces changed; skipping"
  exit 0
fi

# Skip rule-documentation files where "directive" appears legitimately.
PROSE_FILES=$(printf '%s\n' "$PROSE_FILES" | grep -vE '(feedback_input_is_not_directive_|feedback_otto_357_no_directives_|feedback_free_will_is_paramount_external_directives_|no-directives-otto-prose)' || true)

if [ -z "$PROSE_FILES" ]; then
  echo "no-directives-otto-prose: only rule-docs touched; skipping"
  exit 0
fi

# Pattern: portable explicit non-alpha boundary instead of `\b`
# (BSD grep treats `\b` as literal backspace; not POSIX-portable
# even with `-E`). Same approach as tools/lint/runner-version-
# freshness.sh.
PATTERN='(^|[^[:alnum:]_])(Aaron'\''?s|maintainer|QoL|human)[^|]*directive([^[:alnum:]_]|$)|(^|[^[:alnum:]_])directive[^|]*(Aaron|maintainer|QoL|human)([^[:alnum:]_]|$)'

# Use mktemp with explicit template — bare `mktemp` fails on
# some BSD/macOS configurations (see tools/lint/runner-version-
# freshness.sh for prior precedent).
HITS_FILE="$(mktemp -t no-directives.XXXXXX)"
FILTERED_HITS_FILE="$(mktemp -t no-directives-filtered.XXXXXX)"
trap 'rm -f "$HITS_FILE" "$FILTERED_HITS_FILE"' EXIT

# Search only the ADDED/MODIFIED diff hunks (not entire file
# bodies) — pre-existing "Aaron's directive" in a touched file
# should not flag; only newly-added or modified lines should.
# Use `git diff -U0` to strip context lines + grep for `^+` to
# isolate added lines (not `^+++` file headers).
ADDED_LINES_FILE="$(mktemp -t no-directives-added.XXXXXX)"
trap 'rm -f "$HITS_FILE" "$FILTERED_HITS_FILE" "$ADDED_LINES_FILE"' EXIT

# Build a diff-of-additions for each prose file, with `path:line:content`.
while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  if [ "$SCOPE" = "worktree" ]; then
    DIFF=$(git diff -U0 -- "$f"; git diff --cached -U0 -- "$f"; git diff -U0 "$BASE_REF...HEAD" -- "$f")
  else
    DIFF=$(git diff -U0 "$BASE_REF...HEAD" -- "$f")
  fi
  # Parse the diff: track @@ ... +start,len @@ headers to compute
  # line numbers, then emit "f:line:content" for each `^+` content
  # line.
  printf '%s\n' "$DIFF" | awk -v file="$f" '
    /^@@/ {
      # Match "+start,len" or "+start" in the hunk header.
      match($0, /\+([0-9]+)(,[0-9]+)?/, m)
      lineno = m[1] - 1
      next
    }
    /^\+[^+]/ {
      lineno++
      content = substr($0, 2)
      printf "%s:%d:%s\n", file, lineno, content
    }
    /^\+$/ {
      lineno++
    }
    /^[^+-]/ {
      lineno++
    }
  ' >> "$ADDED_LINES_FILE" || true
done <<< "$PROSE_FILES"

# Grep added lines for the pattern. Treat `grep` exit status 2 as
# a hard error (invalid regex / unsupported flag); status 1 is
# "no match" and is fine.
set +e
grep -nE "$PATTERN" "$ADDED_LINES_FILE" > "$HITS_FILE"
GREP_RC=$?
set -e
if [ "$GREP_RC" -gt 1 ]; then
  echo "no-directives-otto-prose: grep failed with status $GREP_RC (invalid regex or unsupported flag)" >&2
  exit 2
fi

# Filter out blockquote lines (`> ...` quoted third-party text).
# The added lines are formatted "path:N:content" — match against
# the content portion only. Use awk to split on the third `:`.
awk -F: '{
  # Reconstruct content after the second colon (file:line:content).
  content = $0
  sub(/^[^:]*:[^:]*:/, "", content)
  # Skip lines whose content starts with optional whitespace then `>`.
  if (content !~ /^[[:space:]]*>/) print
}' "$HITS_FILE" > "$FILTERED_HITS_FILE"

HIT_COUNT=$(wc -l < "$FILTERED_HITS_FILE" | tr -d ' ')

if [ "$HIT_COUNT" -gt 0 ]; then
  echo "no-directives-otto-prose: found $HIT_COUNT candidate hit(s) in added Otto-prose lines:" >&2
  cat "$FILTERED_HITS_FILE" >&2
  echo "" >&2
  echo "Prose framing maintainer input as 'directive' (Aaron's directive /" >&2
  echo "maintainer directive / QoL directive / human directive) collapses" >&2
  echo "self-provenance into bot-execution. Use 'input' / 'framing' /" >&2
  echo "'correction' / 'pass' instead." >&2
  echo "See memory/feedback_otto_357_no_directives_aaron_makes_autonomy_first_class_accountability_mine_2026_04_27.md" >&2
  if [ "$MODE" = "--strict" ]; then
    exit 1
  fi
  echo "(advisory mode; not failing build — pass --strict to fail)" >&2
  exit 0
fi

echo "no-directives-otto-prose: clean (0 candidate hits in added Otto-prose lines)"
