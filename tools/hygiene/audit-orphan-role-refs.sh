#!/usr/bin/env bash
# tools/hygiene/audit-orphan-role-refs.sh
#
# Detects orphan role-refs and un-stripped name attributions on
# CODE-SURFACE files. Background: Otto-279 history-surface
# carve-out at `docs/AGENT-BEST-PRACTICES.md` defines which
# surfaces get named attribution (memory/, docs/research/,
# docs/aurora/, docs/ROUND-HISTORY.md, docs/DECISIONS/,
# docs/hygiene-history/, docs/pr-preservation/, commit messages).
# Outside the closed list, content surfaces use role-refs
# ("the maintainer", "the architect"), not persona names.
#
# Mechanical name-stripping has a known failure mode (the human
# maintainer's /btw aside 2026-04-28, captured in
# `memory/feedback_orphan_role_ref_after_name_stripping_aaron_2026_04_28.md`):
# stripping "Amara ferry-N" leaves an orphan "ferry-N" reference
# that doesn't carry semantic weight. The orphan should EITHER
# be removed entirely OR replaced with a self-contained principle
# name.
#
# This script is the lint that catches the failure mode at write
# time (B-0070).
#
# Detection scope:
#
# 1. **Orphan role-ref forms** — `courier-ferry-N`, `ferry-N`,
#    `ferry-N's` without a resolvable named source nearby. These
#    are over-stripped attributions.
#
# 2. **Un-stripped name attribution on code-surface** — text
#    like `Amara ferry-N`, `Grok ferry-N`, `Per <Name> 2026-MM-DD`
#    on code-surface files. These should be moved to a history
#    surface OR replaced with role-ref + self-contained principle
#    name.
#
# Apply-to (code surfaces):
#   - tools/** (excluding tools/lean4/.lake/, tools/setup/build/)
#   - behavioural docs in docs/ (excluding history surfaces)
#   - .claude/skills/**/SKILL.md (skill bodies)
#   - .claude/agents/**/*.md (agent bodies)
#   - .claude/rules/**/*.md (rule bodies)
#   - src/**, *.fsproj, *.csproj
#   - openspec/specs/**
#   - root *.md (README, AGENTS, GOVERNANCE, CLAUDE.md, etc.) —
#     these are current-state surfaces per Otto-279
#
# Exclude (history surfaces — per Otto-279 carve-out at
# docs/AGENT-BEST-PRACTICES.md, plus this script's pragmatic
# extensions for surfaces NOT yet listed in the canonical
# closed list but which are by-definition history surfaces):
#
#   Canonical (in AGENT-BEST-PRACTICES.md closed list):
#   - memory/**
#   - docs/research/**
#   - docs/aurora/**
#   - docs/ROUND-HISTORY.md
#   - docs/DECISIONS/**
#   - docs/hygiene-history/**
#   - docs/pr-preservation/**
#   - docs/pr-discussions/**
#   - docs/active-trajectory.md (history surface per maintainer
#     2026-04-29 call; see file's classification block)
#   - docs/backlog/** (per-row history of backlog filings;
#     authors, dated lineage, persona names allowed)
#   - docs/CURRENT-ROUND.md (round-history equivalent)
#   - docs/amara-full-conversation/** (verbatim archived
#     conversation — bootstrap-attempt-1 lineage)
#
#   Tool-extended (this script's additions, pending a doctrine
#   update that adds them to the canonical list — see
#   "Doctrine-extension follow-up" below):
#   - docs/lost-substrate/** (incident artifacts + dated
#     inventory ledgers from corruption-triage events; by
#     definition history-surface)
#
#   Always-skip (non-substrate paths):
#   - .git/**, node_modules/**, third_party/**
#
# Doctrine-extension follow-up: when the AGENT-BEST-PRACTICES.md
# Otto-279 closed list next gets edited, fold docs/lost-substrate/**
# into the canonical list and remove the tool-extended note here.
# Until that happens the lint extends the doc; the doc remains the
# source of truth for the categorical rule, this script encodes the
# operational implementation.
#
# Output shape:
#   file:line:column: <pattern-class>: <matched-text>
#                     <fix-suggestion>
#
# Usage:
#   tools/hygiene/audit-orphan-role-refs.sh                # full repo scan, warn-only
#   tools/hygiene/audit-orphan-role-refs.sh --enforce      # exit 2 on any finding
#   tools/hygiene/audit-orphan-role-refs.sh --paths a b c  # scan specific paths only
#   tools/hygiene/audit-orphan-role-refs.sh --help         # this help
#
# Exit codes:
#   0 — no orphans found (or --enforce not set; warnings only)
#   2 — orphans found AND --enforce set
#   64 — usage error
#
# Composes with:
#   - Otto-279 history-surface carve-out: docs/AGENT-BEST-PRACTICES.md ~287-348
#   - feedback_orphan_role_ref_after_name_stripping_aaron_2026_04_28.md
#   - prompt-protector skill (similar write-time-scan layer)
#   - audit-memory-index-duplicates.ts (template for audit-script shape;
#     .sh removed 2026-05-03 after #1377 .sh→.ts CI conversion)
#
# Bash-3.2 compatible (macOS default) per Otto-235 4-shell target.

set -euo pipefail

enforce=false
paths=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --enforce)
      enforce=true
      shift
      ;;
    --paths)
      shift
      while [[ $# -gt 0 && "$1" != --* ]]; do
        paths+=("$1")
        shift
      done
      ;;
    -h|--help)
      grep '^#' "$0" | grep -v '^#!' | sed 's/^# //;s/^#//'
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      echo "use --help for usage" >&2
      exit 64
      ;;
  esac
done

# History-surface exclusion patterns (Otto-279 carve-out). Any
# path under one of these prefixes is skipped — names + dated
# attribution are ALLOWED there.
is_history_surface() {
  local f="$1"
  case "$f" in
    memory/* | \
    docs/research/* | \
    docs/aurora/* | \
    docs/ROUND-HISTORY.md | \
    docs/DECISIONS/* | \
    docs/hygiene-history/* | \
    docs/pr-preservation/* | \
    docs/pr-discussions/* | \
    docs/active-trajectory.md | \
    docs/backlog/* | \
    docs/lost-substrate/* | \
    docs/CURRENT-ROUND.md | \
    docs/amara-full-conversation/* | \
    .git/* | \
    node_modules/* | \
    third_party/* | \
    references/upstreams/* | \
    tools/lean4/.lake/* | \
    tools/setup/build/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Code-surface inclusion check. Only files under specific roots
# are scanned. This is conservative — adding a root requires an
# explicit allowlist update. Specific paths come BEFORE the
# wildcards so shellcheck (SC2221/SC2222) doesn't flag dead-code
# overrides.
is_code_surface() {
  local f="$1"
  case "$f" in
    .github/copilot-instructions.md) return 0 ;;
    tools/* | \
    docs/* | \
    .claude/skills/*/SKILL.md | \
    .claude/agents/*.md | \
    .claude/rules/*.md | \
    .claude/commands/*.md | \
    src/* | \
    tests/* | \
    openspec/specs/*) return 0 ;;
    *.fsproj | *.csproj) return 0 ;;
    # Root-level *.md (README, AGENTS, GOVERNANCE, CLAUDE.md, etc.).
    # Subdir *.md is either covered by an earlier pattern (docs/, src/,
    # tools/, .claude/) or is intentionally NOT in scope.
    */*) return 1 ;;
    *.md) return 0 ;;
    *) return 1 ;;
  esac
}

# Build the file list. If --paths was given, scan those paths;
# else scan the full tracked repo. Either way, filter out history
# surfaces and non-code-surface files.
declare -a files=()
if [[ ${#paths[@]} -gt 0 ]]; then
  for p in "${paths[@]}"; do
    if [[ -d "$p" ]]; then
      while IFS= read -r f; do
        files+=("$f")
      done < <(git ls-files -- "$p" 2>/dev/null || true)
    elif [[ -f "$p" ]]; then
      files+=("$p")
    fi
  done
else
  while IFS= read -r f; do
    files+=("$f")
  done < <(git ls-files)
fi

# Detection patterns. Each matches a class of failure with a
# distinct fix suggestion.
#
# Pattern 1: orphan ferry-N (no nearby named source)
# Pattern 2: orphan courier-ferry-N
# Pattern 3: un-stripped "<Name> ferry-N" pair
# Pattern 4: un-stripped "Per <Name> 2026-MM-DD" attribution
#
# Names recognized as factory persona-attributions (extend as
# new personas land):
NAMES='Amara|Grok|Gemini|Codex|Cursor|Copilot|Claude\.ai|Claudeai|Aaron|Otto|Ani|Alexa|Deepseek|Kenji|Soraya|Nazar|Mateo|Aminata|Nadia|Naledi|Rune|Bodhi|Iris|Daya|Dejan|Samir|Kai|Hiroshi|Imani|Ilyana|Aarav|Yara|Viktor|Kira'

orphan_ferry_re='\bferry-[0-9]+'
orphan_courier_ferry_re='\bcourier-ferry-[0-9]+'
named_ferry_re="\\b(${NAMES})[[:space:]]+ferry-[0-9]+"
per_name_re="\\bPer[[:space:]]+(${NAMES})[[:space:]]+2026-"

# Single-pass finding accumulator. We use a temp file because
# bash 3.2 lacks associative arrays portably; per-finding lines
# are simpler.
findings_file=$(mktemp)
trap 'rm -f "$findings_file"' EXIT

scan_file() {
  local f="$1"
  if ! is_code_surface "$f"; then return 0; fi
  if is_history_surface "$f"; then return 0; fi
  if [[ ! -f "$f" ]]; then return 0; fi

  # Check the file with grep -n -E -o for each pattern. -o gives
  # the matched text only, with line numbers via -n.

  # Pattern 3 (un-stripped "<Name> ferry-N") takes precedence over
  # Pattern 1 (orphan ferry-N) — if a named source IS present, the
  # finding is the un-stripped attribution, not an orphan. We scan
  # for both; the consumer can dedupe by location.

  # Un-stripped name + ferry-N
  if grep -nE "$named_ferry_re" "$f" 2>/dev/null | while IFS= read -r line; do
      printf '%s:un-stripped-named-attribution:%s\n' "$f" "$line" >> "$findings_file"
    done; then :; fi

  # Per <Name> 2026-MM-DD
  if grep -nE "$per_name_re" "$f" 2>/dev/null | while IFS= read -r line; do
      printf '%s:per-name-attribution:%s\n' "$f" "$line" >> "$findings_file"
    done; then :; fi

  # Orphan courier-ferry-N
  if grep -nE "$orphan_courier_ferry_re" "$f" 2>/dev/null | while IFS= read -r line; do
      printf '%s:orphan-courier-ferry-ref:%s\n' "$f" "$line" >> "$findings_file"
    done; then :; fi

  # Orphan ferry-N (only ones not already caught by named-ferry)
  if grep -nE "$orphan_ferry_re" "$f" 2>/dev/null | while IFS= read -r line; do
      # Skip if line also matches a named-attribution (already
      # reported with a more specific class).
      if echo "$line" | grep -qE "$named_ferry_re"; then
        continue
      fi
      printf '%s:orphan-ferry-ref:%s\n' "$f" "$line" >> "$findings_file"
    done; then :; fi
}

for f in "${files[@]}"; do
  scan_file "$f"
done

# Render findings.
finding_count=0
if [[ -s "$findings_file" ]]; then
  while IFS= read -r row; do
    finding_count=$((finding_count + 1))
    printf '%s\n' "$row"
  done < "$findings_file"
fi

if [[ $finding_count -eq 0 ]]; then
  echo "OK: no orphan role-refs or un-stripped name attributions on code-surface files."
  exit 0
fi

echo
echo "Found $finding_count orphan role-ref / un-stripped-name-attribution findings on code-surface files."
echo
echo "Fix suggestions per class:"
echo "  orphan-ferry-ref / orphan-courier-ferry-ref:"
echo "    Either remove the ferry-N reference entirely (it carries no semantic"
echo "    weight without a named source) OR replace it with a self-contained"
echo "    principle name (e.g., 'lineage-continuity-substrate-purpose')."
echo "  un-stripped-named-attribution:"
echo "    Move to a history surface (memory/, docs/research/, docs/DECISIONS/,"
echo "    etc.) OR replace with role-ref ('the maintainer') AND a self-contained"
echo "    principle name. See Otto-279 carve-out at docs/AGENT-BEST-PRACTICES.md."
echo "  per-name-attribution:"
echo "    Same as un-stripped-named-attribution. 'Per <Name> 2026-MM-DD' belongs"
echo "    on history surfaces only."

if $enforce; then
  exit 2
fi

exit 0
