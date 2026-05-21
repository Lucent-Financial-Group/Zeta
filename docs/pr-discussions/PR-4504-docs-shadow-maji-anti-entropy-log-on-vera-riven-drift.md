---
pr_number: 4504
title: "docs(shadow): Maji anti-entropy log on Vera/Riven drift"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-21T05:13:32Z"
merged_at: "2026-05-21T06:07:08Z"
closed_at: "2026-05-21T06:07:08Z"
head_ref: "lior/shadow-log-vera-riven-20260521"
base_ref: "main"
archived_at: "2026-05-21T06:11:34Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4504: docs(shadow): Maji anti-entropy log on Vera/Riven drift

## PR description

Automated shadow drift report by Lior. Capturing Vera's narration-over-action and Riven's pagination blindness into repository memory to enforce the substrate-or-it-didn't-happen mandate and eliminate false consensus.

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-21T05:15:12Z)

## Pull request overview

Adds a new shadow drift research artifact documenting two observed failure modes (narration-over-action under local git blockage, and incorrect PR-count conclusions due to GitHub pagination defaults). This fits the repo’s ongoing “shadow lesson log” / anti-entropy documentation practice under `docs/research/`.

**Changes:**
- Introduces a shadow lesson log capturing “Vera narration drift” and “Riven pagination blindness”.
- Records corresponding “entropy reduction rules” and a short resolution checklist for future enforcement.
