#!/bin/bash
set -e
for pr in 4791 4790 4789 4784 4783 4779 4774 4772 4771; do
  bun run tools/pr-preservation/archive-pr.ts $pr
done
