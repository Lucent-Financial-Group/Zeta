#!/usr/bin/env bash
#
# tools/alignment/audit_archive_headers.sh — archive-header
# discipline lint (Amara 5th-ferry Artifact C, detect-only v0).
#
# Checks every `docs/aurora/**/*.md` absorb doc for the four
# archive-header fields proposed in Amara's 5th ferry
# (§33 candidate, PR #235 absorb):
#
#   Scope:               research / cross-review / archival purpose
#   Attribution:         speaker labels preserved
#   Operational status:  research-grade | operational
#   Non-fusion disclaimer: explicit non-fusion clause
#
# The tool is deliberately *detect-only* at v0. Running
# `--enforce` makes it exit non-zero on any missing header,
# but CI does not currently call that flag — Aminata's Otto-80
# threat-model pass flagged proposed §33 as IMPORTANT-not-
# CRITICAL pending Aaron signoff on the governance edit
# itself. This tool is the mechanism that will back §33 if /
# when it lands; it also provides detect-only signal today
# so drift is visible before enforcement.
#
# Usage:
#   tools/alignment/audit_archive_headers.sh                    # detect-only
#   tools/alignment/audit_archive_headers.sh --enforce          # exit 2 on gap
#   tools/alignment/audit_archive_headers.sh --path DIR         # custom path
#   tools/alignment/audit_archive_headers.sh --json             # JSON output
#   tools/alignment/audit_archive_headers.sh --out DIR          # per-file JSON
#
# Exit codes:
#   0   All archive docs have all four headers (or --enforce unset).
#   2   One or more archive docs missing header(s) and --enforce set.
#   64  Script error / missing dependency / bad args.
#
# Scope:
# - Default path: `docs/aurora/` — every `.md` file is treated
#   as archive-of-external-conversation and checked.
# - `--path DIR` overrides to check a different archive root
#   (e.g. `docs/research/` would apply only if research docs
#   were the scope; v0 leaves this for explicit opt-in).
#
# Not in scope (v0):
# - Content-level validation of header values. A doc with
#   `Scope: research` as prose in paragraph 3 technically
#   passes; this is the partial-header-adversary Aminata
#   flagged. Harden via syntactic requirement (header must
#   appear in the first N lines + as a definition-list item
#   or bold label) in a follow-up.
# - Cross-repo checks (KSK / lucent-ksk cross-references).
# - Memory-file archive-header checks. Memory lives under
#   `~/.claude/projects/<slug>/memory/` (per-user, not
#   in-repo). In-repo `memory/` is a different surface; this
#   tool does not assume it covers archive content.
#
# Reference: `docs/research/aminata-threat-model-5th-ferry-governance-edits-2026-04-23.md`
# (PR #241) — Aminata's analysis of why this lint matters for
# §33 not to decay within 3-5 rounds.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

target_path="docs/aurora"
enforce=false
json=false
out_dir=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --enforce) enforce=true; shift ;;
    --json) json=true; shift ;;
    --path)
      if [[ -z "${2:-}" ]]; then
        echo "audit_archive_headers: --path requires a directory" >&2
        exit 64
      fi
      target_path="$2"; shift 2 ;;
    --out)
      if [[ -z "${2:-}" ]]; then
        echo "audit_archive_headers: --out requires a directory" >&2
        exit 64
      fi
      out_dir="$2"; shift 2 ;;
    -h|--help)
      sed -n '3,55p' "$0" | sed 's/^# //;s/^#//'
      exit 0 ;;
    *)
      echo "audit_archive_headers: unknown arg: $1" >&2
      exit 64 ;;
  esac
done

if [[ ! -d "$target_path" ]]; then
  echo "audit_archive_headers: target path not found: $target_path" >&2
  exit 64
fi

# The four required headers. Each pattern matches the label in
# the first 20 lines of the file. v0 uses substring match on
# the label; content-validation is out-of-scope.
declare -a HEADER_LABELS=(
  'Scope:'
  'Attribution:'
  'Operational status:'
  'Non-fusion disclaimer:'
)

# Collect archive files (ASCII sort for stable output).
# Use a while-read loop instead of mapfile so the tool runs on
# bash 3.2 (macOS default) as well as bash 4+.
archive_files=()
while IFS= read -r f; do
  archive_files+=("$f")
done < <(find "$target_path" -maxdepth 1 -type f -name '*.md' | sort)

if [[ ${#archive_files[@]} -eq 0 ]]; then
  echo "audit_archive_headers: no .md files in $target_path" >&2
  exit 0
fi

total_files=${#archive_files[@]}
files_with_all_headers=0
files_missing_headers=0
gap_details=""

if [[ -n "$out_dir" ]]; then
  mkdir -p "$out_dir"
fi

for file in "${archive_files[@]}"; do
  # Read first 20 lines to scope the header check.
  head_content=$(head -n 20 "$file")
  missing_labels=()

  for label in "${HEADER_LABELS[@]}"; do
    if ! grep -qF -- "$label" <<< "$head_content"; then
      missing_labels+=("$label")
    fi
  done

  if [[ ${#missing_labels[@]} -eq 0 ]]; then
    files_with_all_headers=$((files_with_all_headers + 1))
    file_status="ok"
  else
    files_missing_headers=$((files_missing_headers + 1))
    file_status="missing"
    missing_joined=$(IFS=','; echo "${missing_labels[*]}")
    gap_details+="  $file: missing [$missing_joined]"$'\n'
  fi

  if [[ -n "$out_dir" ]]; then
    # Per-file JSON (same shape as audit_commit.sh / audit_personas.sh).
    file_base=$(basename "$file" .md)
    out_file="$out_dir/${file_base}.json"
    {
      echo "{"
      echo "  \"path\": \"$file\","
      echo "  \"status\": \"$file_status\","
      printf '  "missing_labels": ['
      for i in "${!missing_labels[@]}"; do
        if [[ $i -gt 0 ]]; then printf ', '; fi
        printf '"%s"' "${missing_labels[$i]}"
      done
      echo "],"
      echo "  \"tool\": \"audit_archive_headers\","
      echo "  \"v\": 0"
      echo "}"
    } > "$out_file"
  fi
done

if $json; then
  echo "{"
  echo "  \"tool\": \"audit_archive_headers\","
  echo "  \"v\": 0,"
  echo "  \"target_path\": \"$target_path\","
  echo "  \"total_files\": $total_files,"
  echo "  \"files_ok\": $files_with_all_headers,"
  echo "  \"files_missing_headers\": $files_missing_headers,"
  printf '  "enforce": %s\n' "$enforce"
  echo "}"
else
  echo "archive-header audit on $target_path" >&2
  echo "  files checked:          $total_files" >&2
  echo "  all four headers ok:    $files_with_all_headers" >&2
  echo "  missing one or more:    $files_missing_headers" >&2
  if [[ -n "$gap_details" ]]; then
    echo "" >&2
    echo "gaps:" >&2
    printf '%s' "$gap_details" >&2
  fi
fi

# Exit code discipline
if [[ $files_missing_headers -gt 0 ]] && $enforce; then
  exit 2
fi

exit 0
