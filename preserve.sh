#!/bin/bash
set -e
for pr in 4836 4835 4820 4819 4818 4816 4814 4813 4812 4811; do
  bun run tools/pr-preservation/archive-pr.ts $pr
done
