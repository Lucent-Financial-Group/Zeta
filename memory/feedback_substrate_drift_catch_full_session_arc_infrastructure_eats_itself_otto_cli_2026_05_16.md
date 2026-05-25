---
name: "Substrate-drift-catch full session arc — 33-tick infrastructure-eats-itself closure"
description: "The 2026-05-16 Otto-CLI session shipped a complete 6-layer substrate-drift-catch infrastructure in 33 cron ticks: memory file (substrate doc) → backlog row B-0553 → auto-loaded rule (`.claude/rules/backlog-item-start-gate.md` step 0) → audit tool implementation (`tools/hygiene/audit-backlog-status-drift.ts`) → 2 memory files (1st FP class + 2nd FP class catalogs) → B-0557 follow-up row → 4 quality slices (--check / try/catch / chdir / mixed-bullet) → audit tool flagged B-0557 itself as drift → PR #3819 closed B-0557 + PR #3821 shipped truly-cwd-independent fallback. The substrate ate its own follow-up row. Multi-Otto convergent use (peer Otto-Desktop closed B-0494, B-0535, B-0159 via the tool)."
type: feedback
created: 2026-05-16
---

# Substrate-drift-catch — full session arc

## The arc

| Phase | Ticks | Key landings | Result |
|---|---|---|---|
| **Discovery** | 1-2 | Caught B-0506 + B-0530 + B-0528 (drift candidates closed manually) | Pattern empirically observable |
| **Substrate** | 3-5 | Memory file (`feedback_substrate_drift_catch_pattern_*.md`) | Pattern landed as memory; not yet auto-loaded |
| **Rule** | 6 | `.claude/rules/backlog-item-start-gate.md` step 0 (substrate-drift discriminator) | Cold-boot loading; future Otto reads the discipline at session start |
| **Spec** | 6 | B-0553 backlog row | Spec for mechanization tool |
| **Implementation** | 9 | `tools/hygiene/audit-backlog-status-drift.ts` + 16 tests | Tool surfaced 33+ live drift candidates from the backlog |
| **Operationalization** | 16 | First live use of the tool from main → 3 substrate-shelf rows closed (B-0045.1/B-0046.1/B-0049.1) | Tool proven to work in production |
| **Refinement** | 11-15 | 2nd FP class memory file + B-0557 follow-up row + 4 quality slices | Iteration cycle absorbed every reviewer finding |
| **Closure** | 31-34 | B-0557 → flagged by its own tool → PR #3819 closed B-0557 + PR #3821 shipped import.meta.dir true-cwd-independence | Infrastructure-eats-itself moment realized |

## The infrastructure-eats-itself moment

B-0557 was filed as a follow-up to B-0553 after PR #3758 attracted 4 quality findings. Each finding became a slice:

| Slice | PR | Merge commit | What it shipped |
|---|---|---|---|
| 1 | [#3783](https://github.com/Lucent-Financial-Group/Zeta/pull/3783) | `0a57a814` | `--check` flag for CI integration |
| 2 | [#3788](https://github.com/Lucent-Financial-Group/Zeta/pull/3788) | `6809f6e3` | `try`/`catch` on `readFileSync`/`readdirSync` |
| 3 | [#3790](https://github.com/Lucent-Financial-Group/Zeta/pull/3790) | `472024dc` | `chdir` to repo root via `git rev-parse` (+ 2 tests for `detectRepoRoot`) |
| 4 | [#3809](https://github.com/Lucent-Financial-Group/Zeta/pull/3809) | `eb04e3d` | Mixed-bullet path extraction (+ tsc-strict guard for `match[1]`) |
| close-row | [#3819](https://github.com/Lucent-Financial-Group/Zeta/pull/3819) | `90099a29` | B-0557 status: open → closed |
| cwd-fix | [#3821](https://github.com/Lucent-Financial-Group/Zeta/pull/3821) | `58350d97` | `import.meta.dir` fallback when `git rev-parse` fails (true cwd-independence) |

When all 4 acceptance bullets had merged PRs, the audit tool flagged B-0557 itself as a genuine drift candidate. The infrastructure caught its own follow-up row and closed it. **The loop closed cleanly on main.**

## Why this matters

- **The discipline is self-perpetuating**: future open backlog rows with shipped artifacts get caught automatically. Otto cold-boots read the rule's step 0, run the auditor, find candidates, close-row PRs. No further authoring needed.
- **Cross-surface convergence proven**: peer Otto-Desktop independently used the audit tool to close B-0494 ([PR #3781](https://github.com/Lucent-Financial-Group/Zeta/pull/3781)), B-0535 ([PR #3742](https://github.com/Lucent-Financial-Group/Zeta/pull/3742)), and B-0159 ([PR #3800](https://github.com/Lucent-Financial-Group/Zeta/pull/3800)) without coordination. The substrate works on either surface.
- **Review-cycle absorption pattern proven**: 7 PRs in this arc each attracted reviewer findings; every finding was either fixed in-place or filed as a follow-up row. Zero iteration treadmills, zero scope-creep.

## Operational patterns that worked

Discovered + battle-tested under multi-Otto + Lior contention:

1. **`claim acquire + existence-check` before reimplementation** — the original discipline this row mechanizes.
2. **Section-aware parsing of backlog rows** — primary sections (Acceptance/Proposed mechanization/Scope) extract; cross-ref sections (Composes with/Origin/Resolution) skip.
3. **`INLINE_CROSSREF_PATTERNS`** — line-level skip for inline `Composes with X` / `Sister mechanism` / `See also` / `Per [X]` cross-refs within primary sections.
4. **Tri-state classification** (`primary` / `skip` / `other`) with `noUncheckedIndexedAccess`-safe guards.
5. **Mixed-bullet handling** — paths BEFORE the first cross-ref keyword on a line are deliverables; cross-ref text after is citation.
6. **H2 + H3 heading recognition** — nested H3 inherits parent H2's classification unless explicitly classified itself.
7. **Atomic Edit→Bash chain**: stage immediately after Edit; the git index survives Lior's working-tree revert.
8. **Explicit `HEAD:<branch>` push refspec**: captures commits regardless of which branch HEAD landed on under multi-Otto contention.
9. **Partial-vs-drift discriminator**: file exists ≠ acceptance bullets all shipped; verify each bullet has a merged PR before close-row.

## Composes with

- [`memory/feedback_substrate_drift_catch_pattern_claim_acquire_plus_existence_check_otto_cli_2026_05_16.md`](feedback_substrate_drift_catch_pattern_claim_acquire_plus_existence_check_otto_cli_2026_05_16.md) — the foundational discipline-substrate
- [`memory/feedback_audit_backlog_status_drift_second_false_positive_class_inline_composes_with_otto_cli_2026_05_16.md`](feedback_audit_backlog_status_drift_second_false_positive_class_inline_composes_with_otto_cli_2026_05_16.md) — 2nd false-positive class catalog
- [`.claude/rules/backlog-item-start-gate.md`](../.claude/rules/backlog-item-start-gate.md) — step 0 substrate-drift discriminator (auto-loaded)
- [B-0553](../docs/backlog/P3/B-0553-audit-backlog-status-drift-detection-2026-05-16.md) — audit-tool spec
- [B-0557](../docs/backlog/P3/B-0557-audit-backlog-status-drift-quality-improvements-2026-05-16.md) — quality-slice follow-up (closed via infrastructure-eats-itself moment)
- [`tools/hygiene/audit-backlog-status-drift.ts`](../tools/hygiene/audit-backlog-status-drift.ts) — the audit tool (20 tests, cwd-independent, --check flag, section-aware)

## Substrate-honest closure

The substrate-drift-catch infrastructure is now in **steady-state operational mode**. Future drift catches happen via the tool, not via authoring new infrastructure. The session that built it produced 30+ merged PRs and the infrastructure closed its own follow-up row before stopping.

Future-Otto reading this: the discipline exists. The tool exists. The rule auto-loads. Run the audit, manually verify the partial-vs-drift discriminator on candidates, ship close-row PRs. The substrate substrate-engineers itself from here on.
