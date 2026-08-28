---
id: B-0532
priority: P3
status: open
title: "Backlog-graph consistency lint — flag parent `status: closed` while declared child is `status: open`"
tier: factory-infrastructure
effort: S
created: 2026-05-15
last_updated: 2026-05-15
depends_on: []
composes_with: [B-0442, B-0503, B-0504, B-0505]
tags: [backlog, lint, mechanization, multi-agent, drift-detection]
type: feature
---

# Backlog-graph consistency lint

## Origin

PR [#3518](https://github.com/Lucent-Financial-Group/Zeta/pull/3518) (2026-05-15) shipped a row-status flip closing parent `B-0442` without closing children `B-0504` + `B-0505`. The result was a silent backlog-graph inconsistency: parent said *"I'm closed"*, two of three declared children still said *"I'm open"*. Caught by Codex + Copilot review (P1 + P2 findings) before merge — the substrate-honest catch took 4 review-thread cycles to fully resolve.

Same shape as the spec-vs-impl-drift problem at row-internal scope: visible-symbol fixes alone aren't sufficient. The graph has structure that must stay coherent under updates.

## The failure-class pattern

| Step | What happened | What this lint catches |
|------|---------------|-----------------------|
| 1 | Row X declares `children: [Y, Z]` in frontmatter | (graph edge) |
| 2 | Y + Z's work lands via some PR | (no action; Y/Z still `status: open` until explicit flip) |
| 3 | Future agent verifies X's acceptance items checked-off, flips `status: open` → `closed` | DETECT: X is closed, Y or Z still open |

The inverse case also matters:

| Step | What happened | What this lint catches |
|------|---------------|-----------------------|
| 1 | Row Y declares `parent: X` | (graph edge) |
| 2 | All children of X are `status: closed`, but X is still `status: open` | DETECT: X should be reviewable for closure |

The first case is a hard error (graph inconsistency landed); the second is a soft warning (closure candidate flagged for next-tick attention).

## Acceptance criteria

- [ ] New file `tools/lint/backlog-graph-consistency.ts` that:
  - Walks all `docs/backlog/P*/B-*.md` files
  - Parses each file's YAML frontmatter for `id`, `status`, `children`, `parent`
  - For each row with `status: closed`: every `child` in its declared `children: [...]` must also be `status: closed` (hard error)
  - For each row with `status: open` whose `parent` exists: if all siblings of the same `parent` are `status: closed`, surface as soft warning (closure candidate)
  - Bidirectional consistency: if Y has `parent: X`, then X's `children` must include Y; if X has `child Y`, Y's `parent` should be X (or unset for the orphan case)
  - Exit 1 on any hard error; exit 0 with stderr warning on soft warnings
  - `--json` flag for machine-readable output (composes with bus + downstream tools)

- [ ] Test file `tools/lint/backlog-graph-consistency.test.ts` covering:
  - Hard error: parent closed + child open
  - Hard error: bidirectional mismatch (parent's `children` doesn't include row that names it as `parent`)
  - Soft warning: all children closed but parent open
  - Pass case: parent open + at least one child open (normal in-progress state)
  - Pass case: parent closed + all children closed (terminal coherent state)
  - JSON output schema validation

- [ ] Wired into `.github/workflows/gate.yml` under the existing `lint-shell` or `lint-tsc-tools` job (or a new `lint-backlog-graph` job — designer's choice)

- [ ] Documented in `docs/AGENT-BEST-PRACTICES.md` under the row-status-flip discipline section

## Why P3

Not blocking — the failure mode was caught by humans-in-the-loop review on a single PR (#3518). Frequency is low (row-status flips are not a daily operation). Cost of mechanization is moderate (a few hundred lines of TS + tests + CI wire). Future-Otto reading PR #3518's history surfaces this row as the "next time this happens, mechanize" anchor.

Composes with the broader [`.claude/rules/encoding-rules-without-mechanizing.md`](../../../.claude/rules/encoding-rules-without-mechanizing.md) discipline — this row is itself an instance of that discipline applied to a specific failure mode.

## Pre-start checklist

- [ ] Prior-art search: `tools/hygiene/audit-backlog-items.ts` (existing TS impl — check for overlap; this lint should compose, not duplicate)
- [ ] Confirm YAML parser convention in `tools/lint/*.ts` (likely `js-yaml` or a hand-rolled frontmatter splitter)
- [ ] Verify `gate.yml` job composition strategy with [`.claude/rules/devops-engineer.md`](../../../.claude/rules/devops-engineer.md) sensibilities

## Composes with

- [`.claude/rules/encoding-rules-without-mechanizing.md`](../../../.claude/rules/encoding-rules-without-mechanizing.md) — this row IS that discipline applied
- [`.claude/rules/refresh-before-decide.md`](../../../.claude/rules/refresh-before-decide.md) — would have caught the failure earlier; lint catches what discipline missed
- PR [#3518](https://github.com/Lucent-Financial-Group/Zeta/pull/3518) (the originating incident)
- B-0442 / B-0503 / B-0504 / B-0505 (the chain that surfaced the failure mode)
- `tools/hygiene/audit-backlog-items.ts` (existing backlog auditing; potential composition target)
