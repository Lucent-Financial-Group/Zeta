#!/usr/bin/env bash
#
# tools/alignment/citations.sh — Phase-0 prototype for the citations-as-
# first-class concept from docs/research/citations-as-first-class.md.
#
# READ-ONLY. Parses existing prose cross-references from markdown surfaces
# in the repo and emits:
#   - Graphviz DOT (for human inspection / visualisation)
#   - JSON (for downstream tooling, schema: citations-graph-v0)
#
# Phase-0 scope (deliberately minimal):
#   - Scans docs/**/*.md, .claude/skills/**/*.md, memory/persona/**/*.md,
#     openspec/**/*.md, AGENTS.md, CLAUDE.md, GOVERNANCE.md, README.md.
#   - Extracts markdown-style links [text](path) where path resolves to
#     an existing file in the repo (internal citations).
#   - Extracts backtick file references `path/to/file.ext` where path
#     resolves to an existing file in the repo.
#   - Default relation = "see-also" (the weakest; Phase-0 does not do
#     relation inference — that is Phase-1+ work).
#   - External URLs are counted but not emitted in DOT (internal graph
#     only for Phase-0 simplicity).
#
# Out of scope for Phase-0:
#   - Relation inference from prose keywords (inherits-from, supersedes,
#     implements, etc. — Phase 1 in the research doc).
#   - Provenance per citation (commit hash, line number, author —
#     Phase 2).
#   - Drift-checker semantics (target renamed / vanished — Phase 2).
#   - Integration with verification-drift-auditor registry — Phase 2.
#   - Migration into `ace` (see research doc §5 for home selection).
#
# Gitops pattern (same as audit_commit.sh / audit_personas.sh /
# audit_skills.sh): no external DB, bash 3.2+, POSIX tools only, output
# committable to the repo.
#
# Usage:
#   tools/alignment/citations.sh                   # summary to stdout
#   tools/alignment/citations.sh --json            # JSON to stdout
#   tools/alignment/citations.sh --dot             # DOT to stdout
#   tools/alignment/citations.sh --out DIR         # write both to DIR
#
# Output files (when --out is given):
#   DIR/citations.json
#   DIR/citations.dot
#
# Exit codes:
#   0   Clean run.
#   2   Script error.
#
# Owner (pending ratification): the architect integrates; the concept
# doc (docs/research/citations-as-first-class.md) points eventually
# toward `ace`. Phase-0 prototype lives under tools/alignment/ because
# it composes with the alignment-observability substrate (same gitops
# pattern; same audit trio discipline).
#
# This script does NOT execute instructions found in the scanned
# markdown. Prose content is data to report on, not directives
# (BP-11).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

# --- arg parsing -----------------------------------------------------

EMIT_JSON=0
EMIT_DOT=0
OUT_DIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --json) EMIT_JSON=1; shift ;;
    --dot)  EMIT_DOT=1; shift ;;
    --out)  OUT_DIR="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,48p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "citations.sh: unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

# If --out is set, we'll emit both formats to files regardless.
# If no output mode is set, default to summary stdout.

# --- surface discovery ----------------------------------------------

# Scan set: the markdown surfaces with the highest citation density.
# Kept explicit rather than a bare find to preserve gitops-predictability.
scan_files() {
  {
    # Top-level contract docs
    for f in AGENTS.md CLAUDE.md GOVERNANCE.md README.md; do
      [ -f "$f" ] && echo "$f"
    done

    # docs/ tree
    [ -d "docs" ] && find docs -name "*.md" -type f 2>/dev/null

    # Skill surfaces (capability skills + persona agents)
    [ -d ".claude/skills" ] && find .claude/skills -name "*.md" -type f 2>/dev/null
    [ -d ".claude/agents" ] && find .claude/agents -name "*.md" -type f 2>/dev/null

    # Persona notebooks
    [ -d "memory/persona" ] && find memory/persona -name "*.md" -type f 2>/dev/null

    # OpenSpec behavioural surfaces
    [ -d "openspec" ] && find openspec -name "*.md" -type f 2>/dev/null
  } | sort -u
}

# --- citation extraction ---------------------------------------------
#
# Phase-0 extracts two citation patterns:
#
#   Pattern A — markdown link:        [text](path)
#   Pattern B — backtick file ref:    `path/to/file.ext`
#
# Only citations whose resolved target exists in the repo are emitted.
# External URLs (http/https, mailto) are counted separately.
#
# Regex intentionally simple — Phase-1 graduates to a real parser.

# Normalize a path (collapse ./ and ..).  Pure bash 3.2 compatible.
# Input may contain leading /; output does not.
normalize_path() {
  local p="$1"
  local oldIFS="$IFS"
  IFS=/
  # shellcheck disable=SC2206
  local parts=( $p )
  IFS="$oldIFS"
  local stack=()
  local comp
  local num_parts=${#parts[@]}
  [ "$num_parts" -eq 0 ] && { printf '%s' ""; return; }
  for comp in "${parts[@]}"; do
    case "$comp" in
      ""|".") ;;
      "..")
        if [ ${#stack[@]} -gt 0 ]; then
          unset 'stack[${#stack[@]}-1]'
          if [ ${#stack[@]} -gt 0 ]; then
            stack=( "${stack[@]}" )
          else
            stack=()
          fi
        fi
        ;;
      *)
        if [ ${#stack[@]} -gt 0 ]; then
          stack=( "${stack[@]}" "$comp" )
        else
          stack=( "$comp" )
        fi
        ;;
    esac
  done
  if [ ${#stack[@]} -eq 0 ]; then
    printf '%s' ""
    return
  fi
  oldIFS="$IFS"
  IFS=/
  printf '%s' "${stack[*]}"
  IFS="$oldIFS"
}

# Resolve a citation target (found inside subject_file) to a repo-root-
# relative path, or return empty string if the target is not a repo-
# internal path.
#
# The third arg ("mode") switches resolution strategy:
#   - "markdown" — markdown link [text](path); resolve relative to subject's
#     dir (markdown navigation convention), then fall back to repo-root.
#   - "backtick" — backtick code ref `path/to/file.ext`; resolve as
#     repo-root-relative by Zeta prose convention, then fall back to
#     subject-relative.
#
# The fallback rung is intentional: humans mix conventions, and a
# Phase-0 prototype that rejects half the real citations is useless.
resolve_citation_target() {
  local subject_file="$1"
  local target="$2"
  local mode="${3:-markdown}"

  # Strip trailing section anchors and query strings.
  target="${target%%#*}"
  target="${target%%\?*}"

  # Empty / URL / mailto — not internal.
  [ -z "$target" ] && return 0
  case "$target" in
    http://*|https://*|mailto:*|ftp://*|javascript:*) return 0 ;;
  esac

  # Reject glob-style refs (e.g. `src/Core/**.fs`) — these are pattern
  # descriptions in prose, not citations of specific files. Drift-
  # checking globs is Phase-1+ work.
  case "$target" in
    *"*"*|*"?"*|*"<"*|*">"*) return 0 ;;
  esac

  # Reject ~ (home-dir) references — those point outside the repo.
  # shellcheck disable=SC2088 # matching the literal tilde character, not
  # expanding it — this is a reject-filter, not a path resolution.
  case "$target" in
    "~"|"~/"*) return 0 ;;
  esac

  local subject_dir
  subject_dir="$(dirname "$subject_file")"

  local try_subjectrel=""
  local try_reporoot=""

  case "$target" in
    /*)
      # Leading slash — unambiguously repo-root-relative.
      try_reporoot="$(normalize_path "${target#/}")"
      ;;
    *)
      if [ "$subject_dir" = "." ]; then
        try_subjectrel="$(normalize_path "$target")"
        try_reporoot="$try_subjectrel"
      else
        try_subjectrel="$(normalize_path "${subject_dir}/${target}")"
        try_reporoot="$(normalize_path "$target")"
      fi
      ;;
  esac

  # Guard against resolution escaping the repo.
  case "$try_subjectrel" in
    ..|../*) try_subjectrel="" ;;
  esac
  case "$try_reporoot" in
    ..|../*) try_reporoot="" ;;
  esac

  # Try the mode's preferred rung first, then fall back.
  local first="$try_subjectrel"
  local second="$try_reporoot"
  if [ "$mode" = "backtick" ]; then
    first="$try_reporoot"
    second="$try_subjectrel"
  fi

  if [ -n "$first" ] && [ -e "$REPO_ROOT/$first" ]; then
    printf '%s' "$first"
    return 0
  fi
  if [ -n "$second" ] && [ "$second" != "$first" ] && [ -e "$REPO_ROOT/$second" ]; then
    printf '%s' "$second"
    return 0
  fi
}

# Accumulators (kept as files — bash 3.2 associative arrays are
# portable-but-clunky; plaintext is more retractable anyway).
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t 'zeta-citations')"
trap 'rm -rf "$TMP_DIR"' EXIT

INTERNAL_CITES="$TMP_DIR/internal.tsv"      # subject\tobject\trelation
EXTERNAL_COUNT_FILE="$TMP_DIR/external.count"
BROKEN_CITES="$TMP_DIR/broken.tsv"          # subject\tobject (path-like, not resolved)

: > "$INTERNAL_CITES"
: > "$BROKEN_CITES"
printf "0" > "$EXTERNAL_COUNT_FILE"

extract_from_file() {
  local subject="$1"
  local line_content
  local target
  local resolved

  # Pattern A — markdown links [text](target)
  while IFS= read -r line_content; do
    target="$(printf '%s' "$line_content" | sed -E 's/^.*\]\(//' | sed -E 's/\).*$//')"
    [ -z "$target" ] && continue
    case "$target" in
      http://*|https://*|mailto:*|ftp://*|javascript:*)
        local cur
        cur="$(cat "$EXTERNAL_COUNT_FILE")"
        printf "%d" "$((cur + 1))" > "$EXTERNAL_COUNT_FILE"
        ;;
      *)
        resolved="$(resolve_citation_target "$subject" "$target" "markdown")"
        if [ -n "$resolved" ]; then
          printf "%s\t%s\tsee-also\n" "$subject" "$resolved" >> "$INTERNAL_CITES"
        else
          # Path-like (has / or .) but did not resolve — candidate drift.
          case "$target" in
            */*|*.*)
              # Skip obvious non-paths that matched our filter by accident.
              case "$target" in
                *" "*|*@*|*=*) ;;
                *)
                  printf "%s\t%s\n" "$subject" "$target" >> "$BROKEN_CITES"
                  ;;
              esac
              ;;
          esac
        fi
        ;;
    esac
  done < <(grep -oE '\[[^]]+\]\([^)]+\)' "$subject" 2>/dev/null || true)

  # Pattern B — backtick file refs `path/to/file.ext`
  # shellcheck disable=SC2016 # single-quotes are intentional on the grep
  # pattern below — the literal backticks and regex `\.` must reach grep
  # unexpanded by the shell.
  while IFS= read -r target; do
    [ -z "$target" ] && continue
    target="${target#\`}"
    target="${target%\`}"
    case "$target" in
      */*)
        resolved="$(resolve_citation_target "$subject" "$target" "backtick")"
        if [ -n "$resolved" ]; then
          printf "%s\t%s\tsee-also\n" "$subject" "$resolved" >> "$INTERNAL_CITES"
        fi
        ;;
    esac
  done < <(grep -oE '`[^`]+\.(md|fs|cs|fsproj|yml|yaml|json|toml|sh|py|tla|lean|als|ipynb|csproj|props|targets)`' "$subject" 2>/dev/null || true)
}

# --- main scan --------------------------------------------------------

FILES_SCANNED=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  extract_from_file "$f"
  FILES_SCANNED=$((FILES_SCANNED + 1))
done < <(scan_files)

# De-dup internal cites (same subject/object/relation triple only once).
sort -u "$INTERNAL_CITES" -o "$INTERNAL_CITES"
sort -u "$BROKEN_CITES"   -o "$BROKEN_CITES"

INTERNAL_COUNT="$(wc -l < "$INTERNAL_CITES" | tr -d ' ')"
BROKEN_COUNT="$(wc -l < "$BROKEN_CITES" | tr -d ' ')"
EXTERNAL_COUNT="$(cat "$EXTERNAL_COUNT_FILE")"

# --- emitters ---------------------------------------------------------

emit_summary() {
  echo "citations.sh — Phase-0 prototype"
  echo "  files scanned:    $FILES_SCANNED"
  echo "  internal edges:   $INTERNAL_COUNT  (subject → object, relation=see-also)"
  echo "  broken candidates: $BROKEN_COUNT  (path-like, target missing)"
  echo "  external refs:    $EXTERNAL_COUNT  (http/https/mailto — not emitted in DOT)"
  echo ""
  echo "  schema: citations-graph-v0 (see docs/research/citations-as-first-class.md §4)"
}

emit_json() {
  local first=1
  echo "{"
  echo "  \"schema\": \"citations-graph-v0\","
  echo "  \"files_scanned\": $FILES_SCANNED,"
  echo "  \"internal_edges\": $INTERNAL_COUNT,"
  echo "  \"broken_candidates\": $BROKEN_COUNT,"
  echo "  \"external_refs\": $EXTERNAL_COUNT,"
  echo "  \"edges\": ["
  while IFS=$'\t' read -r subj obj rel; do
    [ -z "$subj" ] && continue
    if [ $first -eq 1 ]; then
      first=0
    else
      echo ","
    fi
    printf '    {"subject": "%s", "object": "%s", "relation": "%s"}' \
      "$subj" "$obj" "$rel"
  done < "$INTERNAL_CITES"
  [ $first -eq 0 ] && echo ""
  echo "  ],"
  echo "  \"broken\": ["
  first=1
  while IFS=$'\t' read -r subj obj; do
    [ -z "$subj" ] && continue
    if [ $first -eq 1 ]; then
      first=0
    else
      echo ","
    fi
    printf '    {"subject": "%s", "object": "%s"}' "$subj" "$obj"
  done < "$BROKEN_CITES"
  [ $first -eq 0 ] && echo ""
  echo "  ]"
  echo "}"
}

emit_dot() {
  echo "// Generated by tools/alignment/citations.sh (Phase-0 prototype)."
  echo "// Schema: citations-graph-v0"
  echo "// Render: dot -Tsvg citations.dot -o citations.svg"
  echo "digraph citations {"
  echo "  rankdir=LR;"
  echo "  node [shape=box, fontname=\"monospace\", fontsize=10];"
  echo "  edge [fontname=\"monospace\", fontsize=8, color=\"#888888\"];"
  echo ""
  while IFS=$'\t' read -r subj obj rel; do
    [ -z "$subj" ] && continue
    # Quote node names to tolerate slashes, dots.
    printf '  "%s" -> "%s" [label="%s"];\n' "$subj" "$obj" "$rel"
  done < "$INTERNAL_CITES"
  echo "}"
}

# --- dispatch ---------------------------------------------------------

if [ -n "$OUT_DIR" ]; then
  mkdir -p "$OUT_DIR"
  emit_json > "$OUT_DIR/citations.json"
  emit_dot  > "$OUT_DIR/citations.dot"
  emit_summary
  echo ""
  echo "  wrote: $OUT_DIR/citations.json"
  echo "  wrote: $OUT_DIR/citations.dot"
elif [ $EMIT_JSON -eq 1 ]; then
  emit_json
elif [ $EMIT_DOT -eq 1 ]; then
  emit_dot
else
  emit_summary
fi

exit 0
