---
pr_number: 4771
title: "skill(alignment-observability): TUNE-S \u2014 populate bp_rules_cited per Aarav round 44 finding"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T21:22:39Z"
merged_at: "2026-05-23T21:23:55Z"
closed_at: "2026-05-23T21:23:55Z"
head_ref: "otto/cli-aarav-r44-tune-s-alignment-observability-bp-rules-2026-05-23"
base_ref: "main"
archived_at: "2026-05-24T01:24:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4771: skill(alignment-observability): TUNE-S — populate bp_rules_cited per Aarav round 44 finding

## PR description

Acts on Aarav round 44 spot-check finding (PR #4770). Frontmatter-only edit: bp_rules_cited [] → [BP-10, BP-11] + bumps last_updated. Mirrors sibling alignment-auditor citation pattern. BP rules verified against canonical docs/AGENT-BEST-PRACTICES.md:253, :278.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-23T21:23:43Z)

## Pull request overview

Updates the `alignment-observability` skill frontmatter to accurately cite the relevant best-practice rules it relies on, aligning it with the established citation pattern used by sibling skills.

**Changes:**
- Populates `bp_rules_cited` with `[BP-10, BP-11]`.
- Bumps `last_updated` to `2026-05-23`.
