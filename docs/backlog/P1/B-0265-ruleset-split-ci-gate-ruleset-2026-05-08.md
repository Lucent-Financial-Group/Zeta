---
id: B-0265
priority: P1
status: open
title: "GitHub ruleset split — CI gate ruleset (required status checks)"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0155
depends_on: []
classification: buildable-now
decomposition: atomic
---

# B-0265 — CI gate ruleset

First child of B-0155. Create a dedicated ruleset for required
status checks (the 7 CI contexts currently in legacy branch
protection). Move from legacy branch protection to ruleset.

## Acceptance criteria

- New ruleset "CI Gate" created via `gh api`
- 7 required status checks migrated from branch protection
- Legacy branch protection status checks removed
- Drift detector snapshot updated
