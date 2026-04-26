#!/usr/bin/env bash
#
# tools/hygiene/check-archive-header-section33.sh — validates that
# courier-ferry / external-conversation imports under `docs/research/**`
# carry the 4-field archive boundary header in the first 20 lines per
# GOVERNANCE.md §33.
#
# Why this exists (Otto-346 pattern; observed 2026-04-26):
#   The §33 archive header was the most-common review finding across
#   the 11-Amara-refinement courier-ferry lineage this session: PR #560
#   / #562 / #563 / #565 / #566 / #568 / #569 / #570 / #553 each had
#   to be retrofitted with the header AFTER review. Recurring identical
#   review finding = signal that the discipline lacks automated
#   enforcement.
#
#   Per Otto-346 (recurring pattern → substrate primitive missing) +
#   Otto-341 (mechanism over vigilance), the right shape is a CI lint
#   check that fails the build when a courier-ferry import lands
#   without the §33 header — instead of waiting for human / advisory-AI
#   review to flag it on every doc.
#
# What this checks:
#   For every file under `docs/research/**.md` that matches the
#   courier-ferry import pattern (filename or content contains
#   "courier-ferry" / "via Aaron" / "external conversation"):
#   - First 20 lines contain ALL four required §33 labels:
#     * `Scope:` (literal label, NOT bold-styled `**Scope**:`)
#     * `Attribution:`
#     * `Operational status:`
#     * `Non-fusion disclaimer:`
#   - Reports the first failing file with a diagnostic
#   - Exits non-zero on any failure
#
# What this does NOT do:
#   - Does NOT validate the CONTENT of each header field (that's a
#     judgment call the author makes)
#   - Does NOT auto-fix; the fix is the author's responsibility (the
#     CI failure points at the missing labels)
#   - Does NOT enforce §33 on docs OUTSIDE `docs/research/**` (other
#     surfaces have different governance per AGENTS.md)
#
# Composes with:
#   - GOVERNANCE.md §33 (the rule this lints)
#   - tools/hygiene/check-tick-history-order.sh (pattern: structural-
#     prevention via lint, not vigilance)
#   - .github/workflows/gate.yml (wired as a lint job)
#
# Self-test:
#   $ tools/hygiene/check-archive-header-section33.sh
#     → exit 0 if all courier-ferry research docs have §33 headers
#     → exit 1 with diagnostic if any are missing

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RESEARCH_DIR="${REPO_ROOT}/docs/research"

if [[ ! -d "$RESEARCH_DIR" ]]; then
  echo "OK: docs/research/ does not exist; nothing to check"
  exit 0
fi

# Required §33 labels as literal strings. Bold-styled forms like
# `**Scope**:` are NOT acceptable per the discovery in PR #570 P0:
# header-format linting may not recognize bold-styled labels.
required_labels=(
  "Scope:"
  "Attribution:"
  "Operational status:"
  "Non-fusion disclaimer:"
)

# A courier-ferry / external-conversation import is identified by
# common-marker patterns in filename or first-200-line content. Empty
# match = file is NOT in scope, skip silently.
is_courier_ferry_import() {
  local file="$1"
  # Filename signals
  if [[ "$file" =~ courier-ferry|amara-via|aaron-share|cross-substrate ]]; then
    return 0
  fi
  # Content signals (within first 200 lines to avoid scanning whole file)
  if head -200 "$file" 2>/dev/null | grep -qiE 'courier.ferry|via [A-Z][a-z]+ courier|external conversation|external collaborator|google search ai|chatgpt'; then
    return 0
  fi
  return 1
}

violations=0
violation_files=()

# Iterate all .md files under docs/research/ (one level deep; this is
# the canonical structure — research docs are not nested under
# subdirectories at present).
shopt -s nullglob
for file in "$RESEARCH_DIR"/*.md; do
  if ! is_courier_ferry_import "$file"; then
    continue
  fi

  header_region=$(head -20 "$file")
  missing=()
  for label in "${required_labels[@]}"; do
    if ! echo "$header_region" | grep -qF "$label"; then
      missing+=("$label")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    violations=$((violations + 1))
    violation_files+=("$file")
    echo "VIOLATION: ${file#"$REPO_ROOT/"} missing §33 labels: ${missing[*]}" >&2
  fi
done

if [[ $violations -gt 0 ]]; then
  echo "" >&2
  echo "FAIL: $violations courier-ferry research-doc(s) missing GOVERNANCE.md §33 archive header(s)" >&2
  echo "" >&2
  echo "Required header (literal label form, NOT bold-styled) in first 20 lines:" >&2
  echo "  Scope: <one-line scope>" >&2
  echo "  Attribution: <named entities + first-name attribution per Otto-279>" >&2
  echo "  Operational status: <research-grade vs operational-policy>" >&2
  echo "  Non-fusion disclaimer: <attribution boundary preservation>" >&2
  echo "" >&2
  echo "Pattern reference: see PR #570 / #566 / #563 §33-header fixes for examples." >&2
  exit 1
fi

echo "OK: all courier-ferry research docs have §33 archive headers"
exit 0
