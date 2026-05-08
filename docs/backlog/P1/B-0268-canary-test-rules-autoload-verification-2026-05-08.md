---
id: B-0268
priority: P1
status: open
title: "Verify .claude/rules/ auto-load — run canary test"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0158
depends_on: []
classification: buildable-now
decomposition: atomic
---

# B-0268 — Canary test for rules auto-load

The canary file exists at .claude/rules/test-canary.md with
detection string RULES_AUTOLOAD_CANARY_2026_05_01_LIVE_OFF_THE_LAND.

Run the test protocol: fresh session, ask for the string without
reading the file. Pass = auto-load works. Fail = rules surface
is not usable for spillover.

## Acceptance criteria

- Test executed in fresh session
- Result documented (pass or fail)
- Loading taxonomy memo updated with empirical finding
