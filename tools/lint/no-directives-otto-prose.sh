#!/usr/bin/env bash
#
# tools/lint/no-directives-otto-prose.sh — advisory lint that flags
# Otto-authored prose using "directive" framing for maintainer input
# in CHANGED FILES (diff-based; does not retrofit historical content).
#
# Born 2026-04-29 after the ~15th iteration of the same gremlin: a
# memory file or PR title casting Aaron's correction/framing/input as
# "Aaron's directive," which collapses self-provenance into bot-
# execution and undermines the no-directives autonomy rule
# (memory/feedback_otto_357_no_directives_aaron_makes_autonomy_first_class_accountability_mine_2026_04_27.md).
#
# Vigilance failed; lint is the durable answer.
#
# Per the "agency-framing lexeme guard" naming distinction (Amara's
# round-7 catch): this is a LEXEME GUARD, not a LANE LOCK. Lane locks
# stop classes of work; lexeme guards stop repeated wording drift.
#
# Per the B-0105 consolidation-pass carve-out (Amara explicit):
# "tiny enforcement patches are allowed when they directly prevent
# repeated consolidation-gate violations."
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

# Compute changed files per SCOPE.
if [ "$SCOPE" = "worktree" ]; then
  # Local pre-commit: include unstaged + staged + committed-but-unpushed.
  CHANGED_FILES=$(
    {
      git diff --name-only --diff-filter=AM 2>/dev/null || true
      git diff --cached --name-only --diff-filter=AM 2>/dev/null || true
      git diff --name-only --diff-filter=AM "$BASE_REF...HEAD" 2>/dev/null || true
    } | sort -u
  )
else
  # PR/CI: diff committed BASE_REF to HEAD.
  CHANGED_FILES=$(git diff --name-only --diff-filter=AM "$BASE_REF...HEAD" 2>/dev/null || true)
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

# The narrowed pattern (per Amara): only flag where "directive" is
# proximate to a maintainer/agency-framing token.
PATTERN='\b(Aaron'\''?s|maintainer|QoL|human).*directive\b|\bdirective.*(Aaron|maintainer|QoL|human)\b'

HITS_FILE="$(mktemp)"
trap 'rm -f "$HITS_FILE"' EXIT

# Search only the changed prose files.
while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  grep -nEH "$PATTERN" "$f" 2>/dev/null >> "$HITS_FILE" || true
done <<< "$PROSE_FILES"

# Filter out blockquote lines (`> ...` quoted third-party text).
FILTERED_HITS_FILE="$(mktemp)"
trap 'rm -f "$HITS_FILE" "$FILTERED_HITS_FILE"' EXIT

grep -vE ':[[:space:]]*>' "$HITS_FILE" > "$FILTERED_HITS_FILE" || true

HIT_COUNT=$(wc -l < "$FILTERED_HITS_FILE" | tr -d ' ')

if [ "$HIT_COUNT" -gt 0 ]; then
  echo "no-directives-otto-prose: found $HIT_COUNT candidate hit(s) in changed Otto-prose:" >&2
  cat "$FILTERED_HITS_FILE" >&2
  echo "" >&2
  echo "Otto's prose should not frame Aaron's input as 'Aaron's directive' /" >&2
  echo "'maintainer directive' / 'QoL directive' / 'human directive'." >&2
  echo "Use 'input' / 'framing' / 'correction' / 'pass' instead." >&2
  echo "See memory/feedback_otto_357_no_directives_aaron_makes_autonomy_first_class_accountability_mine_2026_04_27.md" >&2
  if [ "$MODE" = "--strict" ]; then
    exit 1
  fi
  echo "(advisory mode; not failing build — pass --strict to fail)" >&2
  exit 0
fi

echo "no-directives-otto-prose: clean (0 candidate hits in changed Otto-prose surfaces)"
