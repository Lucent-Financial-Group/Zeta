---
id: B-0103
priority: P2
status: open
title: Computed-metadata-discipline — unified lint consolidating B-0098 + B-0099 + filename-timestamp drift
tier: factory-hygiene
effort: M
ask: Multi-AI synthesis packet 2026-04-29 (Amara filter — promote individual P3 metadata-drift items to single P2)
created: 2026-04-29
last_updated: 2026-04-29
composes_with: [B-0098, B-0099, B-0102]
tags: [ci-lint, factory-hygiene, derived-metadata, manual-drift-class, mechanical-guard, p2-promotion]
---

# Computed-metadata-discipline — unified lint

The 2026-04-29 session arc surfaced **three** instances of the
same failure class — agent-authored metadata that drifted from
derived truth:

1. **Tick-ordinal drift** — shard prose claims "twenty-second tick"
   but file order says twenty-first (B-0098).
2. **PR-count drift** — shard prose claims "30 PRs total this
   session arc" but git log says 28 (B-0099).
3. **Shard-filename-vs-row-timestamp drift** — shard at
   `0613Z.md` has row timestamp `06:12:50Z` (off-by-one minute,
   caught by Codex P1 on PR #809).

Three instances in one session is enough signal to consolidate
the family into a single P2 mechanical guard rather than three
parallel P3 lints.

## Canonical rule

```text
Agent-authored metadata must match derived truth.
If the truth can be computed, compute it or lint it.
```

## Examples (the drift-prone metadata claims this lint covers)

| Claim | Derived from |
|---|---|
| filename timestamp (`HHMMZ.md`) | row timestamp's `HH:MM` |
| tick ordinal ("twenty-second tick") | sorted shard position in directory |
| session PR total ("30 PRs") | `gh pr list --search` or `git log` count |
| branch base ("based on main") | explicit ref SHA |
| "this is the Nth fix" | git log count of similar commits |

## Distilled keepers

```text
Events are written.
Metadata is computed.
Claims are checked against derived truth.
```

## Implementation sketch (single lint, multiple checks)

```bash
# tools/lint/metadata-drift-check.sh
# Run on PR diffs touching tick-history shards or backlog rows.

# Check 1 — filename HHMM matches row timestamp HH:MM
for shard in $(git diff --name-only "$BASE..$HEAD" -- 'docs/hygiene-history/ticks/**/*.md'); do
  filename_hhmm=$(basename "$shard" .md | grep -oE '^[0-9]{4}Z')
  row_hhmm=$(head -1 "$shard" | grep -oE 'T[0-9]{2}:[0-9]{2}' | tr -d 'T:')
  [[ "${filename_hhmm%Z}" == "$row_hhmm" ]] || warn "$shard: filename $filename_hhmm vs row $row_hhmm"
done

# Check 2 — claimed ordinal matches file position (only when prose contains ordinal words)
# Check 3 — claimed PR count matches gh / git query (only when prose contains "N PRs total")
# Check 4 — branch-base claims cite explicit SHA
```

## Why P2 (vs three separate P3s)

The pattern recurred 3x in 24 hours — strong signal it would
recur again. Single P2 lint:

- Reduces total surface area (one CI check, one set of regex
  rules, one file to maintain).
- Catches all four drift sub-classes uniformly.
- Aligns with Amara's framing: "If metadata can be derived,
  do not trust agent-authored prose."

P2 (factory hygiene, can-be-deferred but desirable) rather than
P0/P1 (blocking) because the drift is caught manually within
1-2 ticks via review pipeline; the lint accelerates detection
but doesn't unblock anything currently broken.

## Composes with

- B-0098 (tick-ordinal-continuity lint) — subsumed.
- B-0099 (PR-count-projection-not-narrated) — subsumed.
- B-0102 (PR-liveness race) — sibling agent-asserted-state
  discipline.
- `memory/feedback_bare_main_ambiguity_automation_discipline_explicit_refs_required_amara_2026_04_29.md`
  — same computed-vs-narrated rule at the git-ref layer.

## Migration path

When this P2 lands as active work:

1. Implement the single `tools/lint/metadata-drift-check.sh`
   covering all 3+ sub-classes.
2. Wire into `.github/workflows/gate.yml` (or sibling).
3. Mark B-0098 + B-0099 as superseded-by-B-0103 in their
   frontmatter.
4. Remove ordinal-word + PR-count-prose from existing tick
   shards if the lint catches them as drift candidates.
