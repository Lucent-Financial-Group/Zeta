---
id: B-0098
priority: P3
status: open
title: Tick-ordinal-continuity lint — ordinals are computed, not narrated
tier: research-grade
effort: S
ask: Multi-AI synthesis packet 2026-04-29 (Deepseek + Amara filter)
created: 2026-04-29
last_updated: 2026-04-29
composes_with: [B-0099, B-0100, B-0101]
tags: [ci-lint, tick-history, derived-metadata, manual-drift-class, mechanical-guard]
---

# Tick-ordinal-continuity lint

Hand-authored tick-ordinal words ("twenty-second", "twenty-third",
etc.) in `docs/hygiene-history/ticks/YYYY/MM/DD/*.md` shards drift
under edit pressure. The 2026-04-29 ordinal-cascade incident showed
the failure mode: a Copilot review thread cited a snippet, my "fix"
trusted the cited context without re-reading the full file
sequence, and introduced a duplicate ordinal. Recovery worked
(read all shards → revert → re-verify), but the underlying class
is *manual metadata drift* — the same class as the bare-`main`
ambiguity rule.

## Two viable resolutions (pick one or compose)

### Option A — Lint that verifies claimed ordinals against file order

```bash
# Pseudocode. Uses POSIX-portable boundary matching since grep -E
# on GNU/BSD does NOT support \b (treated as backspace/undefined
# escape). Use a portable boundary: anchor on (^|[^[:alpha:]])
# and ([^[:alpha:]]|$), or use grep -w (POSIX -w "match whole
# word"), which both BSD and GNU grep support.
for file in $(ls -1 docs/hygiene-history/ticks/YYYY/MM/DD/*.md | sort); do
  claimed_ordinal=$(grep -woE '(first|second|...|thirtieth|...)' "$file" | head -1)
  expected_ordinal=$(compute_from_file_position)
  [[ "$claimed_ordinal" == "$expected_ordinal" ]] || warn "$file ordinal mismatch"
done
```

Pros: keeps the prose readable.
Cons: still depends on prose, just with a guard.

### Option B — Drop ordinal words from shards entirely; compute in projection

Shards become pure event data (timestamp, model, cron-id, body,
PR refs, observation). The "twenty-second tick" framing lives only
in a generated read-model (`docs/hygiene-history/projection/...`)
that derives the ordinal from file position.

Pros: eliminates the failure class entirely. Aligns with the DBSP/
Z-set pattern Amara cited (event = stored, projection = derived).
Cons: requires updating the existing shard schema + tooling.

## Recommendation

Lean toward Option B (the cleaner fix) when next active work
window opens. Option A as an intermediate guard if prose has to
stay for a few more rounds.

## Composes with

- `memory/feedback_bare_main_ambiguity_automation_discipline_explicit_refs_required_amara_2026_04_29.md`
  — same class (computed > narrated metadata).
- B-0099 (PR-count projection) — sibling action item from the same
  packet.

## Why P3 (research-grade, not blocking)

The ordinal drift was caught and corrected within 2-3 ticks via the
existing review pipeline. The mechanical guard would prevent
future occurrences but is not blocking; opening it as P0/P1 would
violate the maintainer's narrowing on multi-AI-synthesis-packet
items. Promote when work-bandwidth allows.
