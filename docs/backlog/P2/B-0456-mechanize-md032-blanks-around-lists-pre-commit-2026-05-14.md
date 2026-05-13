---
id: B-0456
priority: P2
status: open
title: Mechanize MD032 (blanks-around-lists) check — catch tick-shard discipline gap before push, not in CI
tier: factory-hygiene
effort: S
created: 2026-05-14
last_updated: 2026-05-14
depends_on: []
composes_with: [B-0451]
tags: [substrate-hygiene, markdownlint, MD032, mechanization, tick-shards, encoding-rules-without-mechanizing]
type: friction-reducer
---

# B-0456 — Mechanize MD032 blanks-around-lists check

## Origin

Filed 2026-05-14 after the 4th MD032 failure on a tick shard this
session (occurrences in PR #3044, #3058, and #3065 ×2). Per
`.claude/rules/encoding-rules-without-mechanizing.md`: encoded
discipline without mechanization produces a memory of failures, not
prevention.

## The discipline gap

Tick shards repeatedly hit MD032 when a label sentence ends with
`:` and is immediately followed by a `- bullet` or `1. item` list
without an intervening blank line. The discipline ("blank line
between label and list") is in-head; heads forget under per-minute
cron-tick volume.

Examples this session:

| Shard | Line | Pattern |
|---|---|---|
| 2228Z (PR #3044) | 88 | `Two PRs in flight, both auto-merge armed:` → `- ` |
| 2348Z (PR #3058) | 41 | `Each row:` → `- ` |
| 0017Z (PR #3065) | 51 | `Plus:` → `- ` |
| 0024Z (PR #3065) | 66 | `infra issues that resolve when:` → `1.` |

Each occurrence costs ~1 CI cycle on the markdownlint job + ~5
minutes of agent attention to triage + fix.

## What lands

Per Rule 0 (TS-only outside install-graph), a small TS helper
under `tools/hygiene/`:

```typescript
// tools/hygiene/check-md032-blanks-around-lists.ts
// Scans .md files for MD032 pattern: line ending with `:` immediately
// followed by a list item (`- ` or `1. ` etc.) with no blank line.
// Exit 0 = clean, 1 = at least one finding. CLI lists file:line.
```

Wire either:

1. **Pre-push git hook**: runs the check on staged `.md` files in
   `docs/hygiene-history/ticks/**`. Fast; catches before CI.
2. **Tick-close ritual**: agent runs the check at end-of-tick
   alongside CronList. Less mechanical but doesn't need git hook
   install.

Option 1 is preferred (mechanizes the discipline at the substrate
layer). Option 2 is a fallback if hooks add too much friction.

## Acceptance criteria

- [ ] `tools/hygiene/check-md032-blanks-around-lists.ts` exists +
      passes for an MD032-clean fixture and fails for an MD032-dirty
      fixture
- [ ] Test file under `tools/hygiene/` covering: clean shard,
      shard with single MD032 risk, shard with multiple MD032 risks,
      shard with no lists, list-without-preceding-label (which is
      MD032-clean and should NOT flag)
- [ ] CLI emits `file:line` for each finding (matches markdownlint
      output style)
- [ ] Wire into either pre-push hook or tick-close ritual
- [ ] Verify against the 4 historical occurrences (2228Z, 2348Z,
      0017Z, 0024Z) — each should be caught

## Why P2

Not P0/P1 because the current CI markdownlint catches it (just at
post-push cost). P2 captures "this discipline is in-head and
should be mechanized" without forcing immediate scheduling.

## Composes with

- B-0451 (parent substrate-cleanup row — this is part of the same
  sweep of "discipline-in-head, fix-by-mechanization" patterns)
- `.claude/rules/encoding-rules-without-mechanizing.md` (the rule
  this row enforces)
- `.claude/rules/rule-0-no-sh-files.md` (the TS-only constraint)
- PR #3044, #3058, #3065 tick shards (the historical occurrences
  this row will retroactively catch)

## Future composing work

Once the check is in place, a sibling row could expand to other
recurring tick-shard lint patterns (e.g., header-spacing, MD040
fenced-code language hints, MD041 first-line-h1). But: don't
scope-creep this row — ship the MD032 helper first, add patterns
incrementally as they recur.
