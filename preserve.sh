#!/bin/bash
set -e
for pr in 4810 4809 4808 4806 4798 4797 4796 4795 4794 4793 4792; do
  bun run tools/pr-preservation/archive-pr.ts $pr
done
