---
id: 081M2BRQWCT087G0R000XSXY3V
type: bug
state: backlog
priority: P1
slug: followup-receipt-existssync-is-toctou-ferry-test-settimeout
title: "followup receipt existsSync is TOCTOU; ferry.test setTimeout is ambient time"
created: 2026-09-12T21:35:00.000Z
depends_on: []
composes_with: []
---

# followup receipt existsSync is TOCTOU; ferry.test setTimeout is ambient time

`#17385` reddened `gate (required)` on `main`:

- `existsSync(receipt)` at `followup-commands.ts:403` gates `readFileSync` and
  (per the audit) the later `writeFileSync`. The check-then-use lint refuses
  it. Fix: delete the check; interpret `readFileSync` failure.
- `ferry.test.ts` uses `setTimeout(..., 10|15|20|30)` to observe `slots()`
  concurrency. Ambient-time-in-tests refuses a non-zero delay. The rest of
  that file already uses `parked()` barriers; the slots tests should too.
