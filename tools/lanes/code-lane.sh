#!/usr/bin/env bash
# tools/lanes/code-lane.sh
#
# Code-lane subcommand wrapper. Thin pass-through to
# tools/lanes/lane-allocator.sh with `code` as the lane.
#
# Usage:
#   tools/lanes/code-lane.sh allocate <branch-name>
#   tools/lanes/code-lane.sh release
#   tools/lanes/code-lane.sh path
#
# See tools/lanes/README.md for the full doc/code two-lane
# parallel-subagent dispatch protocol.

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

if [[ $# -lt 1 ]]; then
  cat <<EOF
Usage: $(basename "$0") <allocate|release|path> [args]

Examples:
  $(basename "$0") allocate ci/topic-2026-05-02
  $(basename "$0") release
  $(basename "$0") path

See tools/lanes/README.md for the full protocol.
EOF
  exit 64
fi

cmd="$1"
shift

case "$cmd" in
  allocate)
    exec "${SCRIPT_DIR}/lane-allocator.sh" allocate code "$@"
    ;;
  release)
    exec "${SCRIPT_DIR}/lane-allocator.sh" release code
    ;;
  path)
    exec "${SCRIPT_DIR}/lane-allocator.sh" path code
    ;;
  *)
    echo "error: unknown command: ${cmd}" >&2
    echo "       valid commands: allocate | release | path" >&2
    exit 64
    ;;
esac
