#!/usr/bin/env bash
# tools/lanes/lane-allocator.sh
#
# Worktree allocator for the rung-2 doc/code two-lane parallel-
# subagent dispatch protocol. See tools/lanes/README.md for the
# full protocol.
#
# This is the shared backend for both `doc-lane.sh` and
# `code-lane.sh`. Those are thin wrappers passing the lane name;
# this script does the worktree-allocation work.
#
# Usage:
#   tools/lanes/lane-allocator.sh allocate <lane> <branch-name>
#   tools/lanes/lane-allocator.sh release  <lane>
#   tools/lanes/lane-allocator.sh path     <lane>
#   tools/lanes/lane-allocator.sh status
#   tools/lanes/lane-allocator.sh --help
#
# Lanes recognized:
#   doc   — for docs/, memory/, openspec/specs/, .claude/, root *.md
#   code  — for src/, tests/, tools/, .github/workflows/, *.fs, *.fsproj
#
# Worktree paths (under the parent of the repo root, NOT inside it):
#   doc lane:  ../zeta-doc-lane
#   code lane: ../zeta-code-lane
#
# These paths are siblings of the main checkout per the
# worktree-isolation rule (worktrees that share a parent with the
# main checkout don't risk being scanned by tools that recurse the
# main checkout's directory tree).
#
# Exit codes:
#   0 — operation succeeded
#   1 — usage error / unknown lane
#   2 — worktree already exists (allocate) or doesn't exist (release)
#   3 — git command failed
#   64 — invalid invocation

set -euo pipefail

usage() {
  grep '^#' "$0" | grep -v '^#!' | sed 's/^# //;s/^#//'
}

# Resolve the repo root (works from any worktree).
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "error: not inside a git repository" >&2
  exit 3
}
PARENT_DIR=$(dirname "$REPO_ROOT")
REPO_NAME=$(basename "$REPO_ROOT")

lane_path() {
  local lane="$1"
  case "$lane" in
    doc)  echo "${PARENT_DIR}/${REPO_NAME}-doc-lane" ;;
    code) echo "${PARENT_DIR}/${REPO_NAME}-code-lane" ;;
    *)
      echo "error: unknown lane: ${lane}" >&2
      echo "       valid lanes: doc | code" >&2
      return 1
      ;;
  esac
}

cmd_allocate() {
  local lane="$1"
  local branch="${2:-}"
  if [[ -z "${branch}" ]]; then
    echo "error: allocate requires a branch name" >&2
    echo "       usage: lane-allocator.sh allocate ${lane} <branch-name>" >&2
    return 64
  fi
  local wt
  wt=$(lane_path "$lane")
  if [[ -d "$wt" ]]; then
    echo "error: worktree already exists at ${wt}" >&2
    echo "       run: lane-allocator.sh release ${lane}" >&2
    echo "       or:  git worktree remove ${wt}" >&2
    return 2
  fi
  echo "Allocating ${lane}-lane worktree..."
  echo "  path:   ${wt}"
  echo "  branch: ${branch}"
  if ! git worktree add "$wt" -b "$branch"; then
    echo "error: git worktree add failed" >&2
    return 3
  fi
  echo "OK: ${lane}-lane allocated at ${wt} on branch ${branch}"
  echo
  echo "Subagent should cd to: ${wt}"
  echo "Subagent should write only to ${lane}-lane allowlist paths"
  echo "  (see tools/lanes/README.md § 'File allowlist per lane')"
}

cmd_release() {
  local lane="$1"
  local wt
  wt=$(lane_path "$lane")
  if [[ ! -d "$wt" ]]; then
    echo "no ${lane}-lane worktree at ${wt}; nothing to release"
    return 0
  fi
  echo "Releasing ${lane}-lane worktree at ${wt}..."
  if ! git worktree remove "$wt" --force; then
    echo "error: git worktree remove failed" >&2
    echo "       try: git worktree remove ${wt} --force" >&2
    return 3
  fi
  echo "OK: ${lane}-lane released"
}

cmd_path() {
  local lane="$1"
  lane_path "$lane"
}

cmd_status() {
  echo "Lane worktree status:"
  for lane in doc code; do
    local wt
    wt=$(lane_path "$lane")
    if [[ -d "$wt" ]]; then
      local branch
      branch=$(git -C "$wt" symbolic-ref --short HEAD 2>/dev/null || echo "(detached)")
      printf '  %-4s lane: ALLOCATED at %s (branch: %s)\n' "${lane}" "${wt}" "${branch}"
    else
      printf '  %-4s lane: not allocated\n' "${lane}"
    fi
  done
}

main() {
  if [[ $# -lt 1 ]]; then
    usage
    return 64
  fi
  local cmd="$1"
  shift
  case "$cmd" in
    allocate)
      if [[ $# -lt 1 ]]; then
        echo "error: allocate requires <lane>" >&2
        return 64
      fi
      cmd_allocate "$@"
      ;;
    release)
      if [[ $# -lt 1 ]]; then
        echo "error: release requires <lane>" >&2
        return 64
      fi
      cmd_release "$@"
      ;;
    path)
      if [[ $# -lt 1 ]]; then
        echo "error: path requires <lane>" >&2
        return 64
      fi
      cmd_path "$@"
      ;;
    status)
      cmd_status
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "error: unknown command: ${cmd}" >&2
      echo "       use --help for usage" >&2
      return 64
      ;;
  esac
}

main "$@"
