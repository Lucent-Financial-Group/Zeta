---
pr_number: 4764
title: "feat(B-0708 slice 1): audit resolver improvements + 1 real-stale fix (87 \u2192 17, -80%)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T20:53:29Z"
merged_at: "2026-05-23T20:55:43Z"
closed_at: "2026-05-23T20:55:43Z"
head_ref: "otto/cli-b0708-slice1-stale-pointer-classify-report-2026-05-23"
base_ref: "main"
archived_at: "2026-05-24T01:24:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4764: feat(B-0708 slice 1): audit resolver improvements + 1 real-stale fix (87 → 17, -80%)

## PR description

## Summary

B-0708 slice 1 — address the 87 stale-pointer candidates from razor-cadence pass 2026-05-23. Two-prong: improve audit-rule-cross-refs.ts resolver to recognize FP classes + fix the 1 real-stale wording-drift found.

**Result: 87 → 17 candidates (-80%); 16% MISS → 3.1% MISS (below 5% healthy-FP floor).**

## Resolver improvements

5 new paths in `refExists()`:
1. **Template placeholders** (`...` ellipsis, `YYYY` date) → healthy-FP
2. **Command-snippet detection** — find embedded path in backtick'd shell command
3. **Sibling-rule resolution** — bare `<name>.md` in `.claude/rules/` resolves via `.claude/rules/<name>`
4. **Peer-call wrapper resolution** — bare `<name>.ts` resolves via `tools/peer-call/<name>`
5. **tools/hygiene/ + tools/github/ + memory/MEMORY.md** fallbacks

## Real-stale fix

`tonal-momentum-equals-meme-emergent-harmonic-coercion.md` cited `god-tier-claims-don't-collapse.md` (with apostrophe); actual file is `god-tier-claims-high-signal-high-suspicion-dont-collapse.md` (no apostrophe). Same lesson as PR #4752 Lock/Wait-free canonical fix.

## Remaining 17 candidates classify as healthy

- User-scope memory references (rule body explicitly says "user-scope only" — preserved at `~/.claude/projects/.../memory/`; not in-repo)
- Anti-pattern citations (`rule-0-no-sh-files.md` cites legacy `.sh` files explicitly to call out the cleared anti-pattern; `tick-must-never-stop.md` cites `loop-tick-history.md` as "NOT legacy")
- IF-fail-clause hypotheticals (`test-canary.md` cites `tools/substrate-discovery/discover.ts` with "would land as..." conditional)

Per 9-variant taxonomy, all remaining candidates fall in healthy classes (rule-acknowledged-transient / conditional / alternative-location / anti-pattern / legacy-noted).

## Tests

21 pass (16 pre-existing + 5 new for resolver paths).

## Composes with

- B-0708 (parent)
- B-0192 (razor-cadence trigger — this completes the cadence pass finding)
- PR #4752 (wording-discipline lesson)
- `docs/hygiene-history/ticks/2026/05/14/1920Z.md` (9-variant taxonomy)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
