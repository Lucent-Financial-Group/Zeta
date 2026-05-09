---
id: B-0267
priority: P1
status: open
title: "GitHub ruleset split — safety ruleset (deletion + force-push + linear history)"
created: 2026-05-08
last_updated: 2026-05-09
parent: B-0155
depends_on: [B-0265]
classification: buildable-now
decomposition: atomic
type: friction-reducer
---

# B-0267 — Safety ruleset

Third child of B-0155. Dedicated ruleset for branch safety
(no deletion, no force-push, linear history required).

## Pre-start checklist

- [x] Prior-art search: B-0265 (CI Gate, closed) created
  first dedicated ruleset via `gh api` + snapshot update.
  B-0266 (Review Policy, PR #2159 merged) followed same
  pattern with `tools/migrations/b0266-review-policy-ruleset.ts`.
- [x] Dependency check: B-0265 (CI Gate) is closed. No blockers.
- [x] Parent B-0155 reviewed — three-ruleset target documented in
  `docs/GITHUB-SETTINGS.md` migration matrix.
- [x] Current Default ruleset (id: 15256879) inspected — contains
  5 rules (deletion, non_fast_forward, copilot_code_review,
  pull_request, required_linear_history). B-0266 migration
  script committed but not yet executed.

## Acceptance criteria

- [x] New ruleset "Branch Safety" created
- [x] Deletion + non_fast_forward + linear_history rules migrated
- [x] Default ruleset updated (safety rules removed)
- [x] Snapshot updated

## Implementation

Migration script: `tools/migrations/b0267-safety-ruleset.ts`

Order-independent with B-0266 — reads current Default rules
and filters out safety types rather than assuming a fixed
prior state. If Default ends up empty after removing safety
rules, deletes it; otherwise updates with remaining rules.

### Run

```bash
bun tools/migrations/b0267-safety-ruleset.ts
```

Dry run first:
```bash
bun tools/migrations/b0267-safety-ruleset.ts --dry-run
```
