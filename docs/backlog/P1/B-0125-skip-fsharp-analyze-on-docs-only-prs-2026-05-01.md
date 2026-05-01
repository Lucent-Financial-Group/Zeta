---
id: B-0125
priority: P1
status: open
title: Skip Analyze (csharp) on docs-only PRs without tripping `code_quality severity:all`
created: 2026-05-01
last_updated: 2026-05-01
---

# B-0125 — Skip Analyze (csharp) on docs-only PRs without tripping `code_quality severity:all`

**Priority:** P1 (high value, soon)

**Filed:** 2026-05-01

**Filed by:** Otto under the new backlog-prioritization authority delegated 2026-05-01 (per `memory/feedback_backlog_prioritization_authority_delegated_to_otto_aaron_2026_05_01.md`). Aaron's framing 2026-05-01 in chat: *"speeding up for CI for non code changes? where do you want to priortize that, the typescript is part of the docs but you can skip the f# that's on backlog."*

**Effort:** M (1-3 days — investigation + workflow change + verification)

## What

Make `Analyze (csharp)` (and any other F#-only CI step) skip on PRs that touch only docs/memory/backlog/research surfaces, while keeping all TypeScript checks, build-and-test, and CodeQL on other languages running unchanged. Specifically:

- **Skip on:** `docs/**`, `memory/**`, `docs/backlog/**`, `docs/hygiene-history/**`, `docs/research/**` (and similar non-code surfaces).
- **Do NOT skip on:** any `src/**` change, any `.github/workflows/**` change, any TypeScript file change anywhere (TypeScript is the factory tooling per CURRENT-aaron §30, treat as code), any `tools/**` change that affects F# build/test.
- **Must NOT trip:** the `code_quality severity:all` ruleset on LFG/main. The hard part is that `code_quality severity:all` will fail when `Analyze (csharp)` is *skipped* rather than *successful* — Amara's Option B per-language source-presence gate (PR #857 / task #340) addressed an adjacent case but the docs-only path-filter case remains.

## Why P1

- **Throughput cost is real and recurring.** This session block landed 6 non-code PRs (#997 / #999 / #1000 / #1001 / #1002 / #1003) at ~5min CI each = ~30min CI-blocked time for substrate-only work. Project produces ~half its PRs in this non-code class going forward; cost compounds with the high substrate cadence (~550 checkins/week per chunk-11 CSAP-pushback observation).
- **Bounded scope.** Path-filter + ruleset-coordination is a contained change.
- **High Aaron-tax reduction.** Aaron flagged this in chat as visible CI-wait pain.

## Why not P0

- **Real risk.** `code_quality severity:all` on LFG/main is host-mutation-protected (per `memory/feedback_*` from PRs #849/#857/#651-cluster, plus task #343 drift-debt receipt for the 2026-04-29 ruleset mutation). Rushing the workflow change can break LFG/main protection.
- **Not blocking critical-path work.** CI-wait is throughput-drag, not stop-the-line.

## Why not P2

- The throughput cost is paid every non-code PR and compounds. Deferring multi-week leaves substantial Aaron-tax + Otto-tick-time on the table.

## Acceptance criteria

1. **Path-filter implemented.** PRs touching only the listed non-code surfaces skip `Analyze (csharp)` and any F#-only CI steps. Implementation must use a deterministic path-list (not pattern guesswork) to avoid silent drift.
2. **TypeScript still runs.** Any PR touching `*.ts` / `*.tsx` / `package.json` / `bun.lock` / `tsconfig*.json` runs the full TypeScript pipeline. The "TypeScript is part of docs" carve-out from Aaron's chat framing is honored.
3. **`code_quality severity:all` does NOT fail** on LFG/main when the skip fires. Three paths in the design space:
   - (a) Conditional skip-vs-run rather than always-run pattern (so the ruleset sees "not applicable" not "failed"), OR
   - (b) Coordinated ruleset config change on the existing single ruleset, OR
   - (c) **Multi-ruleset split** — separate docs-targeted ruleset (lower bar; F# Analyze not required) + code-targeted ruleset (severity:all on src/ paths). Aaron 2026-05-01 in chat: *"maybe multiple rulesets i just had one for convience, you can do it for whats best for your and making humans feel comfortable, all makes humans feel comfortable i don't know if that help if not no worries."* This reveals the single severity:all ruleset was set up for convenience, not as a technical requirement. The real constraint is **human-comfort signaling** — humans see "all required checks passing" and feel reassured; the literal severity:all configuration is one of several ways to produce that signal. A multi-ruleset design that surfaces "all required-for-this-surface checks pass" preserves the comfort property without requiring F# Analyze on docs PRs.

**Aaron's host-mutation authorization for this work specifically (2026-05-01):** *"you can do it for what's best."* Scoped explicitly to the ruleset-redesign work in this row. NOT a blanket grant on host mutations going forward — the §16 host-mutation-needs-sign-off rule remains in force; this is an explicit per-row carve-out for B-0125 implementation.
4. **Verification across PR shapes:** docs-only PR, TypeScript-only PR, src-only PR, mixed PR, workflow-only PR — all behave correctly.
5. **No reduction in security coverage** for actual code surfaces. Skip is for non-code only.

## Out of scope

- **Changing what `code_quality severity:all` requires** for code surfaces (src/) — that protection stays at the same severity level. Multi-ruleset split adds a docs-targeted ruleset alongside; it does NOT lower the bar on the code-targeted ruleset.
- **Skipping CodeQL on other languages** (only F#/csharp is named in Aaron's chat carve-out).
- **Skipping TypeScript checks ever** — TypeScript IS docs surface per CURRENT-aaron §30.
- **Cross-cutting CI overhaul** — narrow scope; broader CI work can be its own row.

## Composes with

- **Task #306** (TaskList): "Cadence-fast revisit — find a way to skip Analyze (csharp) on PR without tripping code_quality severity:all" — this row is the substrate version of that task.
- **Task #340** (completed): PR #857 codeql per-language source-presence gate (Amara Option B). The path-filter case is downstream of source-presence but not solved by it.
- **Task #342** (completed): Resolve multi-master CodeQL conflict on #849. Reference for the ruleset-interaction patterns that almost-broke things.
- **Task #343** (completed): Drift-debt receipt for the 2026-04-29 ruleset mutation. The host-mutation discipline that constrains the (b) path above.
- **Memory:** `feedback_backlog_prioritization_authority_delegated_to_otto_aaron_2026_05_01.md` — this row is the first substantive use of the delegation, filed under Otto's authority with Aaron's framing as input not directive.
- **CURRENT-aaron.md §30** — TypeScript-is-factory-tooling rule that defines why TypeScript stays in CI even on "docs" PRs.

## Status

**Filed.** Implementation deferred to a future session-open with rested attention (per the §39 slow-deliberate rule + the receipt-energy hazard discipline — first substantive use of the new authority should not also be the implementation rush). Otto picks the implementation tick.

## Verify-before-deferring note

Aaron's chat said *"that's on backlog"* referring to task #306. Verified: task #306 is in the TaskList but NO B-NNNN substrate row existed until this filing. Substrate-or-it-didn't-happen rule applied: the task lived in ephemeral task-tracker only, not in committed substrate. This row closes that gap.
